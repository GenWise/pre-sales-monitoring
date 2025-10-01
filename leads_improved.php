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

// DISPATCHER PATTERN - Handle webhook POST requests with strong secret
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['webhook']) && hash_equals($_GET['webhook'], '6Z-HBCYZExmSjx1bSxsFOgAblIgYMeDXzBI17p9hfkw')) {
    error_log("DISPATCHER: Webhook mode activated with strong secret");
    // Webhook mode - write data to sheet
    handleWebhookRequest();
    exit;
}

error_log("DISPATCHER: Read mode activated");
// Default mode - read data from sheet (GET requests)
handleLeadsRequest();

function handleWebhookRequest() {
    error_log("WEBHOOK: Starting webhook handler");
    // Configuration
    $SPREADSHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
    $SHEET_NAME = 'Sheet1';
    $SERVICE_ACCOUNT_FILE = 'service-account-key.json';

    try {
        // Get POST data
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        error_log("WEBHOOK: Received data: " . $input);

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
        $jwt = createJWT($credentials, 'https://www.googleapis.com/auth/spreadsheets');

        // Get OAuth token
        $accessToken = getAccessToken($jwt);

        // Prepare data for Google Sheets - Complete 15 column mapping
        $timestamp = $data['timestamp'] ?? date('Y-m-d H:i:s');

        // Expected columns: Timestamp, Child Name, Parent Name, Parent Email, Parent Mobile,
        // Age/Class, Previous School, Address, City, Status, Interest Level, Source Tag,
        // Duplicate Flag, Assigned Owner, Notes
        $rowData = [
            $timestamp,                                           // Timestamp
            $data['child_name'] ?? $data['name'] ?? '',          // Child Name
            $data['parent_name'] ?? '',                          // Parent Name
            $data['parent_email'] ?? $data['email'] ?? '',       // Parent Email
            $data['parent_mobile'] ?? $data['mobile'] ?? $data['phone'] ?? '', // Parent Mobile
            $data['age_class'] ?? '',                            // Age/Class
            $data['previous_school'] ?? '',                      // Previous School
            $data['address'] ?? '',                              // Address
            $data['city'] ?? '',                                 // City
            $data['status'] ?? 'New Parent',                     // Status
            $data['interest_level'] ?? 'Medium',                 // Interest Level
            $data['source_tag'] ?? $data['source'] ?? 'webhook_dispatcher', // Source Tag
            $data['duplicate_flag'] ?? 'No',                     // Duplicate Flag
            $data['assigned_owner'] ?? 'Unassigned',             // Assigned Owner
            $data['notes'] ?? ''                                 // Notes
        ];

        error_log("WEBHOOK: Prepared row data: " . json_encode($rowData));

        // Append data to sheet using full range A:O
        $result = appendToSheet($accessToken, $SPREADSHEET_ID, $SHEET_NAME, $rowData);

        error_log("WEBHOOK: Sheet append result: " . json_encode($result));

        echo json_encode([
            'success' => true,
            'message' => 'Data added to sheet successfully via secure dispatcher',
            'data' => $data,
            'timestamp' => $timestamp,
            'sheet_response' => $result,
            'mode' => 'webhook_dispatcher_secure',
            'columns_mapped' => 15
        ]);

    } catch (Exception $e) {
        error_log("WEBHOOK ERROR: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'details' => 'Failed to add data to Google Sheets via secure dispatcher',
            'mode' => 'webhook_dispatcher_secure'
        ]);
    }
}

function handleLeadsRequest() {
    // Configuration
    $SPREADSHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
    $SHEET_NAME = 'Sheet1';
    $SERVICE_ACCOUNT_FILE = 'service-account-key.json';

    try {
        // Load service account credentials
        if (!file_exists($SERVICE_ACCOUNT_FILE)) {
            throw new Exception('Service account file not found');
        }

        $credentials = json_decode(file_get_contents($SERVICE_ACCOUNT_FILE), true);
        if (!$credentials) {
            throw new Exception('Invalid service account file');
        }

        // Create JWT for service account authentication
        $jwt = createJWT($credentials, 'https://www.googleapis.com/auth/spreadsheets.readonly');

        // Get OAuth token
        $accessToken = getAccessToken($jwt);

        // Make API request with service account token - now using full range A:O
        $range = urlencode($SHEET_NAME . '!A:O');
        $url = "https://sheets.googleapis.com/v4/spreadsheets/{$SPREADSHEET_ID}/values/{$range}";

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    'Authorization: Bearer ' . $accessToken,
                    'User-Agent: PHP-Dashboard-Proxy/1.0'
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
                'mode' => 'read_dispatcher_secure'
            ]);
            exit;
        }

        $rows = $data['values'];
        $headers = array_map(function($h) {
            return strtolower(trim(preg_replace('/\s+/', '_', $h)));
        }, $rows[0]);

        $leads = [];
        for ($i = 1; $i < count($rows); $i++) {
            $row = $rows[$i];
            if (empty($row)) continue;

            $lead = [];
            foreach ($headers as $index => $header) {
                $lead[$header] = isset($row[$index]) ? $row[$index] : '';
            }

            // Add metadata
            $lead['id'] = 'lead_' . $i;
            $lead['row_number'] = $i + 1;

            // Transform for dashboard compatibility with all fields
            $lead = [
                'id' => $lead['id'] ?? '',
                'name' => $lead['child_name'] ?? $lead['name'] ?? '',
                'email' => $lead['parent_email'] ?? $lead['email'] ?? '',
                'mobile' => $lead['parent_mobile'] ?? $lead['mobile'] ?? $lead['phone'] ?? '',
                'status' => $lead['status'] ?? 'New Parent',
                'source' => $lead['source_tag'] ?? $lead['source'] ?? 'Unknown',
                'date' => $lead['timestamp'] ?? $lead['date'] ?? date('Y-m-d'),
                'notes' => $lead['notes'] ?? '',
                'interest' => $lead['interest_level'] ?? $lead['interest'] ?? '',
                'company' => $lead['parent_name'] ?? $lead['company'] ?? '',
                'city' => $lead['city'] ?? '',
                'assigned_to' => $lead['assigned_owner'] ?? $lead['assigned_to'] ?? 'Unassigned',
                'duplicate_flag' => $lead['duplicate_flag'] ?? 'No',
                'age_class' => $lead['age_class'] ?? $lead['age/class'] ?? '',
                'previous_school' => $lead['previous_school'] ?? '',
                'address' => $lead['address'] ?? '',
                'timestamp' => $lead['timestamp'] ?? date('c'),
                'row_number' => $lead['row_number'] ?? 0
            ];

            $leads[] = $lead;
        }

        echo json_encode([
            'success' => true,
            'leads' => $leads,
            'total' => count($leads),
            'headers' => $headers,
            'timestamp' => date('c'),
            'mode' => 'read_dispatcher_secure',
            'columns_read' => 15
        ]);

    } catch (Exception $e) {
        error_log("READ ERROR: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'details' => 'Failed to fetch leads from Google Sheets',
            'mode' => 'read_dispatcher_secure'
        ]);
    }
}

// JWT creation function
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

// Append data to Google Sheet
function appendToSheet($accessToken, $spreadsheetId, $sheetName, $rowData) {
    $range = urlencode($sheetName . '!A:O'); // Full 15 column range
    $url = "https://sheets.googleapis.com/v4/spreadsheets/{$spreadsheetId}/values/{$range}:append";

    $postData = json_encode([
        'values' => [$rowData],
        'majorDimension' => 'ROWS'
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

    $response = file_get_contents($url . '?valueInputOption=RAW&insertDataOption=INSERT_ROWS', false, $context);

    if ($response === false) {
        throw new Exception('Failed to append data to sheet');
    }

    return json_decode($response, true);
}
?>