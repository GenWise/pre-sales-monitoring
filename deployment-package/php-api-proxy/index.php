<?php
/**
 * PHP-based API Proxy for Pre-Sales Monitoring Dashboard
 * Replaces Node.js proxy for shared hosting environments
 *
 * Provides Google Sheets API access with service account authentication
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuration
$SPREADSHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
$SHEET_NAME = 'Sheet1';
$GOOGLE_SHEETS_API_KEY = 'AIzaSyDcSU0QHFQmdudhLff3-LQNFCsXArvqXY8';

// Get the request path
$request = $_SERVER['REQUEST_URI'];
$path = parse_url($request, PHP_URL_PATH);
$path = str_replace('/api-proxy', '', $path); // Remove base path

// Route handling
switch ($path) {
    case '/health':
        handleHealth();
        break;
    case '/api/leads':
        handleLeads();
        break;
    case '/api/metadata':
        handleMetadata();
        break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        break;
}

function handleHealth() {
    echo json_encode([
        'status' => 'ok',
        'service' => 'php-dashboard-api-proxy',
        'version' => '1.0.0',
        'timestamp' => date('c')
    ]);
}

function handleLeads() {
    global $SPREADSHEET_ID, $SHEET_NAME, $GOOGLE_SHEETS_API_KEY;

    try {
        // Build Google Sheets API URL
        $range = urlencode($SHEET_NAME . '!A:K');
        $url = "https://sheets.googleapis.com/v4/spreadsheets/{$SPREADSHEET_ID}/values/{$range}?key={$GOOGLE_SHEETS_API_KEY}";

        // Make API request
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
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
            return;
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
            $lead = transformLead($lead);

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
}

function handleMetadata() {
    global $SPREADSHEET_ID, $GOOGLE_SHEETS_API_KEY;

    try {
        $url = "https://sheets.googleapis.com/v4/spreadsheets/{$SPREADSHEET_ID}?key={$GOOGLE_SHEETS_API_KEY}";

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    'User-Agent: PHP-Dashboard-Proxy/1.0'
                ],
                'timeout' => 30
            ]
        ]);

        $response = file_get_contents($url, false, $context);

        if ($response === false) {
            throw new Exception('Failed to fetch metadata from Google Sheets API');
        }

        $data = json_decode($response, true);

        $sheets = [];
        if (isset($data['sheets'])) {
            foreach ($data['sheets'] as $sheet) {
                $sheets[] = [
                    'title' => $sheet['properties']['title'],
                    'id' => $sheet['properties']['sheetId'],
                    'index' => $sheet['properties']['index']
                ];
            }
        }

        echo json_encode([
            'success' => true,
            'title' => $data['properties']['title'] ?? 'Unknown',
            'sheets' => $sheets,
            'lastModified' => $data['properties']['updatedTime'] ?? null
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

function transformLead($lead) {
    // Map sheet columns to dashboard fields (same as Node.js version)
    return [
        'id' => $lead['id'] ?? '',
        'name' => $lead['child_name'] ?? $lead['name'] ?? '',
        'email' => $lead['parent_email'] ?? $lead['email'] ?? '',
        'mobile' => $lead['parent_mobile'] ?? $lead['mobile'] ?? $lead['phone'] ?? '',
        'status' => normalizeStatus($lead['status'] ?? ''),
        'source' => $lead['source_tag'] ?? $lead['source'] ?? 'Unknown',
        'date' => parseDate($lead['timestamp'] ?? $lead['date'] ?? ''),
        'notes' => $lead['notes'] ?? '',
        'interest' => $lead['interest_level'] ?? $lead['interest'] ?? '',
        'company' => $lead['parent_name'] ?? $lead['company'] ?? '',
        'city' => $lead['city'] ?? '',
        'assigned_to' => $lead['assigned_owner'] ?? $lead['assigned_to'] ?? 'Unassigned',
        'duplicate_flag' => $lead['duplicate_flag'] ?? 'No',
        'timestamp' => $lead['timestamp'] ?? date('c'),
        'row_number' => $lead['row_number'] ?? 0
    ];
}

function normalizeStatus($status) {
    if (empty($status)) return 'New Parent';

    $statusMap = [
        'new parent' => 'New Parent',
        'new' => 'New Parent',
        'contacted' => 'Contacted',
        'follow-up' => 'Follow-up',
        'follow up' => 'Follow-up',
        'enrolled' => 'Enrolled',
        'converted' => 'Enrolled',
        'not interested' => 'Not Interested',
        'lost' => 'Not Interested'
    ];

    $normalizedKey = strtolower(trim($status));
    return $statusMap[$normalizedKey] ?? $status;
}

function parseDate($dateStr) {
    if (empty($dateStr)) return date('Y-m-d');

    $timestamp = strtotime($dateStr);
    if ($timestamp === false) {
        return date('Y-m-d');
    }

    return date('Y-m-d', $timestamp);
}

function logError($message) {
    error_log(date('[Y-m-d H:i:s] ') . $message . PHP_EOL, 3, 'api-proxy-error.log');
}
?>