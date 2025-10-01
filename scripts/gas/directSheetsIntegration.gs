/**
 * Google Apps Script for Direct Google Sheets Integration
 * Deploy this script to each Google Form to enable real-time sync to master database
 *
 * This version writes directly to Google Sheets instead of using webhooks
 *
 * SETUP INSTRUCTIONS:
 * 1. Open Google Apps Script (script.google.com)
 * 2. Create a new project and give it a descriptive name (e.g., "returning_students-MasterSheet-Integration")
 * 3. Replace the default code with this file's contents
 * 4. Update the MASTER_SHEET_ID constant below with your master sheet ID
 * 5. Update FORM_SOURCE_TAG with the appropriate tag for this form
 * 6. Save the project (Ctrl+S)
 * 7. Set up form submission trigger (see setupTrigger function)
 */

// Configuration - UPDATE THESE VALUES FOR EACH FORM
const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ'; // Master Database Sheet ID
const FORM_SOURCE_TAG = 'returning_students'; // Update this for each form: returning_students, ats_qualifiers, website, early_bird

// Master Database Schema - These match the exact column headers in your master sheet
const MASTER_FIELDS = {
    CHILD_NAME: 'Child Name',
    PARENT_NAME: 'Parent Name',
    PARENT_EMAIL: 'Parent Email',
    PARENT_MOBILE: 'Parent Mobile',
    INTEREST_LEVEL: 'Interest Level',
    SOURCE_TAG: 'Source Tag',
    TIMESTAMP: 'Timestamp',
    DUPLICATE_FLAG: 'Duplicate Flag',
    STATUS: 'Status',
    ASSIGNED_OWNER: 'Assigned Owner',
    NOTES: 'Notes'
};

// Field mapping configuration for each form
const FORMS_CONFIG = {
    'returning_students': {
        sourceTag: 'returning_students',
        fieldMapping: {
            'Child Name': MASTER_FIELDS.CHILD_NAME,
            'Child\'s Name': MASTER_FIELDS.CHILD_NAME,
            'Student Name': MASTER_FIELDS.CHILD_NAME,
            'Name of Child': MASTER_FIELDS.CHILD_NAME,

            'Parent Name': MASTER_FIELDS.PARENT_NAME,
            'Parent\'s Name': MASTER_FIELDS.PARENT_NAME,
            'Guardian Name': MASTER_FIELDS.PARENT_NAME,
            'Father\'s Name': MASTER_FIELDS.PARENT_NAME,
            'Mother\'s Name': MASTER_FIELDS.PARENT_NAME,

            'Parent Email': MASTER_FIELDS.PARENT_EMAIL,
            'Email Address': MASTER_FIELDS.PARENT_EMAIL,
            'Email': MASTER_FIELDS.PARENT_EMAIL,
            'Guardian Email': MASTER_FIELDS.PARENT_EMAIL,

            'Parent Mobile': MASTER_FIELDS.PARENT_MOBILE,
            'Mobile Number': MASTER_FIELDS.PARENT_MOBILE,
            'Phone Number': MASTER_FIELDS.PARENT_MOBILE,
            'Contact Number': MASTER_FIELDS.PARENT_MOBILE,
            'Mobile': MASTER_FIELDS.PARENT_MOBILE,
            'Phone': MASTER_FIELDS.PARENT_MOBILE,

            'Interest Level': MASTER_FIELDS.INTEREST_LEVEL,
            'Level of Interest': MASTER_FIELDS.INTEREST_LEVEL,
            'How interested are you?': MASTER_FIELDS.INTEREST_LEVEL,
            'Interest': MASTER_FIELDS.INTEREST_LEVEL,

            'Timestamp': MASTER_FIELDS.TIMESTAMP,
        },
        defaultValues: {
            [MASTER_FIELDS.INTEREST_LEVEL]: 'Medium',
            [MASTER_FIELDS.STATUS]: 'New Parent',
            [MASTER_FIELDS.DUPLICATE_FLAG]: 'No'
        },
        interestLevelMapping: {
            'Very High': 'High',
            'Very Interested': 'High',
            'High': 'High',
            'Interested': 'High',
            'Moderate': 'Medium',
            'Medium': 'Medium',
            'Somewhat Interested': 'Medium',
            'Low': 'Low',
            'Not Very Interested': 'Low',
            'Maybe': 'Low'
        }
    },
    'ats_qualifiers': {
        sourceTag: 'ats_qualifiers',
        fieldMapping: {
            'Child Name': MASTER_FIELDS.CHILD_NAME,
            'Student Name': MASTER_FIELDS.CHILD_NAME,
            'Name': MASTER_FIELDS.CHILD_NAME,

            'Parent Name': MASTER_FIELDS.PARENT_NAME,
            'Guardian Name': MASTER_FIELDS.PARENT_NAME,
            'Contact Person': MASTER_FIELDS.PARENT_NAME,

            'Email': MASTER_FIELDS.PARENT_EMAIL,
            'Email Address': MASTER_FIELDS.PARENT_EMAIL,
            'Contact Email': MASTER_FIELDS.PARENT_EMAIL,

            'Mobile': MASTER_FIELDS.PARENT_MOBILE,
            'Contact Number': MASTER_FIELDS.PARENT_MOBILE,
            'Phone': MASTER_FIELDS.PARENT_MOBILE,

            'Interest Level': MASTER_FIELDS.INTEREST_LEVEL,
            'Priority': MASTER_FIELDS.INTEREST_LEVEL,

            'Timestamp': MASTER_FIELDS.TIMESTAMP,
        },
        defaultValues: {
            [MASTER_FIELDS.INTEREST_LEVEL]: 'Medium',
            [MASTER_FIELDS.STATUS]: 'New Parent',
            [MASTER_FIELDS.DUPLICATE_FLAG]: 'No'
        },
        interestLevelMapping: {
            'Urgent': 'High',
            'High Priority': 'High',
            'High': 'High',
            'Normal': 'Medium',
            'Medium': 'Medium',
            'Low Priority': 'Low',
            'Low': 'Low'
        }
    },
    'website': {
        sourceTag: 'website',
        fieldMapping: {
            'Child Name': MASTER_FIELDS.CHILD_NAME,
            'Kid Name': MASTER_FIELDS.CHILD_NAME,
            'Student': MASTER_FIELDS.CHILD_NAME,

            'Parent Name': MASTER_FIELDS.PARENT_NAME,
            'Your Name': MASTER_FIELDS.PARENT_NAME,
            'Full Name': MASTER_FIELDS.PARENT_NAME,

            'Email': MASTER_FIELDS.PARENT_EMAIL,
            'Your Email': MASTER_FIELDS.PARENT_EMAIL,

            'Mobile': MASTER_FIELDS.PARENT_MOBILE,
            'Your Mobile': MASTER_FIELDS.PARENT_MOBILE,
            'WhatsApp Number': MASTER_FIELDS.PARENT_MOBILE,

            'Interest': MASTER_FIELDS.INTEREST_LEVEL,
            'How likely are you to enroll?': MASTER_FIELDS.INTEREST_LEVEL,

            'Timestamp': MASTER_FIELDS.TIMESTAMP,
        },
        defaultValues: {
            [MASTER_FIELDS.INTEREST_LEVEL]: 'Medium',
            [MASTER_FIELDS.STATUS]: 'New Parent',
            [MASTER_FIELDS.DUPLICATE_FLAG]: 'No'
        },
        interestLevelMapping: {
            'Very Likely': 'High',
            'Definitely': 'High',
            'Likely': 'High',
            'Maybe': 'Medium',
            'Possibly': 'Medium',
            'Unlikely': 'Low',
            'Not Sure': 'Low'
        }
    },
    'early_bird': {
        sourceTag: 'early_bird',
        fieldMapping: {
            'Child Name': MASTER_FIELDS.CHILD_NAME,
            'Student Name': MASTER_FIELDS.CHILD_NAME,
            'Learner Name': MASTER_FIELDS.CHILD_NAME,

            'Parent Name': MASTER_FIELDS.PARENT_NAME,
            'Guardian': MASTER_FIELDS.PARENT_NAME,
            'Contact Person Name': MASTER_FIELDS.PARENT_NAME,

            'Email': MASTER_FIELDS.PARENT_EMAIL,
            'Parent Email': MASTER_FIELDS.PARENT_EMAIL,

            'Mobile': MASTER_FIELDS.PARENT_MOBILE,
            'Contact': MASTER_FIELDS.PARENT_MOBILE,
            'Phone Number': MASTER_FIELDS.PARENT_MOBILE,

            'Interest Level': MASTER_FIELDS.INTEREST_LEVEL,
            'Urgency': MASTER_FIELDS.INTEREST_LEVEL,

            'Timestamp': MASTER_FIELDS.TIMESTAMP,
        },
        defaultValues: {
            [MASTER_FIELDS.INTEREST_LEVEL]: 'Medium',
            [MASTER_FIELDS.STATUS]: 'New Parent',
            [MASTER_FIELDS.DUPLICATE_FLAG]: 'No'
        },
        interestLevelMapping: {
            'Immediate': 'High',
            'ASAP': 'High',
            'High': 'High',
            'Soon': 'Medium',
            'Medium': 'Medium',
            'Later': 'Low',
            'Low': 'Low'
        }
    }
};

/**
 * Main function that processes form submissions
 * This function should be connected to the form's "On form submit" trigger
 */
function onFormSubmit(e) {
    try {
        console.log('Form submission received, processing...');

        // Extract form response data
        const response = e.response;
        const formData = extractFormData(response);

        console.log('Extracted form data:', formData);

        // Add metadata
        formData.sourceTag = FORM_SOURCE_TAG;
        formData.timestamp = new Date().toISOString();
        formData.formId = response.getEditResponseUrl().match(/forms\/d\/([a-zA-Z0-9-_]+)/)[1];

        // Process and write to master sheet
        const result = writeToMasterSheet(formData);

        if (result.success) {
            console.log('✅ Successfully wrote form data to master database');
            logSuccess(formData, result);
        } else {
            console.error('❌ Failed to write form data to master database:', result.error);
            logError(formData, result.error);
        }

    } catch (error) {
        console.error('❌ Error in onFormSubmit:', error.toString());
        logError(e.response ? extractFormData(e.response) : {}, error.toString());
    }
}

/**
 * Extract data from form response
 * @param {FormResponse} response - Google Forms response object
 * @returns {Object} Extracted form data
 */
function extractFormData(response) {
    const formData = {};

    try {
        const itemResponses = response.getItemResponses();

        // Extract each question and answer
        for (const itemResponse of itemResponses) {
            const question = itemResponse.getItem().getTitle();
            const answer = itemResponse.getResponse();

            if (answer && answer.toString().trim() !== '') {
                formData[question] = answer.toString().trim();
            }
        }

        // Add response metadata
        formData.responseId = response.getId();
        formData.submissionTime = response.getTimestamp();
        formData.editUrl = response.getEditResponseUrl();

    } catch (error) {
        console.error('Error extracting form data:', error.toString());
        throw new Error('Failed to extract form data: ' + error.toString());
    }

    return formData;
}

/**
 * Write form data directly to the master Google Sheet
 * @param {Object} formData - Form data to write
 * @returns {Object} Result of the write operation
 */
function writeToMasterSheet(formData) {
    try {
        console.log('Opening master sheet:', MASTER_SHEET_ID);

        // Open the master spreadsheet
        const masterSheet = SpreadsheetApp.openById(MASTER_SHEET_ID);
        const worksheet = masterSheet.getActiveSheet();

        // Get the form configuration
        const formConfig = FORMS_CONFIG[FORM_SOURCE_TAG];
        if (!formConfig) {
            throw new Error(`No configuration found for form source tag: ${FORM_SOURCE_TAG}`);
        }

        // Map the form data to master database format
        const mappedData = mapFormResponse(formData, formConfig);
        console.log('Mapped data:', mappedData);

        // Get the header row to determine column order
        const headerRange = worksheet.getRange(1, 1, 1, worksheet.getLastColumn());
        const headers = headerRange.getValues()[0];

        // Create row data array in the correct column order
        const rowData = headers.map(header => mappedData[header] || '');

        console.log('Row data to insert:', rowData);

        // Check for duplicates based on email
        const emailIndex = headers.indexOf(MASTER_FIELDS.PARENT_EMAIL);
        if (emailIndex !== -1 && mappedData[MASTER_FIELDS.PARENT_EMAIL]) {
            const duplicateInfo = checkForDuplicate(worksheet, mappedData[MASTER_FIELDS.PARENT_EMAIL], emailIndex + 1);
            if (duplicateInfo.isDuplicate) {
                console.log('Duplicate found, updating duplicate flag');
                rowData[headers.indexOf(MASTER_FIELDS.DUPLICATE_FLAG)] = 'Yes';

                // Optionally update the original record to mark it as having duplicates
                worksheet.getRange(duplicateInfo.row, headers.indexOf(MASTER_FIELDS.DUPLICATE_FLAG) + 1).setValue('Yes');
            }
        }

        // Append the new row
        worksheet.appendRow(rowData);

        // Get the row number of the inserted data
        const insertedRow = worksheet.getLastRow();

        console.log(`✅ Data written to master sheet at row ${insertedRow}`);

        return {
            success: true,
            rowNumber: insertedRow,
            data: rowData,
            masterSheetUrl: `https://docs.google.com/spreadsheets/d/${MASTER_SHEET_ID}/edit#gid=0&range=A${insertedRow}`
        };

    } catch (error) {
        console.error('Error writing to master sheet:', error.toString());
        return {
            success: false,
            error: error.toString(),
            formData: formData
        };
    }
}

/**
 * Map form response data to master database format
 * @param {Object} formResponse - Raw form response data
 * @param {Object} formConfig - Form configuration
 * @returns {Object} Mapped data ready for master database
 */
function mapFormResponse(formResponse, formConfig) {
    const mappedData = {};

    // Apply field mappings
    Object.keys(formResponse).forEach(formField => {
        const masterField = formConfig.fieldMapping[formField];
        if (masterField && formResponse[formField]) {
            mappedData[masterField] = formResponse[formField];
        }
    });

    // Apply default values for missing fields
    Object.keys(formConfig.defaultValues).forEach(field => {
        if (!mappedData[field]) {
            mappedData[field] = formConfig.defaultValues[field];
        }
    });

    // Apply interest level mapping if present
    if (mappedData[MASTER_FIELDS.INTEREST_LEVEL] && formConfig.interestLevelMapping) {
        const originalLevel = mappedData[MASTER_FIELDS.INTEREST_LEVEL];
        const mappedLevel = formConfig.interestLevelMapping[originalLevel];
        if (mappedLevel) {
            mappedData[MASTER_FIELDS.INTEREST_LEVEL] = mappedLevel;
        }
    }

    // Ensure source tag is set
    mappedData[MASTER_FIELDS.SOURCE_TAG] = formConfig.sourceTag;

    // Format timestamp if present
    if (mappedData[MASTER_FIELDS.TIMESTAMP]) {
        mappedData[MASTER_FIELDS.TIMESTAMP] = new Date(mappedData[MASTER_FIELDS.TIMESTAMP]).toISOString();
    } else {
        mappedData[MASTER_FIELDS.TIMESTAMP] = new Date().toISOString();
    }

    return mappedData;
}

/**
 * Check for duplicate entries based on email address
 * @param {Sheet} worksheet - The master sheet
 * @param {string} email - Email to check for duplicates
 * @param {number} emailColumn - Column number containing emails (1-based)
 * @returns {Object} Duplicate check result
 */
function checkForDuplicate(worksheet, email, emailColumn) {
    try {
        const dataRange = worksheet.getRange(2, emailColumn, worksheet.getLastRow() - 1, 1);
        const emails = dataRange.getValues().flat();

        const duplicateIndex = emails.findIndex(existingEmail =>
            existingEmail && existingEmail.toString().toLowerCase().trim() === email.toLowerCase().trim()
        );

        if (duplicateIndex !== -1) {
            return {
                isDuplicate: true,
                row: duplicateIndex + 2 // +2 because we started from row 2 and arrays are 0-based
            };
        }

        return { isDuplicate: false };

    } catch (error) {
        console.error('Error checking for duplicates:', error.toString());
        return { isDuplicate: false };
    }
}

/**
 * Log successful form processing
 */
function logSuccess(formData, result) {
    try {
        const logData = {
            timestamp: new Date().toISOString(),
            sourceTag: FORM_SOURCE_TAG,
            status: 'SUCCESS',
            parentEmail: getEmailFromFormData(formData),
            parentName: getNameFromFormData(formData),
            masterSheetRow: result.rowNumber,
            masterSheetUrl: result.masterSheetUrl
        };

        console.log('✅ Success log:', logData);
    } catch (error) {
        console.error('Error logging success:', error.toString());
    }
}

/**
 * Log form processing errors
 */
function logError(formData, error) {
    try {
        const logData = {
            timestamp: new Date().toISOString(),
            sourceTag: FORM_SOURCE_TAG,
            status: 'ERROR',
            error: error,
            formData: JSON.stringify(formData),
            parentEmail: getEmailFromFormData(formData),
            parentName: getNameFromFormData(formData)
        };

        console.error('❌ Error log:', logData);

        // Optionally send email notification for critical errors
        // sendErrorNotification(logData);

    } catch (logError) {
        console.error('Error logging error:', logError.toString());
    }
}

/**
 * Extract email from form data using common field patterns
 */
function getEmailFromFormData(formData) {
    const emailFields = [
        'Email Address', 'Email', 'Parent Email', 'Parent Email Address',
        'Guardian Email', 'Contact Email', 'Your Email'
    ];

    for (const field of emailFields) {
        if (formData[field] && formData[field].includes('@')) {
            return formData[field];
        }
    }

    // Look for any field containing '@'
    for (const [key, value] of Object.entries(formData)) {
        if (typeof value === 'string' && value.includes('@')) {
            return value;
        }
    }

    return 'unknown';
}

/**
 * Extract name from form data using common field patterns
 */
function getNameFromFormData(formData) {
    const nameFields = [
        'Parent Name', 'Parent\'s Name', 'Guardian Name', 'Your Name',
        'Full Name', 'Name', 'Contact Person', 'Father\'s Name', 'Mother\'s Name'
    ];

    for (const field of nameFields) {
        if (formData[field]) {
            return formData[field];
        }
    }

    return 'unknown';
}

/**
 * Setup function to install the form submit trigger
 * IMPORTANT: Run this function ONCE after deploying the script
 */
function setupTrigger() {
    try {
        // Delete existing form submit triggers for this function
        const triggers = ScriptApp.getProjectTriggers();
        triggers.forEach(trigger => {
            if (trigger.getHandlerFunction() === 'onFormSubmit' &&
                trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT) {
                ScriptApp.deleteTrigger(trigger);
            }
        });

        // Get the current form
        const form = FormApp.getActiveForm();
        if (!form) {
            throw new Error('This script must be bound to a Google Form. Please run this from a form-bound script.');
        }

        // Create new form submit trigger
        ScriptApp.newTrigger('onFormSubmit')
            .timeBased()
            .everyHours(1) // Fallback - runs every hour to catch any missed submissions
            .create();

        console.log('✅ Trigger set up successfully for form:', form.getTitle());
        console.log('Form ID:', form.getId());
        console.log('Source Tag:', FORM_SOURCE_TAG);

        return {
            success: true,
            formTitle: form.getTitle(),
            formId: form.getId(),
            sourceTag: FORM_SOURCE_TAG
        };

    } catch (error) {
        console.error('❌ Error setting up trigger:', error.toString());
        return { success: false, error: error.toString() };
    }
}

/**
 * Test function to verify the integration is working
 * Run this manually to test the Google Sheets connection
 */
function testIntegration() {
    try {
        console.log('🧪 Testing Google Sheets integration...');

        // Create sample form data
        const sampleData = {
            'Parent Name': 'Test Parent',
            'Child Name': 'Test Child',
            'Parent Email': 'test@example.com',
            'Parent Mobile': '+1234567890',
            'Interest Level': 'High',
            responseId: 'test-response-id',
            submissionTime: new Date(),
            sourceTag: FORM_SOURCE_TAG,
            timestamp: new Date().toISOString(),
            formId: 'test-form-id'
        };

        console.log('Sending test data:', sampleData);

        const result = writeToMasterSheet(sampleData);

        if (result.success) {
            console.log('✅ Integration test successful!');
            console.log('Test data written to row:', result.rowNumber);
            console.log('Master sheet URL:', result.masterSheetUrl);
            return {
                success: true,
                message: 'Integration working correctly',
                result: result
            };
        } else {
            console.error('❌ Integration test failed:', result.error);
            return {
                success: false,
                message: 'Integration test failed',
                error: result.error
            };
        }

    } catch (error) {
        console.error('❌ Integration test error:', error.toString());
        return {
            success: false,
            message: 'Integration test error',
            error: error.toString()
        };
    }
}

/**
 * Get information about the current script configuration
 */
function getScriptInfo() {
    try {
        const form = FormApp.getActiveForm();
        const triggers = ScriptApp.getProjectTriggers();

        return {
            formTitle: form ? form.getTitle() : 'No form attached',
            formId: form ? form.getId() : 'No form attached',
            sourceTag: FORM_SOURCE_TAG,
            masterSheetId: MASTER_SHEET_ID,
            masterSheetUrl: `https://docs.google.com/spreadsheets/d/${MASTER_SHEET_ID}/edit`,
            triggersCount: triggers.length,
            triggers: triggers.map(t => ({
                handlerFunction: t.getHandlerFunction(),
                eventType: t.getEventType().toString(),
                source: t.getTriggerSource().toString()
            }))
        };
    } catch (error) {
        return {
            error: error.toString()
        };
    }
}

/**
 * Manual function to process existing form responses (run once to catch up)
 * This will process the last N responses from the form's response sheet
 */
function processExistingResponses(maxResponses = 10) {
    try {
        console.log(`🔄 Processing last ${maxResponses} form responses...`);

        const form = FormApp.getActiveForm();
        if (!form) {
            throw new Error('This script must be bound to a Google Form');
        }

        const responses = form.getResponses();
        const recentResponses = responses.slice(-maxResponses); // Get last N responses

        console.log(`Found ${responses.length} total responses, processing ${recentResponses.length} recent ones`);

        let successCount = 0;
        let errorCount = 0;

        for (const response of recentResponses) {
            try {
                const formData = extractFormData(response);
                formData.sourceTag = FORM_SOURCE_TAG;
                formData.timestamp = new Date().toISOString();
                formData.formId = form.getId();

                const result = writeToMasterSheet(formData);

                if (result.success) {
                    successCount++;
                    console.log(`✅ Processed response ${response.getId()}`);
                } else {
                    errorCount++;
                    console.error(`❌ Failed to process response ${response.getId()}:`, result.error);
                }

                // Add small delay to avoid hitting rate limits
                Utilities.sleep(1000);

            } catch (error) {
                errorCount++;
                console.error(`❌ Error processing response ${response.getId()}:`, error.toString());
            }
        }

        console.log(`🏁 Processing complete: ${successCount} success, ${errorCount} errors`);

        return {
            success: true,
            totalProcessed: recentResponses.length,
            successCount: successCount,
            errorCount: errorCount
        };

    } catch (error) {
        console.error('❌ Error in processExistingResponses:', error.toString());
        return {
            success: false,
            error: error.toString()
        };
    }
}