<?php

ini_set('display_errors', '0');
error_reporting(E_ALL);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/lib/feed.php';

$status = football_update();
fwrite(STDOUT, $status . PHP_EOL);
exit($status === 'write-failed' || $status === 'error' ? 1 : 0);
