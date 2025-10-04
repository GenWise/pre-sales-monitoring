<?php
// Test script to verify the current webhook dispatcher functionality

echo "Testing Current Webhook Dispatcher\n";
echo "==================================\n\n";

// Test data
$testData = [
    'child_name' => 'Test Current Webhook',
    'parent_name' => 'Test Current Parent',
    'parent_email' => 'current.webhook@example.com',
    'parent_mobile' => '+91-9876543210',
    'city' => 'Test City Current',
    'source_tag' => 'current_webhook_test',
    'status' => 'New Parent',
    'interest_level' => 'High',
    'notes' => 'Current webhook test - ' . date('Y-m-d H:i:s'),
    'timestamp' => date('Y-m-d H:i:s')
];

// Test current production secret
$currentSecret = 'gw2025webhook';
$url = "https://dashboard.giftedworld.org/leads.php?webhook=$currentSecret";
$postData = json_encode($testData);

echo "Testing current webhook URL: $url\n";
echo "POST Data: $postData\n\n";

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($postData)
        ],
        'content' => $postData
    ]
]);

echo "Sending POST request...\n";
$response = file_get_contents($url, false, $context);

if ($response === false) {
    echo "❌ ERROR: Failed to send webhook request\n";
    $error = error_get_last();
    echo "Error details: " . $error['message'] . "\n";
} else {
    echo "✅ SUCCESS: Webhook request sent\n";
    echo "Response:\n";
    $responseData = json_decode($response, true);

    if ($responseData) {
        echo "Status: " . ($responseData['success'] ? 'SUCCESS' : 'FAILED') . "\n";
        echo "Message: " . ($responseData['message'] ?? 'No message') . "\n";
        echo "Mode: " . ($responseData['mode'] ?? 'Unknown') . "\n";

        if (isset($responseData['error'])) {
            echo "Error: " . $responseData['error'] . "\n";
        }

        if (isset($responseData['leads'])) {
            echo "Response type: READ (returning leads data)\n";
        } else {
            echo "Response type: WRITE (webhook mode)\n";
        }
    } else {
        echo "Raw Response:\n$response\n";
    }
}

echo "\n==================================\n";
echo "Current webhook test completed\n";
?>