<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Only POST requests accepted.']);
    exit;
}

// Configuration
$SPREADSHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
$SHEET_NAME = 'Sheet1';
$SERVICE_ACCOUNT_FILE = 'service-account-key.json';

try {
    // Get POST data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception('Invalid JSON data received');
    }

    // Load service account credentials
    if (!file_exists($SERVICE_ACCOUNT_FILE)) {
        throw new Exception('Service account file not found');
    }

    $credentials = json_decode(file_get_contents($SERVICE_ACCOUNT_FILE), true);
    if (!$credentials) {
        throw new Exception('Invalid service account file');
    }

    // Create JWT for service account authentication
    $jwt = createJWT($credentials);

    // Get OAuth token with write permissions
    $accessToken = getAccessToken($jwt);

    // Extract form data from the Google Apps Script payload
    $formData = $data['formData'] ?? $data;

    // Map form field names to extract values
    // Google Apps Script sends field names like "Child Name", "Parent Name", etc.
    $childName = $formData['Child Name'] ?? $formData['childName'] ?? $formData['child_name'] ?? '';
    $parentName = $formData['Parent Name'] ?? $formData['parentName'] ?? $formData['parent_name'] ?? '';
    $parentEmail = $formData['Parent Email'] ?? $formData['parentEmail'] ?? $formData['parent_email'] ?? '';
    $parentMobile = $formData['Parent Mobile'] ?? $formData['parentMobile'] ?? $formData['parent_mobile'] ?? '';
    $interestLevel = $formData['Interest Level'] ?? $formData['interestLevel'] ?? $formData['interest_level'] ?? 'Medium';
    $sourceTag = $formData['sourceTag'] ?? $formData['source_tag'] ?? 'website';
    $timestamp = $formData['timestamp'] ?? $formData['Timestamp'] ?? date('n/j/Y G:i:s');

    // Prepare row data for Google Sheets
    // CRITICAL: Must match EXACT column order in master sheet:
    // Child Name, Parent Name, Parent Email, Parent Mobile, Interest Level,
    // Source Tag, Timestamp, Duplicate Flag, Status, Assigned Owner, Notes
    $rowData = [
        $childName,                                   // Child Name
        $parentName,                                  // Parent Name
        $parentEmail,                                 // Parent Email
        $parentMobile,                                // Parent Mobile
        $interestLevel,                               // Interest Level
        $sourceTag,                                   // Source Tag
        $timestamp,                                   // Timestamp
        'No',                                         // Duplicate Flag
        'New Parent',                                 // Status
        'Unassigned',                                 // Assigned Owner
        "Auto-added from {$sourceTag} on " . date('n/j/Y') // Notes
    ];

    // Append data to Google Sheets
    $result = appendToSheet($accessToken, $SPREADSHEET_ID, $SHEET_NAME, $rowData);

    echo json_encode([
        'success' => true,
        'message' => 'Data successfully added to Google Sheets',
        'data' => $data,
        'extracted_data' => [
            'childName' => $childName,
            'parentName' => $parentName,
            'parentEmail' => $parentEmail,
            'parentMobile' => $parentMobile,
            'interestLevel' => $interestLevel,
            'sourceTag' => $sourceTag,
            'timestamp' => $timestamp
        ],
        'row_data' => $rowData,
        'sheets_response' => $result,
        'timestamp' => date('c')
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'input_data' => $data ?? null,
        'timestamp' => date('c')
    ]);
}

// JWT creation function (same as leads.php)
function createJWT($credentials) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'RS256']);
    $payload = json_encode([
        'iss' => $credentials['client_email'],
        'scope' => 'https://www.googleapis.com/auth/spreadsheets', // Full spreadsheets scope for writing
        'aud' => 'https://oauth2.googleapis.com/token',
        'exp' => time() + 3600,
        'iat' => time()
    ]);

    $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

    $signature = '';
    $privateKey = openssl_pkey_get_private($credentials['private_key']);
    openssl_sign($base64Header . '.' . $base64Payload, $signature, $privateKey, 'SHA256');
    $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

    return $base64Header . '.' . $base64Payload . '.' . $base64Signature;
}

// Get OAuth access token (same as leads.php)
function getAccessToken($jwt) {
    $postData = http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt
    ]);

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => [
                'Content-Type: application/x-www-form-urlencoded',
                'Content-Length: ' . strlen($postData)
            ],
            'content' => $postData
        ]
    ]);

    $response = file_get_contents('https://oauth2.googleapis.com/token', false, $context);

    if ($response === false) {
        throw new Exception('Failed to get access token');
    }

    $data = json_decode($response, true);
    if (!isset($data['access_token'])) {
        throw new Exception('Invalid token response: ' . $response);
    }

    return $data['access_token'];
}

// Append data to Google Sheets
function appendToSheet($accessToken, $spreadsheetId, $sheetName, $rowData) {
    $range = urlencode($sheetName . '!A:O'); // A to O columns
    $url = "https://sheets.googleapis.com/v4/spreadsheets/{$spreadsheetId}/values/{$range}:append?valueInputOption=RAW";

    $postData = json_encode([
        'values' => [$rowData]
    ]);

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => [
                'Authorization: Bearer ' . $accessToken,
                'Content-Type: application/json',
                'Content-Length: ' . strlen($postData)
            ],
            'content' => $postData
        ]
    ]);

    $response = file_get_contents($url, false, $context);

    if ($response === false) {
        throw new Exception('Failed to append data to Google Sheets');
    }

    $result = json_decode($response, true);

    if (!isset($result['updates'])) {
        throw new Exception('Invalid response from Google Sheets API: ' . $response);
    }

    return $result;
}
?>