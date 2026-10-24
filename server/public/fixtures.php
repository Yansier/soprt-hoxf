<?php

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Cache-Control: public, max-age=60');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$empty = ['updatedAt' => null, 'fixtures' => []];
if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode($empty);
    exit;
}

$path = dirname(__DIR__) . '/data/fixtures.json';
if (!is_file($path)) {
    echo json_encode($empty);
    exit;
}

$raw = file_get_contents($path);
$payload = is_string($raw) ? json_decode($raw, true) : null;
if (!is_array($payload) || !isset($payload['fixtures']) || !is_array($payload['fixtures'])) {
    echo json_encode($empty);
    exit;
}

echo json_encode([
    'updatedAt' => $payload['updatedAt'] ?? null,
    'fixtures' => $payload['fixtures'],
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
