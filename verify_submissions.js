// Final Verification: Check All 8 Missing Submissions Status
const { google } = require('googleapis');
require('dotenv').config();

const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';

const originalSubmissions = [
    { row: 107, time: '10:40:58', child: 'Test Child Webhook', email: 'webhook.test@automation.com' },
    { row: 108, time: '10:51:17', child: 'pattu kutti', email: 'aiyo@aiaiyo.com' },
    { row: 109, time: '15:19:54', child: 'test child', email: 'test@test.com' },
    { row: 110, time: '16:34:09', child: 'test test', email: 'test@parent.com' },
    { row: 111, time: '16:34:56', child: 'test', email: 'test@parent.com' },
    { row: 112, time: '17:23:18', child: 'Child', email: 'parent@parent.com' },
    { row: 113, time: '21:26:47', child: 'Test Beta', email: 'mamapapa@parent.com' },
    { row: 114, time: '22:30:33', child: 'Testimonial', email: 'test@parent.ing' }
];

async function verifyAllSubmissions() {
    console.log('========================================');
    console.log('MISSING SUBMISSIONS VERIFICATION');
    console.log('========================================\n');

    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: MASTER_SHEET_ID,
            range: 'Sheet1!A:K'
        });

        const rows = response.data.values;
        let found = 0;
        let duplicates = 0;

        console.log('Checking status of all 8 missing submissions:\n');

        for (const submission of originalSubmissions) {
            const matchingRows = rows.filter(row =>
                row[3] && row[3].toLowerCase() === submission.email.toLowerCase()
            );

            if (matchingRows.length === 0) {
                console.log(`❌ Row ${submission.row} (${submission.time}): ${submission.child} → ${submission.email} - NOT FOUND`);
            } else if (matchingRows.length === 1) {
                console.log(`✅ Row ${submission.row} (${submission.time}): ${submission.child} → ${submission.email} - ADDED`);
                found++;
            } else {
                console.log(`🔄 Row ${submission.row} (${submission.time}): ${submission.child} → ${submission.email} - DUPLICATE (${matchingRows.length} entries)`);
                duplicates++;
                found++;
            }
        }

        console.log('\n========================================');
        console.log('FINAL SUMMARY');
        console.log('========================================');
        console.log(`Total original submissions: ${originalSubmissions.length}`);
        console.log(`Found in master sheet: ${found}`);
        console.log(`New additions: ${found - duplicates}`);
        console.log(`Pre-existing duplicates: ${duplicates}`);

        if (found === originalSubmissions.length) {
            console.log('\n🎉 SUCCESS: All 8 submissions are now in the master sheet!');
            console.log('✅ User submission "Testimonial → test@parent.ing" is included');
        } else {
            console.log('\n⚠️  Some submissions may still be missing');
        }

        // Show current master sheet row count
        console.log(`\nMaster sheet total rows: ${rows.length}`);
        console.log('Dashboard should now display all submissions');

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }
}

verifyAllSubmissions();