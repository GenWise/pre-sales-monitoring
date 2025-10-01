const { google } = require('googleapis');
const fs = require('fs');
const axios = require('axios');

// Service account credentials
const serviceAccountKey = JSON.parse(fs.readFileSync('./deployment-package/proxy-api/service-account-key.json', 'utf8'));

// Configuration
const RESPONSE_SHEET_ID = '14Wj7yZSWq6J0Sbkh3yk26c24JCqvfekWJtGxYbjH-pE';
const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
const WEBHOOK_URL = 'http://localhost:3001/webhook/form-submission';
const TODAY = '10/1/2025'; // Target date for processing

async function authenticateGoogleSheets() {
    const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

async function getResponseSheetData(sheets) {
    try {
        console.log(`Accessing response sheet: ${RESPONSE_SHEET_ID}`);

        // Get sheet metadata to understand structure
        const sheetInfo = await sheets.spreadsheets.get({
            spreadsheetId: RESPONSE_SHEET_ID
        });

        console.log('Available sheets:', sheetInfo.data.sheets.map(s => s.properties.title));

        // Try to get data from the first sheet
        const sheetName = sheetInfo.data.sheets[0].properties.title;
        console.log(`Reading data from sheet: ${sheetName}`);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: RESPONSE_SHEET_ID,
            range: `${sheetName}!A:Z`, // Get all columns
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('No data found in response sheet');
            return { headers: [], data: [] };
        }

        console.log(`Found ${rows.length} total rows in response sheet`);
        console.log('Headers:', rows[0]);

        return {
            headers: rows[0],
            data: rows.slice(1) // Skip header row
        };

    } catch (error) {
        console.error('Error accessing response sheet:', error.message);
        if (error.code === 403) {
            console.error('Access denied. Check service account permissions.');
        }
        throw error;
    }
}

function determineSourceTag(headers) {
    // Based on the headers, determine which form this is
    console.log('Analyzing headers to determine form type...');

    // Check for specific header patterns
    const headerStr = headers.join(' ').toLowerCase();

    if (headerStr.includes('interested in the gifted summer program')) {
        console.log('Detected: website form (with Gifted Summer Program field)');
        return 'website';
    } else if (headerStr.includes('returning') || headerStr.includes('previous')) {
        console.log('Detected: returning_students form');
        return 'returning_students';
    } else if (headerStr.includes('ats') || headerStr.includes('qualified')) {
        console.log('Detected: ats_qualifiers form');
        return 'ats_qualifiers';
    } else if (headerStr.includes('early') || headerStr.includes('bird')) {
        console.log('Detected: early_bird form');
        return 'early_bird';
    } else {
        console.log('Detected: website form (default)');
        return 'website';
    }
}

function filterTodaysSubmissions(data, headers) {
    console.log(`\nFiltering submissions for date: ${TODAY}`);

    // Find timestamp column (usually first column)
    const timestampIndex = 0; // Assuming timestamp is in first column
    console.log('Sample timestamps from data:');

    const todaysSubmissions = data.filter((row, index) => {
        if (index < 5) { // Show first 5 for debugging
            console.log(`Row ${index + 2}: ${row[timestampIndex]}`);
        }

        if (!row[timestampIndex]) return false;

        const timestamp = row[timestampIndex];
        // Check if timestamp contains today's date in various formats
        return timestamp.includes('10/1/2025') ||
               timestamp.includes('2025-10-01') ||
               timestamp.includes('Oct 1, 2025') ||
               timestamp.includes('1/10/2025');
    });

    console.log(`Found ${todaysSubmissions.length} submissions for ${TODAY}`);
    return todaysSubmissions;
}

async function processSubmissionThroughWebhook(submission, headers, sourceTag) {
    try {
        // Create formData object with proper structure
        const formData = {
            sourceTag: sourceTag, // This is required by the webhook
            timestamp: submission[0] // Assuming timestamp is first column
        };

        // Add all form fields
        headers.forEach((header, index) => {
            if (submission[index]) {
                formData[header] = submission[index];
            }
        });

        // Create webhook payload matching expected structure
        const webhookPayload = {
            formData: formData,
            source: sourceTag,
            metadata: {
                formName: `${sourceTag} Form`,
                processedAt: new Date().toISOString(),
                originalSheet: RESPONSE_SHEET_ID
            }
        };

        console.log(`\nSending submission to webhook: ${WEBHOOK_URL}`);
        console.log('Payload preview:', {
            sourceTag: formData.sourceTag,
            timestamp: formData.timestamp,
            parentEmail: formData['Parent Email Id'] || formData['Parent Email'] || formData['Email'],
            formDataKeys: Object.keys(formData)
        });

        const response = await axios.post(WEBHOOK_URL, webhookPayload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log(`Webhook response: ${response.status} - ${response.statusText}`);
        return { success: true, response: response.data };

    } catch (error) {
        console.error(`Webhook error: ${error.message}`);
        if (error.response) {
            console.error(`Response status: ${error.response.status}`);
            console.error(`Response data:`, error.response.data);
        }
        return { success: false, error: error.message };
    }
}

async function verifyMasterSheetUpdate(sheets) {
    try {
        console.log('\nVerifying master sheet updates...');

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: MASTER_SHEET_ID,
            range: 'A:Z', // Get all data
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('No data found in master sheet');
            return { totalRows: 0, recentRows: [] };
        }

        console.log(`Master sheet has ${rows.length} total rows`);

        // Show last 5 rows to see recent additions
        const recentRows = rows.slice(-5);
        console.log('Last 5 rows in master sheet:');
        recentRows.forEach((row, index) => {
            console.log(`Row ${rows.length - 5 + index + 1}:`, row.slice(0, 5), '...');
        });

        return { totalRows: rows.length, recentRows };

    } catch (error) {
        console.error('Error verifying master sheet:', error.message);
        throw error;
    }
}

async function main() {
    try {
        console.log('=== PROCESSING TODAY\'S SUBMISSION BACKLOG ===');
        console.log(`Target date: ${TODAY}`);
        console.log(`Response sheet: ${RESPONSE_SHEET_ID}`);
        console.log(`Master sheet: ${MASTER_SHEET_ID}`);
        console.log(`Webhook URL: ${WEBHOOK_URL}`);

        // Step 1: Authenticate with Google Sheets
        console.log('\n1. Authenticating with Google Sheets...');
        const sheets = await authenticateGoogleSheets();
        console.log('✓ Authentication successful');

        // Step 2: Get response sheet data
        console.log('\n2. Accessing response sheet...');
        const { headers, data } = await getResponseSheetData(sheets);

        if (data.length === 0) {
            console.log('No data found in response sheet. Exiting.');
            return;
        }

        // Step 3: Determine the source tag for this form
        console.log('\n3. Determining form type...');
        const sourceTag = determineSourceTag(headers);

        // Step 4: Filter today's submissions
        console.log('\n4. Filtering today\'s submissions...');
        const todaysSubmissions = filterTodaysSubmissions(data, headers);

        if (todaysSubmissions.length === 0) {
            console.log(`No submissions found for ${TODAY}. Exiting.`);
            return;
        }

        // Step 5: Process each submission through webhook
        console.log('\n5. Processing submissions through webhook...');
        const results = [];

        for (let i = 0; i < todaysSubmissions.length; i++) {
            const submission = todaysSubmissions[i];
            console.log(`\n--- Processing submission ${i + 1}/${todaysSubmissions.length} ---`);

            const result = await processSubmissionThroughWebhook(submission, headers, sourceTag);
            results.push({
                submissionIndex: i + 1,
                timestamp: submission[0],
                result
            });

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Step 6: Verify master sheet updates
        console.log('\n6. Verifying master sheet updates...');
        await verifyMasterSheetUpdate(sheets);

        // Step 7: Summary
        console.log('\n=== PROCESSING SUMMARY ===');
        console.log(`Total submissions processed: ${results.length}`);

        const successful = results.filter(r => r.result.success).length;
        const failed = results.filter(r => !r.result.success).length;

        console.log(`Successful: ${successful}`);
        console.log(`Failed: ${failed}`);

        if (failed > 0) {
            console.log('\nFailed submissions:');
            results.filter(r => !r.result.success).forEach(r => {
                console.log(`- Submission ${r.submissionIndex} (${r.timestamp}): ${r.result.error}`);
            });
        }

        console.log('\n✓ Backlog processing complete');

    } catch (error) {
        console.error('\n❌ Error processing backlog:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };