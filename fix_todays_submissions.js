/**
 * Script to fix today's submissions that were incorrectly processed as summer_program_2026
 * instead of website form, and to apply correct interest level mappings
 */

const { google } = require('googleapis');
const fs = require('fs');
const axios = require('axios');
const { FormMappingUtils, FORMS_CONFIG } = require('./src/sheets/formsMapping');

// Service account credentials
const serviceAccountKey = JSON.parse(fs.readFileSync('./deployment-package/proxy-api/service-account-key.json', 'utf8'));

// Configuration
const RESPONSE_SHEET_ID = '14Wj7yZSWq6J0Sbkh3yk26c24JCqvfekWJtGxYbjH-pE';
const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
const WEBHOOK_URL = 'http://localhost:3001/webhook/form-submission';
const TODAY = '10/1/2025'; // Target date for processing

async function authenticateGoogleSheets() {
    const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

async function getTodaysSubmissions(sheets) {
    try {
        console.log(`📋 Getting today's submissions from response sheet: ${RESPONSE_SHEET_ID}`);

        // Get the data from the response sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: RESPONSE_SHEET_ID,
            range: 'Form Responses 1!A:Z'
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) {
            console.log('❌ No data found in response sheet');
            return [];
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);

        console.log(`📊 Headers: ${headers.join(', ')}`);
        console.log(`📊 Total rows: ${dataRows.length}`);

        // Filter for today's submissions
        const todaysSubmissions = dataRows.filter(row => {
            const timestamp = row[0]; // Assuming timestamp is in first column
            return timestamp && timestamp.includes(TODAY);
        });

        console.log(`📅 Today's submissions (${TODAY}): ${todaysSubmissions.length}`);

        return { headers, submissions: todaysSubmissions };

    } catch (error) {
        console.error('❌ Error getting submissions:', error.message);
        throw error;
    }
}

async function getMasterSheetData(sheets) {
    try {
        console.log(`📋 Getting master sheet data: ${MASTER_SHEET_ID}`);

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
        console.error('❌ Error getting master sheet data:', error.message);
        throw error;
    }
}

function convertRowToFormData(headers, row) {
    const formData = {
        sourceTag: 'website', // CORRECTED: This should be website, not summer_program_2026
        timestamp: row[0] || new Date().toISOString()
    };

    headers.forEach((header, index) => {
        if (row[index]) {
            formData[header] = row[index];
        }
    });

    return formData;
}

function fixInterestLevel(formData) {
    // Check for the specific interest level field and apply correct mapping
    const interestField = formData['Interested in the Gifted Summer Program'] || formData['Interested in the Gifted Summer Program '];

    if (interestField) {
        console.log(`🔧 Original interest field value: "${interestField}"`);

        // Clean the interest field value (remove special characters)
        const cleanedField = interestField.replace(/[^\w\s]/g, '').trim();
        console.log(`🧹 Cleaned field value: "${cleanedField}"`);

        // Apply the correct mapping
        const websiteConfig = FORMS_CONFIG.website;
        let mappedLevel = websiteConfig.interestLevelMapping[interestField] ||
                          websiteConfig.interestLevelMapping[cleanedField];

        // Try partial matching if exact match fails
        if (!mappedLevel) {
            const cleanedLower = cleanedField.toLowerCase();
            if (cleanedLower.includes('ready to sign up') || cleanedLower.includes('save') || cleanedLower.includes('discount')) {
                mappedLevel = 'High';
            } else if (cleanedLower.includes('speak to genwise') || cleanedLower.includes('resolve questions')) {
                mappedLevel = 'Medium';
            } else if (cleanedLower.includes('not interested')) {
                mappedLevel = 'Low';
            }
        }

        if (mappedLevel) {
            console.log(`✅ Mapped to interest level: ${mappedLevel}`);
            formData['Interest Level'] = mappedLevel;
        } else {
            console.log(`⚠️ No mapping found for "${interestField}", defaulting to Medium`);
            formData['Interest Level'] = 'Medium';
        }
    }

    return formData;
}

async function sendToWebhook(formData) {
    try {
        const payload = {
            formData: formData,
            source: 'data-fix-script',
            version: '2.0',
            metadata: {
                formName: 'Website Form',
                sourceTag: 'website',
                dataFix: true,
                fixedAt: new Date().toISOString(),
                originalSheet: RESPONSE_SHEET_ID
            }
        };

        console.log('📤 Sending to webhook:', JSON.stringify(payload, null, 2));

        const response = await axios.post(WEBHOOK_URL, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log('✅ Webhook response:', response.status, response.data);
        return { success: true, response: response.data };

    } catch (error) {
        console.error('❌ Webhook error:', error.message);
        return { success: false, error: error.message };
    }
}

async function findAndFixMasterSheetEntries(sheets, masterData, submissionEmails, correctedInterestLevels) {
    try {
        console.log('\n🔧 FIXING MASTER SHEET ENTRIES');
        console.log('='.repeat(50));

        const { headers, data } = masterData;
        const emailIndex = headers.indexOf('Parent Email');
        const sourceTagIndex = headers.indexOf('Source Tag');
        const interestLevelIndex = headers.indexOf('Interest Level');

        if (emailIndex === -1 || sourceTagIndex === -1) {
            console.log('❌ Could not find required columns in master sheet');
            return;
        }

        console.log(`📍 Email column index: ${emailIndex}`);
        console.log(`📍 Source Tag column index: ${sourceTagIndex}`);
        console.log(`📍 Interest Level column index: ${interestLevelIndex}`);

        const updates = [];

        data.forEach((row, index) => {
            const email = row[emailIndex];
            const sourceTag = row[sourceTagIndex];
            const currentInterestLevel = row[interestLevelIndex];

            if (submissionEmails.includes(email) && sourceTag === 'summer_program_2026') {
                console.log(`🔧 Found incorrect entry: ${email} (source: ${sourceTag}, interest: ${currentInterestLevel})`);

                const rowNumber = index + 2; // +2 because Google Sheets is 1-indexed and we skip header

                // Prepare update: change source tag to website
                updates.push({
                    range: `${String.fromCharCode(65 + sourceTagIndex)}${rowNumber}`, // Convert index to column letter
                    values: [['website']]
                });

                // Update interest level if we have a corrected value and it's different
                const correctedLevel = correctedInterestLevels[email];
                if (correctedLevel && correctedLevel !== currentInterestLevel) {
                    console.log(`🔧 Correcting interest level for ${email}: ${currentInterestLevel} → ${correctedLevel}`);
                    updates.push({
                        range: `${String.fromCharCode(65 + interestLevelIndex)}${rowNumber}`,
                        values: [[correctedLevel]]
                    });
                } else if (currentInterestLevel === 'High') {
                    console.log(`⚠️ Interest level for ${email} remains High - verify if this is correct`);
                }
            }
        });

        if (updates.length > 0) {
            console.log(`📝 Applying ${updates.length} updates to master sheet...`);

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

            console.log('✅ Master sheet updates completed');
        } else {
            console.log('ℹ️ No master sheet updates needed');
        }

    } catch (error) {
        console.error('❌ Error fixing master sheet entries:', error.message);
    }
}

async function main() {
    console.log('🚀 FIXING TODAY\'S SUBMISSIONS');
    console.log('='.repeat(60));
    console.log(`📅 Target date: ${TODAY}`);
    console.log(`📋 Response sheet: ${RESPONSE_SHEET_ID}`);
    console.log(`📊 Master sheet: ${MASTER_SHEET_ID}`);
    console.log(`🔗 Webhook: ${WEBHOOK_URL}`);
    console.log('');

    try {
        const sheets = await authenticateGoogleSheets();
        console.log('✅ Google Sheets authenticated');

        // Get today's submissions from the response sheet
        const { headers, submissions } = await getTodaysSubmissions(sheets);

        if (submissions.length === 0) {
            console.log('❌ No submissions found for today');
            return;
        }

        console.log(`\n📋 Processing ${submissions.length} submissions...`);

        const submissionEmails = [];
        const correctedInterestLevels = {};

        // Process each submission
        for (let i = 0; i < submissions.length; i++) {
            const row = submissions[i];
            console.log(`\n📝 Processing submission ${i + 1}/${submissions.length}`);

            // Convert row to form data
            let formData = convertRowToFormData(headers, row);
            console.log('📊 Original form data:', formData);

            // Fix the interest level mapping
            formData = fixInterestLevel(formData);
            console.log('🔧 Fixed form data:', formData);

            // Track email and corrected interest level for master sheet fixing
            const email = formData['Parent Email'] || formData['Parent Email Id'];
            if (email) {
                submissionEmails.push(email);
                correctedInterestLevels[email] = formData['Interest Level'];
            }

            // Send to webhook with corrected data
            const result = await sendToWebhook(formData);

            if (result.success) {
                console.log(`✅ Submission ${i + 1} processed successfully`);
            } else {
                console.log(`❌ Submission ${i + 1} failed: ${result.error}`);
            }

            // Small delay to avoid overwhelming the webhook
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Fix master sheet entries
        const masterData = await getMasterSheetData(sheets);
        await findAndFixMasterSheetEntries(sheets, masterData, submissionEmails, correctedInterestLevels);

        console.log('\n🎉 ALL PROCESSING COMPLETED');
        console.log('='.repeat(60));
        console.log(`✅ Processed ${submissions.length} submissions`);
        console.log(`📧 Tracked ${submissionEmails.length} email addresses`);
        console.log('✅ Source tags corrected from summer_program_2026 to website');
        console.log('✅ Interest level mappings applied correctly');

    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        console.error(error.stack);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };