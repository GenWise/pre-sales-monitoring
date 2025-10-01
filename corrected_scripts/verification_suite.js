/**
 * VERIFICATION SUITE FOR FORM-BOUND SCRIPTS
 *
 * This script helps verify that all form automation is working correctly.
 * Run these functions after deploying the form-bound scripts.
 *
 * USAGE:
 * 1. Copy this into any Google Apps Script project (can be standalone)
 * 2. Update the FORM_IDS and configuration
 * 3. Run verification functions to test the deployment
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
const WEBHOOK_URL = 'https://dashboard.giftedworld.org/webhook';

const FORM_IDS = {
  'returning_students': '1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA',
  'ats_qualifiers': '1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ',
  'website': '1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg',
  'early_bird': '1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY'
};

const FORM_URLS = {
  'returning_students': 'https://docs.google.com/forms/d/1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA/edit',
  'ats_qualifiers': 'https://docs.google.com/forms/d/1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ/edit',
  'website': 'https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg/edit',
  'early_bird': 'https://docs.google.com/forms/d/1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY/edit'
};

// =============================================================================
// MAIN VERIFICATION FUNCTIONS
// =============================================================================

/**
 * MASTER VERIFICATION - Run this to check everything
 */
function runFullVerification() {
  console.log('🔍 Starting full verification suite...');

  const results = {
    timestamp: new Date().toISOString(),
    masterSheet: null,
    webhook: null,
    forms: {},
    summary: {}
  };

  // Test master sheet access
  console.log('\n📊 Testing master sheet access...');
  results.masterSheet = testMasterSheetAccess();

  // Test webhook endpoint
  console.log('\n🌐 Testing webhook endpoint...');
  results.webhook = testWebhookEndpoint();

  // Test each form
  console.log('\n📝 Testing form access...');
  for (const [formName, formId] of Object.entries(FORM_IDS)) {
    console.log(`\n--- Testing ${formName} ---`);
    results.forms[formName] = testFormAccess(formName, formId);
  }

  // Generate summary
  results.summary = generateSummary(results);

  console.log('\n' + '='.repeat(50));
  console.log('📋 VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  console.log(JSON.stringify(results.summary, null, 2));

  return results;
}

/**
 * Test master sheet access and structure
 */
function testMasterSheetAccess() {
  try {
    const sheet = SpreadsheetApp.openById(MASTER_SHEET_ID);
    const activeSheet = sheet.getActiveSheet();
    const headers = activeSheet.getRange(1, 1, 1, activeSheet.getLastColumn()).getValues()[0];
    const lastRow = activeSheet.getLastRow();

    const result = {
      success: true,
      sheetName: activeSheet.getName(),
      sheetId: MASTER_SHEET_ID,
      lastRow: lastRow,
      columnCount: headers.length,
      headers: headers,
      url: sheet.getUrl()
    };

    console.log('✅ Master sheet access successful');
    console.log(`📊 Sheet: ${result.sheetName} (${result.lastRow} rows, ${result.columnCount} columns)`);

    return result;

  } catch (error) {
    const result = {
      success: false,
      error: error.toString(),
      sheetId: MASTER_SHEET_ID
    };

    console.error('❌ Master sheet access failed:', error.toString());
    return result;
  }
}

/**
 * Test webhook endpoint connectivity
 */
function testWebhookEndpoint() {
  try {
    const testPayload = {
      source: 'verification-suite',
      version: '1.0',
      test: true,
      timestamp: new Date().toISOString(),
      data: {
        message: 'Verification test from Google Apps Script'
      }
    };

    const response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GoogleAppsScript-Verification/1.0'
      },
      payload: JSON.stringify(testPayload),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    const result = {
      success: responseCode >= 200 && responseCode < 300,
      url: WEBHOOK_URL,
      responseCode: responseCode,
      responseText: responseText,
      timestamp: new Date().toISOString()
    };

    if (result.success) {
      console.log('✅ Webhook endpoint accessible');
      console.log(`📡 Response: ${responseCode} - ${responseText.substring(0, 100)}`);
    } else {
      console.error('❌ Webhook endpoint failed');
      console.error(`📡 Response: ${responseCode} - ${responseText}`);
    }

    return result;

  } catch (error) {
    const result = {
      success: false,
      url: WEBHOOK_URL,
      error: error.toString()
    };

    console.error('❌ Webhook test failed:', error.toString());
    return result;
  }
}

/**
 * Test individual form access
 */
function testFormAccess(formName, formId) {
  try {
    // This will only work if run from within the form's bound script
    // From a standalone script, we can only check basic form info

    const result = {
      formName: formName,
      formId: formId,
      url: FORM_URLS[formName],
      accessible: false,
      bindingRequired: true,
      instructions: `To test ${formName}, run testWebhook() function directly in the form's script editor`
    };

    console.log(`ℹ️ ${formName}: Form binding verification required`);
    console.log(`🔗 URL: ${result.url}`);
    console.log(`📋 Instructions: ${result.instructions}`);

    return result;

  } catch (error) {
    const result = {
      formName: formName,
      formId: formId,
      success: false,
      error: error.toString()
    };

    console.error(`❌ ${formName} test failed:`, error.toString());
    return result;
  }
}

/**
 * Generate verification summary
 */
function generateSummary(results) {
  const summary = {
    overallStatus: 'unknown',
    masterSheetOk: results.masterSheet?.success || false,
    webhookOk: results.webhook?.success || false,
    formsTotal: Object.keys(FORM_IDS).length,
    formsAccessible: 0,
    issues: [],
    nextSteps: []
  };

  // Count accessible forms
  for (const formResult of Object.values(results.forms)) {
    if (formResult.accessible) {
      summary.formsAccessible++;
    }
  }

  // Identify issues
  if (!summary.masterSheetOk) {
    summary.issues.push('Master sheet access failed');
    summary.nextSteps.push('Verify master sheet permissions and ID');
  }

  if (!summary.webhookOk) {
    summary.issues.push('Webhook endpoint not accessible');
    summary.nextSteps.push('Check webhook URL and server status');
  }

  summary.nextSteps.push('Deploy form-bound scripts using DEPLOYMENT_INSTRUCTIONS.md');
  summary.nextSteps.push('Test each form by running testWebhook() in form script editors');

  // Determine overall status
  if (summary.masterSheetOk && summary.webhookOk) {
    summary.overallStatus = 'ready-for-deployment';
  } else if (summary.issues.length > 0) {
    summary.overallStatus = 'issues-found';
  }

  return summary;
}

// =============================================================================
// INDIVIDUAL TESTING FUNCTIONS
// =============================================================================

/**
 * Test just the master sheet
 */
function testMasterSheetOnly() {
  console.log('📊 Testing master sheet access...');
  return testMasterSheetAccess();
}

/**
 * Test just the webhook
 */
function testWebhookOnly() {
  console.log('🌐 Testing webhook endpoint...');
  return testWebhookEndpoint();
}

/**
 * Send test data to master sheet
 */
function sendTestDataToMasterSheet() {
  try {
    console.log('📝 Sending test data to master sheet...');

    const sheet = SpreadsheetApp.openById(MASTER_SHEET_ID).getActiveSheet();

    const testData = [
      'Test Child Verification',
      'Test Parent Verification',
      'test-verification@example.com',
      '+1234567890',
      'High',
      'Verification',
      new Date().toISOString(),
      'No',
      'New Parent',
      'Unassigned',
      'Test data from verification suite'
    ];

    sheet.appendRow(testData);

    console.log('✅ Test data added to master sheet');
    console.log('📋 Data:', testData);

    return {
      success: true,
      data: testData,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Failed to add test data:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Check for recent form submissions in master sheet
 */
function checkRecentSubmissions() {
  try {
    console.log('🔍 Checking for recent form submissions...');

    const sheet = SpreadsheetApp.openById(MASTER_SHEET_ID).getActiveSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      console.log('ℹ️ No data rows found in master sheet');
      return { success: true, submissions: [], count: 0 };
    }

    // Get last 10 rows or all data rows, whichever is smaller
    const rowsToCheck = Math.min(10, lastRow - 1);
    const dataRange = sheet.getRange(lastRow - rowsToCheck + 1, 1, rowsToCheck, sheet.getLastColumn());
    const data = dataRange.getValues();

    const submissions = data.map((row, index) => ({
      row: lastRow - rowsToCheck + 1 + index,
      childName: row[0],
      parentName: row[1],
      email: row[2],
      sourceTag: row[5],
      timestamp: row[6],
      status: row[8]
    }));

    console.log(`✅ Found ${submissions.length} recent submissions`);
    submissions.forEach(sub => {
      console.log(`📝 Row ${sub.row}: ${sub.childName} (${sub.sourceTag}) - ${sub.status}`);
    });

    return {
      success: true,
      submissions: submissions,
      count: submissions.length,
      lastRow: lastRow
    };

  } catch (error) {
    console.error('❌ Failed to check submissions:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

// =============================================================================
// DEPLOYMENT STATUS CHECKER
// =============================================================================

/**
 * Check if form-bound scripts are properly deployed
 */
function checkDeploymentStatus() {
  console.log('🔍 Checking deployment status...');

  const status = {
    timestamp: new Date().toISOString(),
    formsToCheck: Object.keys(FORM_IDS).length,
    instructions: [],
    summary: 'Form-bound scripts must be checked manually in each form\'s script editor'
  };

  status.instructions = [
    '1. Open each form URL in the configuration',
    '2. Go to Script Editor (three dots menu → Script editor)',
    '3. Run testWebhook() function to verify deployment',
    '4. Run getStatus() to check configuration',
    '5. Submit a test response to verify end-to-end flow'
  ];

  console.log('📋 Manual verification required for form-bound scripts');
  console.log('📝 Instructions:');
  status.instructions.forEach((instruction, index) => {
    console.log(`   ${instruction}`);
  });

  return status;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get configuration summary
 */
function getConfiguration() {
  return {
    masterSheetId: MASTER_SHEET_ID,
    webhookUrl: WEBHOOK_URL,
    forms: FORM_IDS,
    formUrls: FORM_URLS,
    timestamp: new Date().toISOString()
  };
}

/**
 * Quick health check
 */
function quickHealthCheck() {
  console.log('⚡ Running quick health check...');

  const results = {
    masterSheet: testMasterSheetAccess(),
    webhook: testWebhookEndpoint()
  };

  const allGood = results.masterSheet.success && results.webhook.success;

  console.log(allGood ? '✅ Basic systems operational' : '❌ Issues detected');

  return {
    healthy: allGood,
    details: results,
    timestamp: new Date().toISOString()
  };
}