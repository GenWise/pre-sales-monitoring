/**
 * Master Sheet onChange Notification System
 * Deploy this script to the Master Sheet to enable real-time email/Slack notifications
 *
 * SETUP INSTRUCTIONS:
 * 1. Open Master Sheet: https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ
 * 2. Go to Extensions → Apps Script
 * 3. Replace any existing code with this file's contents
 * 4. Save the project (name it "Master Sheet Notifications")
 * 5. Run setupOnChangeTrigger() function once to install the trigger
 * 6. Authorize when prompted
 */

// Configuration
const CONFIG = {
  // Email recipients (comma-separated for multiple)
  EMAIL_RECIPIENTS: 'rajesh@genwise.in',

  // Slack webhook URL (optional - leave empty to disable Slack)
  SLACK_WEBHOOK_URL: 'REDACTED_SLACK_WEBHOOK',

  // Email subject prefix
  EMAIL_SUBJECT_PREFIX: '[GSP26] New Lead Submitted',

  // Notification settings
  SEND_EMAIL: true,
  SEND_SLACK: true, // Slack webhook configured

  // Master Sheet column indices (0-based)
  COLUMNS: {
    CHILD_NAME: 0,      // Column A
    PARENT_NAME: 1,     // Column B
    PARENT_EMAIL: 2,    // Column C
    PARENT_MOBILE: 3,   // Column D
    INTEREST_LEVEL: 4,  // Column E
    SOURCE_TAG: 5,      // Column F
    TIMESTAMP: 6,       // Column G
    DUPLICATE_FLAG: 7,  // Column H
    STATUS: 8,          // Column I
    ASSIGNED_OWNER: 9,  // Column J
    NOTES: 10          // Column K
  }
};

/**
 * Main onChange trigger function
 * Fires when any change is made to the sheet
 */
function onSheetChange(e) {
  try {
    console.log('onChange trigger fired:', e);

    // Only process if rows were added
    if (!e || e.changeType !== 'INSERT_ROW') {
      console.log('Not a row insertion, skipping notification');
      return;
    }

    // Get the active sheet
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    // Skip if header row or empty
    if (lastRow <= 1) {
      console.log('No data rows to process');
      return;
    }

    // Get the newly added row data
    const rowData = sheet.getRange(lastRow, 1, 1, Object.keys(CONFIG.COLUMNS).length).getValues()[0];

    // Parse the row data
    const leadData = parseRowData(rowData);

    // Skip if essential data is missing
    if (!leadData.parentEmail || leadData.parentEmail === '') {
      console.log('No email address found, skipping notification');
      return;
    }

    console.log('Processing new lead:', leadData);

    // Send notifications
    const results = {
      email: null,
      slack: null
    };

    if (CONFIG.SEND_EMAIL) {
      results.email = sendEmailNotification(leadData);
    }

    if (CONFIG.SEND_SLACK && CONFIG.SLACK_WEBHOOK_URL) {
      results.slack = sendSlackNotification(leadData);
    }

    console.log('Notification results:', results);

  } catch (error) {
    console.error('Error in onSheetChange:', error.toString());
    console.error('Stack trace:', error.stack);

    // Send error notification to admin
    sendErrorNotification(error);
  }
}

/**
 * Parse row data into structured lead object
 */
function parseRowData(rowData) {
  return {
    childName: rowData[CONFIG.COLUMNS.CHILD_NAME] || '',
    parentName: rowData[CONFIG.COLUMNS.PARENT_NAME] || '',
    parentEmail: rowData[CONFIG.COLUMNS.PARENT_EMAIL] || '',
    parentMobile: rowData[CONFIG.COLUMNS.PARENT_MOBILE] || '',
    interestLevel: rowData[CONFIG.COLUMNS.INTEREST_LEVEL] || '',
    sourceTag: rowData[CONFIG.COLUMNS.SOURCE_TAG] || '',
    timestamp: rowData[CONFIG.COLUMNS.TIMESTAMP] || new Date(),
    duplicateFlag: rowData[CONFIG.COLUMNS.DUPLICATE_FLAG] || 'No',
    status: rowData[CONFIG.COLUMNS.STATUS] || '',
    assignedOwner: rowData[CONFIG.COLUMNS.ASSIGNED_OWNER] || 'Unassigned',
    notes: rowData[CONFIG.COLUMNS.NOTES] || ''
  };
}

/**
 * Send email notification for new lead
 */
function sendEmailNotification(leadData) {
  try {
    const subject = `${CONFIG.EMAIL_SUBJECT_PREFIX} - ${leadData.parentName}`;

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
            .important { background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 15px 0; }
            .duplicate { background-color: #f8d7da; padding: 10px; border-left: 4px solid #dc3545; margin: 15px 0; }
            .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #777; }
            .link { color: #4CAF50; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">🎓 New GSP26 Lead Submitted</h2>
            </div>
            <div class="content">
              ${leadData.duplicateFlag === 'Yes' ? '<div class="duplicate">⚠️ <strong>DUPLICATE LEAD</strong> - This email has submitted before</div>' : ''}

              <div class="field">
                <span class="label">Child Name:</span>
                <span class="value">${leadData.childName}</span>
              </div>

              <div class="field">
                <span class="label">Parent Name:</span>
                <span class="value">${leadData.parentName}</span>
              </div>

              <div class="field">
                <span class="label">Parent Email:</span>
                <span class="value"><a href="mailto:${leadData.parentEmail}" class="link">${leadData.parentEmail}</a></span>
              </div>

              <div class="field">
                <span class="label">Parent Mobile:</span>
                <span class="value">${leadData.parentMobile}</span>
              </div>

              <div class="field">
                <span class="label">Interest Level:</span>
                <span class="value"><strong>${leadData.interestLevel}</strong></span>
              </div>

              <div class="field">
                <span class="label">Source:</span>
                <span class="value">${formatSourceTag(leadData.sourceTag)}</span>
              </div>

              <div class="field">
                <span class="label">Status:</span>
                <span class="value">${leadData.status}</span>
              </div>

              <div class="field">
                <span class="label">Assigned Owner:</span>
                <span class="value">${leadData.assignedOwner}</span>
              </div>

              <div class="field">
                <span class="label">Submitted:</span>
                <span class="value">${formatTimestamp(leadData.timestamp)}</span>
              </div>

              ${leadData.notes ? `
              <div class="field">
                <span class="label">Notes:</span>
                <span class="value">${leadData.notes}</span>
              </div>
              ` : ''}

              ${leadData.interestLevel === 'High' ? '<div class="important">🔥 <strong>HIGH INTEREST</strong> - Priority follow-up recommended</div>' : ''}

              <div style="margin-top: 20px;">
                <a href="https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ"
                   class="link"
                   style="background-color: #4CAF50; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
                  View Master Sheet →
                </a>
              </div>
            </div>

            <div class="footer">
              <p>This is an automated notification from the GSP26 Pre-Sales Monitoring System.</p>
              <p>Master Sheet: <a href="https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ" class="link">Open Spreadsheet</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const plainBody = `
New GSP26 Lead Submitted
${leadData.duplicateFlag === 'Yes' ? '⚠️ DUPLICATE LEAD - This email has submitted before\n' : ''}

Child Name: ${leadData.childName}
Parent Name: ${leadData.parentName}
Parent Email: ${leadData.parentEmail}
Parent Mobile: ${leadData.parentMobile}
Interest Level: ${leadData.interestLevel}
Source: ${formatSourceTag(leadData.sourceTag)}
Status: ${leadData.status}
Assigned Owner: ${leadData.assignedOwner}
Submitted: ${formatTimestamp(leadData.timestamp)}
${leadData.notes ? '\nNotes: ' + leadData.notes : ''}

${leadData.interestLevel === 'High' ? '🔥 HIGH INTEREST - Priority follow-up recommended\n' : ''}

View Master Sheet: https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ
    `.trim();

    // Send email
    const recipients = CONFIG.EMAIL_RECIPIENTS.split(',').map(e => e.trim()).join(',');

    MailApp.sendEmail({
      to: recipients,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: 'GSP26 Pre-Sales System'
    });

    console.log('✅ Email notification sent to:', recipients);
    return { success: true, recipients: recipients };

  } catch (error) {
    console.error('❌ Error sending email notification:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Send Slack notification for new lead (optional)
 */
function sendSlackNotification(leadData) {
  try {
    if (!CONFIG.SLACK_WEBHOOK_URL) {
      console.log('Slack webhook URL not configured, skipping');
      return { success: false, error: 'Webhook not configured' };
    }

    const payload = {
      text: `🎓 New GSP26 Lead: ${leadData.parentName}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🎓 New GSP26 Lead Submitted"
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Child Name:*\n${leadData.childName}`
            },
            {
              type: "mrkdwn",
              text: `*Parent Name:*\n${leadData.parentName}`
            },
            {
              type: "mrkdwn",
              text: `*Email:*\n${leadData.parentEmail}`
            },
            {
              type: "mrkdwn",
              text: `*Mobile:*\n${leadData.parentMobile}`
            },
            {
              type: "mrkdwn",
              text: `*Interest Level:*\n${leadData.interestLevel}`
            },
            {
              type: "mrkdwn",
              text: `*Source:*\n${formatSourceTag(leadData.sourceTag)}`
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
                text: "View Master Sheet"
              },
              url: "https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ"
            }
          ]
        }
      ]
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    };

    const response = UrlFetchApp.fetch(CONFIG.SLACK_WEBHOOK_URL, options);

    console.log('✅ Slack notification sent');
    return { success: true, statusCode: response.getResponseCode() };

  } catch (error) {
    console.error('❌ Error sending Slack notification:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Send error notification to admin
 */
function sendErrorNotification(error) {
  try {
    const subject = '[ERROR] GSP26 Master Sheet Notification System';
    const body = `
An error occurred in the Master Sheet notification system:

Error: ${error.toString()}
Stack Trace: ${error.stack || 'No stack trace available'}

Time: ${new Date().toISOString()}
Sheet: https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ

Please check the script and logs.
    `.trim();

    MailApp.sendEmail({
      to: 'rajesh@genwise.in',
      subject: subject,
      body: body
    });

    console.log('Error notification sent to admin');

  } catch (emailError) {
    console.error('Failed to send error notification:', emailError.toString());
  }
}

/**
 * Format source tag for display
 */
function formatSourceTag(sourceTag) {
  const mapping = {
    'returning_students': 'Returning Students Form',
    'ats_qualifiers': 'ATS Qualifiers Form',
    'website': 'Website Form',
    'early_bird': 'Early Bird Form'
  };

  return mapping[sourceTag] || sourceTag;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp) {
  try {
    const date = new Date(timestamp);
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'MMM dd, yyyy hh:mm a');
  } catch (error) {
    return timestamp.toString();
  }
}

/**
 * Setup onChange trigger
 * Run this function ONCE to install the trigger
 */
function setupOnChangeTrigger() {
  try {
    // Delete existing onChange triggers to avoid duplicates
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onSheetChange') {
        ScriptApp.deleteTrigger(trigger);
        console.log('Deleted existing trigger');
      }
    });

    // Create new onChange trigger
    const spreadsheet = SpreadsheetApp.getActive();

    ScriptApp.newTrigger('onSheetChange')
      .forSpreadsheet(spreadsheet)
      .onChange()
      .create();

    console.log('✅ onChange trigger created successfully');
    console.log('Spreadsheet:', spreadsheet.getName());
    console.log('Email recipients:', CONFIG.EMAIL_RECIPIENTS);

    // Send test notification
    Browser.msgBox(
      'Trigger Setup Complete',
      '✅ onChange trigger has been installed successfully!\\n\\n' +
      'Email notifications will be sent to: ' + CONFIG.EMAIL_RECIPIENTS + '\\n\\n' +
      'The trigger will fire when new rows are added to the sheet.\\n\\n' +
      'Check the execution log (View → Executions) to monitor activity.',
      Browser.Buttons.OK
    );

    return { success: true };

  } catch (error) {
    console.error('❌ Error setting up trigger:', error.toString());
    Browser.msgBox('Error', 'Failed to setup trigger: ' + error.toString(), Browser.Buttons.OK);
    return { success: false, error: error.toString() };
  }
}

/**
 * Remove onChange trigger
 * Run this if you need to disable notifications
 */
function removeOnChangeTrigger() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;

    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onSheetChange') {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
      }
    });

    console.log(`✅ Removed ${deletedCount} onChange trigger(s)`);
    Browser.msgBox('Trigger Removed', `Removed ${deletedCount} onChange trigger(s)`, Browser.Buttons.OK);

    return { success: true, deletedCount: deletedCount };

  } catch (error) {
    console.error('❌ Error removing trigger:', error.toString());
    Browser.msgBox('Error', 'Failed to remove trigger: ' + error.toString(), Browser.Buttons.OK);
    return { success: false, error: error.toString() };
  }
}

/**
 * Test notification system
 * Run this to send a test notification with the last row of data
 */
function testNotification() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      Browser.msgBox('No Data', 'No data rows found to test with', Browser.Buttons.OK);
      return { success: false, error: 'No data rows' };
    }

    // Get the last row data
    const rowData = sheet.getRange(lastRow, 1, 1, Object.keys(CONFIG.COLUMNS).length).getValues()[0];
    const leadData = parseRowData(rowData);

    console.log('Testing notification with data:', leadData);

    // Send test notifications
    const emailResult = sendEmailNotification(leadData);
    const slackResult = CONFIG.SEND_SLACK ? sendSlackNotification(leadData) : { success: false, error: 'Disabled' };

    const message =
      'Email: ' + (emailResult.success ? '✅ Sent' : '❌ Failed - ' + emailResult.error) + '\\n' +
      'Slack: ' + (slackResult.success ? '✅ Sent' : '❌ ' + slackResult.error);

    Browser.msgBox('Test Results', message, Browser.Buttons.OK);

    return {
      success: emailResult.success || slackResult.success,
      email: emailResult,
      slack: slackResult
    };

  } catch (error) {
    console.error('❌ Error in test:', error.toString());
    Browser.msgBox('Error', 'Test failed: ' + error.toString(), Browser.Buttons.OK);
    return { success: false, error: error.toString() };
  }
}

/**
 * Get current configuration
 */
function getConfig() {
  console.log('Current Configuration:', CONFIG);

  const triggers = ScriptApp.getProjectTriggers();
  const onChangeTriggers = triggers.filter(t => t.getHandlerFunction() === 'onSheetChange');

  console.log('Active onChange triggers:', onChangeTriggers.length);

  return {
    config: CONFIG,
    triggersInstalled: onChangeTriggers.length,
    spreadsheetId: SpreadsheetApp.getActive().getId(),
    spreadsheetName: SpreadsheetApp.getActive().getName()
  };
}
