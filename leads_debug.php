<?php
error_log("DISPATCHER DEBUG: Method=" . $_SERVER['REQUEST_METHOD'] . " Query=" . $_SERVER['QUERY_STRING'] . " Input=" . file_get_contents('php://input'));

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// DEBUGGING: Log all critical conditions
$requestMethod = $_SERVER['REQUEST_METHOD'];
$webhookParam = $_GET['webhook'] ?? null;
$secretKey = '6Z-HBCYZExmSjx1bSxsFOgAblIgYMeDXzBI17p9hfkw';

error_log("WEBHOOK DEBUG: Method=$requestMethod, WebhookParam=$webhookParam, SecretMatches=" . (hash_equals($webhookParam ?: '', $secretKey) ? 'YES' : 'NO'));

// DISPATCHER PATTERN - Handle webhook POST requests with strong secret
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['webhook']) && hash_equals($_GET['webhook'], '6Z-HBCYZExmSjx1bSxsFOgAblIgYMeDXzBI17p9hfkw')) {
    error_log("DISPATCHER: Webhook mode activated with strong secret");
    echo json_encode([
        'success' => true,
        'mode' => 'webhook_debug',
        'message' => 'Webhook branch activated successfully',
        'debug' => [
            'method' => $_SERVER['REQUEST_METHOD'],
            'webhook_param' => $_GET['webhook'],
            'secret_match' => 'YES'
        ]
    ]);
    exit;
}

error_log("DISPATCHER: Read mode activated");
// Default mode - read data from sheet (GET requests)
echo json_encode([
    'success' => true,
    'mode' => 'read_debug',
    'message' => 'Read mode activated',
    'debug' => [
        'method' => $_SERVER['REQUEST_METHOD'],
        'webhook_param' => $_GET['webhook'] ?? 'NOT_SET',
        'conditions' => [
            'is_post' => $_SERVER['REQUEST_METHOD'] === 'POST',
            'webhook_isset' => isset($_GET['webhook']),
            'webhook_value' => $_GET['webhook'] ?? null,
            'secret_correct' => isset($_GET['webhook']) ? hash_equals($_GET['webhook'], '6Z-HBCYZExmSjx1bSxsFOgAblIgYMeDXzBI17p9hfkw') : false
        ]
    ]
]);
?>