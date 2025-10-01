const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = process.env.DASHBOARD_API_PORT || 3002;

// Enable CORS for dashboard
app.use(cors({
    origin: [
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'https://dashboard.giftedworld.org',
        'http://dashboard.giftedworld.org'
    ],
    credentials: true
}));

// Google Sheets configuration
const SPREADSHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
const SHEET_NAME = 'Sheet1';

// Initialize Google Sheets API with service account
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials/service-account-key.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

const sheets = google.sheets({ version: 'v4', auth });

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'dashboard-api-proxy' });
});

// Get all leads from master sheet
app.get('/api/leads', async (req, res) => {
    try {
        console.log('Fetching leads from Google Sheets...');

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:K` // Get all 11 columns
        });

        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            return res.json({ leads: [], message: 'No data found' });
        }

        // Parse headers (first row)
        const headers = rows[0].map(h => h.toLowerCase().trim().replace(/\s+/g, '_'));

        // Convert rows to objects
        const leads = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const lead = {};
            headers.forEach((header, index) => {
                lead[header] = row[index] || '';
            });

            // Add metadata
            lead.id = `lead_${i}`;
            lead.row_number = i + 1; // For updates

            leads.push(lead);
        }

        console.log(`Successfully fetched ${leads.length} leads`);
        res.json({
            success: true,
            leads: leads,
            total: leads.length,
            headers: headers
        });

    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response?.data || 'Failed to fetch leads from Google Sheets'
        });
    }
});

// Get sheet metadata
app.get('/api/metadata', async (req, res) => {
    try {
        const response = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID
        });

        res.json({
            success: true,
            title: response.data.properties.title,
            sheets: response.data.sheets.map(s => ({
                title: s.properties.title,
                id: s.properties.sheetId,
                index: s.properties.index
            })),
            lastModified: response.data.properties.updatedTime
        });

    } catch (error) {
        console.error('Error fetching metadata:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get specific lead by row number
app.get('/api/leads/:rowNumber', async (req, res) => {
    try {
        const rowNumber = parseInt(req.params.rowNumber);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A${rowNumber}:K${rowNumber}`
        });

        const row = response.data.values?.[0];

        if (!row) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found'
            });
        }

        // Get headers
        const headersResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A1:K1`
        });

        const headers = headersResponse.data.values[0].map(h =>
            h.toLowerCase().trim().replace(/\s+/g, '_')
        );

        const lead = {};
        headers.forEach((header, index) => {
            lead[header] = row[index] || '';
        });

        lead.id = `lead_${rowNumber - 1}`;
        lead.row_number = rowNumber;

        res.json({
            success: true,
            lead: lead
        });

    } catch (error) {
        console.error('Error fetching lead:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Dashboard API Proxy running on port ${PORT}`);
    console.log(`Spreadsheet ID: ${SPREADSHEET_ID}`);
    console.log(`CORS enabled for dashboard origins`);
    console.log(`Service account authentication configured`);
});