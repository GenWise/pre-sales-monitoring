/**
 * Google Apps Script for Real-time Form Response Processing
 * Deploy this script to each Google Form to enable real-time sync to master database
 *
 * SETUP INSTRUCTIONS:
 * 1. Open Google Apps Script (script.google.com)
 * 2. Create a new project
 * 3. Replace the default code with this file's contents
 * 4. Update the WEBHOOK_URL constant below with your actual endpoint
 * 5. Update FORM_SOURCE_TAG with the appropriate tag for this form
 * 6. Save and deploy as web app
 * 7. Set up form submission trigger
 */

// Configuration - UPDATE THESE VALUES
const WEBHOOK_URL = 'https://your-server.com/api/webhook/form-response'; // Replace with your actual webhook URL
const FORM_SOURCE_TAG = 'returning_students'; // Update this for each form: returning_students, ats_qualifiers, website, early_bird

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

    // Add metadata
    formData.sourceTag = FORM_SOURCE_TAG;
    formData.timestamp = new Date().toISOString();
    formData.formId = response.getEditResponseUrl().match(/forms\/d\/([a-zA-Z0-9-_]+)/)[1];

    console.log('Extracted form data:', formData);

    // Send to webhook endpoint
    const result = sendToWebhook(formData);

    if (result.success) {
      console.log('Successfully sent form data to master database');
      logSuccess(formData, result);
    } else {
      console.error('Failed to send form data to master database:', result.error);
      logError(formData, result.error);
    }

  } catch (error) {
    console.error('Error in onFormSubmit:', error.toString());
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
 * Send form data to webhook endpoint
 * @param {Object} formData - Form data to send
 * @returns {Object} Result of webhook call
 */
function sendToWebhook(formData) {
  try {
    const payload = {
      formData: formData,
      source: 'google-apps-script',
      version: '1.0'
    };

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GoogleAppsScript-FormIntegration/1.0'
      },
      payload: JSON.stringify(payload)
    };

    console.log('Sending payload to webhook:', WEBHOOK_URL);

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    console.log('Webhook response code:', responseCode);
    console.log('Webhook response:', responseText);

    if (responseCode >= 200 && responseCode < 300) {
      return {
        success: true,
        statusCode: responseCode,
        response: responseText
      };
    } else {
      return {
        success: false,
        statusCode: responseCode,
        error: responseText,
        formData: formData
      };
    }

  } catch (error) {
    console.error('Error sending to webhook:', error.toString());
    return {
      success: false,
      error: error.toString(),
      formData: formData
    };
  }
}

/**
 * Log successful form processing
 * @param {Object} formData - Form data that was processed
 * @param {Object} result - Processing result
 */
function logSuccess(formData, result) {
  try {
    const logData = {
      timestamp: new Date().toISOString(),
      sourceTag: FORM_SOURCE_TAG,
      status: 'SUCCESS',
      parentEmail: getEmailFromFormData(formData),
      parentName: getNameFromFormData(formData),
      webhookResponse: result.response
    };

    // Log to a Google Sheet (optional - uncomment and configure if needed)
    // logToSheet('SUCCESS_LOG', logData);

    console.log('Success log:', logData);
  } catch (error) {
    console.error('Error logging success:', error.toString());
  }
}

/**
 * Log form processing errors
 * @param {Object} formData - Form data that failed to process
 * @param {string} error - Error message
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

    // Log to a Google Sheet (optional - uncomment and configure if needed)
    // logToSheet('ERROR_LOG', logData);

    console.error('Error log:', logData);

    // Send email notification for critical errors (optional)
    // sendErrorNotification(logData);

  } catch (logError) {
    console.error('Error logging error:', logError.toString());
  }
}

/**
 * Extract email from form data using common field patterns
 * @param {Object} formData - Form data
 * @returns {string} Email address or 'unknown'
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
 * @param {Object} formData - Form data
 * @returns {string} Name or 'unknown'
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
 * Run this once after deploying the script
 */
function setupTrigger() {
  try {
    // Delete existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onFormSubmit') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Get the form (assumes this script is bound to a form)
    const form = FormApp.getActiveForm();
    if (!form) {
      throw new Error('This script must be bound to a Google Form');
    }

    // Create new trigger
    ScriptApp.newTrigger('onFormSubmit')
      .timeBased()
      .everyHours(24) // Fallback trigger
      .create();

    ScriptApp.newTrigger('onFormSubmit')
      .timeBased()
      .after(60 * 1000) // 1 minute
      .create();

    console.log('Triggers set up successfully for form:', form.getTitle());
    return { success: true, formTitle: form.getTitle() };

  } catch (error) {
    console.error('Error setting up trigger:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Test function to verify the integration is working
 * You can run this manually to test the webhook connection
 */
function testIntegration() {
  try {
    console.log('Testing form integration...');

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

    const result = sendToWebhook(sampleData);

    if (result.success) {
      console.log('✅ Integration test successful!');
      return { success: true, message: 'Integration working correctly', result: result };
    } else {
      console.error('❌ Integration test failed:', result.error);
      return { success: false, message: 'Integration test failed', error: result.error };
    }

  } catch (error) {
    console.error('❌ Integration test error:', error.toString());
    return { success: false, message: 'Integration test error', error: error.toString() };
  }
}

/**
 * Get information about the current form and script configuration
 */
function getScriptInfo() {
  try {
    const form = FormApp.getActiveForm();
    const triggers = ScriptApp.getProjectTriggers();

    return {
      formTitle: form ? form.getTitle() : 'No form attached',
      formId: form ? form.getId() : 'No form attached',
      sourceTag: FORM_SOURCE_TAG,
      webhookUrl: WEBHOOK_URL,
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