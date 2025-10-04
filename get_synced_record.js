const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');

async function getMasterSheetData() {
    const serviceAccountInfo = JSON.parse(fs.readFileSync('./service-account-key.json', 'utf8'));
    const authClient = new JWT({
        email: serviceAccountInfo.client_email,
        key: serviceAccountInfo.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const doc = new GoogleSpreadsheet('1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ', authClient);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    const headers = sheet.headerValues;
    console.log('Master Sheet Headers:', headers);
    console.log('\n');

    for (const row of rows) {
        const leadData = {};
        headers.forEach((header, index) => {
            if (row._rawData && row._rawData[index] !== undefined) {
                leadData[header] = row._rawData[index];
            }
        });

        const status = (leadData.status || leadData.Status || '').toLowerCase();
        if (['warm', 'hot', 'not interested'].includes(status)) {
            console.log('MASTER SHEET RECORD SYNCED TO CRM:');
            console.log(JSON.stringify(leadData, null, 2));
            break;
        }
    }
}

getMasterSheetData().catch(console.error);
