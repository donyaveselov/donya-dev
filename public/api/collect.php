<?php
// POST /api/collect.php: a batch of the page's analytics events (src/services/analytics.service.ts sends them with
// navigator.sendBeacon), as {"s": "<session uuid>", "e": [{"n": "<event>", "t": <ms since the visit began>, "p": {...}}]}.
//
// It checks the request (POST, our Origin, at most 4 KB of JSON, no bot, the rate limit), keeps only the events and
// props of the list (analytics-lib.php), appends them to <log_dir>/<YYYY-MM-DD>.jsonl and keeps a small summary of the
// visit in <state_dir>/sessions/<session>.json. At the visit's end (visit_end, which comes when the tab hides, closes,
// and every minute while it is shown) it sends ONE Telegram message per visit and edits it while later visit_ends
// bring a longer visit, for half an hour. Visits with under 3 s of active time get no message.
//
// Replies: 204 taken; 400 malformed; 403 not our origin, or a bot; 405 not POST; 413 too big; 429 too many; 503 not
// configured.
declare(strict_types=1);

require __DIR__ . '/analytics-lib.php';

header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function an_reply(int $status): void
{
    http_response_code($status);
    exit;
}

/** array_is_list() is PHP 8.1. */
function an_is_list(array $a): bool
{
    return $a === [] || array_keys($a) === range(0, count($a) - 1);
}

/** The request's origin: the Origin header, else the scheme and host of the Referer. */
function an_request_origin(): string
{
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin !== '' && $origin !== 'null') {
        return strtolower(rtrim($origin, '/'));
    }
    $ref = parse_url((string) ($_SERVER['HTTP_REFERER'] ?? ''));
    if (!is_array($ref) || !isset($ref['scheme'], $ref['host'])) {
        return '';
    }
    return strtolower($ref['scheme'] . '://' . $ref['host'] . (isset($ref['port']) ? ':' . $ref['port'] : ''));
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    an_reply(405);
}
$cfg = an_config();
if ($cfg === null) {
    an_reply(503);
}
if (!$cfg['enabled']) {
    an_reply(204);
}

$allowed = array_map(static fn ($o): string => strtolower(rtrim((string) $o, '/')), (array) $cfg['allowed_origins']);
if (!in_array(an_request_origin(), $allowed, true)) {
    an_reply(403);
}
$ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
if (an_is_bot($ua)) {
    an_reply(403);
}
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > AN_MAX_BODY) {
    an_reply(413);
}
$body = file_get_contents('php://input', false, null, 0, AN_MAX_BODY + 1);
if (!is_string($body) || $body === '') {
    an_reply(400);
}
if (strlen($body) > AN_MAX_BODY) {
    an_reply(413);
}
$data = json_decode($body, true, 8);
$sid = is_array($data) ? ($data['s'] ?? null) : null;
$events = is_array($data) ? ($data['e'] ?? null) : null;
if (
    !is_string($sid)
    || preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $sid) !== 1
    || !is_array($events)
    || !an_is_list($events)
    || count($events) === 0
    || count($events) > AN_MAX_EVENTS
) {
    an_reply(400);
}

$clean = [];
foreach ($events as $ev) {
    if (!is_array($ev)) {
        continue;
    }
    $props = an_sanitize($ev['n'] ?? null, $ev['p'] ?? []);
    if ($props === null) {
        continue;
    }
    $t = $ev['t'] ?? 0;
    $clean[] = ['n' => $ev['n'], 't' => (is_int($t) || is_float($t)) ? (int) max(0, min(1e10, $t)) : 0, 'p' => $props];
}
if (!$clean) {
    an_reply(400);
}

$now = an_now();
$day = $now->format('Y-m-d');
$visitor = an_visitor(an_daily_salt($cfg, $day), an_client_ip(), $ua);
if (!an_rate_ok($cfg, $visitor, count($clean), $now->getTimestamp())) {
    an_reply(429);
}

$uaClass = an_ua_class($ua);
$lines = [];
foreach ($clean as $ev) {
    $line = ['t' => $now->format(DATE_ATOM), 's' => $sid, 'v' => $visitor, 'e' => $ev['n'], 'p' => (object) $ev['p'], 'ct' => $ev['t']];
    if ($ev['n'] === 'visit_start') {
        $line['ua'] = $uaClass;
    }
    $lines[] = $line;
}
an_log($cfg, $day, $lines);

// the reply goes now; the visit's summary and its message are the server's business (where PHP runs under FPM, the
// browser does not even wait for Telegram)
http_response_code(204);
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
}
ignore_user_abort(true);

/* ---------- the visit's summary and its message ---------- */

/** The summary of a visit, built up from its events. */
function an_visit_apply(array $v, array $ev, string $uaClass): array
{
    $p = $ev['p'];
    $addOnce = static function (array $list, string $x): array {
        if (!in_array($x, $list, true)) {
            $list[] = $x;
        }
        return $list;
    };
    switch ($ev['n']) {
        case 'visit_start':
            $v['start'] ??= $p;
            $v['ua'] ??= $uaClass;
            break;
        case 'tour_offer':
            $v['tour']['offered'] = true;
            break;
        case 'tour_accept':
            $v['tour']['accepted'] = true;
            break;
        case 'tour_decline':
            $v['tour']['declined'] = true;
            break;
        case 'tour_step':
            $v['tour']['step'] = $p['step'] ?? null;
            break;
        case 'tour_skip':
            $v['tour']['skipped'] = $p['step'] ?? true;
            break;
        case 'tour_complete':
            $v['tour']['done'] = true;
            break;
        case 'pc_enter':
            $v['pc'] = true;
            break;
        case 'pc_exit':
            if (($p['how'] ?? '') === 'shutdown') {
                $v['shutdown'] = true;
            }
            break;
        case 'app_open':
            if (isset($p['app'])) {
                $v['apps'] = $addOnce($v['apps'] ?? [], $p['app']);
            }
            break;
        case 'project_open':
            if (isset($p['id'])) {
                $v['projects'] = $addOnce($v['projects'] ?? [], $p['id']);
            }
            break;
        case 'site_window_open':
            if (isset($p['site'])) {
                $v['sites'] = $addOnce($v['sites'] ?? [], $p['site']);
            }
            break;
        case 'resume_open':
            $v['resume'] = $addOnce($v['resume'] ?? [], $p['from'] ?? '?');
            break;
        case 'diploma_click':
            $v['diploma'] = true;
            break;
        case 'lang_switch':
            if (isset($p['to'])) {
                $v['lang'] = $p['to'];
            }
            break;
        case 'visit_end':
            $total = (int) ($p['totalMs'] ?? 0);
            $active = (int) ($p['activeMs'] ?? 0);
            // the latest beacons can arrive out of order: keep the longest
            if ($total >= (int) ($v['end']['totalMs'] ?? -1)) {
                $v['end'] = ['totalMs' => $total, 'activeMs' => max($active, (int) ($v['end']['activeMs'] ?? 0))];
            }
            break;
    }
    return $v;
}

/** The visit's message, in Russian: how long, on what, from where; then how far it went. */
function an_visit_text(array $v): string
{
    $start = $v['start'] ?? [];
    $end = $v['end'] ?? ['totalMs' => 0, 'activeMs' => 0];
    $head = ['👀 Визит ' . an_duration((int) $end['totalMs']) . ' (активно ' . an_clock((int) $end['activeMs']) . ')'];
    if (isset($start['device'])) {
        $head[] = AN_DEVICE_RU[$start['device']] ?? $start['device'];
    }
    $lang = $start['blang'] ?? ($start['lang'] ?? '');
    if ($lang !== '') {
        $head[] = strtoupper($lang);
    }
    $ref = $start['ref'] ?? '';
    if ($ref !== '') {
        $from = 'пришёл: ' . ($ref === 'direct' ? 'напрямую' : $ref);
        if (isset($start['utm'])) {
            $from .= ' (utm ' . $start['utm'] . ')';
        }
        $head[] = $from;
    }
    if (isset($start['route']) && $start['route'] !== 'home') {
        $head[] = '/' . $start['route'];
    }
    if (isset($v['ua'])) {
        $head[] = $v['ua'];
    }

    $path = [];
    $tour = $v['tour'] ?? [];
    if (!empty($tour['accepted'])) {
        if (!empty($tour['done'])) {
            $path[] = 'экскурсия: да, до конца';
        } else {
            $step = is_string($tour['step'] ?? null) ? (AN_STEP_RU[$tour['step']] ?? $tour['step']) : null;
            $path[] = 'экскурсия: да' . ($step !== null ? ', до «' . $step . '»' : '');
        }
    } elseif (!empty($tour['declined'])) {
        $path[] = 'экскурсия: нет';
    } elseif (!empty($tour['offered'])) {
        $path[] = 'экскурсия: без ответа';
    }
    if (!empty($v['pc'])) {
        $path[] = 'компьютер' . (!empty($v['shutdown']) ? ' (выключил)' : '');
    }
    $siteApps = ['wax', 'kompy-app', 'project'];
    $apps = array_values(array_filter($v['apps'] ?? [], static fn ($a): bool => !in_array($a, $siteApps, true)));
    if ($apps) {
        $path[] = implode(', ', array_map('an_app_name', $apps));
    }
    $works = [];
    foreach ($v['sites'] ?? [] as $s) {
        $works[$s] = (AN_PROJECT_RU[$s] ?? $s) . ' (сайт)';
    }
    foreach ($v['projects'] ?? [] as $p) {
        $works[$p] ??= AN_PROJECT_RU[$p] ?? $p;
    }
    if ($works) {
        $path[] = implode(', ', $works);
    }
    $via = ['header' => 'кнопка', 'frame' => 'рамка', 'desktop' => 'с компьютера', 'route' => 'ссылка'];
    if (($v['resume'] ?? []) !== []) {
        $path[] = 'лист резюме (' . implode(', ', array_map(static fn ($k) => $via[$k] ?? $k, $v['resume'])) . ')';
    }
    if (!empty($v['diploma'])) {
        $path[] = 'диплом';
    }
    if (isset($v['lang'])) {
        $path[] = 'язык → ' . strtoupper($v['lang']);
    }
    return implode(' · ', $head) . "\n" . ($path ? implode(' → ', $path) : 'посмотрел комнату');
}

$sessions = an_dir($cfg['state_dir'] . '/sessions');
$f = @fopen($sessions . '/' . $sid . '.json', 'c+');
if ($f === false) {
    exit;
}
// one lock per visit around the read, the message and the write: two beacons of one visit never send two messages
flock($f, LOCK_EX);
$visit = json_decode((string) stream_get_contents($f), true);
$visit = is_array($visit) ? $visit : ['first' => $now->getTimestamp()];
$ended = false;
foreach ($clean as $ev) {
    $visit = an_visit_apply($visit, $ev, $uaClass);
    $ended = $ended || $ev['n'] === 'visit_end';
}

$canSend = $cfg['dry_run'] || ((string) $cfg['tg_token'] !== '' && (string) $cfg['tg_chat_id'] !== '');
if ($ended && $cfg['notify'] && $canSend && (int) ($visit['end']['activeMs'] ?? 0) >= AN_MIN_ACTIVE_MS) {
    $text = an_visit_text($visit);
    $msg = $visit['msg'] ?? null;
    if (!is_array($msg)) {
        $id = an_send($cfg, $text);
        if ($id !== null) {
            $visit['msg'] = ['id' => $id, 'at' => $now->getTimestamp(), 'text' => $text];
        }
    } elseif ($text !== $msg['text'] && $now->getTimestamp() - (int) $msg['at'] <= AN_EDIT_WINDOW) {
        if (an_edit($cfg, (int) $msg['id'], $text)) {
            $visit['msg']['text'] = $text;
        }
    }
}

ftruncate($f, 0);
rewind($f);
fwrite($f, (string) json_encode($visit, AN_JSON));
fflush($f);
flock($f, LOCK_UN);
fclose($f);
