const { google } = require('googleapis');

async function checkSheet() {
    const auth = new google.auth.GoogleAuth({
        keyFile: './service-account-key.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';

    const dataRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Sheet1!A2:M100'
    });

    console.log('Sync-eligible records (Warm|Hot|Not Interested) WITHOUT CRM link:');
    dataRes.data.values.forEach((row, i) => {
        const status = row[9]; // J column
        const crmLink = row[12]; // M column
        const eligible = (status === 'Warm' || status === 'Hot' || status === 'Not Interested');
        const notSynced = !crmLink || crmLink === '';
        if (eligible && notSynced) {
            console.log(`Row ${i+2}: ${row[2]} | ${row[0]} | ${row[9]}`);
        }
    });
}

checkSheet().catch(console.error);
