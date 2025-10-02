/**
 * Test script to check if Google Forms are properly calling the webhook
 * This will help us diagnose the 107-minute delay issue
 */

const WEBHOOK_URL = 'https://dashboard.giftedworld.org/webhook.php';

// Test data for each form
const FORM_TEST_DATA = {
  returning_students: {
    formId: '1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA',
    testData: {
      child_name: 'Test Child Returning',
      parent_name: 'Test Parent Returning',
      parent_email: 'returning.test@automation.com',
      parent_mobile: '9876543210',
      source_tag: 'returning_students',
      interest_level: 'High',
      timestamp: new Date().toISOString()
    }
  },
  ats_qualifiers: {
    formId: '1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ',
    testData: {
      child_name: 'Test Child ATS',
      parent_name: 'Test Parent ATS',
      parent_email: 'ats.test@automation.com',
      parent_mobile: '9876543211',
      source_tag: 'ats_qualifiers',
      interest_level: 'Medium',
      timestamp: new Date().toISOString()
    }
  },
  website: {
    formId: '1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg',
    testData: {
      child_name: 'Test Child Website',
      parent_name: 'Test Parent Website',
      parent_email: 'website.test@automation.com',
      parent_mobile: '9876543212',
      source_tag: 'website',
      interest_level: 'Low',
      timestamp: new Date().toISOString()
    }
  },
  early_bird: {
    formId: '1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY',
    testData: {
      child_name: 'Test Child Early',
      parent_name: 'Test Parent Early',
      parent_email: 'early.test@automation.com',
      parent_mobile: '9876543213',
      source_tag: 'early_bird',
      interest_level: 'High',
      timestamp: new Date().toISOString()
    }
  }
};

/**
 * Test webhook directly to ensure it's working
 */
async function testWebhookDirect() {
  console.log('🧪 Testing webhook directly...');

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(FORM_TEST_DATA.website.testData)
    });

    const result = await response.text();
    console.log(`📊 Webhook response (${response.status}):`, result);

    if (response.ok) {
      console.log('✅ Webhook is working correctly');
      return true;
    } else {
      console.error('❌ Webhook failed with status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Webhook test failed:', error.message);
    return false;
  }
}

/**
 * Check dashboard API to see recent submissions
 */
async function checkDashboardData() {
  console.log('🔍 Checking dashboard for recent data...');

  try {
    const response = await fetch('https://dashboard.giftedworld.org/leads.php');
    const data = await response.json();

    if (data.success && data.leads) {
      console.log(`📊 Dashboard has ${data.leads.length} total leads`);

      // Check for test submissions from today
      const today = new Date().toISOString().split('T')[0];
      const todayLeads = data.leads.filter(lead => {
        return lead.date && lead.date.startsWith(today);
      });

      console.log(`📅 Today's submissions: ${todayLeads.length}`);

      // Show recent test submissions
      const testEmails = ['returning.test@automation.com', 'ats.test@automation.com',
                         'website.test@automation.com', 'early.test@automation.com'];

      const testSubmissions = data.leads.filter(lead =>
        testEmails.includes(lead.email)
      );

      console.log(`🧪 Test submissions found: ${testSubmissions.length}`);

      return {
        totalLeads: data.leads.length,
        todayLeads: todayLeads.length,
        testSubmissions: testSubmissions.length,
        recentSubmissions: data.leads.slice(-5).map(lead => ({
          name: lead.name,
          email: lead.email,
          source: lead.source,
          date: lead.date
        }))
      };
    } else {
      console.error('❌ Failed to get dashboard data');
      return null;
    }
  } catch (error) {
    console.error('❌ Dashboard check failed:', error.message);
    return null;
  }
}

/**
 * Test timing by submitting to webhook and checking how long it takes to appear
 */
async function testTimingWithWebhook() {
  console.log('⏱️ Testing webhook submission timing...');

  const testEmail = `timing.test.${Date.now()}@automation.com`;
  const testData = {
    child_name: `Timing Test Child ${Date.now()}`,
    parent_name: 'Timing Test Parent',
    parent_email: testEmail,
    parent_mobile: '9999999999',
    source_tag: 'website',
    interest_level: 'Medium',
    timestamp: new Date().toISOString()
  };

  console.log('📤 Submitting test data to webhook...');
  const startTime = Date.now();

  try {
    // Submit to webhook
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    if (!webhookResponse.ok) {
      console.error('❌ Webhook submission failed');
      return null;
    }

    console.log('✅ Webhook submission successful');

    // Wait a moment and check dashboard
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('🔍 Checking if data appears in dashboard...');

    const dashboardData = await checkDashboardData();
    if (dashboardData) {
      const foundSubmission = await checkForSubmission(testEmail);
      if (foundSubmission) {
        const endTime = Date.now();
        const timeTaken = (endTime - startTime) / 1000;
        console.log(`⚡ TIMING RESULT: ${timeTaken} seconds from webhook to dashboard`);
        return timeTaken;
      } else {
        console.log('❌ Submission not found in dashboard yet');
        return null;
      }
    }

  } catch (error) {
    console.error('❌ Timing test failed:', error.message);
    return null;
  }
}

/**
 * Check for a specific submission by email
 */
async function checkForSubmission(email, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('https://dashboard.giftedworld.org/leads.php');
      const data = await response.json();

      if (data.success && data.leads) {
        const found = data.leads.find(lead => lead.email === email);
        if (found) {
          console.log(`✅ Found submission for ${email}`);
          return found;
        }
      }

      if (i < maxRetries - 1) {
        console.log(`⏳ Attempt ${i + 1}/${maxRetries} - not found yet, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`❌ Check attempt ${i + 1} failed:`, error.message);
    }
  }

  console.log(`❌ Submission for ${email} not found after ${maxRetries} attempts`);
  return null;
}

/**
 * Main diagnostic function
 */
async function runDiagnostics() {
  console.log('🔧 Starting Form Webhook Integration Diagnostics...\n');

  // Test 1: Webhook connectivity
  console.log('=== TEST 1: Webhook Connectivity ===');
  const webhookWorking = await testWebhookDirect();
  console.log('');

  // Test 2: Dashboard data check
  console.log('=== TEST 2: Dashboard Data Check ===');
  const dashboardData = await checkDashboardData();
  console.log('');

  // Test 3: Timing test
  console.log('=== TEST 3: Webhook Timing Test ===');
  const timingResult = await testTimingWithWebhook();
  console.log('');

  // Summary
  console.log('=== DIAGNOSTIC SUMMARY ===');
  console.log(`Webhook Working: ${webhookWorking ? '✅' : '❌'}`);
  console.log(`Dashboard Accessible: ${dashboardData ? '✅' : '❌'}`);
  console.log(`Webhook Timing: ${timingResult ? `⚡ ${timingResult}s` : '❌ Failed'}`);

  if (webhookWorking && timingResult && timingResult < 30) {
    console.log('\n🎉 WEBHOOK PIPELINE IS WORKING! Problem likely in Google Apps Scripts.');
    console.log('📋 Next steps:');
    console.log('   1. Check if form-bound scripts are deployed');
    console.log('   2. Verify script triggers are active');
    console.log('   3. Test actual form submissions');
  } else if (webhookWorking && !timingResult) {
    console.log('\n⚠️ WEBHOOK WORKS BUT TIMING FAILED');
    console.log('📋 Possible issues:');
    console.log('   1. Dashboard caching delay');
    console.log('   2. Google Sheets API latency');
    console.log('   3. Service account permissions');
  } else {
    console.log('\n❌ WEBHOOK PIPELINE BROKEN');
    console.log('📋 Issues to fix:');
    console.log('   1. Webhook endpoint problems');
    console.log('   2. Server configuration');
    console.log('   3. Database connection');
  }

  return {
    webhookWorking,
    dashboardData,
    timingResult
  };
}

// Run diagnostics if this script is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runDiagnostics().catch(console.error);
}

module.exports = {
  testWebhookDirect,
  checkDashboardData,
  testTimingWithWebhook,
  runDiagnostics
};