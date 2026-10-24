<?php

const FOOTBALL_DAILY_LIMIT = 85;
const FOOTBALL_REMAINING_FLOOR = 15;
const FOOTBALL_TIMEOUT_SECONDS = 10;

const FOOTBALL_LIVE_STATUSES = ['1H', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE', 'HT'];
const FOOTBALL_EXCLUDED_STATUSES = ['PST', 'CANC', 'ABD', 'AWD', 'WO'];

function football_root(): string
{
    return dirname(__DIR__);
}

function football_data_path(string $name): string
{
    return football_root() . '/data/' . $name;
}

function football_api_key(): string
{
    $env = getenv('API_FOOTBALL_KEY');
    if (is_string($env) && $env !== '') {
        return $env;
    }
    $path = football_root() . '/config/config.php';
    if (!is_file($path)) {
        return '';
    }
    $config = require $path;
    if (is_array($config) && !empty($config['api_football_key'])) {
        return (string) $config['api_football_key'];
    }
    return '';
}

function football_default_meta(): array
{
    return [
        'lastSuccessAt' => 0,
        'lastAttemptAt' => 0,
        'apiCallDate' => '',
        'apiCallCount' => 0,
        'rateLimitRemaining' => null,
        'hasLiveMatches' => false,
        'nextKickoffAt' => null,
        'dates' => [],
    ];
}

function football_read_json(string $path): ?array
{
    if (!is_file($path)) {
        return null;
    }
    $raw = file_get_contents($path);
    if (!is_string($raw) || $raw === '') {
        return null;
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : null;
}

function football_read_meta(): array
{
    $meta = football_read_json(football_data_path('meta.json'));
    return array_merge(football_default_meta(), is_array($meta) ? $meta : []);
}

function football_read_fixtures(): array
{
    $payload = football_read_json(football_data_path('fixtures.json'));
    if (!is_array($payload) || !isset($payload['fixtures']) || !is_array($payload['fixtures'])) {
        return [];
    }
    return $payload['fixtures'];
}

function football_atomic_write(string $path, string $contents): bool
{
    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
        return false;
    }
    $tmp = $path . '.tmp';
    if (file_put_contents($tmp, $contents, LOCK_EX) === false) {
        return false;
    }
    if (!is_file($path) && rename($tmp, $path)) {
        return true;
    }
    if (@rename($tmp, $path)) {
        return true;
    }
    $backup = $path . '.bak';
    if (!@rename($path, $backup)) {
        @unlink($tmp);
        return false;
    }
    if (!@rename($tmp, $path)) {
        @rename($backup, $path);
        @unlink($tmp);
        return false;
    }
    @unlink($backup);
    return true;
}

function football_write_json(string $path, array $payload): bool
{
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if (!is_string($json)) {
        return false;
    }
    return football_atomic_write($path, $json . "\n");
}

function football_errors_present(mixed $errors): bool
{
    if ($errors === null || $errors === '' || $errors === []) {
        return false;
    }
    if (is_array($errors)) {
        return count($errors) > 0;
    }
    return true;
}

function football_normalize_fixture(array $fixture): ?array
{
    $info = $fixture['fixture'] ?? null;
    if (!is_array($info) || empty($info['id'])) {
        return null;
    }
    $status = $info['status']['short'] ?? '';
    if (!is_string($status) || in_array($status, FOOTBALL_EXCLUDED_STATUSES, true)) {
        return null;
    }
    $league = is_array($fixture['league'] ?? null) ? $fixture['league'] : [];
    $teams = is_array($fixture['teams'] ?? null) ? $fixture['teams'] : [];
    $home = is_array($teams['home'] ?? null) ? $teams['home'] : [];
    $away = is_array($teams['away'] ?? null) ? $teams['away'] : [];
    $goals = is_array($fixture['goals'] ?? null) ? $fixture['goals'] : [];
    $elapsed = $info['status']['elapsed'] ?? null;
    $extra = $info['status']['extra'] ?? null;

    return [
        'id' => $info['id'],
        'leagueId' => $league['id'] ?? null,
        'league' => (string) ($league['name'] ?? ''),
        'leagueLogo' => (string) ($league['logo'] ?? ''),
        'country' => (string) ($league['country'] ?? ''),
        'homeTeam' => (string) ($home['name'] ?? ''),
        'homeTeamId' => $home['id'] ?? null,
        'homeLogo' => (string) ($home['logo'] ?? ''),
        'awayTeam' => (string) ($away['name'] ?? ''),
        'awayTeamId' => $away['id'] ?? null,
        'awayLogo' => (string) ($away['logo'] ?? ''),
        'homeScore' => array_key_exists('home', $goals) ? $goals['home'] : null,
        'awayScore' => array_key_exists('away', $goals) ? $goals['away'] : null,
        'apiStatus' => $status,
        'elapsed' => is_numeric($elapsed) ? (int) $elapsed : null,
        'extra' => is_numeric($extra) ? (int) $extra : null,
        'kickoffAt' => (string) ($info['date'] ?? ''),
    ];
}

function football_schedule_state(array $fixtures, int $now): array
{
    $hasLive = false;
    $next = null;
    $hasToday = false;
    $utcToday = gmdate('Y-m-d', $now);
    foreach ($fixtures as $fixture) {
        if (!is_array($fixture)) {
            continue;
        }
        $status = (string) ($fixture['apiStatus'] ?? '');
        if (in_array($status, FOOTBALL_LIVE_STATUSES, true)) {
            $hasLive = true;
        }
        $kick = strtotime((string) ($fixture['kickoffAt'] ?? ''));
        if (!$kick) {
            continue;
        }
        if (gmdate('Y-m-d', $kick) === $utcToday) {
            $hasToday = true;
        }
        if ($kick >= $now && ($next === null || $kick < $next)) {
            $next = $kick;
        }
    }
    return ['hasLive' => $hasLive, 'hasToday' => $hasToday, 'next' => $next];
}

function football_window(int $now): array
{
    return [
        'prev' => gmdate('Y-m-d', $now - 86400),
        'today' => gmdate('Y-m-d', $now),
        'next' => gmdate('Y-m-d', $now + 86400),
    ];
}

function football_slot_file(string $role): string
{
    if ($role === 'prev') {
        return 'fixtures-prev.json';
    }
    if ($role === 'next') {
        return 'fixtures-next.json';
    }
    return 'fixtures-today.json';
}

function football_fixtures_url(string $date): string
{
    return 'https://v3.football.api-sports.io/fixtures?date=' . rawurlencode($date) . '&timezone=UTC';
}

function football_in_active_window(int $kickoff, int $now): bool
{
    return $now >= ($kickoff - 1800) && $now <= ($kickoff + 10800);
}

function football_today_interval(array $fixtures, int $now): int
{
    $liveInWindow = false;
    $nextKickoff = null;
    $hasFuture = false;
    foreach ($fixtures as $fixture) {
        if (!is_array($fixture)) {
            continue;
        }
        $kickoff = strtotime((string) ($fixture['kickoffAt'] ?? ''));
        if (!$kickoff) {
            continue;
        }
        $status = (string) ($fixture['apiStatus'] ?? '');
        if (football_in_active_window($kickoff, $now) && in_array($status, FOOTBALL_LIVE_STATUSES, true)) {
            $liveInWindow = true;
        }
        if ($kickoff > $now) {
            $hasFuture = true;
            if ($nextKickoff === null || $kickoff < $nextKickoff) {
                $nextKickoff = $kickoff;
            }
        }
    }
    if ($liveInWindow) {
        return 900;
    }
    if ($nextKickoff !== null && ($nextKickoff - $now) <= 7200) {
        return 1800;
    }
    if ($hasFuture) {
        return 3600;
    }
    return 7200;
}

function football_quota_block(array $meta, int $now): string
{
    $today = gmdate('Y-m-d', $now);
    $count = (($meta['apiCallDate'] ?? '') === $today) ? (int) ($meta['apiCallCount'] ?? 0) : 0;
    if ($count >= FOOTBALL_DAILY_LIMIT) {
        return 'daily-limit';
    }
    $remaining = $meta['rateLimitRemaining'] ?? null;
    if (($meta['apiCallDate'] ?? '') === $today && $remaining !== null && (int) $remaining <= FOOTBALL_REMAINING_FLOOR) {
        return 'rate-remaining';
    }
    return '';
}

function football_date_block(string $role, array $fixtures, int $lastSuccessAt, int $now): string
{
    if ($lastSuccessAt <= 0) {
        return '';
    }
    $need = $role === 'today' ? football_today_interval($fixtures, $now) : 21600;
    return ($now - $lastSuccessAt) >= $need ? '' : 'interval';
}

function football_log_api_errors(array $payload): void
{
    if (!football_errors_present($payload['errors'] ?? null)) {
        return;
    }
    $encoded = json_encode($payload['errors'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    error_log('HOXF football API errors: ' . (is_string($encoded) ? $encoded : '[]'));
}

function football_request(string $key, string $date): array
{
    $headers = [];
    $ch = curl_init(football_fixtures_url($date));
    curl_setopt_array($ch, [
        CURLOPT_HTTPGET => true,
        CURLOPT_HTTPHEADER => ['x-apisports-key: ' . $key],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => FOOTBALL_TIMEOUT_SECONDS,
        CURLOPT_HEADERFUNCTION => static function ($curl, $header) use (&$headers) {
            $parts = explode(':', $header, 2);
            if (count($parts) === 2) {
                $headers[strtolower(trim($parts[0]))] = trim($parts[1]);
            }
            return strlen($header);
        },
    ]);
    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $remaining = $headers['x-ratelimit-requests-remaining'] ?? $headers['x-ratelimit-remaining'] ?? null;
    $payload = is_string($body) ? json_decode($body, true) : null;
    if (is_array($payload)) {
        football_log_api_errors($payload);
    }
    if ($errno === CURLE_OPERATION_TIMEDOUT) {
        return ['ok' => false, 'code' => 'timeout', 'status' => $status, 'remaining' => $remaining];
    }
    if ($body === false || $errno !== 0) {
        return ['ok' => false, 'code' => 'network', 'status' => $status, 'remaining' => $remaining];
    }
    if ($status === 429) {
        return ['ok' => false, 'code' => 'rate-limit', 'status' => $status, 'remaining' => $remaining];
    }
    if ($status < 200 || $status >= 300) {
        return ['ok' => false, 'code' => 'http', 'status' => $status, 'remaining' => $remaining];
    }
    if (!is_array($payload) || football_errors_present($payload['errors'] ?? null) || !isset($payload['response']) || !is_array($payload['response'])) {
        return ['ok' => false, 'code' => 'invalid', 'status' => $status, 'remaining' => $remaining];
    }
    $fixtures = [];
    foreach ($payload['response'] as $fixture) {
        if (!is_array($fixture)) {
            continue;
        }
        $normalized = football_normalize_fixture($fixture);
        if ($normalized !== null && $normalized['homeTeam'] !== '' && $normalized['awayTeam'] !== '') {
            $fixtures[] = $normalized;
        }
    }
    return ['ok' => true, 'code' => 'ok', 'status' => $status, 'remaining' => $remaining, 'fixtures' => $fixtures];
}

function football_load_dated_caches(): array
{
    $byDate = [];
    foreach (['fixtures-prev.json', 'fixtures-today.json', 'fixtures-next.json'] as $name) {
        $payload = football_read_json(football_data_path($name));
        if (!is_array($payload)) {
            continue;
        }
        $date = (string) ($payload['date'] ?? '');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !isset($payload['fixtures']) || !is_array($payload['fixtures'])) {
            continue;
        }
        $byDate[$date] = [
            'date' => $date,
            'updatedAt' => $payload['updatedAt'] ?? null,
            'fixtures' => $payload['fixtures'],
        ];
    }
    return $byDate;
}

function football_merge_fixtures(array $groups): array
{
    $byId = [];
    foreach ($groups as $fixtures) {
        if (!is_array($fixtures)) {
            continue;
        }
        foreach ($fixtures as $fixture) {
            if (!is_array($fixture) || !isset($fixture['id']) || $fixture['id'] === '') {
                continue;
            }
            $byId[(string) $fixture['id']] = $fixture;
        }
    }
    return array_values($byId);
}

function football_kickoff_date(array $fixture): string
{
    $kickoff = strtotime((string) ($fixture['kickoffAt'] ?? ''));
    return $kickoff ? gmdate('Y-m-d', $kickoff) : '';
}

function football_publish(array $byDate, array $window): bool
{
    foreach (['prev', 'today', 'next'] as $role) {
        $date = $window[$role];
        if (!isset($byDate[$date])) {
            continue;
        }
        if (!football_write_json(football_data_path(football_slot_file($role)), $byDate[$date])) {
            error_log('HOXF football: failed to write ' . football_slot_file($role));
            return false;
        }
    }

    $covered = [];
    foreach (['prev', 'today', 'next'] as $role) {
        if (isset($byDate[$window[$role]])) {
            $covered[$window[$role]] = true;
        }
    }
    if (!$covered) {
        return true;
    }

    $existingPath = football_data_path('fixtures.json');
    $existing = football_read_json($existingPath);
    $existingFixtures = (is_array($existing) && isset($existing['fixtures']) && is_array($existing['fixtures']))
        ? $existing['fixtures']
        : [];
    $windowDates = array_fill_keys(array_values($window), true);
    $groups = [];
    $retained = [];
    foreach ($existingFixtures as $fixture) {
        if (!is_array($fixture)) {
            continue;
        }
        $date = football_kickoff_date($fixture);
        if ($date === '' || !isset($windowDates[$date]) || isset($covered[$date])) {
            continue;
        }
        $retained[] = $fixture;
    }
    if ($retained) {
        $groups[] = $retained;
    }
    foreach (['prev', 'today', 'next'] as $role) {
        $date = $window[$role];
        if (isset($byDate[$date])) {
            $groups[] = $byDate[$date]['fixtures'];
        }
    }

    $latest = 0;
    if (is_array($existing) && !empty($existing['updatedAt'])) {
        $parsed = strtotime((string) $existing['updatedAt']);
        if ($parsed) {
            $latest = $parsed;
        }
    }
    foreach (['prev', 'today', 'next'] as $role) {
        $entry = $byDate[$window[$role]] ?? null;
        $stamp = is_array($entry) ? ($entry['updatedAt'] ?? null) : null;
        $parsed = is_string($stamp) ? strtotime($stamp) : false;
        if ($parsed && $parsed > $latest) {
            $latest = $parsed;
        }
    }

    $saved = football_write_json($existingPath, [
        'updatedAt' => $latest ? gmdate('c', $latest) : null,
        'fixtures' => football_merge_fixtures($groups),
    ]);
    if (!$saved) {
        error_log('HOXF football: failed to write fixtures.json');
    }
    return $saved;
}

function football_refresh(string $key, int $now): string
{
    $meta = football_read_meta();
    $today = gmdate('Y-m-d', $now);
    if (($meta['apiCallDate'] ?? '') !== $today) {
        $meta['apiCallDate'] = $today;
        $meta['apiCallCount'] = 0;
        $meta['rateLimitRemaining'] = null;
    }
    if (!isset($meta['dates']) || !is_array($meta['dates'])) {
        $meta['dates'] = [];
    }

    $window = football_window($now);
    $byDate = football_load_dated_caches();
    $updated = 0;
    $failed = [];
    $blocked = '';
    $fresh = [];

    foreach (['today', 'next', 'prev'] as $role) {
        $date = $window[$role];
        $quota = football_quota_block($meta, $now);
        if ($quota !== '') {
            $blocked = $quota;
            break;
        }
        $known = $byDate[$date] ?? null;
        $fixtures = is_array($known) ? $known['fixtures'] : [];
        $dateMeta = $meta['dates'][$date] ?? null;
        $last = is_array($dateMeta) ? (int) ($dateMeta['lastSuccessAt'] ?? 0) : 0;
        if ($last <= 0 && is_array($known) && !empty($known['updatedAt'])) {
            $parsed = strtotime((string) $known['updatedAt']);
            if ($parsed) {
                $last = $parsed;
            }
        }
        if (football_date_block($role, $fixtures, $last, $now) === 'interval') {
            continue;
        }

        $meta['lastAttemptAt'] = $now;
        $response = football_request($key, $date);
        $meta['apiCallCount'] = (int) $meta['apiCallCount'] + 1;
        if ($response['remaining'] !== null && is_numeric($response['remaining'])) {
            $meta['rateLimitRemaining'] = (int) $response['remaining'];
        }
        if (!$response['ok']) {
            error_log('HOXF football: request failed (' . $response['code'] . ') date=' . $date);
            $failed[] = $response['code'];
            continue;
        }
        $byDate[$date] = [
            'date' => $date,
            'updatedAt' => gmdate('c', $now),
            'fixtures' => $response['fixtures'],
        ];
        $fresh[$date] = $now;
        $updated++;
    }

    $keep = array_fill_keys(array_values($window), true);
    foreach (array_keys($meta['dates']) as $date) {
        if (!isset($keep[$date])) {
            unset($meta['dates'][$date]);
        }
    }

    $stored = football_publish($byDate, $window);
    if ($stored) {
        foreach ($fresh as $date => $stamp) {
            $current = $meta['dates'][$date] ?? [];
            if (!is_array($current)) {
                $current = [];
            }
            $current['lastSuccessAt'] = $stamp;
            $meta['dates'][$date] = $current;
        }
        $stamps = [(int) ($meta['lastSuccessAt'] ?? 0)];
        foreach ($window as $date) {
            $dateMeta = $meta['dates'][$date] ?? null;
            $stamps[] = is_array($dateMeta) ? (int) ($dateMeta['lastSuccessAt'] ?? 0) : 0;
        }
        $meta['lastSuccessAt'] = max($stamps);
    }

    $todayEntry = $byDate[$window['today']] ?? null;
    $todayFixtures = is_array($todayEntry) ? ($todayEntry['fixtures'] ?? []) : [];
    $state = football_schedule_state(is_array($todayFixtures) ? $todayFixtures : [], $now);
    $meta['hasLiveMatches'] = $state['hasLive'];
    $meta['nextKickoffAt'] = $state['next'] ? gmdate('c', $state['next']) : null;
    football_write_json(football_data_path('meta.json'), $meta);

    if (!$stored) {
        return 'write-failed';
    }
    if ($updated > 0) {
        return 'updated';
    }
    if ($failed) {
        return $failed[0];
    }
    if ($blocked !== '') {
        return $blocked;
    }
    return 'interval';
}

function football_update(int $now = 0): string
{
    $now = $now > 0 ? $now : time();
    $lockPath = football_data_path('update.lock');
    $directory = dirname($lockPath);
    if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
        error_log('HOXF football: data directory is not writable');
        return 'error';
    }
    $lock = fopen($lockPath, 'c');
    if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
        if (is_resource($lock)) {
            fclose($lock);
        }
        return 'locked';
    }

    $result = 'error';
    try {
        $key = football_api_key();
        if ($key === '') {
            error_log('HOXF football: API_FOOTBALL_KEY is missing');
            $result = 'missing-key';
        } else {
            $result = football_refresh($key, $now);
        }
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
    return $result;
}
