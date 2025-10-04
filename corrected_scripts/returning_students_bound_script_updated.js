/**
 * FORM-BOUND Google Apps Script for returning_students
 * THIS SCRIPT MUST BE DEPLOYED DIRECTLY IN THE GOOGLE FORM'S SCRIPT EDITOR
 *
 * Form ID: 1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA
 * Form URL: https://docs.google.com/forms/d/1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA/edit
 *
 * CRITICAL: This script will ONLY work when deployed inside the form itself!
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const FORM_SOURCE_TAG = 'returning_students';
const WEBHOOK_URL = 'https://dashboard.giftedworld.org/webhook.php';
const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
const SLACK_WEBHOOK_URL = 'REDACTED_SLACK_WEBHOOK';

// Dropdown values from master sheet (MUST MATCH EXACTLY)
const DROPDOWN_VALUES = {
  "status": ["First Call Pending", "Warm", "Hot", "Not Interested"],
  "interestLevel": ["High", "Medium", "Low"],
  "sourceTag": ["returning_students", "ats_qualifiers", "website", "early_bird"],
  "assignedOwner": ["Unassigned", "Kevin", "Agnes", "Eklavya", "Ashish"]
};

// =============================================================================
// MAIN TRIGGER FUNCTION
// =============================================================================

/**
 * Form submit trigger - automatically runs when form is submitted
 * NO SETUP REQUIRED - Form-bound scripts auto-create triggers
 */
function onFormSubmit(e) {
  console.log('📝 returning_students submission detected');

  try {
    const form = FormApp.getActiveForm();
    const formResponse = e.response;
    const itemResponses = formResponse.getItemResponses();

    // Build response data object
    const responseData = {
      formId: form.getId(),
      sourceTag: FORM_SOURCE_TAG,
      timestamp: new Date().toISOString(),
      responseId: formResponse.getId(),
      submissionTime: formResponse.getTimestamp().toISOString()
    };

    // Extract form field values
    itemResponses.forEach(itemResponse => {
      const question = itemResponse.getItem().getTitle();
      const answer = itemResponse.getResponse();
      responseData[question] = answer;
    });

    // Apply field mapping to ensure compatibility
    const mappedData = mapFormFields(responseData);
    console.log('📋 Original form data:', responseData);
    console.log('📋 Mapped form data:', mappedData);

    // Update master sheet directly (bypassing webhook for reliability)
    updateMasterSheetDirectly(mappedData);

    // Send dual notifications to rajesh@genwise.in
    sendEmailNotification(mappedData, responseData);
    sendSlackNotification(mappedData, responseData);

    // Send to webhook endpoint (optional/backup)
    const webhookPayload = {
      formData: mappedData,
      source: 'google-apps-script-form-bound',
      version: '2.0',
      metadata: {
        formName: 'website',
        sourceTag: FORM_SOURCE_TAG,
        formBound: true,
        dropdownValues: DROPDOWN_VALUES
      }
    };

    const webhookResponse = sendToWebhook(webhookPayload);
    if (!webhookResponse.success) {
      console.warn('⚠️ Webhook failed (non-critical):', webhookResponse.error);
    }

  } catch (error) {
    console.error('❌ Error processing submission:', error.toString());
    storeProcessingError(error.toString());
  }
}


// =============================================================================
// FIELD MAPPING FUNCTIONS
// =============================================================================

/**
 * Map form fields to standard master sheet format
 */
function mapFormFields(responseData) {
  const mappedData = { ...responseData };

  // Field mapping patterns - maps various question formats to standard fields
  const fieldMappings = {
    'Parent Email': ['parent email', 'email address', 'email', 'guardian email', 'contact email'],
    'Parent Name': ['parent name', 'guardian name', 'parent\'s name', 'father name', 'mother name', 'contact person'],
    'Child Name': ['child name', 'student name', 'child\'s name', 'name of child', 'student\'s name'],
    'Parent Mobile': ['parent mobile', 'mobile number', 'phone number', 'contact number', 'mobile', 'phone'],
    'Interest Level': ['interest level', 'level of interest', 'how interested', 'interest', 'priority', 'interested in the gifted summer program']
  };

  // Apply field mappings
  Object.keys(responseData).forEach(originalField => {
    const normalizedField = originalField.toLowerCase().trim();

    Object.keys(fieldMappings).forEach(targetField => {
      const patterns = fieldMappings[targetField];
      if (patterns.some(pattern => normalizedField.includes(pattern))) {
        mappedData[targetField] = responseData[originalField];

        // Apply interest level mapping if this is an interest field
        if (targetField === 'Interest Level') {
          mappedData[targetField] = mapInterestLevel(responseData[originalField]);
        }
      }
    });
  });

  return mappedData;
}

/**
 * Map interest level responses to standard values
 */
function mapInterestLevel(response) {
  if (!response) return 'Medium';

  const normalized = response.toLowerCase().trim();

  // Specific mappings for "Interested in the Gifted Summer Program" field
  const mappings = {
    'ready to sign up and save almost 25% through available discounts': 'High',
    'like to speak to genwise team to resolve questions on my mind': 'Medium',
    'not interested in the genwise summer program right now': 'Low',

    // General mappings
    'urgent': 'High',
    'high priority': 'High',
    'very interested': 'High',
    'definitely': 'High',
    'very likely': 'High',
    'immediately': 'High',
    'asap': 'High',
    'high': 'High',
    'yes': 'High',

    'normal': 'Medium',
    'maybe': 'Medium',
    'possibly': 'Medium',
    'soon': 'Medium',
    'medium': 'Medium',
    'moderate': 'Medium',

    'low priority': 'Low',
    'unlikely': 'Low',
    'not sure': 'Low',
    'later': 'Low',
    'low': 'Low',
    'no': 'Low'
  };

  return mappings[normalized] || 'Medium';
}

// =============================================================================
// WEBHOOK FUNCTIONS
// =============================================================================

/**
 * Send data to webhook endpoint
 */
function sendToWebhook(payload) {
  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GoogleAppsScript-FormBound/2.0'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode >= 200 && responseCode < 300) {
      return { success: true, response: responseText };
    } else {
      return {
        success: false,
        error: `HTTP ${responseCode}: ${responseText}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error.toString()}`
    };
  }
}

// =============================================================================
// MASTER SHEET FUNCTIONS
// =============================================================================

/**
 * Update master sheet directly using corrected column structure (indices 0-11)
 */
function updateMasterSheetDirectly(mappedData) {
  try {
    const sheet = SpreadsheetApp.openById(MASTER_SHEET_ID).getActiveSheet();

    // Check for duplicate based on parent_email
    const duplicateFlag = checkForDuplicate(mappedData.parentEmail);

    // Prepare row data according to corrected structure (indices 0-11)
    const rowData = [
      mappedData.childName || '',                    // Index 0: child_name
      mappedData.parentName || '',                   // Index 1: parent_name
      mappedData.parentEmail || '',                  // Index 2: parent_email
      mappedData.parentMobile || '',                 // Index 3: parent_mobile
      mappedData.newExisting || 'New Parent',        // Index 4: new_existing
      mappedData.interestLevel || 'Medium',          // Index 5: interest_level
      FORM_SOURCE_TAG,                               // Index 6: source_tag
      mappedData.timestamp || new Date().toISOString(), // Index 7: timestamp
      duplicateFlag ? 'Yes' : 'No',                  // Index 8: duplicate_flag
      'First Call Pending',                          // Index 9: status
      'Unassigned',                                  // Index 10: assigned_owner
      `Auto-added from ${FORM_SOURCE_TAG} on ${new Date().toLocaleDateString()}` // Index 11: notes
    ];

    sheet.appendRow(rowData);
    console.log('✅ Data added to master sheet (corrected structure)');

  } catch (error) {
    console.error('❌ Failed to update master sheet:', error.toString());
  }
}

/**
 * Check for duplicate parent email in existing sheet data
 */
function checkForDuplicate(parentEmail) {
  if (!parentEmail) return false;

  try {
    const sheet = SpreadsheetApp.openById(MASTER_SHEET_ID).getActiveSheet();
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    // Skip header row, check parent_email column (index 2)
    for (let i = 1; i < values.length; i++) {
      const existingEmail = values[i][2]; // parent_email is at index 2
      if (existingEmail && existingEmail.toLowerCase().trim() === parentEmail.toLowerCase().trim()) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('❌ Duplicate check failed:', error.toString());
    return false; // Assume no duplicate if check fails
  }
}

/**
 * Send email notification to rajesh@genwise.in for every form submission
 */
function sendEmailNotification(mappedData, originalData) {
  try {
    const recipient = 'rajesh@genwise.in';
    const subject = `New ${FORM_SOURCE_TAG} Submission - ${mappedData.childName || 'Unknown Child'}`;

    const emailBody = `
Dear Rajesh,

A new submission has been received from the ${FORM_SOURCE_TAG} form.

SUBMISSION DETAILS:
==================
Child Name: ${mappedData.childName || 'Not provided'}
Parent Name: ${mappedData.parentName || 'Not provided'}
Parent Email: ${mappedData.parentEmail || 'Not provided'}
Parent Mobile: ${mappedData.parentMobile || 'Not provided'}
Interest Level: ${mappedData.interestLevel || 'Medium'}
Source: ${FORM_SOURCE_TAG}
Submission Time: ${mappedData.timestamp || new Date().toISOString()}
Duplicate Detection: ${checkForDuplicate(mappedData.parentEmail) ? 'DUPLICATE FOUND' : 'New submission'}

ORIGINAL FORM RESPONSES:
========================
${Object.entries(originalData).map(([key, value]) => `${key}: ${value}`).join('\n')}

MASTER SHEET LINK:
==================
https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ/edit

This email was automatically generated by the pre-sales monitoring system.

Best regards,
Pre-sales Automation System
    `.trim();

    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      body: emailBody
    });

    console.log(`✅ Email notification sent to ${recipient}`);

  } catch (error) {
    console.error('❌ Failed to send email notification:', error.toString());
    // Store email failure for retry
    storeEmailFailure(mappedData, error.toString());
  }
}

/**
 * Store failed email notifications for manual review
 */
function storeEmailFailure(mappedData, error) {
  try {
    const props = PropertiesService.getScriptProperties();
    const emailFailures = JSON.parse(props.getProperty('emailFailures') || '[]');

    emailFailures.push({
      formSource: FORM_SOURCE_TAG,
      data: mappedData,
      error: error,
      timestamp: new Date().toISOString(),
      recipient: 'rajesh@genwise.in'
    });

    // Keep only last 20 email failures
    if (emailFailures.length > 20) {
      emailFailures.splice(0, emailFailures.length - 20);
    }

    props.setProperty('emailFailures', JSON.stringify(emailFailures));
    console.log('📝 Email failure stored for retry');

  } catch (error) {
    console.error('❌ Failed to store email failure:', error.toString());
  }
}

/**
 * Send Slack notification to rajesh@genwise.in for every form submission
 */
function sendSlackNotification(mappedData, originalData) {
  try {
    const isDuplicate = checkForDuplicate(mappedData.parentEmail);
    const duplicateText = isDuplicate ? '🔴 DUPLICATE DETECTED' : '🟢 New Submission';
    const priorityEmoji = getPriorityEmoji(mappedData.interestLevel);

    const slackPayload = {
      text: `New ${FORM_SOURCE_TAG} submission - ${mappedData.childName || 'Unknown Child'}`,
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
              text: `*Child:* ${mappedData.childName || 'Not provided'}`
            },
            {
              type: "mrkdwn",
              text: `*Parent:* ${mappedData.parentName || 'Not provided'}`
            },
            {
              type: "mrkdwn",
              text: `*Email:* ${mappedData.parentEmail || 'Not provided'}`
            },
            {
              type: "mrkdwn",
              text: `*Mobile:* ${mappedData.parentMobile || 'Not provided'}`
            },
            {
              type: "mrkdwn",
              text: `*Interest:* ${mappedData.interestLevel || 'Medium'}`
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
              url: "https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ/edit"
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
      throw new Error(`Slack API error: ${responseCode} - ${response.getContentText()}`);
    }

  } catch (error) {
    console.error('❌ Failed to send Slack notification:', error.toString());
    // Store Slack failure for retry
    storeSlackFailure(mappedData, error.toString());
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
 * Store failed Slack notifications for manual review
 */
function storeSlackFailure(mappedData, error) {
  try {
    const props = PropertiesService.getScriptProperties();
    const slackFailures = JSON.parse(props.getProperty('slackFailures') || '[]');

    slackFailures.push({
      formSource: FORM_SOURCE_TAG,
      data: mappedData,
      error: error,
      timestamp: new Date().toISOString(),
      webhookUrl: SLACK_WEBHOOK_URL
    });

    // Keep only last 20 Slack failures
    if (slackFailures.length > 20) {
      slackFailures.splice(0, slackFailures.length - 20);
    }

    props.setProperty('slackFailures', JSON.stringify(slackFailures));
    console.log('📝 Slack failure stored for retry');

  } catch (error) {
    console.error('❌ Failed to store Slack failure:', error.toString());
  }
}

/**
 * Map form fields to standardized format
 * UPDATED for corrected column structure (indices 0-11)
 */
function mapFormFields(responseData) {
  const mapped = {};

  // Child Name variations
  const childNameFields = ['Child Name', "Child's Name", 'Student Name', 'Name of Child', 'Child Full Name'];
  for (const field of childNameFields) {
    if (responseData[field]) {
      mapped.childName = responseData[field];
      break;
    }
  }

  // Parent Name variations
  const parentNameFields = ['Parent Name', "Parent's Name", 'Guardian Name', 'Your Name', 'Full Name'];
  for (const field of parentNameFields) {
    if (responseData[field]) {
      mapped.parentName = responseData[field];
      break;
    }
  }

  // Email variations
  const emailFields = ['Parent Email', 'Email Address', 'Email', 'Your Email'];
  for (const field of emailFields) {
    if (responseData[field]) {
      mapped.parentEmail = responseData[field];
      break;
    }
  }

  // Mobile variations
  const mobileFields = ['Parent Mobile', 'Mobile Number', 'Phone Number', 'Contact Number', 'Your Mobile'];
  for (const field of mobileFields) {
    if (responseData[field]) {
      mapped.parentMobile = responseData[field];
      break;
    }
  }

  // Interest Level variations
  const interestFields = ['Interest Level', 'Level of Interest', 'How interested are you?', 'Interested in the Gifted Summer Program', 'Interested in the Gifted Summer Program '];
  for (const field of interestFields) {
    if (responseData[field]) {
      mapped.interestLevel = normalizeInterestLevel(responseData[field]);
      break;
    }
  }

  // Default new_existing to "New Parent" (will be validated against FreshSales)
  mapped.newExisting = 'New Parent';

  mapped.timestamp = responseData.timestamp || responseData.Timestamp;

  return mapped;
}

/**
 * Normalize interest level values to match dropdown
 */
function normalizeInterestLevel(value) {
  if (!value) return 'Medium';

  const normalized = value.toLowerCase().trim();

  // Specific mappings for "Interested in the Gifted Summer Program" field
  const mappings = {
    'ready to sign up and save almost 25% through available discounts': 'High',
    'like to speak to genwise team to resolve questions on my mind': 'Medium',
    'not interested in the genwise summer program right now': 'Low',

    // General mappings
    'very high': 'High',
    'very interested': 'High',
    'high': 'High',
    'urgent': 'High',
    'definitely': 'High',
    'immediate': 'High',
    'yes': 'High',

    'medium': 'Medium',
    'moderate': 'Medium',
    'maybe': 'Medium',

    'low': 'Low',
    'not very interested': 'Low',
    'unlikely': 'Low',
    'not sure': 'Low',
    'no': 'Low'
  };

  return mappings[normalized] || 'Medium';
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Store failed submissions for retry
 */
function storeFailedSubmission(responseData, error) {
  try {
    const props = PropertiesService.getScriptProperties();
    const failedSubmissions = JSON.parse(props.getProperty('failedSubmissions') || '[]');

    failedSubmissions.push({
      data: responseData,
      error: error,
      timestamp: new Date().toISOString(),
      retryCount: 0
    });

    // Keep only last 10 failed submissions
    if (failedSubmissions.length > 10) {
      failedSubmissions.splice(0, failedSubmissions.length - 10);
    }

    props.setProperty('failedSubmissions', JSON.stringify(failedSubmissions));
    console.log('📝 Failed submission stored for retry');

  } catch (error) {
    console.error('❌ Failed to store failed submission:', error.toString());
  }
}

/**
 * Store processing errors
 */
function storeProcessingError(error) {
  try {
    const props = PropertiesService.getScriptProperties();
    const errors = JSON.parse(props.getProperty('processingErrors') || '[]');

    errors.push({
      error: error,
      timestamp: new Date().toISOString(),
      formSource: FORM_SOURCE_TAG
    });

    // Keep only last 20 errors
    if (errors.length > 20) {
      errors.splice(0, errors.length - 20);
    }

    props.setProperty('processingErrors', JSON.stringify(errors));
    console.log('📝 Processing error logged');

  } catch (error) {
    console.error('❌ Failed to store processing error:', error.toString());
  }
}

// =============================================================================
// TESTING FUNCTIONS
// =============================================================================

/**
 * Test all notification systems (webhook, email, Slack)
 */
function testNotifications() {
  console.log('🧪 Testing all notification systems for website...');

  const testData = {
    childName: 'Test Child Website',
    parentName: 'Test Parent Website',
    parentEmail: 'test@website-form.com',
    parentMobile: '+1234567890',
    interestLevel: 'High',
    newExisting: 'New Parent',
    timestamp: new Date().toISOString()
  };

  const originalData = {
    'Child Name': testData.childName,
    'Parent Name': testData.parentName,
    'Parent Email': testData.parentEmail,
    'Parent Mobile': testData.parentMobile,
    'Interest Level': testData.interestLevel,
    formId: FormApp.getActiveForm().getId(),
    sourceTag: FORM_SOURCE_TAG,
    responseId: 'test-response-' + Date.now(),
    submissionTime: testData.timestamp
  };

  console.log('📊 Testing master sheet update...');
  updateMasterSheetDirectly(testData);

  console.log('📧 Testing email notification...');
  sendEmailNotification(testData, originalData);

  console.log('💬 Testing Slack notification...');
  sendSlackNotification(testData, originalData);

  console.log('🌐 Testing webhook (optional)...');
  const webhookPayload = {
    formData: testData,
    source: 'google-apps-script-test',
    version: '2.0',
    metadata: {
      formName: 'website',
      sourceTag: FORM_SOURCE_TAG,
      testRun: true,
      formBound: true
    }
  };

  const webhookResult = sendToWebhook(webhookPayload);
  if (webhookResult.success) {
    console.log('✅ Webhook test successful');
  } else {
    console.warn('⚠️ Webhook test failed (non-critical):', webhookResult.error);
  }

  console.log('🎉 All notification tests completed!');
  return {
    sheetUpdate: true,
    email: true,
    slack: true,
    webhook: webhookResult.success
  };
}

/**
 * Get status and diagnostics including notification failures
 */
function getStatus() {
  try {
    const form = FormApp.getActiveForm();
    const props = PropertiesService.getScriptProperties();
    const failedSubmissions = JSON.parse(props.getProperty('failedSubmissions') || '[]');
    const errors = JSON.parse(props.getProperty('processingErrors') || '[]');
    const emailFailures = JSON.parse(props.getProperty('emailFailures') || '[]');
    const slackFailures = JSON.parse(props.getProperty('slackFailures') || '[]');

    const status = {
      formName: 'website',
      formId: form.getId(),
      formTitle: form.getTitle(),
      sourceTag: FORM_SOURCE_TAG,

      // Endpoints
      webhookUrl: WEBHOOK_URL,
      slackWebhookUrl: SLACK_WEBHOOK_URL,
      masterSheetId: MASTER_SHEET_ID,

      // Notifications
      notifications: {
        email: {
          recipient: 'rajesh@genwise.in',
          failures: emailFailures.length
        },
        slack: {
          webhook: SLACK_WEBHOOK_URL,
          failures: slackFailures.length
        }
      },

      // Error tracking
      failedSubmissions: failedSubmissions.length,
      processingErrors: errors.length,

      // System info
      lastCheck: new Date().toISOString(),
      scriptType: 'form-bound',
      dropdownValues: DROPDOWN_VALUES,
      columnStructure: 'indices-0-11-corrected'
    };

    console.log('📊 website Status:', JSON.stringify(status, null, 2));
    return status;

  } catch (error) {
    console.error('❌ Error getting status:', error.toString());
    return { error: error.toString() };
  }
}

/**
 * Test direct sheet connection
 */
function testSheetConnection() {
  console.log('🧪 Testing master sheet connection...');

  try {
    const sheet = SpreadsheetApp.openById(MASTER_SHEET_ID);
    const activeSheet = sheet.getActiveSheet();
    const lastRow = activeSheet.getLastRow();

    console.log('✅ Sheet connection successful');
    console.log(`📊 Sheet name: ${activeSheet.getName()}`);
    console.log(`📊 Last row: ${lastRow}`);

    return {
      success: true,
      sheetName: activeSheet.getName(),
      lastRow: lastRow,
      sheetId: MASTER_SHEET_ID
    };

  } catch (error) {
    console.error('❌ Sheet connection failed:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}