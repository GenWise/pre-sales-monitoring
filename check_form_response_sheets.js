const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const FORMS = {
    returning_students: '1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA',
    ats_qualifiers: '1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ',
    website: '1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg',
    early_bird: '1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY'
};

const TARGET_SHEET_ID = '14Wj7yZSWq6J0Sbkh3yk26c24JCqvfekWJtGxYbjH-pE';

async function checkFormResponseSheets() {
    console.log('🔍 Checking form response sheets for each known form...\n');
    console.log(`🎯 Looking for target sheet ID: ${TARGET_SHEET_ID}\n`);

    try {
        const serviceAccountAuth = new JWT({
            keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/forms'
            ],
        });

        for (const [formName, formId] of Object.entries(FORMS)) {
            console.log(`📋 Checking ${formName} (${formId})...`);

            try {
                // Try to access the form's response sheet
                // Google Forms typically create a sheet with ID that starts with the form ID
                // But we need to check what response sheet exists

                // We'll check if the target sheet ID can be accessed and contains form responses
                if (TARGET_SHEET_ID.startsWith(formId.substring(0, 10))) {
                    console.log(`   🎯 POTENTIAL MATCH: ${formName} - IDs start similarly`);
                }

                // Try to access the response sheet directly
                try {
                    const responseDoc = new GoogleSpreadsheet(TARGET_SHEET_ID, serviceAccountAuth);
                    await responseDoc.loadInfo();

                    console.log(`   ✅ Can access target sheet: "${responseDoc.title}"`);
                    console.log(`   📊 Sheets in document: ${responseDoc.sheetsByIndex.length}`);

                    // Check the first sheet for form response structure
                    if (responseDoc.sheetsByIndex.length > 0) {
                        const sheet = responseDoc.sheetsByIndex[0];
                        await sheet.loadHeaderRow();

                        console.log(`   📝 Headers: ${sheet.headerValues.join(', ')}`);

                        // Check if this looks like form responses
                        const hasTimestamp = sheet.headerValues.some(h => h.toLowerCase().includes('timestamp'));
                        const hasEmail = sheet.headerValues.some(h => h.toLowerCase().includes('email'));

                        if (hasTimestamp) {
                            console.log(`   📅 HAS TIMESTAMP COLUMN - This is likely a form response sheet`);

                            // Get recent rows
                            const rows = await sheet.getRows();
                            console.log(`   📊 Total responses: ${rows.length}`);

                            if (rows.length > 0) {
                                const latestRow = rows[rows.length - 1];
                                const timestamp = latestRow.get('Timestamp') || latestRow.get('Carimbo de data/hora') || '';
                                console.log(`   🕐 Latest response: ${timestamp}`);

                                // Check for today's entries
                                const today = '2025-10-01';
                                const todayEntries = rows.filter(row => {
                                    const ts = row.get('Timestamp') || row.get('Carimbo de data/hora') || '';
                                    return ts.includes(today) || ts.includes('1/10/2025') || ts.includes('01/10/2025');
                                });

                                console.log(`   📅 Entries from today (${today}): ${todayEntries.length}`);

                                if (todayEntries.length > 0) {
                                    console.log(`   🚨 FOUND TODAY'S SUBMISSIONS IN THIS SHEET!`);
                                    todayEntries.forEach((row, idx) => {
                                        const ts = row.get('Timestamp') || row.get('Carimbo de data/hora') || '';
                                        console.log(`      ${idx + 1}. ${ts}`);
                                    });
                                }
                            }
                        }
                    }

                    return; // Found the sheet, no need to check others
                } catch (sheetError) {
                    // Sheet doesn't exist or can't access
                }

                console.log(`   ❌ Cannot access target sheet as response sheet for ${formName}`);

            } catch (error) {
                console.log(`   ❌ Error checking ${formName}: ${error.message}`);
            }

            console.log('');
        }

        // Also try to access the target sheet directly without form context
        console.log('🔍 Trying to access target sheet directly...');
        try {
            const targetDoc = new GoogleSpreadsheet(TARGET_SHEET_ID, serviceAccountAuth);
            await targetDoc.loadInfo();

            console.log(`✅ Successfully accessed: "${targetDoc.title}"`);
            console.log(`📊 Number of sheets: ${targetDoc.sheetsByIndex.length}`);

            // Check each sheet
            for (let i = 0; i < targetDoc.sheetsByIndex.length; i++) {
                const sheet = targetDoc.sheetsByIndex[i];
                await sheet.loadHeaderRow();

                console.log(`\n📋 Sheet ${i + 1}: "${sheet.title}"`);
                console.log(`   Headers: ${sheet.headerValues.join(', ')}`);

                const rows = await sheet.getRows();
                console.log(`   Rows: ${rows.length}`);

                if (rows.length > 0) {
                    // Check for today's entries
                    const today = '2025-10-01';
                    const todayEntries = rows.filter(row => {
                        // Check all possible timestamp column names
                        const possibleTimestamps = ['Timestamp', 'Carimbo de data/hora', 'Date', 'Data'];
                        return possibleTimestamps.some(colName => {
                            const value = row.get(colName) || '';
                            return value.includes(today) || value.includes('1/10/2025') || value.includes('01/10/2025');
                        });
                    });

                    console.log(`   📅 Today's entries: ${todayEntries.length}`);

                    if (todayEntries.length > 0) {
                        console.log(`   🚨 FOUND TODAY'S SUBMISSIONS!`);
                        todayEntries.slice(0, 3).forEach((row, idx) => {
                            // Try to find timestamp
                            const possibleTimestamps = ['Timestamp', 'Carimbo de data/hora', 'Date', 'Data'];
                            let timestamp = '';
                            for (const col of possibleTimestamps) {
                                if (row.get(col)) {
                                    timestamp = row.get(col);
                                    break;
                                }
                            }
                            console.log(`      ${idx + 1}. ${timestamp}`);
                        });
                    }
                }
            }

        } catch (error) {
            console.log(`❌ Cannot access target sheet: ${error.message}`);
        }

    } catch (error) {
        console.error('❌ Setup error:', error.message);
    }
}

checkFormResponseSheets();