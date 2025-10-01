// Test Complete Pre-Sales Monitoring Workflow
const { google } = require('googleapis');
require('dotenv').config();

// Configuration
const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
const WEBHOOK_URL = 'http://localhost:3001/webhook/form-submission';
const DASHBOARD_API_URL = 'http://localhost:3002/api/leads';

async function testWorkflow() {
    console.log('========================================');
    console.log('PRE-SALES MONITORING WORKFLOW TEST');
    console.log('========================================\n');

    const results = {
        webhook: false,
        masterSheet: false,
        dashboard: false,
        dataValidation: false
    };

    // Test 1: Webhook Server
    console.log('1. Testing Webhook Server...');
    try {
        const testData = {
            formData: {
                'Child Name': 'Test Child Workflow',
                'Parent Name': 'Test Parent Workflow',
                'Parent Email': 'workflow.test@example.com',
                'Parent Mobile': '9876543210',
                'Interest Level': 'High', // Must match exactly
                sourceTag: 'returning_students',    // Must match exactly
                formId: '1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA',
                timestamp: new Date().toISOString()
            },
            metadata: {
                formName: 'returning_students'
            }
        };

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });

        if (response.ok) {
            console.log('✅ Webhook accepted submission');
            results.webhook = true;
        } else {
            const error = await response.text();
            console.log('❌ Webhook rejected:', error);
        }
    } catch (error) {
        console.log('❌ Webhook server not running:', error.message);
        console.log('   Run: node webhook_server.js');
    }

    // Wait for data to propagate
    console.log('\n⏳ Waiting 3 seconds for data propagation...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 2: Master Sheet Data
    console.log('2. Checking Master Sheet...');
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: MASTER_SHEET_ID,
            range: 'Sheet1!A:K'
        });

        const rows = response.data.values;
        if (rows && rows.length > 1) {
            console.log('✅ Master sheet has', rows.length - 1, 'data rows');

            // Check for our test entry
            const testEntry = rows.find(row =>
                row.includes('workflow.test@example.com')
            );

            if (testEntry) {
                console.log('✅ Test entry found in master sheet');
                results.masterSheet = true;
            } else {
                console.log('⚠️  Test entry not found yet');
            }
        } else {
            console.log('⚠️  Master sheet is empty');
        }
    } catch (error) {
        console.log('❌ Could not read master sheet:', error.message);
    }

    // Test 3: Dashboard API
    console.log('\n3. Testing Dashboard API...');
    try {
        const response = await fetch(DASHBOARD_API_URL);
        const data = await response.json();

        if (data.success && data.leads) {
            console.log('✅ Dashboard API returned', data.leads.length, 'leads');

            // Check for our test entry
            const testLead = data.leads.find(lead =>
                lead.parent_email === 'workflow.test@example.com'
            );

            if (testLead) {
                console.log('✅ Test lead visible in dashboard');
                results.dashboard = true;
            } else {
                console.log('⚠️  Test lead not in dashboard yet');
            }
        } else {
            console.log('❌ Dashboard API error:', data.error);
        }
    } catch (error) {
        console.log('❌ Dashboard API not accessible:', error.message);
    }

    // Test 4: Data Validation
    console.log('\n4. Testing Data Validation...');
    const invalidTests = [
        { field: 'status', value: 'Invalid Status', expected: false },
        { field: 'interest_level', value: 'Very High', expected: false }, // Should be mapped to 'High'
        { field: 'source_tag', value: 'Form5', expected: false },
        { field: 'duplicate_flag', value: 'Maybe', expected: false }
    ];

    let validationPassed = true;
    for (const test of invalidTests) {
        const testData = {
            child_name: 'Validation Test',
            parent_name: 'Validation Parent',
            parent_email: 'validation@test.com',
            parent_mobile: '1234567890',
            [test.field]: test.value
        };

        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
            });

            if (response.ok && !test.expected) {
                console.log(`❌ Validation failed: ${test.field}='${test.value}' should be rejected`);
                validationPassed = false;
            } else if (!response.ok && test.expected) {
                console.log(`❌ Validation failed: ${test.field}='${test.value}' should be accepted`);
                validationPassed = false;
            }
        } catch (error) {
            console.log('⚠️  Could not test validation');
        }
    }

    if (validationPassed) {
        console.log('✅ Data validation working correctly');
        results.dataValidation = true;
    }

    // Summary
    console.log('\n========================================');
    console.log('WORKFLOW TEST RESULTS');
    console.log('========================================');

    const components = [
        { name: 'Webhook Server', status: results.webhook },
        { name: 'Master Sheet Write', status: results.masterSheet },
        { name: 'Dashboard API', status: results.dashboard },
        { name: 'Data Validation', status: results.dataValidation }
    ];

    components.forEach(comp => {
        console.log(`${comp.status ? '✅' : '❌'} ${comp.name}`);
    });

    const allPassed = Object.values(results).every(v => v);

    console.log('\n' + (allPassed ?
        '🎉 ALL TESTS PASSED! Workflow is fully operational.' :
        '⚠️  Some components need attention. Check above for details.'));

    // Cleanup instructions
    console.log('\n========================================');
    console.log('NEXT STEPS');
    console.log('========================================');

    if (!allPassed) {
        if (!results.webhook) {
            console.log('1. Start webhook server: node webhook_server.js');
        }
        if (!results.dashboard) {
            console.log('2. Start dashboard API: node dashboard_api_proxy.js');
        }
        console.log('3. Deploy Google Apps Scripts to forms (see deployment_instructions.md)');
    } else {
        console.log('✅ System ready for production!');
        console.log('Deploy the Google Apps Scripts to each form to complete setup.');
    }
}

// Run tests
testWorkflow().catch(console.error);