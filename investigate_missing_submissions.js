const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const TARGET_RESPONSE_SHEET_ID = '14Wj7yZSWq6J0Sbkh3yk26c24JCqvfekWJtGxYbjH-pE';
const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';

const ALL_FORMS = {
    returning_students: '1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA',
    ats_qualifiers: '1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ',
    website: '1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg',
    early_bird: '1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY',
    summer_program_2026: '1FAIpQLScAEQXMJgbxWEl40xR3X1QgrvVZRphlbK4wzWXOnMxukAiXMw'
};

async function investigateMissingSubmissions() {
    console.log('🔍 SYSTEMATIC INVESTIGATION: Missing Form Submissions Analysis');
    console.log('='.repeat(80));
    console.log(`🎯 Target Response Sheet: ${TARGET_RESPONSE_SHEET_ID}`);
    console.log(`📊 Master Sheet: ${MASTER_SHEET_ID}`);
    console.log(`📅 Investigation Date: 2025-10-01\n`);

    try {
        const serviceAccountAuth = new JWT({
            keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/forms'
            ],
        });

        // Phase 1: Master Sheet Analysis
        console.log('📋 PHASE 1: MASTER SHEET ANALYSIS');
        console.log('-'.repeat(50));

        const masterDoc = new GoogleSpreadsheet(MASTER_SHEET_ID, serviceAccountAuth);
        await masterDoc.loadInfo();
        const masterSheet = masterDoc.sheetsByIndex[0];
        await masterSheet.loadHeaderRow();
        const masterRows = await masterSheet.getRows();

        console.log(`✅ Master sheet accessed: "${masterDoc.title}"`);
        console.log(`📊 Total leads in master sheet: ${masterRows.length}`);

        // Check today's entries in master sheet
        const today = '2025-10-01';
        const todayMasterEntries = masterRows.filter(row => {
            const timestamp = row.get('Timestamp') || '';
            return timestamp.includes(today) || timestamp.includes('1/10/2025') || timestamp.includes('01/10/2025');
        });

        console.log(`📅 Today's entries in master sheet: ${todayMasterEntries.length}`);
        if (todayMasterEntries.length > 0) {
            console.log('   Recent entries:');
            todayMasterEntries.slice(0, 3).forEach((row, idx) => {
                console.log(`   ${idx + 1}. ${row.get('Parent Name')} (${row.get('Source Tag')}) - ${row.get('Timestamp')}`);
            });
        }

        // Phase 2: Target Response Sheet Analysis
        console.log('\n📋 PHASE 2: TARGET RESPONSE SHEET ANALYSIS');
        console.log('-'.repeat(50));

        try {
            const responseDoc = new GoogleSpreadsheet(TARGET_RESPONSE_SHEET_ID, serviceAccountAuth);
            await responseDoc.loadInfo();

            console.log(`✅ Response sheet accessed: "${responseDoc.title}"`);
            console.log(`📊 Number of sheets: ${responseDoc.sheetsByIndex.length}`);

            // Analyze each sheet in the response document
            for (let i = 0; i < responseDoc.sheetsByIndex.length; i++) {
                const sheet = responseDoc.sheetsByIndex[i];
                await sheet.loadHeaderRow();

                console.log(`\n📄 Sheet ${i + 1}: "${sheet.title}"`);
                console.log(`   Headers: ${sheet.headerValues.slice(0, 8).join(', ')}${sheet.headerValues.length > 8 ? '...' : ''}`);

                const rows = await sheet.getRows();
                console.log(`   Total responses: ${rows.length}`);

                if (rows.length > 0) {
                    // Find timestamp column
                    const timestampCols = ['Timestamp', 'Carimbo de data/hora', 'Date', 'Data'];
                    let timestampCol = null;
                    for (const col of timestampCols) {
                        if (sheet.headerValues.includes(col)) {
                            timestampCol = col;
                            break;
                        }
                    }

                    if (timestampCol) {
                        const latestRow = rows[rows.length - 1];
                        console.log(`   🕐 Latest response: ${latestRow.get(timestampCol)}`);

                        // Check for today's entries
                        const todayResponseEntries = rows.filter(row => {
                            const ts = row.get(timestampCol) || '';
                            return ts.includes(today) || ts.includes('1/10/2025') || ts.includes('01/10/2025');
                        });

                        console.log(`   📅 Today's responses: ${todayResponseEntries.length}`);

                        if (todayResponseEntries.length > 0) {
                            console.log(`   🚨 FOUND TODAY'S SUBMISSIONS!`);
                            console.log('   📝 Sample data:');
                            todayResponseEntries.slice(0, 2).forEach((row, idx) => {
                                const ts = row.get(timestampCol) || '';
                                // Try to find email or name field
                                let identifier = '';
                                for (const header of sheet.headerValues) {
                                    if (header.toLowerCase().includes('email')) {
                                        identifier = row.get(header) || '';
                                        break;
                                    }
                                }
                                if (!identifier) {
                                    for (const header of sheet.headerValues) {
                                        if (header.toLowerCase().includes('name')) {
                                            identifier = row.get(header) || '';
                                            break;
                                        }
                                    }
                                }
                                console.log(`      ${idx + 1}. ${ts} - ${identifier}`);
                            });

                            // Check if these submissions are in master sheet
                            console.log('\n   🔍 CHECKING IF THESE SUBMISSIONS REACHED MASTER SHEET:');
                            const missingSubmissions = [];

                            for (const responseRow of todayResponseEntries) {
                                let found = false;
                                let email = '';

                                // Find email field in response
                                for (const header of sheet.headerValues) {
                                    if (header.toLowerCase().includes('email')) {
                                        email = responseRow.get(header) || '';
                                        break;
                                    }
                                }

                                if (email) {
                                    // Check if this email exists in master sheet
                                    const matchInMaster = masterRows.find(masterRow => {
                                        const masterEmail = masterRow.get('Parent Email') || '';
                                        return masterEmail.toLowerCase() === email.toLowerCase();
                                    });

                                    if (matchInMaster) {
                                        console.log(`      ✅ ${email} - Found in master sheet`);
                                    } else {
                                        console.log(`      ❌ ${email} - MISSING from master sheet`);
                                        missingSubmissions.push({
                                            email: email,
                                            timestamp: responseRow.get(timestampCol),
                                            responseRow: responseRow
                                        });
                                    }
                                }
                            }

                            if (missingSubmissions.length > 0) {
                                console.log(`\n   🚨 PIPELINE BREAK CONFIRMED: ${missingSubmissions.length} submissions not reaching master sheet`);
                                console.log('   💥 ROOT CAUSE: Form script not deployed or webhook failing');
                            }
                        }
                    }
                }
            }

        } catch (responseSheetError) {
            console.log(`❌ Cannot access response sheet: ${responseSheetError.message}`);

            if (responseSheetError.message.includes('403')) {
                console.log('   💡 This could mean:');
                console.log('   - Response sheet exists but service account lacks permission');
                console.log('   - Sheet is owned by different Google account');
                console.log('   - Form owner needs to share response sheet with service account');
            }
        }

        // Phase 3: Form Association Analysis
        console.log('\n📋 PHASE 3: FORM ASSOCIATION ANALYSIS');
        console.log('-'.repeat(50));

        // Try to find which form might be associated with this response sheet
        console.log('🔍 Analyzing form ID patterns...');

        // Check if the response sheet ID has patterns matching any known form
        for (const [formName, formId] of Object.entries(ALL_FORMS)) {
            console.log(`📋 ${formName}: ${formId}`);

            // Check for ID pattern similarities
            const formPrefix = formId.substring(0, 10);
            const responsePrefix = TARGET_RESPONSE_SHEET_ID.substring(0, 10);

            if (formPrefix === responsePrefix) {
                console.log(`   🎯 POTENTIAL MATCH: Similar ID prefix`);
            }
        }

        // Phase 4: Script Deployment Status Check
        console.log('\n📋 PHASE 4: SCRIPT DEPLOYMENT STATUS');
        console.log('-'.repeat(50));

        // Check which scripts exist and which might be missing
        const fs = require('fs');
        const path = require('path');

        console.log('📄 Available form scripts:');
        for (const [formName, formId] of Object.entries(ALL_FORMS)) {
            const scriptPath = `/Users/rajeshpanchanathan/code/pre-sales-monitoring/corrected_scripts/${formName}_bound_script.js`;
            const exists = fs.existsSync(scriptPath);
            console.log(`   ${exists ? '✅' : '❌'} ${formName}: ${exists ? 'Script ready' : 'Script missing'}`);

            if (exists && formName === 'summer_program_2026') {
                console.log(`      💡 ${formName} script exists but may need manual deployment to form`);
                console.log(`      🔗 Deploy at: https://docs.google.com/forms/d/${formId}/edit`);
            }
        }

        // Phase 5: Recommendations
        console.log('\n📋 PHASE 5: ROOT CAUSE ANALYSIS & RECOMMENDATIONS');
        console.log('-'.repeat(50));

        console.log('🎯 LIKELY SCENARIOS:');
        console.log('');
        console.log('1. 🆕 NEW FORM WITHOUT SCRIPT DEPLOYMENT');
        console.log('   - Response sheet exists and collecting submissions');
        console.log('   - Google Apps Script not deployed to form');
        console.log('   - Submissions accumulating but not processed');
        console.log('');
        console.log('2. 🔑 PERMISSION ISSUES');
        console.log('   - Service account lacks access to response sheet');
        console.log('   - Form owner needs to share sheet');
        console.log('');
        console.log('3. ⚙️ SCRIPT CONFIGURATION ERROR');
        console.log('   - Script deployed but webhook URL incorrect');
        console.log('   - Script deployed but trigger not working');
        console.log('');
        console.log('🔧 IMMEDIATE ACTION PLAN:');
        console.log('1. Verify form ownership and get response sheet access');
        console.log('2. Deploy appropriate script to the form');
        console.log('3. Test script functions (testWebhook, testSheetConnection)');
        console.log('4. Process backlog of today\'s submissions');

    } catch (error) {
        console.error('❌ Investigation error:', error.message);
    }
}

investigateMissingSubmissions();