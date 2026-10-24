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
$none = [['apiStatus' => 'FT', 'kickoffAt' => '2026-10-22T12:00:00Z']];

expect('daily limit', football_should_request([
    'apiCallDate' => '2026-10-24',
    'apiCallCount' => 85,
    'rateLimitRemaining' => 40,
    'lastSuccessAt' => $now - 7200,
], $live, $now) === 'daily-limit');

expect('remaining floor', football_should_request([
    'apiCallDate' => '2026-10-24',
    'apiCallCount' => 10,
    'rateLimitRemaining' => 15,
    'lastSuccessAt' => $now - 7200,
], $live, $now) === 'rate-remaining');

expect('live waits', football_should_request([
    'apiCallDate' => '2026-10-24',
    'apiCallCount' => 1,
    'rateLimitRemaining' => 80,
    'lastSuccessAt' => $now - 300,
], $live, $now) === 'interval');

expect('live allows', football_should_request([
    'apiCallDate' => '2026-10-24',
    'apiCallCount' => 1,
    'rateLimitRemaining' => 80,
    'lastSuccessAt' => $now - 600,
], $live, $now) === '');

expect('soon uses 20 min', football_should_request([
    'apiCallDate' => '2026-10-24',
    'apiCallCount' => 1,
    'rateLimitRemaining' => 80,
    'lastSuccessAt' => $now - 1199,
], $soon, $now) === 'interval');

expect('today uses 30 min', football_should_request([
    'apiCallDate' => '2026-10-24',
    'apiCallCount' => 1,
    'rateLimitRemaining' => 80,
    'lastSuccessAt' => $now - 1799,
], $later, $now) === 'interval');

expect('quiet uses 60 min', football_should_request([
    'apiCallDate' => '2026-10-24',
    'apiCallCount' => 1,
    'rateLimitRemaining' => 80,
    'lastSuccessAt' => $now - 3599,
], $none, $now) === 'interval');

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
