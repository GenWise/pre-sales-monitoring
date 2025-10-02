<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuration
$SPREADSHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
$SHEET_NAME = 'Sheet1';
$SERVICE_ACCOUNT_FILE = 'service-account-key.json';

try {
    // Load service account credentials (same as webhook.php)
    if (!file_exists($SERVICE_ACCOUNT_FILE)) {
        throw new Exception('Service account file not found');
    }

    $credentials = json_decode(file_get_contents($SERVICE_ACCOUNT_FILE), true);
    if (!$credentials) {
        throw new Exception('Invalid service account file');
    }

    // Create JWT for service account authentication
    $jwt = createJWT($credentials);

    // Get OAuth token with read permissions
    $accessToken = getAccessToken($jwt);

    // Read all data from Google Sheets (A:O to match webhook output)
    $range = urlencode($SHEET_NAME . '!A:O');
    $url = "https://sheets.googleapis.com/v4/spreadsheets/{$SPREADSHEET_ID}/values/{$range}";

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'Authorization: Bearer ' . $accessToken,
                'User-Agent: PHP-Dashboard-Proxy/2.0'
            ],
            'timeout' => 30
        ]
    ]);

    $response = file_get_contents($url, false, $context);

    if ($response === false) {
        throw new Exception('Failed to fetch data from Google Sheets API');
    }

    $data = json_decode($response, true);

    if (!isset($data['values']) || empty($data['values'])) {
        echo json_encode([
            'success' => true,
            'leads' => [],
            'total' => 0,
            'message' => 'No data found',
            'timestamp' => date('c')
        ]);
        exit;
    }

    $rows = $data['values'];

    // Define the expected column structure (matches webhook.php output)
    $expectedColumns = [
        'timestamp',        // A
        'child_name',       // B
        'parent_name',      // C
        'parent_email',     // D
        'parent_mobile',    // E
        'age_class',        // F
        'previous_school',  // G
        'address',          // H
        'city',             // I
        'status',           // J
        'interest_level',   // K
        'source_tag',       // L
        'duplicate_flag',   // M
        'assigned_owner',   // N
        'notes'             // O
    ];

    $leads = [];

    // Process data rows (skip header row if it exists)
    $startRow = 0;

    // Check if first row looks like headers
    if (!empty($rows[0]) && (
        stripos($rows[0][0] ?? '', 'timestamp') !== false ||
        stripos($rows[0][1] ?? '', 'child') !== false ||
        stripos($rows[0][1] ?? '', 'name') !== false
    )) {
        $startRow = 1;
    }

    for ($i = $startRow; $i < count($rows); $i++) {
        $row = $rows[$i];
        if (empty($row) || empty(trim($row[0] ?? ''))) continue; // Skip empty rows

        // Map row data to expected columns
        $leadData = [];
        for ($col = 0; $col < count($expectedColumns); $col++) {
            $leadData[$expectedColumns[$col]] = isset($row[$col]) ? trim($row[$col]) : '';
        }

        // Transform for dashboard compatibility
        $lead = [
            'id' => 'lead_' . $i,
            'name' => $leadData['child_name'],
            'email' => $leadData['parent_email'],
            'mobile' => $leadData['parent_mobile'],
            'status' => $leadData['status'] ?: 'New Parent',
            'source' => $leadData['source_tag'] ?: 'Unknown',
            'date' => $leadData['timestamp'] ? formatDate($leadData['timestamp']) : date('Y-m-d'),
            'notes' => $leadData['notes'],
            'interest' => $leadData['interest_level'],
            'company' => $leadData['parent_name'],
            'city' => $leadData['city'],
            'assigned_to' => $leadData['assigned_owner'] ?: 'Unassigned',
            'duplicate_flag' => $leadData['duplicate_flag'] ?: 'No',
            'timestamp' => $leadData['timestamp'] ?: date('c'),
            'row_number' => $i + 1
        ];

        $leads[] = $lead;
    }

    echo json_encode([
        'success' => true,
        'leads' => $leads,
        'total' => count($leads),
        'headers' => $expectedColumns,
        'timestamp' => date('c')
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'details' => 'Failed to fetch leads from Google Sheets',
        'timestamp' => date('c')
    ]);
}

// JWT creation function (same as webhook.php)
function createJWT($credentials) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'RS256']);
    $payload = json_encode([
        'iss' => $credentials['client_email'],
        'scope' => 'https://www.googleapis.com/auth/spreadsheets.readonly', // Read-only scope
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

// Get OAuth access token (same as webhook.php)
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

// Helper function to format dates
function formatDate($dateString) {
    if (empty($dateString)) return date('Y-m-d');

    try {
        $date = new DateTime($dateString);
        return $date->format('Y-m-d\TH:i:s.v\Z');
    } catch (Exception $e) {
        return date('Y-m-d');
    }
}
?>