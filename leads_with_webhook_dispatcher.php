<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// WEBHOOK DISPATCHER PATTERN - CDN BYPASS SOLUTION
// This allows webhook.php functionality to work through the existing leads.php file
// which bypasses Hostinger CDN caching issues for new PHP files
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['webhook']) && hash_equals($_GET['webhook'], 'presales_webhook_2025_bypass')) {
    // Log the webhook request
    error_log('[WEBHOOK] Dispatcher activated: ' . date('Y-m-d H:i:s'));

    // Normalize environment for webhook script
    $_SERVER['REQUEST_URI'] = '/webhook.php';
    $raw = file_get_contents('php://input');
    $ct = $_SERVER['CONTENT_TYPE'] ?? '';

    if (stripos($ct, 'application/json') !== false) {
        $webhookData = json_decode($raw, true) ?? [];
        error_log('[WEBHOOK] JSON data received: ' . json_encode($webhookData));
    } elseif (stripos($ct, 'application/x-www-form-urlencoded') !== false) {
        parse_str($raw, $webhookData);
        error_log('[WEBHOOK] Form data received: ' . json_encode($webhookData));
    } else {
        $webhookData = [];
        error_log('[WEBHOOK] Unknown content type: ' . $ct);
    }

    // Execute webhook logic directly (inline to avoid include issues)
    try {
        handleWebhookRequest($webhookData);
    } catch (Exception $e) {
        error_log('[WEBHOOK] Error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'timestamp' => date('c')
        ]);
    }
    exit;
}

// Configuration for leads API
$SPREADSHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
$SHEET_NAME = 'Sheet1';
$SERVICE_ACCOUNT_FILE = 'service-account-key.json';

// DEFAULT BEHAVIOR - LEADS API (GET requests)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
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
        $jwt = createJWT($credentials);

        // Get OAuth token
        $accessToken = getAccessToken($jwt);

        // Make API request with service account token
        $range = urlencode($SHEET_NAME . '!A:K');
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
                'message' => 'No data found'
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

            // Transform for dashboard compatibility
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
            'timestamp' => date('c')
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'details' => 'Failed to fetch leads from Google Sheets'
        ]);
    }
} else {
    // Reject other methods
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed. Use GET for leads or POST with webhook parameter.'
    ]);
}

// WEBHOOK HANDLER FUNCTION
function handleWebhookRequest($data) {
    global $SPREADSHEET_ID, $SERVICE_ACCOUNT_FILE;

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

    // Create JWT for service account authentication with write permissions
    $jwt = createJWTForWrite($credentials);

    // Get OAuth token with write permissions
    $accessToken = getAccessToken($jwt);

    // Prepare row data for Google Sheets
    // Expected columns: Timestamp, Child Name, Parent Name, Parent Email, Parent Mobile,
    // Age/Class, Previous School, Address, City, Status, Interest Level, Source Tag,
    // Duplicate Flag, Assigned Owner, Notes
    $rowData = [
        $data['timestamp'] ?? date('Y-m-d H:i:s'),
        $data['child_name'] ?? $data['Child Name'] ?? '',
        $data['parent_name'] ?? $data['Parent Name'] ?? '',
        $data['parent_email'] ?? $data['Parent Email'] ?? '',
        $data['parent_mobile'] ?? $data['Parent Mobile'] ?? '',
        $data['age_class'] ?? $data['Child Grade'] ?? '',
        $data['previous_school'] ?? '',
        $data['address'] ?? '',
        $data['city'] ?? $data['Geography'] ?? '',
        $data['status'] ?? $data['Status'] ?? 'New Parent',
        $data['interest_level'] ?? $data['Interest Level'] ?? 'Medium',
        $data['source_tag'] ?? $data['Source Tag'] ?? 'website',
        $data['duplicate_flag'] ?? $data['Duplicate Flag'] ?? 'No',
        $data['assigned_owner'] ?? $data['Assigned Owner'] ?? 'Unassigned',
        $data['notes'] ?? $data['Notes'] ?? 'Added via webhook dispatcher'
    ];

    // Append data to Google Sheets
    $result = appendToSheet($accessToken, $SPREADSHEET_ID, 'Sheet1', $rowData);

    echo json_encode([
        'success' => true,
        'message' => 'Data successfully added to Google Sheets via webhook dispatcher',
        'data' => $data,
        'row_data' => $rowData,
        'sheets_response' => $result,
        'timestamp' => date('c')
    ]);
}

// JWT creation function for read-only access
function createJWT($credentials) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'RS256']);
    $payload = json_encode([
        'iss' => $credentials['client_email'],
        'scope' => 'https://www.googleapis.com/auth/spreadsheets.readonly',
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

// JWT creation function for write access
function createJWTForWrite($credentials) {
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