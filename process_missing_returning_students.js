/**
 * URGENT: Process Missing Returning Students Submissions
 *
 * This script specifically processes missing submissions from the returning_students form
 * for 10/1/2025 that were not captured by the automated webhook system.
 *
 * Target data:
 * - Response Sheet ID: 14Wj7yZSWq6J0Sbkh3yk26c24JCqvfekWJtGxYbjH-pE
 * - Missing entries: Row 114 and potentially others from 10/1/2025
 * - Specific emails: bharati.puri@gmail.com, essan96foryou@gmail.com
 * - Target: Master sheet 1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Service account credentials
const serviceAccountKey = JSON.parse(fs.readFileSync('./credentials/service-account-key.json', 'utf8'));

// Configuration
const RETURNING_STUDENTS_RESPONSE_SHEET_ID = '14Wj7yZSWq6J0Sbkh3yk26c24JCqvfekWJtGxYbjH-pE';
const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
const TARGET_DATE = '10/1/2025';
const TARGET_EMAILS = ['bharati.puri@gmail.com', 'essan96foryou@gmail.com'];
const SOURCE_TAG = 'returning_students';

// Field mappings specific to returning_students form
const FIELD_MAPPINGS = {
    'Parent Email Id': 'Parent Email',  // KEY MAPPING for this form
    'Parent Email': 'Parent Email',
    'Child Name': 'Child Name',
    'Parent Name': 'Parent Name',
    'Parent Mobile': 'Parent Mobile',
    'Parent Mobile Number': 'Parent Mobile',  // Handle both variations
    'Interested in the Gifted Summer Program': 'Interest Level',
    'Interested in the Gifted Summer Program ': 'Interest Level', // with trailing space
    'Timestamp': 'Timestamp'
};

// Interest level mappings for returning_students form
const INTEREST_LEVEL_MAPPINGS = {
    'Ready to sign up and save almost 25% through available discounts': 'High',
    'Ready to Sign up and save almost 25% through available discounts': 'High',
    'Like to speak to genwise team to resolve questions on my mind': 'Medium',
    'Like to speak to GenWise team to resolve questions on my mind': 'Medium',
    'Not interested in the genwise summer program right now': 'Low',
    'Not interested in the GenWise Summer Program right now': 'Low'
};

// Required master sheet columns in order
const MASTER_SHEET_COLUMNS = [
    'Timestamp',
    'Child Name',
    'Parent Name',
    'Parent Email',
    'Parent Mobile',
    'Interest Level',
    'Source Tag',
    'Duplicate Flag',
    'Status',
    'Assigned Owner',
    'Notes'
];

async function authenticateGoogleSheets() {
    const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

async function getResponseSheetData(sheets) {
    try {
        console.log(`📋 Reading response sheet: ${RETURNING_STUDENTS_RESPONSE_SHEET_ID}`);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: RETURNING_STUDENTS_RESPONSE_SHEET_ID,
            range: 'Form Responses 1!A:Z'
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) {
            console.log('❌ No data found in response sheet');
            return { headers: [], data: [] };
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);

        console.log(`📊 Response sheet headers: ${headers.join(', ')}`);
        console.log(`📊 Total response rows: ${dataRows.length}`);

        return { headers, data: dataRows };

    } catch (error) {
        console.error('❌ Error reading response sheet:', error.message);
        throw error;
    }
}

async function getMasterSheetData(sheets) {
    try {
        console.log(`📋 Reading master sheet: ${MASTER_SHEET_ID}`);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: MASTER_SHEET_ID,
            range: 'A:Z'
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) {
            console.log('❌ No data found in master sheet');
            return { headers: [], data: [] };
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);

        console.log(`📊 Master sheet headers: ${headers.join(', ')}`);
        console.log(`📊 Master sheet rows: ${dataRows.length}`);

        return { headers, data: dataRows };

    } catch (error) {
        console.error('❌ Error reading master sheet:', error.message);
        throw error;
    }
}

function filterTargetSubmissions(headers, data) {
    console.log(`🔍 Filtering submissions for date: ${TARGET_DATE} and specific emails: ${TARGET_EMAILS.join(', ')}`);

    const timestampIndex = headers.findIndex(h =>
        h.toLowerCase().includes('timestamp') || h.toLowerCase().includes('time')
    );

    const emailIndex = headers.findIndex(h =>
        h.toLowerCase().includes('email')
    );

    if (timestampIndex === -1) {
        console.log('❌ No timestamp column found');
        return [];
    }

    if (emailIndex === -1) {
        console.log('❌ No email column found');
        return [];
    }

    console.log(`📅 Timestamp column index: ${timestampIndex} (${headers[timestampIndex]})`);
    console.log(`📧 Email column index: ${emailIndex} (${headers[emailIndex]})`);

    const targetSubmissions = data.filter((row, index) => {
        const timestamp = row[timestampIndex];
        const email = row[emailIndex];

        const isToday = timestamp && timestamp.includes(TARGET_DATE);
        const isTargetEmail = email && TARGET_EMAILS.some(targetEmail =>
            email.toLowerCase() === targetEmail.toLowerCase()
        );

        if (isToday) {
            console.log(`✅ Found today's submission at row ${index + 2}: ${timestamp} - ${email}`);
        }

        if (isTargetEmail) {
            console.log(`🎯 Found target email at row ${index + 2}: ${email} - ${timestamp}`);
        }

        return isToday || isTargetEmail;
    });

    console.log(`📊 Found ${targetSubmissions.length} target submissions`);
    return targetSubmissions.map((row, index) => ({ row, originalIndex: data.indexOf(row) + 2 }));
}

function mapFieldsToMasterFormat(headers, submissionRow) {
    console.log('\n🔄 MAPPING FIELDS');
    console.log('='.repeat(40));

    const mappedData = {};

    // Map each field according to our field mappings
    headers.forEach((header, index) => {
        const value = submissionRow[index];
        if (!value) return;

        const masterField = FIELD_MAPPINGS[header];
        if (masterField) {
            console.log(`📝 Mapping: "${header}" → "${masterField}" = "${value}"`);
            mappedData[masterField] = value;
        } else {
            console.log(`⚠️ Unmapped field: "${header}" = "${value}"`);
        }
    });

    // Handle interest level mapping
    if (mappedData['Interest Level']) {
        const originalLevel = mappedData['Interest Level'];
        const mappedLevel = INTEREST_LEVEL_MAPPINGS[originalLevel];

        if (mappedLevel) {
            console.log(`🎯 Interest level mapping: "${originalLevel}" → "${mappedLevel}"`);
            mappedData['Interest Level'] = mappedLevel;
        } else {
            console.log(`⚠️ No interest mapping for: "${originalLevel}", defaulting to Medium`);
            mappedData['Interest Level'] = 'Medium';
        }
    }

    // Set required default values
    mappedData['Source Tag'] = SOURCE_TAG;
    mappedData['Duplicate Flag'] = 'No';
    mappedData['Status'] = 'New Parent';
    mappedData['Assigned Owner'] = 'Unassigned';
    mappedData['Notes'] = `Recovered missing submission on ${new Date().toISOString()}`;

    // Ensure timestamp is formatted correctly
    if (!mappedData['Timestamp']) {
        mappedData['Timestamp'] = new Date().toISOString();
    }

    console.log('\n📋 Final mapped data:');
    Object.entries(mappedData).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });

    return mappedData;
}

function checkForDuplicates(masterData, submissionEmail) {
    console.log(`🔍 Checking for duplicates of email: ${submissionEmail}`);

    const emailIndex = masterData.headers.indexOf('Parent Email');
    if (emailIndex === -1) {
        console.log('⚠️ Parent Email column not found in master sheet');
        return false;
    }

    const duplicate = masterData.data.find(row => {
        const email = row[emailIndex];
        return email && email.toLowerCase() === submissionEmail.toLowerCase();
    });

    if (duplicate) {
        console.log(`⚠️ DUPLICATE FOUND: ${submissionEmail} already exists in master sheet`);
        return true;
    } else {
        console.log(`✅ No duplicate found for: ${submissionEmail}`);
        return false;
    }
}

function formatRowForMasterSheet(mappedData) {
    // Create row in the exact order of master sheet columns
    const row = MASTER_SHEET_COLUMNS.map(column => mappedData[column] || '');

    console.log('\n📝 Formatted row for master sheet:');
    MASTER_SHEET_COLUMNS.forEach((column, index) => {
        console.log(`   ${index + 1}. ${column}: "${row[index]}"`);
    });

    return row;
}

async function appendToMasterSheet(sheets, formattedRow) {
    try {
        console.log('\n📤 Appending to master sheet...');

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: MASTER_SHEET_ID,
            range: 'A:Z',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [formattedRow]
            }
        });

        console.log('✅ Successfully appended to master sheet');
        console.log(`📊 Updated range: ${response.data.updates.updatedRange}`);

        return true;

    } catch (error) {
        console.error('❌ Error appending to master sheet:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚨 PROCESSING MISSING RETURNING STUDENTS SUBMISSIONS');
    console.log('='.repeat(70));
    console.log(`📅 Target date: ${TARGET_DATE}`);
    console.log(`📋 Response sheet: ${RETURNING_STUDENTS_RESPONSE_SHEET_ID}`);
    console.log(`📊 Master sheet: ${MASTER_SHEET_ID}`);
    console.log(`🏷️ Source tag: ${SOURCE_TAG}`);
    console.log(`📧 Target emails: bharati.puri@gmail.com, essan96foryou@gmail.com`);
    console.log('');

    try {
        // Authenticate with Google Sheets
        const sheets = await authenticateGoogleSheets();
        console.log('✅ Google Sheets authenticated');

        // Get response sheet data
        const responseData = await getResponseSheetData(sheets);
        if (responseData.data.length === 0) {
            console.log('❌ No response data found');
            return;
        }

        // Get master sheet data for duplicate checking
        const masterData = await getMasterSheetData(sheets);

        // Filter for target submissions (today's date or specific emails)
        const targetSubmissions = filterTargetSubmissions(responseData.headers, responseData.data);

        if (targetSubmissions.length === 0) {
            console.log(`❌ No target submissions found`);
            return;
        }

        console.log(`\n📋 Processing ${targetSubmissions.length} submissions...`);

        let processedCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;

        // Process each submission
        for (let i = 0; i < targetSubmissions.length; i++) {
            const { row, originalIndex } = targetSubmissions[i];

            console.log(`\n${'='.repeat(50)}`);
            console.log(`📝 PROCESSING SUBMISSION ${i + 1}/${targetSubmissions.length}`);
            console.log(`📍 Original row: ${originalIndex}`);
            console.log(`${'='.repeat(50)}`);

            try {
                // Map fields to master format
                const mappedData = mapFieldsToMasterFormat(responseData.headers, row);

                // Check for required email field
                const email = mappedData['Parent Email'];
                if (!email) {
                    console.log('❌ No parent email found, skipping submission');
                    errorCount++;
                    continue;
                }

                console.log(`📧 Processing email: ${email}`);

                // Check for duplicates
                if (checkForDuplicates(masterData, email)) {
                    console.log(`⏭️ Skipping duplicate: ${email}`);
                    duplicateCount++;
                    continue;
                }

                // Format row for master sheet
                const formattedRow = formatRowForMasterSheet(mappedData);

                // Append to master sheet
                const success = await appendToMasterSheet(sheets, formattedRow);

                if (success) {
                    processedCount++;
                    console.log(`✅ Successfully processed: ${email}`);

                    // Add to master data for subsequent duplicate checking
                    masterData.data.push(formattedRow);
                } else {
                    errorCount++;
                    console.log(`❌ Failed to process: ${email}`);
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`❌ Error processing submission ${i + 1}:`, error.message);
                errorCount++;
            }
        }

        // Final summary
        console.log('\n🎉 PROCESSING COMPLETE');
        console.log('='.repeat(70));
        console.log(`📊 Total submissions found: ${targetSubmissions.length}`);
        console.log(`✅ Successfully processed: ${processedCount}`);
        console.log(`⚠️ Duplicates skipped: ${duplicateCount}`);
        console.log(`❌ Errors encountered: ${errorCount}`);
        console.log('');

        if (processedCount > 0) {
            console.log('🎯 MISSION ACCOMPLISHED');
            console.log(`✅ ${processedCount} missing customer leads have been recovered and added to the master sheet`);
            console.log(`🏷️ All entries tagged with source: ${SOURCE_TAG}`);
            console.log(`📋 Master sheet updated: ${MASTER_SHEET_ID}`);
        } else {
            console.log('⚠️ No new submissions were processed');
        }

    } catch (error) {
        console.error('💥 FATAL ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };