// Test Complete Forms Automation After Deployment
const { google } = require('googleapis');
require('dotenv').config();

async function testFormsAutomation() {
    console.log('🧪 TESTING COMPLETE FORMS AUTOMATION');
    console.log('=====================================\n');

    // Configuration
    const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
    const WEBHOOK_URL = 'http://localhost:3001/webhook/form-submission';
    const DASHBOARD_URL = 'http://localhost:3002/api/leads';

    const testData = [
        {
            formName: 'returning_students',
            formId: '1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA',
            testSubmission: {
                formData: {
                    'Child Name': 'Test Child returning_students',
                    'Parent Name': 'Test Parent returning_students',
                    'Parent Email': 'form1.test@automation.com',
                    'Parent Mobile': '9001234567',
                    'Interest Level': 'High',
                    sourceTag: 'returning_students',
                    formId: '1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA',
                    timestamp: new Date().toISOString()
                },
                metadata: { formName: 'returning_students' }
            }
        },
        {
            formName: 'ats_qualifiers',
            formId: '1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ',
            testSubmission: {
                formData: {
                    'Child Name': 'Test Child ats_qualifiers',
                    'Parent Name': 'Test Parent ats_qualifiers',
                    'Parent Email': 'form2.test@automation.com',
                    'Parent Mobile': '9001234568',
                    'Interest Level': 'Medium',
                    sourceTag: 'ats_qualifiers',
                    formId: '1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ',
                    timestamp: new Date().toISOString()
                },
                metadata: { formName: 'ats_qualifiers' }
            }
        },
        {
            formName: 'website',
            formId: '1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg',
            testSubmission: {
                formData: {
                    'Child Name': 'Test Child website',
                    'Parent Name': 'Test Parent website',
                    'Parent Email': 'form3.test@automation.com',
                    'Parent Mobile': '9001234569',
                    'Interest Level': 'Low',
                    sourceTag: 'website',
                    formId: '1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg',
                    timestamp: new Date().toISOString()
                },
                metadata: { formName: 'website' }
            }
        },
        {
            formName: 'early_bird',
            formId: '1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY',
            testSubmission: {
                formData: {
                    'Child Name': 'Test Child early_bird',
                    'Parent Name': 'Test Parent early_bird',
                    'Parent Email': 'form4.test@automation.com',
                    'Parent Mobile': '9001234570',
                    'Interest Level': 'High',
                    sourceTag: 'early_bird',
                    formId: '1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY',
                    timestamp: new Date().toISOString()
                },
                metadata: { formName: 'early_bird' }
            }
        }
    ];

    let allPassed = true;
    const results = [];

    // Test each form
    for (const test of testData) {
        console.log(`🧪 Testing ${test.formName}...`);

        try {
            // Send webhook request
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(test.testSubmission)
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`   ✅ ${test.formName} webhook accepted: ${result.success ? 'SUCCESS' : 'FAILED'}`);

                results.push({
                    form: test.formName,
                    webhook: true,
                    webhookResult: result
                });
            } else {
                console.log(`   ❌ ${test.formName} webhook rejected: ${response.status}`);
                results.push({
                    form: test.formName,
                    webhook: false,
                    error: `HTTP ${response.status}`
                });
                allPassed = false;
            }

        } catch (error) {
            console.log(`   ❌ ${test.formName} webhook error: ${error.message}`);
            results.push({
                form: test.formName,
                webhook: false,
                error: error.message
            });
            allPassed = false;
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Wait for data to propagate
    console.log('\n⏳ Waiting 5 seconds for data propagation...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check master sheet
    console.log('📊 Checking Master Sheet...');
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
        const dataRows = rows.slice(1); // Skip header

        console.log(`   📋 Total entries in master sheet: ${dataRows.length}`);

        // Check for test entries
        const testEmails = testData.map(t => t.testSubmission.formData['Parent Email']);
        const foundEntries = testEmails.map(email => {
            const found = dataRows.some(row => row.includes(email));
            return { email, found };
        });

        foundEntries.forEach(entry => {
            console.log(`   ${entry.found ? '✅' : '❌'} ${entry.email}: ${entry.found ? 'Found' : 'Not found'}`);
        });

        const allFound = foundEntries.every(e => e.found);
        if (!allFound) allPassed = false;

    } catch (error) {
        console.log(`   ❌ Master sheet check failed: ${error.message}`);
        allPassed = false;
    }

    // Check dashboard
    console.log('\n🖥️ Checking Dashboard...');
    try {
        const response = await fetch(DASHBOARD_URL);
        const data = await response.json();

        if (data.success) {
            console.log(`   📊 Dashboard has ${data.leads.length} leads`);

            // Check for test entries
            const testEmails = testData.map(t => t.testSubmission.formData['Parent Email']);
            const foundInDashboard = testEmails.map(email => {
                const found = data.leads.some(lead => lead.parent_email === email);
                return { email, found };
            });

            foundInDashboard.forEach(entry => {
                console.log(`   ${entry.found ? '✅' : '❌'} ${entry.email}: ${entry.found ? 'Visible' : 'Not visible'}`);
            });

            const allFoundInDashboard = foundInDashboard.every(e => e.found);
            if (!allFoundInDashboard) allPassed = false;

        } else {
            console.log(`   ❌ Dashboard API error: ${data.error}`);
            allPassed = false;
        }

    } catch (error) {
        console.log(`   ❌ Dashboard check failed: ${error.message}`);
        allPassed = false;
    }

    // Final summary
    console.log('\n🎯 AUTOMATION TEST RESULTS');
    console.log('===========================');

    if (allPassed) {
        console.log('🎉 ALL TESTS PASSED!');
        console.log('✅ Forms automation is FULLY OPERATIONAL');
        console.log('✅ Webhook server processing correctly');
        console.log('✅ Master sheet updating correctly');
        console.log('✅ Dashboard displaying data correctly');
        console.log('\n🚀 Your pre-sales monitoring system is 100% automated!');
    } else {
        console.log('⚠️ Some tests failed. Check details above.');
        console.log('\nComponents to verify:');
        console.log('1. Webhook server running (node webhook_server.js)');
        console.log('2. Dashboard API running (node dashboard_api_proxy.js)');
        console.log('3. Google Apps Scripts deployed to forms');
        console.log('4. Form submission triggers activated');
    }

    // Generate detailed report
    const report = {
        timestamp: new Date().toISOString(),
        testResults: results,
        allTestsPassed: allPassed,
        testedForms: testData.length,
        passedTests: results.filter(r => r.webhook).length
    };

    await require('fs').promises.writeFile(
        'automation_test_report.json',
        JSON.stringify(report, null, 2)
    );

    console.log('\n📄 Detailed report saved to automation_test_report.json');
}

if (require.main === module) {
    testFormsAutomation().catch(console.error);
}