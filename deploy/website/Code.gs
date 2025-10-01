/**
 * Google Apps Script for website - Master Sheet Integration
 * Deploy this script specifically to website: 1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg
 *
 * CRITICAL: This script includes validation to REJECT submissions that don't match
 * exact dropdown values in the master sheet.
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open https://script.google.com
 * 2. Create new project: "website-MasterSheet-Integration"
 * 3. Replace default code with this file
 * 4. Save project (Ctrl+S)
 * 5. Run setupTrigger() function once
 * 6. Test with testIntegration() function
 */

// WEBSITE CONFIGURATION - DO NOT CHANGE
const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
const FORM_SOURCE_TAG = 'website';

// EXACT DROPDOWN VALUES FROM MASTER SHEET - MUST MATCH EXACTLY
const ALLOWED_VALUES = {
    STATUS: ['New Parent', 'Contacted', 'Follow-up', 'Enrolled', 'Not Interested'],
    INTEREST_LEVEL: ['High', 'Medium', 'Low'],
    SOURCE_TAG: ['returning_students', 'ats_qualifiers', 'website', 'early_bird'],
    DUPLICATE_FLAG: ['Yes', 'No'],
    ASSIGNED_OWNER: ['Unassigned', 'Rajesh', 'Team Member']
};

// Master Database Schema
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

// WEBSITE SPECIFIC CONFIGURATION
const WEBSITE_CONFIG = {
    sourceTag: 'website',
    fieldMapping: {
        // Child name variations
        'Child Name': MASTER_FIELDS.CHILD_NAME,
        'Kid Name': MASTER_FIELDS.CHILD_NAME,
        'Student': MASTER_FIELDS.CHILD_NAME,

        // Parent name variations
        'Parent Name': MASTER_FIELDS.PARENT_NAME,
        'Your Name': MASTER_FIELDS.PARENT_NAME,
        'Full Name': MASTER_FIELDS.PARENT_NAME,

        // Email variations
        'Email': MASTER_FIELDS.PARENT_EMAIL,
        'Your Email': MASTER_FIELDS.PARENT_EMAIL,

        // Mobile variations
        'Mobile': MASTER_FIELDS.PARENT_MOBILE,
        'Your Mobile': MASTER_FIELDS.PARENT_MOBILE,
        'WhatsApp Number': MASTER_FIELDS.PARENT_MOBILE,

        // Interest level variations
        'Interest': MASTER_FIELDS.INTEREST_LEVEL,
        'How likely are you to enroll?': MASTER_FIELDS.INTEREST_LEVEL,

        'Timestamp': MASTER_FIELDS.TIMESTAMP,
    },
    defaultValues: {
        [MASTER_FIELDS.STATUS]: 'New Parent',
        [MASTER_FIELDS.DUPLICATE_FLAG]: 'No',
        [MASTER_FIELDS.ASSIGNED_OWNER]: 'Unassigned'
    },
    // WEBSITE SPECIFIC INTEREST LEVEL MAPPINGS
    interestLevelMapping: {
        'Very Likely': 'High',
        'Definitely': 'High',
        'Likely': 'High',
        'Maybe': 'Medium',
        'Possibly': 'Medium',
        'Unlikely': 'Low',
        'Not Sure': 'Low'
    }
};

/**
 * Main function that processes form submissions with STRICT VALIDATION
 */
function onFormSubmit(e) {
    try {
        console.log('website submission received, processing...');

        // Extract form response data
        const response = e.response;
        const formData = extractFormData(response);

        console.log('Extracted form data:', formData);

        // Add metadata
        formData.sourceTag = FORM_SOURCE_TAG;
        formData.timestamp = new Date().toISOString();
        formData.formId = response.getEditResponseUrl().match(/forms\/d\/([a-zA-Z0-9-_]+)/)[1];

        // Map and validate the form data
        const mappedData = mapFormResponse(formData, WEBSITE_CONFIG);

        // CRITICAL VALIDATION - REJECT if values don't match allowed dropdown values
        const validationResult = validateDropdownValues(mappedData);
        if (!validationResult.isValid) {
            const errorMessage = `VALIDATION FAILED: ${validationResult.errors.join(', ')}`;
            console.error('❌', errorMessage);
            logError(formData, errorMessage);

            // Send notification about validation failure
            sendValidationFailureNotification(formData, validationResult.errors);
            return;
        }

        // Write to master sheet
        const result = writeToMasterSheet(mappedData);

        if (result.success) {
            console.log('✅ Successfully wrote website data to master database');
            logSuccess(formData, result);
        } else {
            console.error('❌ Failed to write website data to master database:', result.error);
            logError(formData, result.error);
        }

    } catch (error) {
        console.error('❌ Error in onFormSubmit:', error.toString());
        logError(e.response ? extractFormData(e.response) : {}, error.toString());
    }
}

/**
 * CRITICAL VALIDATION FUNCTION
 * Validates that all dropdown values match exactly with master sheet allowed values
 */
function validateDropdownValues(mappedData) {
    const errors = [];

    // Validate Status
    if (mappedData[MASTER_FIELDS.STATUS] && !ALLOWED_VALUES.STATUS.includes(mappedData[MASTER_FIELDS.STATUS])) {
        errors.push(`Invalid Status: "${mappedData[MASTER_FIELDS.STATUS]}" not in [${ALLOWED_VALUES.STATUS.join(', ')}]`);
    }

    // Validate Interest Level
    if (mappedData[MASTER_FIELDS.INTEREST_LEVEL] && !ALLOWED_VALUES.INTEREST_LEVEL.includes(mappedData[MASTER_FIELDS.INTEREST_LEVEL])) {
        errors.push(`Invalid Interest Level: "${mappedData[MASTER_FIELDS.INTEREST_LEVEL]}" not in [${ALLOWED_VALUES.INTEREST_LEVEL.join(', ')}]`);
    }

    // Validate Source Tag
    if (mappedData[MASTER_FIELDS.SOURCE_TAG] && !ALLOWED_VALUES.SOURCE_TAG.includes(mappedData[MASTER_FIELDS.SOURCE_TAG])) {
        errors.push(`Invalid Source Tag: "${mappedData[MASTER_FIELDS.SOURCE_TAG]}" not in [${ALLOWED_VALUES.SOURCE_TAG.join(', ')}]`);
    }

    // Validate Duplicate Flag
    if (mappedData[MASTER_FIELDS.DUPLICATE_FLAG] && !ALLOWED_VALUES.DUPLICATE_FLAG.includes(mappedData[MASTER_FIELDS.DUPLICATE_FLAG])) {
        errors.push(`Invalid Duplicate Flag: "${mappedData[MASTER_FIELDS.DUPLICATE_FLAG]}" not in [${ALLOWED_VALUES.DUPLICATE_FLAG.join(', ')}]`);
    }

    // Validate Assigned Owner
    if (mappedData[MASTER_FIELDS.ASSIGNED_OWNER] && !ALLOWED_VALUES.ASSIGNED_OWNER.includes(mappedData[MASTER_FIELDS.ASSIGNED_OWNER])) {
        errors.push(`Invalid Assigned Owner: "${mappedData[MASTER_FIELDS.ASSIGNED_OWNER]}" not in [${ALLOWED_VALUES.ASSIGNED_OWNER.join(', ')}]`);
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Send notification when validation fails
 */
function sendValidationFailureNotification(formData, errors) {
    try {
        const emailBody = `
WEBSITE VALIDATION FAILURE

Form submission rejected due to invalid dropdown values.

Errors:
${errors.map(error => `- ${error}`).join('\n')}

Form Data:
${JSON.stringify(formData, null, 2)}

Time: ${new Date().toISOString()}
Form: ${FORM_SOURCE_TAG}
        `;

        // Log the validation failure
        console.error('Validation failure notification:', {
            form: FORM_SOURCE_TAG,
            errors: errors,
            formData: formData
        });

        // TODO: Implement email notification if needed
        // MailApp.sendEmail({
        //     to: 'rajesh@genwise.in',
        //     subject: 'website Validation Failure',
        //     body: emailBody
        // });

    } catch (error) {
        console.error('Error sending validation failure notification:', error.toString());
    }
}

/**
 * Extract data from form response
 */
function extractFormData(response) {
    const formData = {};

    try {
        const itemResponses = response.getItemResponses();

        for (const itemResponse of itemResponses) {
            const question = itemResponse.getItem().getTitle();
            const answer = itemResponse.getResponse();

            if (answer && answer.toString().trim() !== '') {
                formData[question] = answer.toString().trim();
            }
        }

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
 * Map form response data to master database format
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

    // Apply website specific interest level mapping
    if (mappedData[MASTER_FIELDS.INTEREST_LEVEL] && formConfig.interestLevelMapping) {
        const originalLevel = mappedData[MASTER_FIELDS.INTEREST_LEVEL];
        const mappedLevel = formConfig.interestLevelMapping[originalLevel];
        if (mappedLevel) {
            mappedData[MASTER_FIELDS.INTEREST_LEVEL] = mappedLevel;
        }
    }

    // Ensure source tag is set to website
    mappedData[MASTER_FIELDS.SOURCE_TAG] = 'website';

    // Format timestamp
    if (mappedData[MASTER_FIELDS.TIMESTAMP]) {
        mappedData[MASTER_FIELDS.TIMESTAMP] = new Date(mappedData[MASTER_FIELDS.TIMESTAMP]).toISOString();
    } else {
        mappedData[MASTER_FIELDS.TIMESTAMP] = new Date().toISOString();
    }

    return mappedData;
}

/**
 * Write form data directly to the master Google Sheet
 */
function writeToMasterSheet(mappedData) {
    try {
        console.log('Opening master sheet:', MASTER_SHEET_ID);

        const masterSheet = SpreadsheetApp.openById(MASTER_SHEET_ID);
        const worksheet = masterSheet.getActiveSheet();

        console.log('Mapped data to write:', mappedData);

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
                worksheet.getRange(duplicateInfo.row, headers.indexOf(MASTER_FIELDS.DUPLICATE_FLAG) + 1).setValue('Yes');
            }
        }

        // Append the new row
        worksheet.appendRow(rowData);
        const insertedRow = worksheet.getLastRow();

        console.log(`✅ website data written to master sheet at row ${insertedRow}`);

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
            mappedData: mappedData
        };
    }
}

/**
 * Check for duplicate entries based on email address
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
                row: duplicateIndex + 2
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

        console.log('✅ website Success log:', logData);
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

        console.error('❌ website Error log:', logData);

    } catch (logError) {
        console.error('Error logging error:', logError.toString());
    }
}

/**
 * Extract email from form data
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

    for (const [key, value] of Object.entries(formData)) {
        if (typeof value === 'string' && value.includes('@')) {
            return value;
        }
    }

    return 'unknown';
}

/**
 * Extract name from form data
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
        // Delete existing form submit triggers
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
            throw new Error('This script must be bound to a Google Form');
        }

        // Verify this is website
        const expectedFormId = '1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg';
        if (form.getId() !== expectedFormId) {
            throw new Error(`Wrong form! This script is for website (${expectedFormId}), but attached to ${form.getId()}`);
        }

        // Create form submit trigger
        ScriptApp.newTrigger('onFormSubmit')
            .timeBased()
            .everyHours(1)
            .create();

        console.log('✅ website trigger set up successfully');
        console.log('Form Title:', form.getTitle());
        console.log('Form ID:', form.getId());

        return {
            success: true,
            formTitle: form.getTitle(),
            formId: form.getId(),
            sourceTag: FORM_SOURCE_TAG
        };

    } catch (error) {
        console.error('❌ Error setting up website trigger:', error.toString());
        return { success: false, error: error.toString() };
    }
}

/**
 * Test function to verify website integration
 */
function testIntegration() {
    try {
        console.log('🧪 Testing website integration...');

        const sampleData = {
            'Your Name': 'Test website Parent',
            'Kid Name': 'Test website Child',
            'Your Email': 'test-form3@example.com',
            'Your Mobile': '+1234567890',
            'How likely are you to enroll?': 'Very Likely', // This should map to 'High'
            responseId: 'test-form3-response',
            submissionTime: new Date(),
            sourceTag: FORM_SOURCE_TAG,
            timestamp: new Date().toISOString(),
            formId: '1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg'
        };

        console.log('Testing with sample data:', sampleData);

        // Map the data
        const mappedData = mapFormResponse(sampleData, WEBSITE_CONFIG);
        console.log('Mapped data:', mappedData);

        // Validate dropdown values
        const validationResult = validateDropdownValues(mappedData);
        if (!validationResult.isValid) {
            console.error('❌ Validation failed:', validationResult.errors);
            return {
                success: false,
                message: 'Validation failed',
                errors: validationResult.errors
            };
        }

        // Write to master sheet
        const result = writeToMasterSheet(mappedData);

        if (result.success) {
            console.log('✅ website integration test successful!');
            return {
                success: true,
                message: 'website integration working correctly',
                result: result
            };
        } else {
            console.error('❌ website integration test failed:', result.error);
            return {
                success: false,
                message: 'website integration test failed',
                error: result.error
            };
        }

    } catch (error) {
        console.error('❌ website integration test error:', error.toString());
        return {
            success: false,
            message: 'website integration test error',
            error: error.toString()
        };
    }
}