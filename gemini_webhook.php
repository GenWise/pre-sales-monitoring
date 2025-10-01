<?php
// Set headers to return JSON and handle CORS
header('Content-Type: application/json');

// --- CONFIGURATION ---
// Update these variables with your own details.
$serviceAccountKeyFile = __DIR__ . '/service-account-key.json';
$spreadsheetId = 'YOUR_SPREADSHEET_ID'; // e.g., '1kvZ-hLHaQ...'
$sheetRange = 'Sheet1!A1'; // The sheet and starting cell to append to, e.g., 'Leads!A1'
// --- END CONFIGURATION ---


// Step 1: Receive and Decode Incoming POST Data
$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

// Basic validation: Check if data was received and is valid JSON
if (!$data) {
    http_response_code(400); // Bad Request
    echo json_encode(['status' => 'error', 'message' => 'Invalid or empty JSON payload.']);
    exit;
}

// --- IMPORTANT: Extract your data from the $data array ---
// Example: Assuming you receive JSON like {"name": "John Doe", "email": "john.doe@example.com"}
$name = isset($data['name']) ? $data['name'] : '';
$email = isset($data['email']) ? $data['email'] : '';
$timestamp = date('Y-m-d H:i:s'); // Add a timestamp for the record

// The row data to be inserted into the sheet. The order must match your columns.
$newRow = [$timestamp, $name, $email];


/**
 * Helper function for URL-safe Base64 encoding.
 */
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Main function to get the Google API Access Token.
 */
function get_access_token($key_file_path) {
    if (!file_exists($key_file_path)) {
        throw new Exception("Service account key file not found.");
    }
    $serviceAccount = json_decode(file_get_contents($key_file_path), true);
    if (!$serviceAccount) {
        throw new Exception("Failed to parse service account key file.");
    }

    $client_email = $serviceAccount['client_email'];
    $private_key = $serviceAccount['private_key'];
    $scope = 'https://www.googleapis.com/auth/spreadsheets';
    $token_url = 'https://oauth2.googleapis.com/token';

    // Step 2: Create the JWT
    $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
    $now = time();
    $claim_set = json_encode([
        'iss' => $client_email,
        'scope' => $scope,
        'aud' => $token_url,
        'exp' => $now + 3600, // Token expires in 1 hour
        'iat' => $now,
    ]);

    $signature_input = base64url_encode($header) . '.' . base64url_encode($claim_set);
    
    // Sign the input with the private key
    $signature = '';
    openssl_sign($signature_input, $signature, $private_key, 'sha256WithRSAEncryption');
    $jwt = $signature_input . '.' . base64url_encode($signature);

    // Step 3: Exchange the JWT for an Access Token via cURL
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $token_url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt,
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response_text = curl_exec($ch);
    curl_close($ch);

    $response_json = json_decode($response_text, true);
    if (isset($response_json['access_token'])) {
        return $response_json['access_token'];
    }
    
    // If token exchange fails, include Google's error in the exception
    $error_message = isset($response_json['error_description']) ? $response_json['error_description'] : 'Unknown error during token exchange.';
    throw new Exception("Failed to get access token: " . $error_message);
}

/**
 * Appends a row to the Google Sheet.
 */
function append_to_sheet($access_token, $spreadsheet_id, $range, $values) {
    $url = sprintf(
        'https://sheets.googleapis.com/v4/spreadsheets/%s/values/%s:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
        $spreadsheet_id,
        rawurlencode($range)
    );

    $data_to_send = json_encode(['values' => [$values]]);

    // Step 4: Make the API call to append data
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $access_token,
        'Content-Type: application/json',
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data_to_send);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response_text = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code == 200) {
        return true;
    } else {
        throw new Exception("Failed to append to sheet. Response: " . $response_text);
    }
}

// Main execution block
try {
    // Authenticate and get the token
    $accessToken = get_access_token($serviceAccountKeyFile);
    
    // Append the new row to the sheet
    append_to_sheet($accessToken, $spreadsheetId, $sheetRange, $newRow);

    // Step 5: Send success response
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Data successfully added to the sheet.']);

} catch (Exception $e) {
    // Send error response
    http_response_code(500); // Internal Server Error
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
