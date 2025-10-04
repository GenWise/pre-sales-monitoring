/**
 * Google Apps Script for ats_qualifiers - Master Sheet Integration
 * Deploy this script specifically to ats_qualifiers: 1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ
 *
 * CRITICAL: This script includes validation to REJECT submissions that don't match
 * exact dropdown values in the master sheet.
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open https://script.google.com
 * 2. Create new project: "ats_qualifiers-MasterSheet-Integration"
 * 3. Replace default code with this file
 * 4. Save project (Ctrl+S)
 * 5. Run setupTrigger() function once
 * 6. Test with testIntegration() function
 */

// ATS_QUALIFIERS CONFIGURATION - DO NOT CHANGE
const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
const FORM_SOURCE_TAG = 'ats_qualifiers';
const SLACK_WEBHOOK_URL = 'REDACTED_SLACK_WEBHOOK';
const EMAIL_RECIPIENTS = 'rajesh@genwise.in';

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
    CHILD_NAME: 'child_name',
    PARENT_NAME: 'parent_name',
    PARENT_EMAIL: 'parent_email',
    PARENT_MOBILE: 'parent_mobile',
    INTEREST_LEVEL: 'interest_level',
    SOURCE_TAG: 'source_tag',
    TIMESTAMP: 'timestamp',
    DUPLICATE_FLAG: 'duplicate_flag',
    STATUS: 'status',
    ASSIGNED_OWNER: 'assigned_owner',
    NEW_EXISTING: 'new_existing',
    CRM_CONTACT_LINK: 'crm_contact_link',    NOTES: 'notes'
};

// ATS_QUALIFIERS SPECIFIC CONFIGURATION
const ATS_QUALIFIERS_CONFIG = {
    sourceTag: 'ats_qualifiers',
    fieldMapping: {
        // Child name variations
        'child_name': MASTER_FIELDS.CHILD_NAME,
        'Student Name': MASTER_FIELDS.CHILD_NAME,
        'Name': MASTER_FIELDS.CHILD_NAME,

        // Parent name variations
        'parent_name': MASTER_FIELDS.PARENT_NAME,
        'Guardian Name': MASTER_FIELDS.PARENT_NAME,
        'Contact Person': MASTER_FIELDS.PARENT_NAME,

        // Email variations
        'Email': MASTER_FIELDS.PARENT_EMAIL,
        'Email Address': MASTER_FIELDS.PARENT_EMAIL,
        'Contact Email': MASTER_FIELDS.PARENT_EMAIL,

        // Mobile variations
        'Mobile': MASTER_FIELDS.PARENT_MOBILE,
        'Contact Number': MASTER_FIELDS.PARENT_MOBILE,
        'Phone': MASTER_FIELDS.PARENT_MOBILE,

        // Interest level variations
        'interest_level': MASTER_FIELDS.INTEREST_LEVEL,
        'Priority': MASTER_FIELDS.INTEREST_LEVEL,

        'timestamp': MASTER_FIELDS.TIMESTAMP,
    },
    defaultValues: {
        [MASTER_FIELDS.NEW_EXISTING]: 'New Parent',
        [MASTER_FIELDS.DUPLICATE_FLAG]: 'No',
        [MASTER_FIELDS.ASSIGNED_OWNER]: 'Unassigned'
    },
    // ATS_QUALIFIERS SPECIFIC INTEREST LEVEL MAPPINGS
    interestLevelMapping: {
        'Ready to Sign up and save almost 25% through available discounts': 'High',
        'Like to speak to GenWise team to resolve questions on my mind': 'Medium',
        'Not interested in the GenWise Summer Program right now': 'Low'
    }
};

/**
 * Main function that processes form submissions with STRICT VALIDATION
 */
function onFormSubmit(e) {
    try {
        console.log('ats_qualifiers submission received, processing...');

        // Extract form response data
        const response = e.response;
        const formData = extractFormData(response);

        console.log('Extracted form data:', formData);

        // Add metadata
        formData.sourceTag = FORM_SOURCE_TAG;
        formData.timestamp = new Date().toISOString();
        formData.formId = response.getEditResponseUrl().match(/forms\/d\/([a-zA-Z0-9-_]+)/)[1];

        // Map and validate the form data
        const mappedData = mapFormResponse(formData, ATS_QUALIFIERS_CONFIG);

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
            console.log('✅ Successfully wrote ats_qualifiers data to master database');
            logSuccess(formData, result);

            // Send notifications immediately after successful write
            sendEmailNotification(mappedData);
            sendSlackNotification(mappedData);
        } else {
            console.error('❌ Failed to write ats_qualifiers data to master database:', result.error);
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
ATS_QUALIFIERS VALIDATION FAILURE

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
        //     subject: 'ats_qualifiers Validation Failure',
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

    // Apply ats_qualifiers specific interest level mapping
    if (mappedData[MASTER_FIELDS.INTEREST_LEVEL] && formConfig.interestLevelMapping) {
        const originalLevel = mappedData[MASTER_FIELDS.INTEREST_LEVEL];
        const mappedLevel = formConfig.interestLevelMapping[originalLevel];
        if (mappedLevel) {
            mappedData[MASTER_FIELDS.INTEREST_LEVEL] = mappedLevel;
        }
    }

    // Ensure source tag is set to ats_qualifiers
    mappedData[MASTER_FIELDS.SOURCE_TAG] = 'ats_qualifiers';

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

        console.log(`✅ ats_qualifiers data written to master sheet at row ${insertedRow}`);

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
 * Send email notification for new submission
 */
function sendEmailNotification(mappedData) {
    try {
        const isDuplicate = mappedData[MASTER_FIELDS.DUPLICATE_FLAG] === 'Yes';
        const subject = `[GSP26] New Lead Submitted - ${mappedData[MASTER_FIELDS.PARENT_NAME]}`;

        const htmlBody = `
<html>
<head>
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.header { background-color: #4CAF50; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
.content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
.field { margin-bottom: 12px; }
.label { font-weight: bold; color: #555; display: inline-block; width: 140px; }
.value { color: #333; }
.duplicate { background-color: #f8d7da; padding: 10px; border-left: 4px solid #dc3545; margin: 15px 0; }
.important { background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 15px 0; }
</style>
</head>
<body>
<div class="container">
<div class="header"><h2 style="margin: 0;">🎓 New GSP26 Lead Submitted</h2></div>
<div class="content">
${isDuplicate ? '<div class="duplicate">⚠️ <strong>DUPLICATE LEAD</strong> - This email has submitted before</div>' : ''}
<div class="field"><span class="label">Child Name:</span><span class="value">${mappedData[MASTER_FIELDS.CHILD_NAME]}</span></div>
<div class="field"><span class="label">Parent Name:</span><span class="value">${mappedData[MASTER_FIELDS.PARENT_NAME]}</span></div>
<div class="field"><span class="label">Parent Email:</span><span class="value">${mappedData[MASTER_FIELDS.PARENT_EMAIL]}</span></div>
<div class="field"><span class="label">Parent Mobile:</span><span class="value">${mappedData[MASTER_FIELDS.PARENT_MOBILE]}</span></div>
<div class="field"><span class="label">Interest Level:</span><span class="value"><strong>${mappedData[MASTER_FIELDS.INTEREST_LEVEL]}</strong></span></div>
<div class="field"><span class="label">Source:</span><span class="value">${FORM_SOURCE_TAG.replace('_', ' ').toUpperCase()}</span></div>
${mappedData[MASTER_FIELDS.INTEREST_LEVEL] === 'High' ? '<div class="important">🔥 <strong>HIGH INTEREST</strong> - Priority follow-up recommended</div>' : ''}
<div style="margin-top: 20px;"><a href="https://docs.google.com/spreadsheets/d/${MASTER_SHEET_ID}" style="background-color: #4CAF50; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">View Master Sheet →</a></div>
</div>
</div>
</body>
</html>`;

        MailApp.sendEmail({
            to: EMAIL_RECIPIENTS,
            subject: subject,
            htmlBody: htmlBody,
            name: 'GSP26 Pre-Sales System'
        });

        console.log('✅ Email notification sent to:', EMAIL_RECIPIENTS);
    } catch (error) {
        console.error('❌ Error sending email:', error.toString());
    }
}

/**
 * Send Slack notification for new submission
 */
function sendSlackNotification(mappedData) {
    try {
        const isDuplicate = mappedData[MASTER_FIELDS.DUPLICATE_FLAG] === 'Yes';
        const duplicateText = isDuplicate ? '🔴 DUPLICATE DETECTED' : '🟢 New Submission';
        const priorityEmoji = getPriorityEmoji(mappedData[MASTER_FIELDS.INTEREST_LEVEL]);

        const slackPayload = {
            text: `New ${FORM_SOURCE_TAG} submission - ${mappedData[MASTER_FIELDS.CHILD_NAME] || 'Unknown Child'}`,
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: `${priorityEmoji} New ${FORM_SOURCE_TAG.toUpperCase()} Form Submission`
                    }
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Child:* ${mappedData[MASTER_FIELDS.CHILD_NAME] || 'Not provided'}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Parent:* ${mappedData[MASTER_FIELDS.PARENT_NAME] || 'Not provided'}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Email:* ${mappedData[MASTER_FIELDS.PARENT_EMAIL] || 'Not provided'}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Mobile:* ${mappedData[MASTER_FIELDS.PARENT_MOBILE] || 'Not provided'}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Interest:* ${mappedData[MASTER_FIELDS.INTEREST_LEVEL] || 'Medium'}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Status:* ${duplicateText}`
                        }
                    ]
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: `📅 ${new Date().toLocaleString()} | 🏷️ Source: ${FORM_SOURCE_TAG}`
                        }
                    ]
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "📊 View Master Sheet"
                            },
                            url: `https://docs.google.com/spreadsheets/d/${MASTER_SHEET_ID}/edit`
                        }
                    ]
                }
            ]
        };

        const response = UrlFetchApp.fetch(SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            payload: JSON.stringify(slackPayload),
            muteHttpExceptions: true
        });

        const responseCode = response.getResponseCode();
        if (responseCode >= 200 && responseCode < 300) {
            console.log('✅ Slack notification sent successfully');
        } else {
            console.error('⚠️ Slack notification failed:', responseCode, response.getContentText());
        }

    } catch (error) {
        console.error('❌ Error sending Slack notification:', error.toString());
    }
}

/**
 * Get priority emoji based on interest level
 */
function getPriorityEmoji(interestLevel) {
    switch (interestLevel) {
        case 'High': return '🔥';
        case 'Medium': return '📝';
        case 'Low': return '📋';
        default: return '📝';
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

        console.log('✅ ats_qualifiers Success log:', logData);
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

        console.error('❌ ats_qualifiers Error log:', logData);

    } catch (logError) {
        console.error('Error logging error:', logError.toString());
    }
}

/**
 * Extract email from form data
 */
function getEmailFromFormData(formData) {
    const emailFields = [
        'Email Address', 'Email', 'parent_email', 'Parent Email Address',
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
        'parent_name', 'Parent\'s Name', 'Guardian Name', 'Your Name',
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

        // Verify this is ats_qualifiers
        const expectedFormId = '1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ';
        if (form.getId() !== expectedFormId) {
            throw new Error(`Wrong form! This script is for ats_qualifiers (${expectedFormId}), but attached to ${form.getId()}`);
        }

        // Create form submit trigger
        ScriptApp.newTrigger('onFormSubmit')
            .timeBased()
            .everyHours(1)
            .create();

        console.log('✅ ats_qualifiers trigger set up successfully');
        console.log('Form Title:', form.getTitle());
        console.log('Form ID:', form.getId());

        return {
            success: true,
            formTitle: form.getTitle(),
            formId: form.getId(),
            sourceTag: FORM_SOURCE_TAG
        };

    } catch (error) {
        console.error('❌ Error setting up ats_qualifiers trigger:', error.toString());
        return { success: false, error: error.toString() };
    }
}

/**
 * Test function to verify ats_qualifiers integration
 */
function testIntegration() {
    try {
        console.log('🧪 Testing ats_qualifiers integration...');

        const sampleData = {
            'parent_name': 'Test ats_qualifiers Parent',
            'child_name': 'Test ats_qualifiers Child',
            'Email': 'test-form2@example.com',
            'Mobile': '+1234567890',
            'Priority': 'Urgent', // This should map to 'High'
            responseId: 'test-form2-response',
            submissionTime: new Date(),
            sourceTag: FORM_SOURCE_TAG,
            timestamp: new Date().toISOString(),
            formId: '1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ'
        };

        console.log('Testing with sample data:', sampleData);

        // Map the data
        const mappedData = mapFormResponse(sampleData, ATS_QUALIFIERS_CONFIG);
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
            console.log('✅ ats_qualifiers integration test successful!');
            return {
                success: true,
                message: 'ats_qualifiers integration working correctly',
                result: result
            };
        } else {
            console.error('❌ ats_qualifiers integration test failed:', result.error);
            return {
                success: false,
                message: 'ats_qualifiers integration test failed',
                error: result.error
            };
        }

    } catch (error) {
        console.error('❌ ats_qualifiers integration test error:', error.toString());
        return {
            success: false,
            message: 'ats_qualifiers integration test error',
            error: error.toString()
        };
    }
}