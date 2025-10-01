<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

echo json_encode([
    'status' => 'ok',
    'service' => 'php-dashboard-api-proxy',
    'version' => '1.0.0',
    'timestamp' => date('c'),
    'server' => $_SERVER['SERVER_NAME'] ?? 'unknown'
]);
?>