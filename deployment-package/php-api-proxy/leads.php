<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Configuration
$SPREADSHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
$SHEET_NAME = 'Sheet1';
$GOOGLE_SHEETS_API_KEY = $_ENV['GOOGLE_SHEETS_API_KEY'] ?? getenv('GOOGLE_SHEETS_API_KEY') ?? '';

try {
    // Build Google Sheets API URL
    $range = urlencode($SHEET_NAME . '!A:K');
    $url = "https://sheets.googleapis.com/v4/spreadsheets/{$SPREADSHEET_ID}/values/{$range}?key={$GOOGLE_SHEETS_API_KEY}";

    // Make API request with proper referer
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'User-Agent: PHP-Dashboard-Proxy/1.0',
                'Referer: https://giftedworld.org/'
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
?>