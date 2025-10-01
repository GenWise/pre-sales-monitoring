<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

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

// JWT creation function
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