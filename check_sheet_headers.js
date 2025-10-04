require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function checkHeaders() {
    const serviceAccountAuth = new JWT({
        keyFile: './service-account-key.json',
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive',
        ],
    });

    const doc = new GoogleSpreadsheet('1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ', serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow();

    console.log('Sheet title:', sheet.title);
    console.log('Headers:', sheet.headerValues);
    console.log('');

    const rows = await sheet.getRows({ limit: 3 });
    console.log('Total rows:', rows.length);
    
    if (rows.length > 0) {
        console.log('\nFirst row raw data:');
        const firstRow = rows[0];
        console.log('Row object keys:', Object.keys(firstRow.toObject()));
        console.log('Row data:', firstRow.toObject());
    }
}

checkHeaders().catch(console.error);
