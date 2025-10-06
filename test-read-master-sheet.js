/**
 * Read actual master sheet data to see what's being synced
 *
 * Goal: Verify what leads are in the master sheet that should trigger duplicates
 */

require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs').promises;

async function readMasterSheet() {
    console.log('\n=== Reading Master Sheet ===\n');

    const masterSheetId = process.env.PRESALES_MASTER_SHEET_ID;
    const serviceAccountFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;

    const serviceAccountInfo = JSON.parse(await fs.readFile(serviceAccountFile, 'utf8'));
    const authClient = new JWT({
        email: serviceAccountInfo.client_email,
        key: serviceAccountInfo.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const doc = new GoogleSpreadsheet(masterSheetId, authClient);
    await doc.loadInfo();
    console.log('Sheet title:', doc.title);

    const sheet = doc.sheetsByIndex[0];
    console.log('Tab name:', sheet.title);

    const rows = await sheet.getRows();
    console.log('Total rows:', rows.length);

    console.log('\n=== Rows with Status = Warm/Hot (should sync) ===\n');

    let warmHotCount = 0;
    for (const row of rows) {
        const status = row.get('status');
        if (status === 'Warm' || status === 'Hot') {
            warmHotCount++;
            const parentEmail = row.get('parent_email');
            const parentMobile = row.get('parent_mobile');
            const childName = row.get('child_name');
            const crmLink = row.get('crm_contact_link');

            console.log(`${warmHotCount}. Status: ${status}`);
            console.log(`   Email: ${parentEmail}`);
            console.log(`   Mobile: ${parentMobile}`);
            console.log(`   Child: ${childName}`);
            console.log(`   CRM Link: ${crmLink || 'Not set'}`);
            console.log('');
        }
    }

    console.log(`Total Warm/Hot records: ${warmHotCount}`);

    console.log('\n=== Checking for mobile "1212121212" ===\n');
    const mobile1212 = rows.filter(row => row.get('parent_mobile') === '1212121212');
    console.log(`Records with mobile 1212121212: ${mobile1212.length}`);
    mobile1212.forEach((row, idx) => {
        console.log(`${idx + 1}. Email: ${row.get('parent_email')}, Status: ${row.get('status')}, CRM: ${row.get('crm_contact_link') || 'Not set'}`);
    });

    console.log('\n=== Checking for mobile "7367482345" ===\n');
    const mobile7367 = rows.filter(row => row.get('parent_mobile') === '7367482345');
    console.log(`Records with mobile 7367482345: ${mobile7367.length}`);
    mobile7367.forEach((row, idx) => {
        console.log(`${idx + 1}. Email: ${row.get('parent_email')}, Status: ${row.get('status')}, CRM: ${row.get('crm_contact_link') || 'Not set'}`);
    });
}

readMasterSheet()
    .then(() => console.log('\nDone'))
    .catch(error => console.error('Error:', error));
