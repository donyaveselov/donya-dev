<?php
// The analytics' shared part, for collect.php (the events) and digest.php (the daily summary). PHP 8.0+, no Composer.
//
// The configuration lives OUTSIDE the site's folder, so the deploy (which mirrors dist/ into www/donya.dev) never
// touches it and the web never serves it: <home>/donya-private/analytics.php (deploy/analytics.sample.php is the
// template), or the file the DONYA_ANALYTICS_CONFIG environment variable names. The logs and the state (the day's
// salt, the rate counters, a small file per visit for its Telegram message) are next to it, in the same private
// folder.
//
// The event list mirrors SCHEMA in src/services/analytics.service.ts: an event or a prop that is not here is dropped.
//
// Privacy: the IP and the User-Agent are never stored. A visitor is sha256(daily salt . ip . ua)[:16], and the salt is
// replaced every day (Phuket time), so a visitor can be counted once a day but never followed from one day to the
// next. Of the User-Agent only a browser and an OS family are kept ("Chrome/Android").
declare(strict_types=1);

if (count(get_included_files()) === 1) {
    // opened directly: nothing to see (the .htaccess refuses it anyway)
    http_response_code(404);
    exit;
}

/** Phuket: the days, the salt and the digest go by its clock. */
const AN_TZ = 'Asia/Bangkok';
const AN_MAX_BODY = 4096;
const AN_MAX_EVENTS = 80;
const AN_ID_MAX = 32;
const AN_TEXT_MAX = 64;
/** per visitor: this many events per window (s) */
const AN_RATE_MAX = 120;
const AN_RATE_WINDOW = 600;
/** a later visit_end edits the visit's message for this long (s) after it was sent */
const AN_EDIT_WINDOW = 1800;
/** visits with less active time get no message */
const AN_MIN_ACTIVE_MS = 3000;
const AN_KEEP_LOG_DAYS = 180;

const AN_MILESTONES = ['tour', 'tour_done', 'pc', 'app', 'resume', 'project', 'site'];
const AN_LANGS = ['ru', 'en'];

/**
 * Every event and its props. A prop is 'id' (a slug), 'text' (short), 'int', 'bool', a list of allowed values, or
 * ['list' => allowed values] for a list of them.
 */
const AN_SCHEMA = [
    'visit_start' => [
        'route' => 'id',
        'hash' => 'id',
        'lang' => AN_LANGS,
        'blang' => 'id',
        'device' => ['phone', 'tablet', 'desktop'],
        'vp' => 'text',
        'ref' => 'text',
        'utm' => 'text',
    ],
    'tour_offer' => [],
    'tour_accept' => ['replay' => 'bool'],
    'tour_decline' => [],
    'tour_step' => ['step' => 'id'],
    'tour_skip' => ['step' => 'id'],
    'tour_complete' => [],
    'pc_enter' => ['screen' => ['left', 'right', 'flat']],
    'pc_exit' => ['how' => ['normal', 'shutdown']],
    'app_open' => ['app' => 'id'],
    'resume_open' => ['from' => ['header', 'frame', 'desktop', 'route']],
    'diploma_click' => [],
    'project_open' => ['id' => 'id'],
    'site_window_open' => ['site' => 'id'],
    'lang_switch' => ['to' => AN_LANGS],
    'visit_end' => ['activeMs' => 'int', 'totalMs' => 'int', 'maxDepth' => ['list' => AN_MILESTONES]],
];

/** Crawlers, link previews, headless browsers and scripts (an empty User-Agent counts too). */
const AN_BOT_UA = '~bot|crawl|spider|slurp|headless|lighthouse|pagespeed|prerender|phantom|selenium|puppeteer|playwright|preview|facebookexternalhit|embedly|curl|wget|python|go-http|java/|httpclient|okhttp|axios|node-fetch|scrapy|^$~i';

/* ---------- configuration ---------- */

function an_config_path(): string
{
    foreach (['DONYA_ANALYTICS_CONFIG', 'REDIRECT_DONYA_ANALYTICS_CONFIG'] as $name) {
        $v = function_exists('getenv') ? getenv($name) : false;
        if (!is_string($v) || $v === '') {
            $v = $_SERVER[$name] ?? '';
        }
        if (is_string($v) && $v !== '') {
            return $v;
        }
    }
    // <home>/www/donya.dev/api -> <home>
    return dirname(__DIR__, 3) . '/donya-private/analytics.php';
}

/** The configuration with its defaults, or null without a config file. */
function an_config(): ?array
{
    $path = an_config_path();
    if (!@is_file($path)) {
        return null;
    }
    $c = require $path;
    if (!is_array($c)) {
        return null;
    }
    $private = dirname($path);
    $c += [
        'enabled' => true,
        'tg_token' => '',
        'tg_chat_id' => '',
        'allowed_origins' => ['https://donya.dev', 'https://www.donya.dev'],
        'log_dir' => $private . '/logs',
        'state_dir' => $private . '/state',
        'notify' => true,
        'digest_hour' => 9,
        'digest_key' => '',
        'dry_run' => false,
    ];
    $c['log_dir'] = rtrim((string) $c['log_dir'], '/');
    $c['state_dir'] = rtrim((string) $c['state_dir'], '/');
    return $c;
}

function an_dir(string $path): string
{
    if (!is_dir($path)) {
        @mkdir($path, 0700, true);
    }
    return $path;
}

function an_now(): DateTimeImmutable
{
    return new DateTimeImmutable('now', new DateTimeZone(AN_TZ));
}

/* ---------- what an event may hold ---------- */

/** A string cut to $max characters (UTF-8), or null when it is not valid UTF-8. */
function an_cut(string $s, int $max): ?string
{
    if (preg_match('/^.{0,' . $max . '}/us', $s, $m) !== 1) {
        return null;
    }
    return $m[0];
}

/** One prop cleaned by its spec, or null when it does not fit. */
function an_clean(string|array $spec, mixed $v): mixed
{
    if ($spec === 'id') {
        return is_string($v) ? substr((string) preg_replace('/[^a-z0-9_.-]/', '', strtolower($v)), 0, AN_ID_MAX) : null;
    }
    if ($spec === 'text') {
        if (!is_string($v)) {
            return null;
        }
        $v = preg_replace('/[\p{Cc}\p{Cf}]/u', '', $v);
        return is_string($v) ? an_cut(trim($v), AN_TEXT_MAX) : null;
    }
    if ($spec === 'int') {
        if (!is_int($v) && !(is_float($v) && is_finite($v))) {
            return null;
        }
        return (int) max(0, min(1e9, round((float) $v)));
    }
    if ($spec === 'bool') {
        return is_bool($v) ? $v : null;
    }
    if (is_array($spec) && isset($spec['list'])) {
        if (!is_array($v)) {
            return null;
        }
        $out = [];
        foreach ($v as $x) {
            if (is_string($x) && in_array($x, $spec['list'], true) && !in_array($x, $out, true)) {
                $out[] = $x;
            }
        }
        return $out;
    }
    return is_string($v) && in_array($v, $spec, true) ? $v : null;
}

/** An event's props as the list allows them, or null for an event that is not in the list. */
function an_sanitize(mixed $event, mixed $props): ?array
{
    if (!is_string($event) || !array_key_exists($event, AN_SCHEMA)) {
        return null;
    }
    $props = is_array($props) ? $props : [];
    $out = [];
    foreach (AN_SCHEMA[$event] as $key => $spec) {
        if (!array_key_exists($key, $props)) {
            continue;
        }
        $v = an_clean($spec, $props[$key]);
        if ($v === null || $v === '' || $v === []) {
            continue;
        }
        $out[$key] = $v;
    }
    return $out;
}

/* ---------- the visitor ---------- */

function an_is_bot(string $ua): bool
{
    return preg_match(AN_BOT_UA, $ua) === 1;
}

/** "Chrome/Android": a browser family and an OS family, nothing finer. */
function an_ua_class(string $ua): string
{
    $os = match (true) {
        preg_match('/iPhone|iPad|iPod/', $ua) === 1 => 'iOS',
        str_contains($ua, 'Android') => 'Android',
        str_contains($ua, 'CrOS') => 'ChromeOS',
        str_contains($ua, 'Windows') => 'Windows',
        str_contains($ua, 'Macintosh') || str_contains($ua, 'Mac OS X') => 'macOS',
        str_contains($ua, 'Linux') => 'Linux',
        default => 'other',
    };
    $browser = match (true) {
        str_contains($ua, 'YaBrowser') => 'Yandex',
        str_contains($ua, 'Edg') => 'Edge',
        str_contains($ua, 'OPR/') || str_contains($ua, 'Opera') => 'Opera',
        str_contains($ua, 'SamsungBrowser') => 'Samsung',
        str_contains($ua, 'Firefox/') || str_contains($ua, 'FxiOS') => 'Firefox',
        str_contains($ua, 'Chrome/') || str_contains($ua, 'CriOS') => 'Chrome',
        str_contains($ua, 'Safari/') => 'Safari',
        default => 'other',
    };
    return $browser . '/' . $os;
}

/**
 * The client's address. Behind the host's nginx, Apache normally sees the visitor's address already; when it sees a
 * private one (the proxy), the proxy's X-Real-IP / X-Forwarded-For is taken. It is only ever hashed.
 */
function an_client_ip(): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    $public = static fn (string $a): bool => filter_var(
        $a,
        FILTER_VALIDATE_IP,
        FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
    ) !== false;
    if (!$public($ip)) {
        foreach (['HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR'] as $h) {
            $first = trim(explode(',', (string) ($_SERVER[$h] ?? ''))[0]);
            if ($first !== '' && filter_var($first, FILTER_VALIDATE_IP) !== false) {
                return $first;
            }
        }
    }
    return $ip;
}

/**
 * Today's salt: random, kept in the state folder, replaced (the old one is gone) when the Phuket day changes.
 */
function an_daily_salt(array $cfg, string $day): string
{
    $f = @fopen(an_dir($cfg['state_dir']) . '/salt.json', 'c+');
    if ($f === false) {
        // no state folder: a salt for this request only (visitors are then not counted reliably)
        return bin2hex(random_bytes(32));
    }
    flock($f, LOCK_EX);
    $saved = json_decode((string) stream_get_contents($f), true);
    if (is_array($saved) && ($saved['day'] ?? '') === $day && is_string($saved['salt'] ?? null)) {
        $salt = $saved['salt'];
    } else {
        $salt = bin2hex(random_bytes(32));
        ftruncate($f, 0);
        rewind($f);
        fwrite($f, (string) json_encode(['day' => $day, 'salt' => $salt]));
        fflush($f);
    }
    flock($f, LOCK_UN);
    fclose($f);
    return $salt;
}

function an_visitor(string $salt, string $ip, string $ua): string
{
    return substr(hash('sha256', $salt . $ip . $ua), 0, 16);
}

/** Counts $n events for a visitor; false once it is over AN_RATE_MAX in the window. */
function an_rate_ok(array $cfg, string $visitor, int $n, int $now): bool
{
    $f = @fopen(an_dir($cfg['state_dir'] . '/rate') . '/' . $visitor . '.json', 'c+');
    if ($f === false) {
        return true;
    }
    flock($f, LOCK_EX);
    $r = json_decode((string) stream_get_contents($f), true);
    if (!is_array($r) || !is_int($r['start'] ?? null) || $now - $r['start'] >= AN_RATE_WINDOW) {
        $r = ['start' => $now, 'n' => 0];
    }
    $r['n'] = (int) $r['n'] + $n;
    ftruncate($f, 0);
    rewind($f);
    fwrite($f, (string) json_encode($r));
    fflush($f);
    flock($f, LOCK_UN);
    fclose($f);
    return $r['n'] <= AN_RATE_MAX;
}

/* ---------- the log ---------- */

const AN_JSON = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

/** Appends lines to the day's JSONL file, under a lock. */
function an_log(array $cfg, string $day, array $lines): bool
{
    if (!$lines) {
        return true;
    }
    $text = '';
    foreach ($lines as $line) {
        $text .= json_encode($line, AN_JSON) . "\n";
    }
    $f = @fopen(an_dir($cfg['log_dir']) . '/' . $day . '.jsonl', 'a');
    if ($f === false) {
        return false;
    }
    flock($f, LOCK_EX);
    fwrite($f, $text);
    fflush($f);
    flock($f, LOCK_UN);
    fclose($f);
    return true;
}

/** The lines of a day's log, decoded (a broken line is skipped). */
function an_read_log(array $cfg, string $day): array
{
    $path = $cfg['log_dir'] . '/' . $day . '.jsonl';
    if (!is_file($path)) {
        return [];
    }
    $out = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $row = json_decode($line, true);
        if (is_array($row) && is_string($row['e'] ?? null)) {
            $out[] = $row;
        }
    }
    return $out;
}

/* ---------- Telegram ---------- */

/**
 * Calls the Bot API; the decoded reply when it says ok, else null. With dry_run nothing is sent: the call goes to
 * <log_dir>/telegram.log, and a fake message id comes back. The token is never written anywhere.
 */
function an_telegram(array $cfg, string $method, array $params): ?array
{
    if ($cfg['dry_run']) {
        $f = @fopen(an_dir($cfg['log_dir']) . '/telegram.log', 'a');
        if ($f !== false) {
            flock($f, LOCK_EX);
            fwrite($f, json_encode(['t' => an_now()->format(DATE_ATOM), 'method' => $method] + $params, AN_JSON) . "\n");
            flock($f, LOCK_UN);
            fclose($f);
        }
        return ['ok' => true, 'result' => ['message_id' => (int) ($params['message_id'] ?? random_int(1, 1 << 30))]];
    }
    if ($cfg['tg_token'] === '' || (string) $cfg['tg_chat_id'] === '') {
        return null;
    }
    $url = 'https://api.telegram.org/bot' . $cfg['tg_token'] . '/' . $method;
    $body = (string) json_encode($params, AN_JSON);
    $reply = false;
    if (function_exists('curl_init')) {
        $c = curl_init($url);
        curl_setopt_array($c, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 6,
        ]);
        $reply = curl_exec($c);
        curl_close($c);
    } else {
        $ctx = stream_context_create(['http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\n",
            'content' => $body,
            'timeout' => 6,
            'ignore_errors' => true,
        ]]);
        $reply = @file_get_contents($url, false, $ctx);
    }
    $json = is_string($reply) ? json_decode($reply, true) : null;
    return is_array($json) && ($json['ok'] ?? false) === true ? $json : null;
}

function an_send(array $cfg, string $text): ?int
{
    $r = an_telegram($cfg, 'sendMessage', [
        'chat_id' => $cfg['tg_chat_id'],
        'text' => $text,
        'link_preview_options' => ['is_disabled' => true],
    ]);
    $id = $r['result']['message_id'] ?? null;
    return is_int($id) ? $id : null;
}

function an_edit(array $cfg, int $messageId, string $text): bool
{
    return an_telegram($cfg, 'editMessageText', [
        'chat_id' => $cfg['tg_chat_id'],
        'message_id' => $messageId,
        'text' => $text,
        'link_preview_options' => ['is_disabled' => true],
    ]) !== null;
}

/* ---------- words for the messages ---------- */

const AN_DEVICE_RU = ['phone' => 'телефон', 'tablet' => 'планшет', 'desktop' => 'десктоп'];

const AN_APP_RU = [
    'projects' => 'Проекты',
    'resume' => 'Резюме',
    'about' => 'Мой компьютер',
    'contact' => 'Написать мне',
    'browser' => 'Навигатор',
    'terminal' => 'Командная строка',
    'notepad' => 'Блокнот',
    'calc' => 'Калькулятор',
    'paint' => 'Кисть',
    'minesweeper' => 'Сапёр',
    'recycle' => 'Корзина',
    'run' => 'Выполнить',
    'taskmgr' => 'Диспетчер задач',
    'display' => 'Свойства экрана',
    'project' => 'Проект',
    'wax' => 'Wax',
    'kompy-app' => 'Компи',
];

const AN_PROJECT_RU = ['verifikat' => 'Верификат', 'wax' => 'Wax', 'kompy' => 'Компи'];

const AN_STEP_RU = [
    'work' => 'работа',
    'play' => 'игры',
    'outside' => 'на улице',
    'sleep' => 'сон',
    'back' => 'сейчас',
    'projects' => 'проекты',
    'resume' => 'резюме',
    'diploma' => 'диплом',
    'place' => 'место',
    'end' => 'конец',
];

function an_app_name(string $id): string
{
    return AN_APP_RU[$id] ?? $id;
}

/** "3 мин 12 с", "45 с", "1 ч 05 мин". */
function an_duration(int $ms): string
{
    $s = intdiv(max(0, $ms) + 500, 1000);
    if ($s < 60) {
        return $s . ' с';
    }
    if ($s < 3600) {
        return intdiv($s, 60) . ' мин ' . ($s % 60) . ' с';
    }
    return intdiv($s, 3600) . ' ч ' . sprintf('%02d', intdiv($s % 3600, 60)) . ' мин';
}

/** "2:40", "1:02:03". */
function an_clock(int $ms): string
{
    $s = intdiv(max(0, $ms) + 500, 1000);
    if ($s >= 3600) {
        return sprintf('%d:%02d:%02d', intdiv($s, 3600), intdiv($s % 3600, 60), $s % 60);
    }
    return sprintf('%d:%02d', intdiv($s, 60), $s % 60);
}

/* ---------- housekeeping ---------- */

/** Removes logs older than AN_KEEP_LOG_DAYS, visit files older than two days, stale rate counters. */
function an_cleanup(array $cfg): int
{
    $removed = 0;
    $oldest = an_now()->modify('-' . AN_KEEP_LOG_DAYS . ' days')->format('Y-m-d');
    foreach (glob($cfg['log_dir'] . '/*.jsonl') ?: [] as $path) {
        $day = basename($path, '.jsonl');
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $day) === 1 && $day < $oldest && @unlink($path)) {
            $removed++;
        }
    }
    $now = time();
    foreach ([['sessions', 2 * 86400], ['rate', 86400]] as [$sub, $age]) {
        foreach (glob($cfg['state_dir'] . '/' . $sub . '/*.json') ?: [] as $path) {
            $m = @filemtime($path);
            if ($m !== false && $now - $m > $age && @unlink($path)) {
                $removed++;
            }
        }
    }
    return $removed;
}
