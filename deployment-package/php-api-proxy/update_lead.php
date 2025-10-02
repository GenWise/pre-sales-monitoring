<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Configuration
$SPREADSHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
$SHEET_NAME = 'Sheet1';
$SERVICE_ACCOUNT_FILE = 'service-account-key.json';

// Valid dropdown values for validation
$VALID_STATUS = ['New Parent', 'Contacted', 'Follow-up', 'Enrolled', 'Not Interested'];
$VALID_INTEREST = ['High', 'Medium', 'Low'];
$VALID_OWNERS = ['Unassigned', 'Rajesh', 'Team Member'];
$VALID_DUPLICATE = ['Yes', 'No'];

try {
    // Parse request body
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        throw new Exception('Invalid JSON in request body');
    }

    // Validate required fields
    if (!isset($input['row_number']) || !is_numeric($input['row_number'])) {
        throw new Exception('Valid row_number is required');
    }

    $rowNumber = (int)$input['row_number'];
    if ($rowNumber < 2) {
        throw new Exception('Row number must be 2 or greater (row 1 is headers)');
    }

    // Validate status if provided
    if (isset($input['status']) && !in_array($input['status'], $VALID_STATUS)) {
        throw new Exception('Invalid status. Must be one of: ' . implode(', ', $VALID_STATUS));
    }

    // Validate interest level if provided
    if (isset($input['interest_level']) && !in_array($input['interest_level'], $VALID_INTEREST)) {
        throw new Exception('Invalid interest level. Must be one of: ' . implode(', ', $VALID_INTEREST));
    }

    // Validate assigned owner if provided
    if (isset($input['assigned_owner']) && !in_array($input['assigned_owner'], $VALID_OWNERS)) {
        throw new Exception('Invalid assigned owner. Must be one of: ' . implode(', ', $VALID_OWNERS));
    }

    // Validate duplicate flag if provided
    if (isset($input['duplicate_flag']) && !in_array($input['duplicate_flag'], $VALID_DUPLICATE)) {
        throw new Exception('Invalid duplicate flag. Must be one of: ' . implode(', ', $VALID_DUPLICATE));
    }

    // Load service account credentials
    if (!file_exists($SERVICE_ACCOUNT_FILE)) {
        throw new Exception('Service account file not found');
    }

    $credentials = json_decode(file_get_contents($SERVICE_ACCOUNT_FILE), true);
    if (!$credentials) {
        throw new Exception('Invalid service account file');
    }

    // First, get current row data to determine which columns to update
    $jwt = createJWT($credentials, 'https://www.googleapis.com/auth/spreadsheets');
    $accessToken = getAccessToken($jwt);

    // Get current row data
    $getRange = urlencode($SHEET_NAME . '!A' . $rowNumber . ':K' . $rowNumber);
    $getUrl = "https://sheets.googleapis.com/v4/spreadsheets/{$SPREADSHEET_ID}/values/{$getRange}";

    $getContext = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'Authorization: Bearer ' . $accessToken,
                'User-Agent: PHP-Update-Lead/1.0'
            ],
            'timeout' => 30
        ]
    ]);

    $getResponse = file_get_contents($getUrl, false, $getContext);
    if ($getResponse === false) {
        throw new Exception('Failed to fetch current row data');
    }

    $getCurrentData = json_decode($getResponse, true);
    if (!isset($getCurrentData['values']) || empty($getCurrentData['values'])) {
        throw new Exception('Row not found or empty');
    }

    $currentRow = $getCurrentData['values'][0];

    // Prepare the update data based on actual column structure
    // Headers: ["child_name","parent_name","parent_email","parent_mobile","interest_level","source_tag","timestamp","duplicate_flag","status","assigned_owner","notes"]
    // Columns: A=child_name, B=parent_name, C=parent_email, D=parent_mobile, E=interest_level,
    //          F=source_tag, G=timestamp, H=duplicate_flag, I=status, J=assigned_owner, K=notes
    $updateValues = $currentRow;

    // Ensure we have enough columns
    while (count($updateValues) < 11) {
        $updateValues[] = '';
    }

    // Update specific columns based on input
    if (isset($input['status'])) {
        $updateValues[8] = $input['status']; // Column I (Status)
    }

    if (isset($input['interest_level'])) {
        $updateValues[4] = $input['interest_level']; // Column E (Interest Level)
    }

    if (isset($input['assigned_owner'])) {
        $updateValues[9] = $input['assigned_owner']; // Column J (Assigned Owner)
    }

    if (isset($input['notes'])) {
        // Append new notes to existing notes if any
        $existingNotes = isset($updateValues[10]) ? $updateValues[10] : '';
        $newNotes = $input['notes'];

        if (!empty($existingNotes) && !empty($newNotes)) {
            $updateValues[10] = $existingNotes . "\n" . date('Y-m-d H:i:s') . ": " . $newNotes;
        } elseif (!empty($newNotes)) {
            $updateValues[10] = date('Y-m-d H:i:s') . ": " . $newNotes;
        }
    }

    // Update the row
    $updateRange = $SHEET_NAME . '!A' . $rowNumber . ':K' . $rowNumber;
    $updateUrl = "https://sheets.googleapis.com/v4/spreadsheets/{$SPREADSHEET_ID}/values/" . urlencode($updateRange) . "?valueInputOption=RAW";

    $updateData = [
        'values' => [$updateValues]
    ];

    $updateContext = stream_context_create([
        'http' => [
            'method' => 'PUT',
            'header' => [
                'Authorization: Bearer ' . $accessToken,
                'Content-Type: application/json',
                'User-Agent: PHP-Update-Lead/1.0'
            ],
            'content' => json_encode($updateData),
            'timeout' => 30
        ]
    ]);

    $updateResponse = file_get_contents($updateUrl, false, $updateContext);

    if ($updateResponse === false) {
        $error = error_get_last();
        throw new Exception('Failed to update sheet: ' . ($error ? $error['message'] : 'Unknown error'));
    }

    $updateResult = json_decode($updateResponse, true);

    if (!$updateResult || isset($updateResult['error'])) {
        $errorMsg = isset($updateResult['error']['message']) ? $updateResult['error']['message'] : 'Unknown API error';
        throw new Exception('Sheets API error: ' . $errorMsg);
    }

    // Success response
    echo json_encode([
        'success' => true,
        'message' => 'Lead updated successfully',
        'row_number' => $rowNumber,
        'updated_fields' => array_keys($input),
        'updated_cells' => $updateResult['updatedCells'] ?? 0,
        'timestamp' => date('c')
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'details' => 'Failed to update lead in master sheet',
        'timestamp' => date('c')
    ]);
}

// JWT creation function for service account authentication
function createJWT($credentials, $scope) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'RS256']);
    $payload = json_encode([
        'iss' => $credentials['client_email'],
        'scope' => $scope,
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

// Get OAuth access token
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
?>