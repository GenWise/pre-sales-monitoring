/**
 * FORM-BOUND Google Apps Script for website
 * THIS SCRIPT MUST BE DEPLOYED DIRECTLY IN THE GOOGLE FORM'S SCRIPT EDITOR
 *
 * Form ID: 1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg
 * Form URL: https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg/edit
 *
 * CRITICAL: This script will ONLY work when deployed inside the form itself!
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const FORM_SOURCE_TAG = 'website';
const WEBHOOK_URL = 'http://localhost:3001/webhook/form-submission'; // Update if needed
const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';

// Dropdown values from master sheet (MUST MATCH EXACTLY)
const DROPDOWN_VALUES = {
  "status": ["New Parent", "Contacted", "Follow-up", "Enrolled", "Not Interested"],
  "interestLevel": ["High", "Medium", "Low"],
  "sourceTag": ["returning_students", "ats_qualifiers", "website", "early_bird", "summer_program_2026"],
  "assignedOwner": ["Unassigned", "Rajesh", "Team Member"]
};

// =============================================================================
// MAIN TRIGGER FUNCTION
// =============================================================================

/**
 * Form submit trigger - automatically runs when form is submitted
 * NO SETUP REQUIRED - Form-bound scripts auto-create triggers
 */
function onFormSubmit(e) {
  console.log('📝 website submission detected');

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

    // Send to webhook endpoint
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

    if (webhookResponse.success) {
      console.log('✅ Webhook successful');
      updateMasterSheetDirectly(responseData);
    } else {
      console.error('❌ Webhook failed:', webhookResponse.error);
      storeFailedSubmission(responseData, webhookResponse.error);
      updateMasterSheetDirectly(responseData);
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
 * Update master sheet directly as backup method
 */
function updateMasterSheetDirectly(responseData) {
  try {
    const sheet = SpreadsheetApp.openById(MASTER_SHEET_ID).getActiveSheet();

    // Map form data to master sheet format
    const mappedData = mapFormFields(responseData);

    const rowData = [
      mappedData.childName || '',
      mappedData.parentName || '',
      mappedData.parentEmail || '',
      mappedData.parentMobile || '',
      mappedData.interestLevel || 'Medium',
      FORM_SOURCE_TAG,
      mappedData.timestamp || new Date().toISOString(),
      'No', // Duplicate Flag
      'New Parent', // Status
      'Unassigned', // Assigned Owner
      `Auto-added from ${FORM_SOURCE_TAG} on ${new Date().toLocaleDateString()}` // Notes
    ];

    sheet.appendRow(rowData);
    console.log('✅ Data added directly to master sheet');

  } catch (error) {
    console.error('❌ Failed to update master sheet:', error.toString());
  }
}

/**
 * Map form fields to standardized format
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
 * Test the webhook connectivity
 */
function testWebhook() {
  console.log('🧪 Testing webhook connectivity for website...');

  const testPayload = {
    formData: {
      'Child Name': 'Test Child website',
      'Parent Name': 'Test Parent website',
      'Parent Email': 'test@form3.com',
      'Parent Mobile': '+1234567890',
      'Interest Level': 'High',
      formId: FormApp.getActiveForm().getId(),
      sourceTag: FORM_SOURCE_TAG,
      timestamp: new Date().toISOString(),
      responseId: 'test-response-' + Date.now(),
      submissionTime: new Date().toISOString()
    },
    source: 'google-apps-script-test',
    version: '2.0',
    metadata: {
      formName: 'website',
      sourceTag: FORM_SOURCE_TAG,
      testRun: true,
      formBound: true
    }
  };

  const result = sendToWebhook(testPayload);

  if (result.success) {
    console.log('✅ Webhook test successful:', result.response);
  } else {
    console.error('❌ Webhook test failed:', result.error);
    console.log('ℹ️ Testing direct sheet update...');
    updateMasterSheetDirectly(testPayload.formData);
  }

  return result;
}

/**
 * Get status and diagnostics
 */
function getStatus() {
  try {
    const form = FormApp.getActiveForm();
    const props = PropertiesService.getScriptProperties();
    const failedSubmissions = JSON.parse(props.getProperty('failedSubmissions') || '[]');
    const errors = JSON.parse(props.getProperty('processingErrors') || '[]');

    const status = {
      formName: 'website',
      formId: form.getId(),
      formTitle: form.getTitle(),
      sourceTag: FORM_SOURCE_TAG,
      webhookUrl: WEBHOOK_URL,
      masterSheetId: MASTER_SHEET_ID,
      failedSubmissions: failedSubmissions.length,
      processingErrors: errors.length,
      lastCheck: new Date().toISOString(),
      scriptType: 'form-bound',
      dropdownValues: DROPDOWN_VALUES
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