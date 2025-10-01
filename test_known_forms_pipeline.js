const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const FORMS = {
    returning_students: '1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA',
    ats_qualifiers: '1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ',
    website: '1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg',
    early_bird: '1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY'
};

async function testKnownFormsPipeline() {
    console.log('🔍 Testing known forms pipeline to identify broken connections...\n');

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
            console.log(`📋 Testing ${formName} (${formId})...`);

            try {
                // Method 1: Try to find the response sheet by looking for sheets that contain this form ID
                // Google Forms create response sheets with predictable naming patterns

                // Common response sheet ID patterns:
                const possibleResponseSheetIds = [
                    formId, // Sometimes the response sheet has the same ID as the form
                    `1${formId.substring(1)}`, // Sometimes just a different first character
                    formId.replace(/^1/, '1') // Some other variations
                ];

                // Try each possible response sheet ID
                let foundResponseSheet = false;
                for (const responseSheetId of possibleResponseSheetIds) {
                    try {
                        const responseDoc = new GoogleSpreadsheet(responseSheetId, serviceAccountAuth);
                        await responseDoc.loadInfo();

                        console.log(`   ✅ Found response sheet: "${responseDoc.title}"`);

                        if (responseDoc.sheetsByIndex.length > 0) {
                            const sheet = responseDoc.sheetsByIndex[0];
                            await sheet.loadHeaderRow();

                            console.log(`   📝 Headers: ${sheet.headerValues.slice(0, 5).join(', ')}...`);

                            const rows = await sheet.getRows();
                            console.log(`   📊 Total responses: ${rows.length}`);

                            if (rows.length > 0) {
                                const latestRow = rows[rows.length - 1];
                                const timestamp = latestRow.get('Timestamp') || latestRow.get('Carimbo de data/hora') || 'No timestamp';
                                console.log(`   🕐 Latest response: ${timestamp}`);

                                // Check for today's entries
                                const today = '2025-10-01';
                                const todayEntries = rows.filter(row => {
                                    const ts = row.get('Timestamp') || row.get('Carimbo de data/hora') || '';
                                    return ts.includes(today) || ts.includes('1/10/2025') || ts.includes('01/10/2025');
                                });

                                console.log(`   📅 Today's submissions: ${todayEntries.length}`);

                                if (todayEntries.length > 0) {
                                    console.log(`   🚨 FOUND TODAY'S SUBMISSIONS! This form has new data that should be in master sheet.`);
                                    console.log(`   🔍 Response sheet ID: ${responseSheetId}`);

                                    // Show some sample data
                                    todayEntries.slice(0, 2).forEach((row, idx) => {
                                        const ts = row.get('Timestamp') || row.get('Carimbo de data/hora') || '';
                                        console.log(`      ${idx + 1}. ${ts}`);
                                    });

                                    // This is likely the broken form!
                                    console.log(`   ❌ PIPELINE BREAK DETECTED: Submissions exist but not in master sheet`);
                                }
                            }

                            foundResponseSheet = true;
                            break;
                        }
                    } catch (err) {
                        // This response sheet ID doesn't work, try next
                        continue;
                    }
                }

                if (!foundResponseSheet) {
                    console.log(`   ❌ Cannot find response sheet for ${formName}`);
                    console.log(`   🔍 Trying alternative search methods...`);

                    // Try to access the form directly using Apps Script API
                    // This would require different permissions, so skip for now
                    console.log(`   📝 Form might not have responses or response sheet not accessible`);
                }

            } catch (error) {
                console.log(`   ❌ Error testing ${formName}: ${error.message}`);
            }

            console.log('');
        }

        // Now test if our webhook endpoints are working
        console.log('🌐 Testing webhook endpoints...');

        try {
            const fetch = require('node-fetch');

            // Test local webhook server
            const webhookUrl = 'http://localhost:3001/webhook';
            console.log(`📡 Testing local webhook: ${webhookUrl}`);

            const testPayload = {
                formId: '1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA',
                sourceTag: 'returning_students',
                childName: 'Webhook Test Child',
                parentName: 'Webhook Test Parent',
                parentEmail: 'webhook.test@example.com',
                parentMobile: '+91-9999999999',
                interestLevel: 'High',
                timestamp: new Date().toISOString()
            };

            try {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(testPayload)
                });

                if (response.ok) {
                    const result = await response.text();
                    console.log(`   ✅ Local webhook responding: ${response.status}`);
                    console.log(`   📝 Response: ${result.substring(0, 100)}...`);
                } else {
                    console.log(`   ❌ Local webhook error: ${response.status}`);
                }
            } catch (fetchError) {
                console.log(`   ❌ Local webhook not accessible: ${fetchError.message}`);
                console.log(`   💡 Run: node webhook_server.js to start webhook server`);
            }

        } catch (error) {
            console.log(`   ❌ Webhook test setup error: ${error.message}`);
        }

    } catch (error) {
        console.error('❌ Pipeline test setup error:', error.message);
    }
}

testKnownFormsPipeline();