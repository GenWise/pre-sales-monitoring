<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only accept POST requests for webhook
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Get the raw POST data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload']);
    exit();
}

// Load Google API Client
require_once __DIR__ . '/vendor/autoload.php';

// Service account configuration
$serviceAccountKeyFile = __DIR__ . '/service-account-key.json';
$spreadsheetId = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';

try {
    // Initialize Google Client with service account
    $client = new Google_Client();
    $client->setAuthConfig($serviceAccountKeyFile);
    $client->setScopes(Google_Service_Sheets::SPREADSHEETS);

    $service = new Google_Service_Sheets($client);

    // Extract form data
    $formData = $data['formData'] ?? [];

    // Map form fields to master sheet columns
    $rowData = [
        $formData['Child Name'] ?? $formData['childName'] ?? '',
        $formData['Parent Name'] ?? $formData['parentName'] ?? '',
        $formData['Parent Email'] ?? $formData['parentEmail'] ?? '',
        $formData['Parent Mobile'] ?? $formData['parentMobile'] ?? '',
        $formData['Interest Level'] ?? $formData['interestLevel'] ?? 'Medium',
        $formData['sourceTag'] ?? $formData['Source Tag'] ?? '',
        date('c'), // Current timestamp
        'No', // Duplicate flag (would need to check)
        'New Parent', // Status
        '', // Assigned Owner
        'Added via webhook ' . date('Y-m-d H:i:s') // Notes
    ];

    // Append row to spreadsheet
    $range = 'Sheet1';
    $valueRange = new Google_Service_Sheets_ValueRange();
    $valueRange->setValues([$rowData]);

    $params = [
        'valueInputOption' => 'USER_ENTERED'
    ];

    $result = $service->spreadsheets_values->append(
        $spreadsheetId,
        $range,
        $valueRange,
        $params
    );

    // Return success response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Form submission processed',
        'updatedRange' => $result->getUpdates()->getUpdatedRange(),
        'rowsAdded' => $result->getUpdates()->getUpdatedRows()
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>