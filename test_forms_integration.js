const FormsIntegration = require('./src/sheets/formsIntegration');
const { FORMS_CONFIG, FormMappingUtils } = require('./src/sheets/formsMapping');

/**
 * Test script for Google Forms Integration
 * This script tests all aspects of the forms integration system
 */

async function runTests() {
    console.log('🧪 Starting Forms Integration Tests...\n');

    const integration = new FormsIntegration();

    try {
        // Test 1: Initialize the integration
        console.log('📋 Test 1: Initializing Forms Integration');
        await integration.initialize();
        console.log('✅ Forms Integration initialized successfully\n');

        // Test 2: Test all form connections
        console.log('📋 Test 2: Testing Form Connections');
        const connectionResults = await integration.testAllFormConnections();

        console.log('Connection Test Results:');
        connectionResults.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.formName} (${result.formKey})`);
            if (result.success) {
                console.log(`   Headers: ${result.headerCount} columns`);
                console.log(`   Responses: ${result.responseCount} rows`);
                console.log(`   Headers: ${result.headers.slice(0, 5).join(', ')}${result.headers.length > 5 ? '...' : ''}`);
            } else {
                console.log(`   Error: ${result.error}`);
            }
        });
        console.log('');

        // Test 3: Test field mapping
        console.log('📋 Test 3: Testing Field Mapping');
        testFieldMapping();
        console.log('');

        // Test 4: Get processing statistics
        console.log('📋 Test 4: Processing Statistics');
        const stats = integration.getProcessingStats();
        console.log('Processing Statistics:', {
            formsConfigured: stats.formsConfigured,
            availableForms: stats.availableForms.map(f => `${f.name} (${f.sourceTag})`)
        });
        console.log('');

        // Test 5: Process a few responses from each working form (limited)
        console.log('📋 Test 5: Processing Sample Responses (Limited)');
        for (const result of connectionResults) {
            if (result.success && result.responseCount > 0) {
                try {
                    console.log(`Processing sample responses from ${result.formName}...`);
                    const processResult = await integration.pullFormResponses(result.formKey, {
                        processAll: false // Only process new responses
                    });

                    console.log(`✅ ${result.formName}:`, {
                        processed: processResult.processed,
                        added: processResult.added,
                        duplicates: processResult.duplicates,
                        errors: processResult.errors.length,
                        skipped: processResult.skipped
                    });

                    // Show any errors
                    if (processResult.errors.length > 0) {
                        console.log('   Errors encountered:');
                        processResult.errors.slice(0, 3).forEach(error => {
                            console.log(`   - Row ${error.rowIndex}: ${error.error}`);
                        });
                    }
                } catch (error) {
                    console.log(`❌ Failed to process ${result.formName}: ${error.message}`);
                }
            } else if (result.success && result.responseCount === 0) {
                console.log(`⚠️  ${result.formName}: No responses to process`);
            }
        }
        console.log('');

        console.log('🎉 Forms Integration Tests Completed Successfully!');
        console.log('\n📊 Summary:');
        console.log(`- Total forms configured: ${Object.keys(FORMS_CONFIG).length}`);
        console.log(`- Working connections: ${connectionResults.filter(r => r.success).length}`);
        console.log(`- Failed connections: ${connectionResults.filter(r => !r.success).length}`);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

/**
 * Test field mapping functionality
 */
function testFieldMapping() {
    console.log('Testing field mapping with sample data...');

    const sampleFormResponses = [
        {
            'Parent Name': 'John Smith',
            'Child Name': 'Emma Smith',
            'Email Address': 'john.smith@example.com',
            'Mobile Number': '+91-9876543210',
            'Interest Level': 'Very High',
            'Timestamp': '2024-01-15 10:30:00'
        },
        {
            'Guardian Name': 'Sarah Johnson',
            'Student Name': 'Michael Johnson',
            'Parent Email': 'sarah.j@example.com',
            'Phone': '9876543211',
            'How interested are you?': 'Medium',
            'Response Time': '2024-01-15 11:00:00'
        }
    ];

    sampleFormResponses.forEach((response, index) => {
        console.log(`\nSample Response ${index + 1}:`, response);

        // Test mapping with returning_students config
        const form1Config = FORMS_CONFIG.form1;
        const mappedData = FormMappingUtils.mapFormResponse(response, form1Config);
        console.log('Mapped to master format:', mappedData);

        // Test validation
        const validation = FormMappingUtils.validateRequiredFields(mappedData);
        console.log('Validation:', validation.isValid ? '✅ Valid' : '❌ Invalid',
            validation.isValid ? '' : `Missing: ${validation.missingFields.join(', ')}`);

        // Test formatting for master database
        const formatted = FormMappingUtils.formatForMasterDatabase(mappedData);
        console.log('Formatted for database:', formatted);
    });

    console.log('✅ Field mapping tests completed');
}

/**
 * Test webhook payload processing
 */
function testWebhookPayload() {
    console.log('📋 Testing Webhook Payload Processing');

    const sampleWebhookPayload = {
        formData: {
            'Parent Name': 'Test Parent',
            'Child Name': 'Test Child',
            'Parent Email': 'test@example.com',
            'Parent Mobile': '+1234567890',
            'Interest Level': 'High',
            'responseId': 'test-response-id',
            'submissionTime': new Date().toISOString(),
            'sourceTag': 'returning_students',
            'timestamp': new Date().toISOString(),
            'formId': '1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA'
        },
        source: 'google-apps-script',
        version: '1.0'
    };

    console.log('Sample webhook payload:', JSON.stringify(sampleWebhookPayload, null, 2));

    // Test processing the webhook data
    const formConfig = FormMappingUtils.getFormConfig(sampleWebhookPayload.formData.formId);
    if (formConfig) {
        const mappedData = FormMappingUtils.mapFormResponse(sampleWebhookPayload.formData, formConfig);
        const formatted = FormMappingUtils.formatForMasterDatabase(mappedData);
        console.log('✅ Webhook payload would be processed as:', formatted);
    } else {
        console.log('❌ No configuration found for form ID');
    }
}

/**
 * Display integration setup instructions
 */
function showSetupInstructions() {
    console.log('\n📋 SETUP INSTRUCTIONS FOR FORMS INTEGRATION\n');

    console.log('1. CONFIGURE YOUR ENVIRONMENT');
    console.log('   Make sure your .env file has:');
    console.log('   - PRESALES_MASTER_SHEET_ID=your_sheet_id');
    console.log('   - GOOGLE_SERVICE_ACCOUNT_FILE=path_to_credentials.json\n');

    console.log('2. FORM ACCESS PERMISSIONS');
    console.log('   For each form, make sure your service account has access:');
    Object.values(FORMS_CONFIG).forEach(config => {
        console.log(`   - ${config.name}: https://docs.google.com/forms/d/${config.id}/edit`);
    });
    console.log('   Share each form\'s response sheet with your service account email\n');

    console.log('3. GOOGLE APPS SCRIPT DEPLOYMENT');
    console.log('   Deploy the script in scripts/gas/formTrigger.gs to each form:');
    Object.values(FORMS_CONFIG).forEach(config => {
        console.log(`   - ${config.name}: Update FORM_SOURCE_TAG to '${config.sourceTag}'`);
    });
    console.log('   - Update WEBHOOK_URL to your actual endpoint\n');

    console.log('4. WEBHOOK ENDPOINT');
    console.log('   Set up a webhook endpoint that can receive form data');
    console.log('   See webhook-example.js for implementation details\n');

    console.log('5. TESTING');
    console.log('   - Run this test script: node test_forms_integration.js');
    console.log('   - Submit test responses to your forms');
    console.log('   - Verify data appears in your master database\n');
}

// Run tests if this file is executed directly
if (require.main === module) {
    // Parse command line arguments
    const args = process.argv.slice(2);

    if (args.includes('--setup')) {
        showSetupInstructions();
    } else if (args.includes('--webhook')) {
        testWebhookPayload();
    } else if (args.includes('--mapping')) {
        testFieldMapping();
    } else {
        runTests();
    }
}