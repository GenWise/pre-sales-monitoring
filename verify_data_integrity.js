/**
 * Script to verify data integrity after fixes
 * Confirms that all today's submissions are properly processed with correct source tags and interest levels
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

function mapExpectedInterestLevel(originalResponse) {
    if (!originalResponse) return 'Medium';

    const cleaned = originalResponse.replace(/[^\w\s]/g, '').trim().toLowerCase();

    if (cleaned.includes('ready to sign up') || cleaned.includes('save') || cleaned.includes('discount')) {
        return 'High';
    } else if (cleaned.includes('speak to genwise') || cleaned.includes('resolve questions')) {
        return 'Medium';
    } else if (cleaned.includes('not interested')) {
        return 'Low';
    }

    return 'Medium';
}

async function verifyDataIntegrity(sheets) {
    console.log('🔍 VERIFYING DATA INTEGRITY');
    console.log('='.repeat(60));

    // Step 1: Get today's submissions from response sheet
    console.log('📋 Step 1: Getting today\'s submissions from response sheet...');

    const responseSheetData = await sheets.spreadsheets.values.get({
        spreadsheetId: RESPONSE_SHEET_ID,
        range: 'Form Responses 1!A:Z'
    });

    const responseRows = responseSheetData.data.values;
    const responseHeaders = responseRows[0];
    const responseDataRows = responseRows.slice(1);

    const emailIndex = responseHeaders.findIndex(h => h.toLowerCase().includes('email'));
    const interestIndex = responseHeaders.findIndex(h => h.toLowerCase().includes('interested in the gifted summer program'));

    console.log(`📍 Response sheet email column: ${emailIndex} ("${responseHeaders[emailIndex]}")`);
    console.log(`📍 Response sheet interest column: ${interestIndex} ("${responseHeaders[interestIndex]}")`);

    // Get today's submissions
    const todaysSubmissions = responseDataRows.filter(row => {
        const timestamp = row[0];
        return timestamp && timestamp.includes(TODAY);
    });

    console.log(`📊 Found ${todaysSubmissions.length} submissions for ${TODAY}`);

    // Step 2: Get master sheet data
    console.log('\n📋 Step 2: Getting master sheet data...');

    const masterSheetData = await sheets.spreadsheets.values.get({
        spreadsheetId: MASTER_SHEET_ID,
        range: 'A:Z'
    });

    const masterRows = masterSheetData.data.values;
    const masterHeaders = masterRows[0];
    const masterDataRows = masterRows.slice(1);

    const masterEmailIndex = masterHeaders.indexOf('Parent Email');
    const masterSourceTagIndex = masterHeaders.indexOf('Source Tag');
    const masterInterestLevelIndex = masterHeaders.indexOf('Interest Level');

    console.log(`📍 Master sheet email column: ${masterEmailIndex}`);
    console.log(`📍 Master sheet source tag column: ${masterSourceTagIndex}`);
    console.log(`📍 Master sheet interest level column: ${masterInterestLevelIndex}`);

    // Step 3: Verification
    console.log('\n🔍 Step 3: Verification...');
    console.log('-'.repeat(50));

    let allCorrect = true;
    const issues = [];

    for (const submission of todaysSubmissions) {
        const email = submission[emailIndex];
        const originalInterestResponse = submission[interestIndex];
        const expectedInterestLevel = mapExpectedInterestLevel(originalInterestResponse);

        console.log(`\n📧 Checking: ${email}`);
        console.log(`   Original response: "${originalInterestResponse}"`);
        console.log(`   Expected interest level: ${expectedInterestLevel}`);

        // Find this email in master sheet
        const masterEntries = masterDataRows.filter(row => row[masterEmailIndex] === email);

        if (masterEntries.length === 0) {
            console.log(`   ❌ NOT FOUND in master sheet`);
            issues.push(`${email}: Not found in master sheet`);
            allCorrect = false;
            continue;
        }

        // Check each entry for this email
        for (let i = 0; i < masterEntries.length; i++) {
            const entry = masterEntries[i];
            const sourceTag = entry[masterSourceTagIndex];
            const interestLevel = entry[masterInterestLevelIndex];

            console.log(`   Entry ${i + 1}: Source tag = "${sourceTag}", Interest level = "${interestLevel}"`);

            // Verify source tag
            if (sourceTag !== 'website') {
                console.log(`   ❌ INCORRECT SOURCE TAG: Expected "website", got "${sourceTag}"`);
                issues.push(`${email}: Incorrect source tag "${sourceTag}" (should be "website")`);
                allCorrect = false;
            } else {
                console.log(`   ✅ Source tag correct`);
            }

            // Verify interest level
            if (interestLevel !== expectedInterestLevel) {
                console.log(`   ❌ INCORRECT INTEREST LEVEL: Expected "${expectedInterestLevel}", got "${interestLevel}"`);
                issues.push(`${email}: Incorrect interest level "${interestLevel}" (should be "${expectedInterestLevel}")`);
                allCorrect = false;
            } else {
                console.log(`   ✅ Interest level correct`);
            }
        }
    }

    // Step 4: Summary
    console.log('\n🎯 VERIFICATION SUMMARY');
    console.log('='.repeat(60));

    if (allCorrect) {
        console.log('✅ ALL DATA INTEGRITY CHECKS PASSED!');
        console.log(`✅ All ${todaysSubmissions.length} submissions for ${TODAY} are correctly processed`);
        console.log('✅ Source tags are all set to "website"');
        console.log('✅ Interest levels match the original form responses');
    } else {
        console.log(`❌ ${issues.length} DATA INTEGRITY ISSUES FOUND:`);
        issues.forEach((issue, index) => {
            console.log(`   ${index + 1}. ${issue}`);
        });
    }

    // Step 5: Interest level breakdown
    console.log('\n📊 INTEREST LEVEL BREAKDOWN FOR TODAY:');
    console.log('-'.repeat(40));

    const interestLevelCounts = {};

    for (const submission of todaysSubmissions) {
        const originalResponse = submission[interestIndex];
        const expectedLevel = mapExpectedInterestLevel(originalResponse);

        interestLevelCounts[expectedLevel] = (interestLevelCounts[expectedLevel] || 0) + 1;
    }

    Object.entries(interestLevelCounts).forEach(([level, count]) => {
        console.log(`📈 ${level}: ${count} submissions`);
    });

    return { allCorrect, issues, todaysSubmissions, interestLevelCounts };
}

async function main() {
    console.log('🔍 DATA INTEGRITY VERIFICATION');
    console.log('='.repeat(60));
    console.log(`📅 Verification date: ${TODAY}`);
    console.log(`📋 Response sheet: ${RESPONSE_SHEET_ID}`);
    console.log(`📊 Master sheet: ${MASTER_SHEET_ID}`);
    console.log('');

    try {
        const sheets = await authenticateGoogleSheets();
        console.log('✅ Google Sheets authenticated\n');

        const result = await verifyDataIntegrity(sheets);

        console.log('\n🎉 VERIFICATION COMPLETED');
        console.log('='.repeat(60));

        if (result.allCorrect) {
            console.log('🎊 SUCCESS: All data integrity issues have been resolved!');
            console.log('✨ The system is now correctly processing website form submissions');
            console.log('✨ Source tags and interest levels are accurate');
        } else {
            console.log('⚠️ Some issues remain and need attention');
        }

        return result;

    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        console.error(error.stack);
        return { allCorrect: false, issues: [error.message] };
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };