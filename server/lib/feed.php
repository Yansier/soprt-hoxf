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

function football_should_request(array $meta, array $fixtures, int $now): string
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
    $last = (int) ($meta['lastSuccessAt'] ?? 0);
    if ($last <= 0) {
        return '';
    }
    $elapsed = $now - $last;
    $state = football_schedule_state($fixtures, $now);
    if ($state['hasLive']) {
        return $elapsed >= 600 ? '' : 'interval';
    }
    if ($state['next'] !== null && ($state['next'] - $now) <= 3600) {
        return $elapsed >= 1200 ? '' : 'interval';
    }
    if ($state['hasToday']) {
        return $elapsed >= 1800 ? '' : 'interval';
    }
    return $elapsed >= 3600 ? '' : 'interval';
}

function football_request(string $key, int $now): array
{
    $from = gmdate('Y-m-d', $now - 86400);
    $to = gmdate('Y-m-d', $now + 86400);
    $url = 'https://v3.football.api-sports.io/fixtures?from=' . rawurlencode($from) . '&to=' . rawurlencode($to) . '&timezone=UTC';
    $headers = [];
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_HTTPGET => true,
        CURLOPT_HTTPHEADER => ['x-apisports-key: ' . $key, 'Accept: application/json'],
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
    $payload = json_decode($body, true);
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
            $meta = football_read_meta();
            $existing = football_read_fixtures();
            $reason = football_should_request($meta, $existing, $now);
            if ($reason !== '') {
                $result = $reason;
            } else {
                $meta['lastAttemptAt'] = $now;
                $today = gmdate('Y-m-d', $now);
                if (($meta['apiCallDate'] ?? '') !== $today) {
                    $meta['apiCallDate'] = $today;
                    $meta['apiCallCount'] = 0;
                    $meta['rateLimitRemaining'] = null;
                }
                $response = football_request($key, $now);
                $meta['apiCallCount'] = (int) $meta['apiCallCount'] + 1;
                if ($response['remaining'] !== null && is_numeric($response['remaining'])) {
                    $meta['rateLimitRemaining'] = (int) $response['remaining'];
                }
                if (!$response['ok']) {
                    error_log('HOXF football: request failed (' . $response['code'] . ')');
                    football_write_json(football_data_path('meta.json'), $meta);
                    $result = $response['code'];
                } else {
                    $state = football_schedule_state($response['fixtures'], $now);
                    $meta['lastSuccessAt'] = $now;
                    $meta['hasLiveMatches'] = $state['hasLive'];
                    $meta['nextKickoffAt'] = $state['next'] ? gmdate('c', $state['next']) : null;
                    $saved = football_write_json(football_data_path('fixtures.json'), [
                        'updatedAt' => gmdate('c', $now),
                        'fixtures' => $response['fixtures'],
                    ]);
                    football_write_json(football_data_path('meta.json'), $meta);
                    $result = $saved ? 'updated' : 'write-failed';
                    if (!$saved) {
                        error_log('HOXF football: failed to write fixtures.json');
                    }
                }
            }
        }
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
    return $result;
}
