const { google } = require('googleapis');
const fs = require('fs');

// Service account credentials
const serviceAccountKey = JSON.parse(fs.readFileSync('./deployment-package/proxy-api/service-account-key.json', 'utf8'));

const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';

async function authenticateGoogleSheets() {
    const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

async function verifyMasterSheet() {
    try {
        console.log('=== MASTER SHEET VERIFICATION ===');

        const sheets = await authenticateGoogleSheets();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: MASTER_SHEET_ID,
            range: 'A:K', // Get all relevant columns
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('No data found in master sheet');
            return;
        }

        console.log(`Total rows in master sheet: ${rows.length}`);
        console.log('Headers:', rows[0]);

        // Filter for today's submissions (summer_program_2026 source tag)
        const todaysSubmissions = rows.slice(1).filter(row => {
            const sourceTag = row[5]; // Source Tag column
            const timestamp = row[6]; // Timestamp column

            return sourceTag === 'summer_program_2026' &&
                   timestamp &&
                   (timestamp.includes('2025-10-01') || timestamp.includes('2025-01-0'));
        });

        console.log(`\nToday's processed submissions: ${todaysSubmissions.length}`);

        console.log('\n=== TODAY\'S SUBMISSIONS DETAILS ===');
        todaysSubmissions.forEach((row, index) => {
            console.log(`\n${index + 1}. ${row[1]} (${row[0]})`); // Parent Name (Child Name)
            console.log(`   Email: ${row[2]}`);
            console.log(`   Mobile: ${row[3]}`);
            console.log(`   Interest: ${row[4]}`);
            console.log(`   Source: ${row[5]}`);
            console.log(`   Timestamp: ${row[6]}`);
            console.log(`   Duplicate: ${row[7]}`);
            console.log(`   Status: ${row[8]}`);
        });

        // Count duplicates vs new
        const duplicates = todaysSubmissions.filter(row => row[7] === 'Yes').length;
        const newLeads = todaysSubmissions.filter(row => row[7] === 'No').length;

        console.log('\n=== SUMMARY ===');
        console.log(`Total processed today: ${todaysSubmissions.length}`);
        console.log(`New leads: ${newLeads}`);
        console.log(`Duplicates: ${duplicates}`);
        console.log(`Source tag: summer_program_2026`);
        console.log(`All have correct interest level: ${todaysSubmissions.every(row => row[4] === 'High')}`);
        console.log(`All have correct status: ${todaysSubmissions.every(row => row[8] === 'New Parent')}`);

    } catch (error) {
        console.error('Error verifying master sheet:', error.message);
    }
}

verifyMasterSheet();