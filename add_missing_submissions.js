// Add Missing Website Form Submissions to Master Sheet
const { google } = require('googleapis');
require('dotenv').config();

// Master sheet configuration
const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';

// Missing submissions from website form (10/1/2025)
const missingSubmissions = [
    {
        timestamp: '10/1/2025 10:40:58',
        child_name: 'Test Child Webhook',
        parent_email: 'webhook.test@automation.com',
        parent_name: '',  // Not provided in original data
        parent_mobile: '', // Not provided in original data
        interest_level: 'Medium',  // Default for website form
        source_tag: 'website'
    },
    {
        timestamp: '10/1/2025 10:51:17',
        child_name: 'pattu kutti',
        parent_email: 'aiyo@aiaiyo.com',
        parent_name: '',
        parent_mobile: '',
        interest_level: 'Medium',
        source_tag: 'website'
    },
    {
        timestamp: '10/1/2025 15:19:54',
        child_name: 'test child',
        parent_email: 'test@test.com',
        parent_name: '',
        parent_mobile: '',
        interest_level: 'Medium',
        source_tag: 'website'
    },
    {
        timestamp: '10/1/2025 16:34:09',
        child_name: 'test test',
        parent_email: 'test@parent.com',
        parent_name: '',
        parent_mobile: '',
        interest_level: 'Medium',
        source_tag: 'website'
    },
    {
        timestamp: '10/1/2025 16:34:56',
        child_name: 'test',
        parent_email: 'test@parent.com',
        parent_name: '',
        parent_mobile: '',
        interest_level: 'Medium',
        source_tag: 'website'
    },
    {
        timestamp: '10/1/2025 17:23:18',
        child_name: 'Child',
        parent_email: 'parent@parent.com',
        parent_name: '',
        parent_mobile: '',
        interest_level: 'Medium',
        source_tag: 'website'
    },
    {
        timestamp: '10/1/2025 21:26:47',
        child_name: 'Test Beta',
        parent_email: 'mamapapa@parent.com',
        parent_name: '',
        parent_mobile: '',
        interest_level: 'Medium',
        source_tag: 'website'
    },
    {
        timestamp: '10/1/2025 22:30:33',
        child_name: 'Testimonial',
        parent_email: 'test@parent.ing',
        parent_name: '',
        parent_mobile: '',
        interest_level: 'Medium',
        source_tag: 'website'
    }
];

async function addMissingSubmissions() {
    console.log('Adding 8 missing website form submissions...\n');

    try {
        // Initialize Google Sheets API
        const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // First, read existing data to check for duplicates
        console.log('1. Checking for existing duplicates...');
        const existingData = await sheets.spreadsheets.values.get({
            spreadsheetId: MASTER_SHEET_ID,
            range: 'Sheet1!A:K'
        });

        const existingEmails = new Set();
        if (existingData.data.values && existingData.data.values.length > 1) {
            // Skip header row
            for (let i = 1; i < existingData.data.values.length; i++) {
                const row = existingData.data.values[i];
                if (row[3]) { // Parent email is in column D (index 3)
                    existingEmails.add(row[3].toLowerCase());
                }
            }
        }

        console.log(`Found ${existingEmails.size} existing emails in master sheet`);

        // Prepare new rows to add
        const newRows = [];
        const duplicatesFound = [];

        for (const submission of missingSubmissions) {
            const email = submission.parent_email.toLowerCase();

            if (existingEmails.has(email)) {
                duplicatesFound.push(submission);
                console.log(`⚠️  Duplicate found: ${submission.parent_email} (${submission.child_name})`);
            } else {
                // Row format: [Timestamp, Child Name, Parent Name, Parent Email, Parent Mobile, Interest Level, Source Tag, Status, Assigned Owner, Duplicate Flag, Notes]
                const row = [
                    submission.timestamp,
                    submission.child_name,
                    submission.parent_name,
                    submission.parent_email,
                    submission.parent_mobile,
                    submission.interest_level,
                    submission.source_tag,
                    'New Parent',  // Default status
                    'Unassigned',  // Default assigned owner
                    'No',          // Default duplicate flag
                    'Added manually from missing website submissions'
                ];
                newRows.push(row);
            }
        }

        if (newRows.length === 0) {
            console.log('\n✅ No new submissions to add (all were duplicates)');
            return;
        }

        console.log(`\n2. Adding ${newRows.length} new submissions to master sheet...`);

        // Add the new rows
        const result = await sheets.spreadsheets.values.append({
            spreadsheetId: MASTER_SHEET_ID,
            range: 'Sheet1!A:K',
            valueInputOption: 'RAW',
            resource: {
                values: newRows
            }
        });

        console.log(`✅ Successfully added ${newRows.length} submissions to master sheet`);

        // Show summary
        console.log('\n========================================');
        console.log('SUBMISSION SUMMARY');
        console.log('========================================');

        newRows.forEach((row, index) => {
            console.log(`✅ Added: ${row[1]} (${row[3]})`);
        });

        if (duplicatesFound.length > 0) {
            console.log('\nDuplicates skipped:');
            duplicatesFound.forEach(dup => {
                console.log(`⚠️  ${dup.child_name} (${dup.parent_email})`);
            });
        }

        console.log(`\n🎉 Successfully processed ${missingSubmissions.length} submissions`);
        console.log(`   - Added: ${newRows.length}`);
        console.log(`   - Duplicates skipped: ${duplicatesFound.length}`);

    } catch (error) {
        console.error('❌ Error adding submissions:', error.message);
        console.error(error);
    }
}

// Run the script
addMissingSubmissions();