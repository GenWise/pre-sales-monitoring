const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

async function checkMasterSheet() {
    const serviceAccountAuth = new JWT({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const masterSheetId = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';

    try {
        const doc = new GoogleSpreadsheet(masterSheetId, serviceAccountAuth);
        await doc.loadInfo();

        console.log('📊 MASTER SHEET BASELINE:');
        console.log('Title:', doc.title);

        // List all available sheets
        console.log('Available sheets:');
        doc.sheetsByIndex.forEach((sheet, idx) => {
            console.log(`  ${idx}: ${sheet.title}`);
        });

        // Get the first sheet (which should be the main data sheet)
        const masterSheet = doc.sheetsByIndex[0];
        if (!masterSheet) {
            console.log('❌ No sheets found');
            return;
        }

        console.log(`\nUsing sheet: "${masterSheet.title}"`)

        const rows = await masterSheet.getRows();
        console.log('Current row count:', rows.length);

        // Show last few entries
        if (rows.length > 0) {
            console.log('\nLAST 3 ENTRIES:');
            const lastThree = rows.slice(-3);
            lastThree.forEach((row, idx) => {
                const rowNum = rows.length - 3 + idx + 1;
                console.log(`Row ${rowNum + 1}: ${row.get('Timestamp') || 'No timestamp'} | ${row.get('Child Name') || 'No name'} | ${row.get('Email') || 'No email'}`);
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkMasterSheet();