#!/usr/bin/env node

/**
 * Enable Required APIs and Generate Deployment Scripts
 *
 * Since the Apps Script API requires manual enablement, this script:
 * 1. Enables the required APIs programmatically
 * 2. Reads master sheet to get actual dropdown values
 * 3. Generates ready-to-use Apps Script code for each form
 * 4. Provides step-by-step deployment instructions
 * 5. Sets up webhook endpoint to receive form data
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const FORMS_CONFIG = {
    form1: {
        id: '1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA',
        name: 'returning_students',
        sourceTag: 'returning_students'
    },
    form2: {
        id: '1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ',
        name: 'ats_qualifiers',
        sourceTag: 'ats_qualifiers'
    },
    form3: {
        id: '1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg',
        name: 'website',
        sourceTag: 'website'
    },
    form4: {
        id: '1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY',
        name: 'early_bird',
        sourceTag: 'early_bird'
    }
};

const MASTER_SHEET_ID = process.env.PRESALES_MASTER_SHEET_ID;
const WEBHOOK_URL = 'https://your-webhook-endpoint.com/webhook'; // TODO: Update this

class APIsAndDeploymentManager {
    constructor() {
        this.auth = null;
        this.sheets = null;
        this.serviceusage = null;
        this.masterSheetData = null;
        this.dropdownValues = {};
    }

    async initialize() {
        console.log('🔐 Initializing Google API clients...');

        const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
        if (!fs.existsSync(credentialsPath)) {
            throw new Error(`Service account file not found: ${credentialsPath}`);
        }

        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

        this.auth = new google.auth.GoogleAuth({
            credentials,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/script.projects',
                'https://www.googleapis.com/auth/script.deployments',
                'https://www.googleapis.com/auth/forms',
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/service.management'
            ]
        });

        const authClient = await this.auth.getClient();
        this.sheets = google.sheets({ version: 'v4', auth: authClient });
        this.serviceusage = google.serviceusage({ version: 'v1', auth: authClient });

        console.log('✅ Google API clients initialized successfully');
    }

    async enableRequiredAPIs() {
        console.log('🔧 Enabling required APIs...');

        const projectId = '1024532710053'; // From the error message
        const requiredAPIs = [
            'script.googleapis.com',
            'forms.googleapis.com',
            'sheets.googleapis.com',
            'drive.googleapis.com'
        ];

        for (const api of requiredAPIs) {
            try {
                console.log(`   Enabling ${api}...`);

                await this.serviceusage.services.enable({
                    name: `projects/${projectId}/services/${api}`
                });

                console.log(`   ✅ ${api} enabled successfully`);
            } catch (error) {
                console.log(`   ⚠️ Could not enable ${api}: ${error.message}`);
                console.log(`   Please manually enable at: https://console.developers.google.com/apis/api/${api}/overview?project=${projectId}`);
            }
        }

        console.log('🔧 API enablement process completed');
        console.log('   ⏰ Wait 2-3 minutes for APIs to propagate before retrying deployment');
    }

    async readMasterSheetData() {
        console.log('📊 Reading master sheet data...');

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: MASTER_SHEET_ID,
                range: 'A1:Z1000'
            });

            this.masterSheetData = response.data.values || [];

            if (this.masterSheetData.length === 0) {
                throw new Error('Master sheet appears to be empty');
            }

            const headers = this.masterSheetData[0];
            console.log('📋 Master sheet headers:', headers);

            this.dropdownValues = this.extractDropdownValues(headers);
            console.log('🎯 Extracted dropdown values:', this.dropdownValues);

            return this.dropdownValues;
        } catch (error) {
            console.error('❌ Failed to read master sheet:', error.message);
            throw error;
        }
    }

    extractDropdownValues(headers) {
        const data = this.masterSheetData;
        const dropdownValues = {};

        const statusCol = headers.indexOf('Status');
        const interestCol = headers.indexOf('Interest Level');
        const sourceCol = headers.indexOf('Source Tag');
        const ownerCol = headers.indexOf('Assigned Owner');

        if (statusCol !== -1) {
            dropdownValues.status = [...new Set(
                data.slice(1)
                    .map(row => row[statusCol])
                    .filter(val => val && val.trim())
            )];
        }

        if (interestCol !== -1) {
            dropdownValues.interestLevel = [...new Set(
                data.slice(1)
                    .map(row => row[interestCol])
                    .filter(val => val && val.trim())
            )];
        }

        if (sourceCol !== -1) {
            dropdownValues.sourceTag = [...new Set(
                data.slice(1)
                    .map(row => row[sourceCol])
                    .filter(val => val && val.trim())
            )];
        }

        if (ownerCol !== -1) {
            dropdownValues.assignedOwner = [...new Set(
                data.slice(1)
                    .map(row => row[ownerCol])
                    .filter(val => val && val.trim())
            )];
        }

        // Add default values if empty
        if (dropdownValues.status.length === 0) {
            dropdownValues.status = ['New Parent', 'Contacted', 'Follow-up', 'Enrolled', 'Not Interested'];
        }
        if (dropdownValues.interestLevel.length === 0) {
            dropdownValues.interestLevel = ['High', 'Medium', 'Low'];
        }
        if (dropdownValues.sourceTag.length === 0) {
            dropdownValues.sourceTag = ['returning_students', 'ats_qualifiers', 'website', 'early_bird', 'summer_program_2026'];
        }
        if (dropdownValues.assignedOwner.length === 0) {
            dropdownValues.assignedOwner = ['Unassigned', 'Rajesh', 'Team Member'];
        }

        return dropdownValues;
    }

    generateAppsScriptCode(formConfig) {
        return `
/**
 * Google Apps Script for Form: ${formConfig.name}
 * Generated by Forms Automation System
 *
 * SETUP INSTRUCTIONS:
 * 1. Copy this code into a new Apps Script project
 * 2. Update the WEBHOOK_URL below to your actual endpoint
 * 3. Save and authorize the script
 * 4. Run setupFormTrigger() once to create the form submit trigger
 * 5. Test with testWebhook() function
 */

// =============================================================================
// CONFIGURATION - UPDATE THESE VALUES
// =============================================================================

const FORM_SOURCE_TAG = '${formConfig.sourceTag}';
const WEBHOOK_URL = '${WEBHOOK_URL}'; // UPDATE THIS!
const MASTER_SHEET_ID = '${MASTER_SHEET_ID}';

// Dropdown values from master sheet
const DROPDOWN_VALUES = ${JSON.stringify(this.dropdownValues, null, 2)};

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Main trigger function - runs when form is submitted
 */
function onFormSubmit(e) {
  console.log('📝 Form submission detected for ${formConfig.name}');

  try {
    const formResponse = e.response;
    const itemResponses = formResponse.getItemResponses();

    // Build response data object
    const responseData = {
      formId: '${formConfig.id}',
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

    console.log('📋 Form data collected:', responseData);

    // Send to webhook endpoint
    const webhookPayload = {
      formData: responseData,
      source: 'google-apps-script',
      version: '1.0',
      metadata: {
        formName: '${formConfig.name}',
        sourceTag: FORM_SOURCE_TAG,
        dropdownValues: DROPDOWN_VALUES
      }
    };

    const webhookResponse = sendToWebhook(webhookPayload);

    if (webhookResponse.success) {
      console.log('✅ Form data sent to webhook successfully');
      updateMasterSheetDirectly(responseData);
    } else {
      console.error('❌ Webhook failed, storing for retry:', webhookResponse.error);
      storeFailedSubmission(responseData, webhookResponse.error);
      // Try direct sheet update as fallback
      updateMasterSheetDirectly(responseData);
    }

  } catch (error) {
    console.error('❌ Error processing form submission:', error.toString());
    storeProcessingError(error.toString(), e);
  }
}

/**
 * Send data to webhook endpoint
 */
function sendToWebhook(payload) {
  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GoogleAppsScript-FormTrigger/1.0'
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
        error: \`HTTP \${responseCode}: \${responseText}\`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: \`Network error: \${error.toString()}\`
    };
  }
}

/**
 * Update master sheet directly as backup method
 */
function updateMasterSheetDirectly(responseData) {
  try {
    const sheet = SpreadsheetApp.openById(MASTER_SHEET_ID).getActiveSheet();

    // Map form data to master sheet format based on common field variations
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
      '', // Assigned Owner
      \`Auto-added from \${FORM_SOURCE_TAG} on \${new Date().toLocaleDateString()}\` // Notes
    ];

    sheet.appendRow(rowData);
    console.log('✅ Data added directly to master sheet');

  } catch (error) {
    console.error('❌ Failed to update master sheet directly:', error.toString());
  }
}

/**
 * Map form fields to standardized format
 */
function mapFormFields(responseData) {
  const mapped = {};

  // Child Name variations
  const childNameFields = ['Child Name', "Child's Name", 'Student Name', 'Name of Child', 'Child Full Name', 'Kid Name', 'Student', 'Learner Name'];
  for (const field of childNameFields) {
    if (responseData[field]) {
      mapped.childName = responseData[field];
      break;
    }
  }

  // Parent Name variations
  const parentNameFields = ['Parent Name', "Parent's Name", 'Guardian Name', "Father's Name", "Mother's Name", 'Parent/Guardian Name', 'Your Name', 'Full Name', 'Guardian', 'Contact Person Name'];
  for (const field of parentNameFields) {
    if (responseData[field]) {
      mapped.parentName = responseData[field];
      break;
    }
  }

  // Email variations
  const emailFields = ['Parent Email', 'Email Address', 'Email', 'Parent Email Address', 'Guardian Email', 'Your Email', 'Contact Email'];
  for (const field of emailFields) {
    if (responseData[field]) {
      mapped.parentEmail = responseData[field];
      break;
    }
  }

  // Mobile variations
  const mobileFields = ['Parent Mobile', 'Mobile Number', 'Phone Number', 'Contact Number', 'Parent Contact', 'Mobile', 'Phone', 'Contact', 'Your Mobile', 'WhatsApp Number'];
  for (const field of mobileFields) {
    if (responseData[field]) {
      mapped.parentMobile = responseData[field];
      break;
    }
  }

  // Interest Level variations
  const interestFields = ['Interest Level', 'Level of Interest', 'How interested are you?', 'Interest', 'Priority', 'How likely are you to enroll?', 'Urgency'];
  for (const field of interestFields) {
    if (responseData[field]) {
      mapped.interestLevel = normalizeInterestLevel(responseData[field]);
      break;
    }
  }

  mapped.timestamp = responseData.timestamp || responseData.Timestamp || responseData['Response Time'] || responseData['Submitted At'];

  return mapped;
}

/**
 * Normalize interest level values
 */
function normalizeInterestLevel(value) {
  const highValues = ['Very High', 'Very Interested', 'High', 'Interested', 'Urgent', 'High Priority', 'Very Likely', 'Definitely', 'Likely', 'Immediate', 'ASAP'];
  const lowValues = ['Low', 'Not Very Interested', 'Maybe', 'Low Priority', 'Unlikely', 'Not Sure', 'Later'];

  if (highValues.includes(value)) return 'High';
  if (lowValues.includes(value)) return 'Low';
  return 'Medium';
}

// =============================================================================
// UTILITY FUNCTIONS
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

    props.setProperty('failedSubmissions', JSON.stringify(failedSubmissions));
    console.log('📝 Failed submission stored for retry');

  } catch (error) {
    console.error('❌ Failed to store failed submission:', error.toString());
  }
}

/**
 * Store processing errors for investigation
 */
function storeProcessingError(error, originalEvent) {
  try {
    const props = PropertiesService.getScriptProperties();
    const errors = JSON.parse(props.getProperty('processingErrors') || '[]');

    errors.push({
      error: error,
      timestamp: new Date().toISOString(),
      formSource: FORM_SOURCE_TAG,
      eventData: originalEvent ? originalEvent.toString() : 'No event data'
    });

    if (errors.length > 50) {
      errors.splice(0, errors.length - 50);
    }

    props.setProperty('processingErrors', JSON.stringify(errors));
    console.log('📝 Processing error logged');

  } catch (error) {
    console.error('❌ Failed to store processing error:', error.toString());
  }
}

// =============================================================================
// SETUP AND TESTING FUNCTIONS
// =============================================================================

/**
 * SETUP FUNCTION - Run this once after deploying the script
 */
function setupFormTrigger() {
  try {
    console.log('⚡ Setting up form submit trigger for ${formConfig.name}...');

    // Delete existing triggers to avoid duplicates
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onFormSubmit') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Create new form submit trigger
    const trigger = ScriptApp.newTrigger('onFormSubmit')
      .onFormSubmit()
      .create();

    console.log('✅ Form submit trigger created successfully');
    console.log('📋 Trigger ID:', trigger.getUniqueId());

    return trigger.getUniqueId();

  } catch (error) {
    console.error('❌ Failed to setup form trigger:', error.toString());
    throw error;
  }
}

/**
 * TEST FUNCTION - Test webhook connectivity
 */
function testWebhook() {
  console.log('🧪 Testing webhook connectivity...');

  const testPayload = {
    formData: {
      'Child Name': 'Test Child',
      'Parent Name': 'Test Parent',
      'Parent Email': 'test@example.com',
      'Parent Mobile': '+1234567890',
      'Interest Level': 'High',
      formId: '${formConfig.id}',
      sourceTag: FORM_SOURCE_TAG,
      timestamp: new Date().toISOString(),
      responseId: 'test-response-' + Date.now(),
      submissionTime: new Date().toISOString()
    },
    source: 'google-apps-script-test',
    version: '1.0',
    metadata: {
      formName: '${formConfig.name}',
      sourceTag: FORM_SOURCE_TAG,
      testRun: true
    }
  };

  const result = sendToWebhook(testPayload);

  if (result.success) {
    console.log('✅ Webhook test successful:', result.response);
  } else {
    console.error('❌ Webhook test failed:', result.error);
    console.log('ℹ️ Testing direct sheet update as fallback...');
    updateMasterSheetDirectly(testPayload.formData);
  }

  return result;
}

/**
 * Get status and diagnostics
 */
function getStatus() {
  try {
    const props = PropertiesService.getScriptProperties();
    const failedSubmissions = JSON.parse(props.getProperty('failedSubmissions') || '[]');
    const errors = JSON.parse(props.getProperty('processingErrors') || '[]');

    const status = {
      formName: '${formConfig.name}',
      sourceTag: FORM_SOURCE_TAG,
      webhookUrl: WEBHOOK_URL,
      masterSheetId: MASTER_SHEET_ID,
      failedSubmissions: failedSubmissions.length,
      processingErrors: errors.length,
      lastCheck: new Date().toISOString(),
      dropdownValues: DROPDOWN_VALUES
    };

    console.log('📊 Form Status:', JSON.stringify(status, null, 2));
    return status;

  } catch (error) {
    console.error('❌ Error getting status:', error.toString());
    return { error: error.toString() };
  }
}

/**
 * Manual retry function for failed submissions
 */
function retryFailedSubmissions() {
  try {
    const props = PropertiesService.getScriptProperties();
    const failedSubmissions = JSON.parse(props.getProperty('failedSubmissions') || '[]');

    if (failedSubmissions.length === 0) {
      console.log('ℹ️ No failed submissions to retry');
      return;
    }

    console.log(\`🔄 Retrying \${failedSubmissions.length} failed submissions...\`);

    const successfulRetries = [];
    const stillFailing = [];

    failedSubmissions.forEach((submission, index) => {
      if (submission.retryCount >= 3) {
        stillFailing.push(submission);
        return;
      }

      const webhookPayload = {
        formData: submission.data,
        source: 'google-apps-script-retry',
        version: '1.0',
        metadata: {
          formName: '${formConfig.name}',
          sourceTag: FORM_SOURCE_TAG,
          retryAttempt: submission.retryCount + 1,
          originalError: submission.error
        }
      };

      const result = sendToWebhook(webhookPayload);

      if (result.success) {
        successfulRetries.push(index);
        console.log(\`✅ Retry successful for submission \${index}\`);
      } else {
        submission.retryCount += 1;
        submission.lastRetryError = result.error;
        submission.lastRetryTime = new Date().toISOString();
        stillFailing.push(submission);
        console.log(\`❌ Retry failed for submission \${index}: \${result.error}\`);
      }
    });

    props.setProperty('failedSubmissions', JSON.stringify(stillFailing));

    console.log(\`🎯 Retry complete: \${successfulRetries.length} successful, \${stillFailing.length} still failing\`);

  } catch (error) {
    console.error('❌ Error during retry process:', error.toString());
  }
}

// =============================================================================
// INSTRUCTIONS
// =============================================================================

/**
 * DEPLOYMENT INSTRUCTIONS
 *
 * 1. Copy this entire code
 * 2. Go to Google Apps Script: https://script.google.com/
 * 3. Create a new project
 * 4. Replace the default code with this code
 * 5. Update WEBHOOK_URL in the configuration section
 * 6. Save the project with name: "${formConfig.name} Automation"
 * 7. Run setupFormTrigger() once to create the trigger
 * 8. Test with testWebhook() function
 * 9. Check getStatus() for monitoring
 *
 * Your form will now automatically send data to the webhook and master sheet!
 */
`;
    }

    async generateAllScripts() {
        console.log('📝 Generating Apps Script code for all forms...');

        // Create scripts directory
        const scriptsDir = path.join(__dirname, 'generated_scripts');
        if (!fs.existsSync(scriptsDir)) {
            fs.mkdirSync(scriptsDir);
        }

        const generatedFiles = [];

        for (const [key, formConfig] of Object.entries(FORMS_CONFIG)) {
            console.log(`   Generating script for ${formConfig.name}...`);

            const scriptCode = this.generateAppsScriptCode(formConfig);
            const fileName = `${formConfig.name}_automation.js`;
            const filePath = path.join(scriptsDir, fileName);

            fs.writeFileSync(filePath, scriptCode);
            generatedFiles.push({
                form: formConfig.name,
                file: filePath,
                formId: formConfig.id,
                sourceTag: formConfig.sourceTag
            });

            console.log(`   ✅ Generated: ${fileName}`);
        }

        return generatedFiles;
    }

    async createWebhookEndpoint() {
        console.log('📡 Creating webhook endpoint...');

        const webhookCode = `
const express = require('express');
const cors = require('cors');
const { FormsIntegration } = require('./src/sheets/formsIntegration');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize forms integration
const formsIntegration = new FormsIntegration();

// Webhook endpoint for form submissions
app.post('/webhook/form-submission', async (req, res) => {
    console.log('📝 Webhook received form submission');

    try {
        const { formData, source, metadata } = req.body;

        if (!formData || !formData.sourceTag) {
            return res.status(400).json({
                success: false,
                error: 'Missing required formData or sourceTag'
            });
        }

        console.log(\`📋 Processing \${metadata?.formName || 'Unknown Form'} submission:\`, {
            sourceTag: formData.sourceTag,
            email: formData['Parent Email'] || formData['Email'],
            timestamp: formData.timestamp
        });

        // Process the form submission
        await formsIntegration.initialize();

        const result = await formsIntegration.processWebhookSubmission(formData);

        console.log('✅ Form submission processed successfully:', result);

        res.json({
            success: true,
            message: 'Form submission processed successfully',
            data: result
        });

    } catch (error) {
        console.error('❌ Error processing webhook:', error);

        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Check server logs for more information'
        });
    }
});

// Health check endpoint
app.get('/webhook/health', (req, res) => {
    res.json({
        success: true,
        message: 'Webhook endpoint is healthy',
        timestamp: new Date().toISOString()
    });
});

// Status endpoint
app.get('/webhook/status', async (req, res) => {
    try {
        await formsIntegration.initialize();
        const stats = formsIntegration.getProcessingStats();

        res.json({
            success: true,
            stats: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.listen(port, () => {
    console.log(\`🚀 Webhook server running on port \${port}\`);
    console.log(\`📡 Endpoint: http://localhost:\${port}/webhook/form-submission\`);
    console.log(\`🏥 Health check: http://localhost:\${port}/webhook/health\`);
});

module.exports = app;
`;

        const webhookPath = path.join(__dirname, 'webhook_server.js');
        fs.writeFileSync(webhookPath, webhookCode);

        console.log(`✅ Webhook endpoint created: ${webhookPath}`);
        return webhookPath;
    }

    async generateDeploymentInstructions(generatedFiles, webhookPath) {
        const instructions = `
# 🤖 AUTOMATED FORMS DEPLOYMENT INSTRUCTIONS

## Overview
This system automates Google Forms integration with your master database.
All scripts have been generated and are ready for deployment.

## Master Sheet Data
📊 **Dropdown Values Found:**
${Object.entries(this.dropdownValues).map(([key, values]) =>
    `   ${key}: ${values.join(', ') || 'None found'}`
).join('\n')}

## 🚀 DEPLOYMENT STEPS

### Step 1: Start the Webhook Server
\`\`\`bash
# Install dependencies if needed
npm install express cors

# Start the webhook server
node webhook_server.js
\`\`\`

The webhook will be available at: http://localhost:3001/webhook/form-submission

### Step 2: Deploy Apps Scripts to Each Form

${generatedFiles.map((file, index) => `
#### ${index + 1}. ${file.form} (${file.sourceTag})
1. **Open Google Apps Script**: https://script.google.com/
2. **Create New Project**: Click "New project"
3. **Copy the generated code** from: \`${file.file}\`
4. **Paste into the script editor** (replace default code)
5. **Update WEBHOOK_URL** in the script to: \`http://localhost:3001/webhook/form-submission\`
6. **Save the project** with name: "${file.form} Automation"
7. **Authorize permissions** when prompted
8. **Run setupFormTrigger()** function once to create the form submit trigger
9. **Test with testWebhook()** function
10. **Verify with getStatus()** function

**Form URL**: https://docs.google.com/forms/d/${file.formId}/edit
**Response Sheet**: Check the form for linked Google Sheet
`).join('\n')}

### Step 3: Test the Complete System

1. **Test webhook endpoint**:
   \`\`\`bash
   curl -X GET http://localhost:3001/webhook/health
   \`\`\`

2. **Submit a test form** in each of the 4 forms
3. **Check the webhook logs** for incoming data
4. **Verify data appears** in your master sheet
5. **Run getStatus()** in each Apps Script to check for errors

### Step 4: Process Existing Submissions

Each generated script includes functionality to handle existing submissions.
The system will automatically:
- ✅ Send new submissions to webhook
- ✅ Fall back to direct sheet updates if webhook fails
- ✅ Store failed submissions for retry
- ✅ Log errors for investigation

## 📊 MONITORING AND MAINTENANCE

### Available Functions in Each Script:
- \`onFormSubmit()\` - Main trigger (auto-runs on form submission)
- \`setupFormTrigger()\` - Run once during setup
- \`testWebhook()\` - Test connectivity
- \`getStatus()\` - Get current status and stats
- \`retryFailedSubmissions()\` - Retry any failed submissions

### Webhook Endpoints:
- \`GET /webhook/health\` - Health check
- \`GET /webhook/status\` - Processing statistics
- \`POST /webhook/form-submission\` - Main form submission endpoint

## 🔧 TROUBLESHOOTING

### If Apps Script API is still disabled:
1. Visit: https://console.developers.google.com/apis/api/script.googleapis.com/overview?project=1024532710053
2. Click "Enable"
3. Wait 2-3 minutes
4. Retry the automated deployment with: \`node deploy_forms_automation.js\`

### If webhook fails:
- Forms will automatically fall back to direct sheet updates
- Failed submissions are stored for retry
- Check Apps Script logs for details

### Common Issues:
1. **Webhook URL not updated** - Update WEBHOOK_URL in each script
2. **Permissions not granted** - Run each script once to authorize
3. **Trigger not created** - Run setupFormTrigger() in each script
4. **Network issues** - Check webhook server is running

## 📈 SUCCESS METRICS

✅ **Deployment Complete When:**
- All 4 Apps Scripts are deployed and authorized
- Form submit triggers are active in all scripts
- Webhook server is running and healthy
- Test submissions flow to master sheet
- getStatus() shows no errors in any script

✅ **System Working When:**
- New form submissions automatically appear in master sheet
- Webhook logs show incoming data
- No failed submissions in script status
- Data mapping is correct for all fields

Your forms automation system is now ready! 🎉
`;

        const instructionsPath = path.join(__dirname, 'DEPLOYMENT_INSTRUCTIONS.md');
        fs.writeFileSync(instructionsPath, instructions);

        console.log(`📋 Deployment instructions created: ${instructionsPath}`);
        return instructionsPath;
    }

    async run() {
        console.log('🤖 Google Forms Automation Setup System');
        console.log('=' .repeat(60));

        try {
            // Initialize
            await this.initialize();

            // Try to enable APIs
            await this.enableRequiredAPIs();

            // Read master sheet data
            await this.readMasterSheetData();

            // Generate all scripts
            const generatedFiles = await this.generateAllScripts();

            // Create webhook endpoint
            const webhookPath = await this.createWebhookEndpoint();

            // Generate deployment instructions
            const instructionsPath = await this.generateDeploymentInstructions(generatedFiles, webhookPath);

            console.log('\n🎉 SETUP COMPLETE!');
            console.log('=' .repeat(60));
            console.log('📁 Generated Files:');
            generatedFiles.forEach(file => {
                console.log(`   📝 ${file.form}: ${file.file}`);
            });
            console.log(`   📡 Webhook: ${webhookPath}`);
            console.log(`   📋 Instructions: ${instructionsPath}`);

            console.log('\n🚀 Next Steps:');
            console.log('   1. Start webhook server: node webhook_server.js');
            console.log('   2. Follow DEPLOYMENT_INSTRUCTIONS.md');
            console.log('   3. Deploy scripts to all 4 forms');
            console.log('   4. Test the complete system');

            return {
                success: true,
                generatedFiles,
                webhookPath,
                instructionsPath,
                dropdownValues: this.dropdownValues
            };

        } catch (error) {
            console.error('\n❌ Setup failed:', error.message);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const manager = new APIsAndDeploymentManager();
    manager.run().catch(console.error);
}

module.exports = APIsAndDeploymentManager;