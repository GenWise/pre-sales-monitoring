<?php
// Test script to verify the webhook dispatcher functionality

echo "Testing Webhook Dispatcher Functionality\n";
echo "========================================\n\n";

// Test data that matches form submission format
$testData = [
    'child_name' => 'Test Child Dispatcher',
    'parent_name' => 'Test Parent Dispatcher',
    'parent_email' => 'test.dispatcher@example.com',
    'parent_mobile' => '+91-9876543210',
    'age_class' => '8th Grade',
    'previous_school' => 'Test Previous School',
    'address' => '123 Test Street, Test Area',
    'city' => 'Test City',
    'status' => 'New Parent',
    'interest_level' => 'High',
    'source_tag' => 'webhook_dispatcher_test',
    'duplicate_flag' => 'No',
    'assigned_owner' => 'Unassigned',
    'notes' => 'Test submission via dispatcher - ' . date('Y-m-d H:i:s'),
    'timestamp' => date('Y-m-d H:i:s')
];

echo "Test Data:\n";
print_r($testData);
echo "\n";

// Simulate webhook POST request
$url = 'https://dashboard.giftedworld.org/leads.php?webhook=6Z-HBCYZExmSjx1bSxsFOgAblIgYMeDXzBI17p9hfkw';
$postData = json_encode($testData);

echo "Testing webhook URL: $url\n";
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

        echo "\nFull Response:\n";
        echo json_encode($responseData, JSON_PRETTY_PRINT) . "\n";
    } else {
        echo "Raw Response:\n$response\n";
    }
}

echo "\n========================================\n";
echo "Test completed at: " . date('Y-m-d H:i:s') . "\n";
?>