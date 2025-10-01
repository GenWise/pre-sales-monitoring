/**
 * Script to fix interest levels in master sheet for today's website form submissions
 * that were incorrectly set to "High" instead of their proper values
 */

const { google } = require('googleapis');
const fs = require('fs');

// Service account credentials
const serviceAccountKey = JSON.parse(fs.readFileSync('./deployment-package/proxy-api/service-account-key.json', 'utf8'));

// Configuration
const RESPONSE_SHEET_ID = '14Wj7yZSWq6J0Sbkh3yk26c24JCqvfekWJtGxYbjH-pE';
const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
const TODAY = '10/1/2025';

async function authenticateGoogleSheets() {
    const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

function mapInterestLevel(originalResponse) {
    if (!originalResponse) return 'Medium';

    // Clean the response (remove special characters)
    const cleaned = originalResponse.replace(/[^\w\s]/g, '').trim().toLowerCase();

    // Apply specific mappings for the website form
    if (cleaned.includes('ready to sign up') || cleaned.includes('save') || cleaned.includes('discount')) {
        return 'High';
    } else if (cleaned.includes('speak to genwise') || cleaned.includes('resolve questions')) {
        return 'Medium';
    } else if (cleaned.includes('not interested')) {
        return 'Low';
    }

    // Default fallback
    return 'Medium';
}

async function getTodaysResponseData(sheets) {
    try {
        console.log(`📋 Getting today's response data from sheet: ${RESPONSE_SHEET_ID}`);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: RESPONSE_SHEET_ID,
            range: 'Form Responses 1!A:Z'
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) {
            console.log('❌ No data found in response sheet');
            return {};
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);

        console.log(`📊 Headers: ${headers.join(', ')}`);

        // Find the relevant columns
        const emailIndex = headers.findIndex(h => h.toLowerCase().includes('email'));
        const interestIndex = headers.findIndex(h => h.toLowerCase().includes('interested in the gifted summer program'));

        if (emailIndex === -1 || interestIndex === -1) {
            console.log('❌ Could not find required columns in response sheet');
            return {};
        }

        console.log(`📍 Email column index: ${emailIndex} ("${headers[emailIndex]}")`);
        console.log(`📍 Interest column index: ${interestIndex} ("${headers[interestIndex]}")`);

        // Create mapping of email to correct interest level
        const emailToInterestLevel = {};

        dataRows.forEach(row => {
            const timestamp = row[0];
            const email = row[emailIndex];
            const interestResponse = row[interestIndex];

            if (timestamp && timestamp.includes(TODAY) && email && interestResponse) {
                const correctedLevel = mapInterestLevel(interestResponse);
                emailToInterestLevel[email] = {
                    originalResponse: interestResponse,
                    correctedLevel: correctedLevel
                };
                console.log(`📧 ${email}: "${interestResponse}" → ${correctedLevel}`);
            }
        });

        console.log(`📊 Found ${Object.keys(emailToInterestLevel).length} email-to-interest mappings`);
        return emailToInterestLevel;

    } catch (error) {
        console.error('❌ Error getting response data:', error.message);
        throw error;
    }
}

async function fixMasterSheetInterestLevels(sheets, emailToInterestLevel) {
    try {
        console.log('\n🔧 FIXING MASTER SHEET INTEREST LEVELS');
        console.log('='.repeat(50));

        // Get master sheet data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: MASTER_SHEET_ID,
            range: 'A:Z'
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) {
            console.log('❌ No data found in master sheet');
            return;
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);

        const emailIndex = headers.indexOf('Parent Email');
        const sourceTagIndex = headers.indexOf('Source Tag');
        const interestLevelIndex = headers.indexOf('Interest Level');

        if (emailIndex === -1 || sourceTagIndex === -1 || interestLevelIndex === -1) {
            console.log('❌ Could not find required columns in master sheet');
            return;
        }

        console.log(`📍 Email column index: ${emailIndex}`);
        console.log(`📍 Source Tag column index: ${sourceTagIndex}`);
        console.log(`📍 Interest Level column index: ${interestLevelIndex}`);

        const updates = [];

        dataRows.forEach((row, index) => {
            const email = row[emailIndex];
            const sourceTag = row[sourceTagIndex];
            const currentInterestLevel = row[interestLevelIndex];

            // Check if this is a website form entry that we need to fix
            if (sourceTag === 'website' && emailToInterestLevel[email]) {
                const correctLevel = emailToInterestLevel[email].correctedLevel;
                const originalResponse = emailToInterestLevel[email].originalResponse;

                if (currentInterestLevel !== correctLevel) {
                    console.log(`🔧 ${email}: ${currentInterestLevel} → ${correctLevel} (based on: "${originalResponse}")`);

                    const rowNumber = index + 2; // +2 because Google Sheets is 1-indexed and we skip header
                    updates.push({
                        range: `${String.fromCharCode(65 + interestLevelIndex)}${rowNumber}`,
                        values: [[correctLevel]]
                    });
                } else {
                    console.log(`✅ ${email}: already correct (${currentInterestLevel})`);
                }
            }
        });

        if (updates.length > 0) {
            console.log(`\n📝 Applying ${updates.length} interest level updates...`);

            for (const update of updates) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: MASTER_SHEET_ID,
                    range: update.range,
                    valueInputOption: 'RAW',
                    resource: {
                        values: update.values
                    }
                });
                console.log(`✅ Updated ${update.range} to: ${update.values[0][0]}`);
            }

            console.log('✅ Interest level updates completed');
        } else {
            console.log('ℹ️ No interest level updates needed');
        }

    } catch (error) {
        console.error('❌ Error fixing master sheet interest levels:', error.message);
    }
}

async function main() {
    console.log('🔧 FIXING INTEREST LEVELS IN MASTER SHEET');
    console.log('='.repeat(60));
    console.log(`📅 Target date: ${TODAY}`);
    console.log(`📋 Response sheet: ${RESPONSE_SHEET_ID}`);
    console.log(`📊 Master sheet: ${MASTER_SHEET_ID}`);
    console.log('');

    try {
        const sheets = await authenticateGoogleSheets();
        console.log('✅ Google Sheets authenticated');

        // Get the correct interest level mappings from today's responses
        const emailToInterestLevel = await getTodaysResponseData(sheets);

        if (Object.keys(emailToInterestLevel).length === 0) {
            console.log('❌ No data to process');
            return;
        }

        // Fix the master sheet interest levels
        await fixMasterSheetInterestLevels(sheets, emailToInterestLevel);

        console.log('\n🎉 INTEREST LEVEL FIXES COMPLETED');
        console.log('='.repeat(60));
        console.log(`✅ Processed ${Object.keys(emailToInterestLevel).length} email mappings`);
        console.log('✅ Interest levels corrected based on actual form responses');

    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        console.error(error.stack);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };