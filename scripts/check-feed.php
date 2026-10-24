<?php

require dirname(__DIR__) . '/server/lib/feed.php';

$failed = 0;
function expect($label, $condition) {
    global $failed;
    if (!$condition) {
        fwrite(STDERR, "fail: {$label}\n");
        $failed++;
    }
}

$now = strtotime('2026-10-24T12:00:00Z');
$live = [['apiStatus' => '2H', 'kickoffAt' => '2026-10-24T11:00:00Z']];
$later = [['apiStatus' => 'NS', 'kickoffAt' => '2026-10-24T20:00:00Z']];
$soon = [['apiStatus' => 'NS', 'kickoffAt' => '2026-10-24T12:30:00Z']];
$finished = [['apiStatus' => 'FT', 'kickoffAt' => '2026-10-24T08:00:00Z']];
$staleLive = [['apiStatus' => '2H', 'kickoffAt' => '2026-10-24T08:00:00Z']];
$quota = [
    'apiCallDate' => '2026-10-24',
    'apiCallCount' => 85,
    'rateLimitRemaining' => 40,
];

expect('daily limit', football_quota_block($quota, $now) === 'daily-limit');
expect('remaining floor', football_quota_block([
    'apiCallDate' => '2026-10-24',
    'apiCallCount' => 10,
    'rateLimitRemaining' => 15,
], $now) === 'rate-remaining');
expect('live window waits', football_date_block('today', $live, $now - 899, $now) === 'interval');
expect('live window allows', football_date_block('today', $live, $now - 900, $now) === '');
expect('stale live is not 15 min', football_date_block('today', $staleLive, $now - 900, $now) === 'interval');
expect('soon uses 30 min', football_date_block('today', $soon, $now - 1799, $now) === 'interval');
expect('later uses 60 min', football_date_block('today', $later, $now - 3599, $now) === 'interval');
expect('quiet uses 2 hours', football_date_block('today', $finished, $now - 7199, $now) === 'interval');
expect('yesterday uses 6 hours', football_date_block('prev', $finished, $now - 21599, $now) === 'interval');
expect('yesterday allows after 6 hours', football_date_block('prev', $finished, $now - 21600, $now) === '');
expect('date query', football_fixtures_url('2026-10-24') === 'https://v3.football.api-sports.io/fixtures?date=2026-10-24&timezone=UTC');
expect('no from/to query', !str_contains(football_fixtures_url('2026-10-24'), 'from=') && !str_contains(football_fixtures_url('2026-10-24'), 'to='));

$merged = football_merge_fixtures([
    [['id' => 1, 'homeTeam' => 'A'], ['id' => 2, 'homeTeam' => 'B']],
    [['id' => 2, 'homeTeam' => 'B2'], ['id' => 3, 'homeTeam' => 'C']],
]);
expect('dedupe by id', count($merged) === 3 && $merged[1]['homeTeam'] === 'B2');

$normalized = football_normalize_fixture([
    'fixture' => ['id' => 9, 'date' => '2026-10-24T14:00:00+00:00', 'status' => ['short' => '2H', 'elapsed' => 74, 'extra' => null]],
    'league' => ['id' => 39, 'name' => 'Premier League', 'country' => 'England', 'logo' => 'https://media.example/league.png'],
    'teams' => [
        'home' => ['id' => 42, 'name' => 'Arsenal', 'logo' => 'https://media.example/arsenal.png'],
        'away' => ['id' => 49, 'name' => 'Chelsea', 'logo' => 'https://media.example/chelsea.png'],
    ],
    'goals' => ['home' => 2, 'away' => 1],
]);
expect('normalize', $normalized && $normalized['homeLogo'] === 'https://media.example/arsenal.png' && $normalized['elapsed'] === 74 && !array_key_exists('source', $normalized));
expect('exclude cancelled', football_normalize_fixture([
    'fixture' => ['id' => 10, 'date' => '2026-10-24T14:00:00+00:00', 'status' => ['short' => 'CANC']],
    'league' => [],
    'teams' => ['home' => ['name' => 'A'], 'away' => ['name' => 'B']],
    'goals' => [],
]) === null);

$target = football_data_path('atomic-check.json');
$original = "{\"updatedAt\":null,\"fixtures\":[]}\n";
file_put_contents($target, $original);
expect('atomic keeps replacement', football_atomic_write($target, "{\"ok\":true}\n") && file_get_contents($target) === "{\"ok\":true}\n");
@unlink($target);

if ($failed) {
    fwrite(STDERR, "feed checks failed: {$failed}\n");
    exit(1);
}
fwrite(STDOUT, "feed checks ok\n");
