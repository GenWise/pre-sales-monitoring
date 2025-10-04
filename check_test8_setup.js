require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function checkTest8() {
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

    const rows = await sheet.getRows();
    
    console.log('TEST 8 SETUP CHECK');
    console.log('Total rows in sheet:', rows.length);
    
    const test8Records = rows.filter(r => {
        const email = r.get('parent_email') || '';
        return email.includes('test_mixed');
    });
    
    console.log('Test 8 records found:', test8Records.length);
    console.log('Expected: 4');
    
    if (test8Records.length > 0) {
        console.log('Found Test 8 records:');
        test8Records.forEach(r => {
            const email = r.get('parent_email');
            const status = r.get('status');
            const crmLink = r.get('crm_contact_link');
            console.log('  -', email, '| Status:', status, '| CRM:', crmLink ? 'YES' : 'NO');
        });
    } else {
        console.log('TEST 8 DATA NOT FOUND - Setup required');
    }
    
    console.log('');
    console.log('All records by status:');
    const statusCounts = {};
    rows.forEach(r => {
        const status = r.get('status') || 'EMPTY';
        const hasCRM = r.get('crm_contact_link') ? 'Synced' : 'Not Synced';
        const key = status + ' - ' + hasCRM;
        statusCounts[key] = (statusCounts[key] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(' ', status, ':', count);
    });
}

checkTest8().catch(console.error);
