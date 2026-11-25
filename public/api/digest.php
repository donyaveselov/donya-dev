<?php
// The daily summary in Telegram, for a cron job: yesterday's visits (Phuket days), unique visitors, the median and
// average active time, where visitors came from, how many took the tour, sat at the PC and opened the resume, and the
// apps they opened. Then the housekeeping: logs older than 180 days and stale state files go.
//
// Run it every hour; it sends once a day, in the hour `digest_hour` (Phuket) of the config, whatever the server's
// time zone. Either from the command line (no key needed):
//   php ~/www/donya.dev/api/digest.php            [force] [day=2026-11-24] [print]
// or over HTTP with the config's `digest_key`:
//   https://donya.dev/api/digest.php?key=<digest_key>[&force=1][&day=2026-11-24][&print=1]
// force: send now, even outside the hour or a second time; day: summarise that day instead of yesterday; print: show
// the text and send nothing.
declare(strict_types=1);

require __DIR__ . '/analytics-lib.php';

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function an_done(int $status, string $text): void
{
    if (PHP_SAPI !== 'cli') {
        http_response_code($status);
    }
    echo $text, "\n";
    exit($status >= 400 ? 1 : 0);
}

$cli = PHP_SAPI === 'cli';
$args = $_GET;
if ($cli) {
    foreach (array_slice($argv ?? [], 1) as $a) {
        [$k, $v] = array_pad(explode('=', (string) $a, 2), 2, '1');
        $args[$k] = $v;
    }
}

$cfg = an_config();
if ($cfg === null) {
    an_done(503, 'no config: see deploy/analytics.sample.php');
}
if (!$cli) {
    $key = (string) $cfg['digest_key'];
    if ($key === '' || !hash_equals($key, (string) ($args['key'] ?? ''))) {
        an_done(403, 'forbidden');
    }
}
$force = !empty($args['force']);
$print = !empty($args['print']);

$now = an_now();
$day = (string) ($args['day'] ?? $now->modify('-1 day')->format('Y-m-d'));
if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $day) !== 1) {
    an_done(400, 'day: YYYY-MM-DD');
}
$stamp = an_dir($cfg['state_dir']) . '/digest-last.txt';
if (!$force && !$print) {
    if ((int) $now->format('G') !== (int) $cfg['digest_hour']) {
        an_done(200, 'not the hour: ' . $now->format('H:i') . ' in Phuket, the digest goes at ' . (int) $cfg['digest_hour'] . ':00');
    }
    if (trim((string) @file_get_contents($stamp)) === $day) {
        an_done(200, 'already sent for ' . $day);
    }
}

/** The day's numbers, from its log. */
function an_digest(array $rows): array
{
    $visits = [];
    $visitors = [];
    foreach ($rows as $r) {
        $s = (string) ($r['s'] ?? '');
        $p = is_array($r['p'] ?? null) ? $r['p'] : [];
        $visitors[(string) ($r['v'] ?? '')] = true;
        $v = $visits[$s] ?? ['active' => null, 'ref' => null, 'device' => null, 'tour' => false, 'pc' => false, 'resume' => false, 'apps' => []];
        switch ($r['e']) {
            case 'visit_start':
                $v['ref'] ??= (string) ($p['ref'] ?? 'direct');
                $v['device'] ??= (string) ($p['device'] ?? '');
                break;
            case 'visit_end':
                $v['active'] = max((int) ($v['active'] ?? 0), (int) ($p['activeMs'] ?? 0));
                break;
            case 'tour_accept':
                $v['tour'] = true;
                break;
            case 'pc_enter':
                $v['pc'] = true;
                break;
            case 'resume_open':
                $v['resume'] = true;
                break;
            case 'app_open':
                $app = (string) ($p['app'] ?? '');
                if ($app === 'resume') {
                    $v['resume'] = true;
                }
                if ($app !== '') {
                    $v['apps'][$app] = true;
                }
                break;
        }
        $visits[$s] = $v;
    }
    $times = [];
    $refs = [];
    $devices = [];
    $apps = [];
    $tour = $pc = $resume = 0;
    foreach ($visits as $v) {
        if ($v['active'] !== null) {
            $times[] = $v['active'];
        }
        if ($v['ref'] !== null) {
            $refs[$v['ref']] = ($refs[$v['ref']] ?? 0) + 1;
        }
        if ($v['device']) {
            $devices[$v['device']] = ($devices[$v['device']] ?? 0) + 1;
        }
        foreach (array_keys($v['apps']) as $a) {
            $apps[$a] = ($apps[$a] ?? 0) + 1;
        }
        $tour += (int) $v['tour'];
        $pc += (int) $v['pc'];
        $resume += (int) $v['resume'];
    }
    sort($times);
    $n = count($times);
    $median = $n === 0 ? 0 : ($n % 2 ? $times[intdiv($n, 2)] : intdiv($times[intdiv($n, 2) - 1] + $times[intdiv($n, 2)], 2));
    arsort($refs);
    arsort($devices);
    arsort($apps);
    return [
        'visits' => count($visits),
        'visitors' => count($visitors),
        'median' => $median,
        'average' => $n ? intdiv(array_sum($times), $n) : 0,
        'refs' => array_slice($refs, 0, 5, true),
        'devices' => $devices,
        'tour' => $tour,
        'pc' => $pc,
        'resume' => $resume,
        'apps' => array_slice($apps, 0, 5, true),
    ];
}

function an_digest_text(string $day, array $d): string
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $day);
    $title = '📊 Сводка за ' . ($date ? $date->format('d.m.Y') : $day);
    if ($d['visits'] === 0) {
        return $title . ': визитов не было';
    }
    $share = static fn (int $k): string => (int) round(100 * $k / $d['visits']) . '%';
    $list = static function (array $counts, callable $name): string {
        $out = [];
        foreach ($counts as $k => $n) {
            $out[] = $name((string) $k) . ' ' . $n;
        }
        return implode(', ', $out);
    };
    $lines = [
        $title,
        'Визитов: ' . $d['visits'] . ' · уникальных посетителей: ' . $d['visitors'],
        'Активное время: медиана ' . an_clock($d['median']) . ', среднее ' . an_clock($d['average']),
    ];
    if ($d['refs']) {
        $lines[] = 'Откуда: ' . $list($d['refs'], static fn ($r) => $r === 'direct' ? 'напрямую' : $r);
    }
    if ($d['devices']) {
        $lines[] = 'Устройства: ' . $list($d['devices'], static fn ($k) => AN_DEVICE_RU[$k] ?? $k);
    }
    $lines[] = 'Экскурсия ' . $share($d['tour']) . ' · компьютер ' . $share($d['pc']) . ' · резюме ' . $share($d['resume']);
    if ($d['apps']) {
        $lines[] = 'Приложения: ' . $list($d['apps'], 'an_app_name');
    }
    return implode("\n", $lines);
}

$text = an_digest_text($day, an_digest(an_read_log($cfg, $day)));
if ($print) {
    an_done(200, $text);
}
$canSend = $cfg['dry_run'] || ((string) $cfg['tg_token'] !== '' && (string) $cfg['tg_chat_id'] !== '');
if (!$canSend) {
    an_done(503, "no tg_token / tg_chat_id in the config\n\n" . $text);
}
if (an_send($cfg, $text) === null) {
    an_done(502, "Telegram did not take the message\n\n" . $text);
}
@file_put_contents($stamp, $day);
$removed = an_cleanup($cfg);
an_done(200, $text . "\n\n(sent; " . $removed . ' old files removed)');
