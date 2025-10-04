const axios = require('axios');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();
const fs = require('fs');

// Configuration
const WEBHOOK_URL = 'http://localhost:3001/webhook/form-submission'; // Local test
const PROD_WEBHOOK_URL = 'https://dashboard.giftedworld.org/webhook.php'; // Production
const SHEET_ID = process.env.PRESALES_MASTER_SHEET_ID;
const CREDENTIALS_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;

// Expected column order
const EXPECTED_COLUMNS = [
    'Child Name',
    'Parent Name',
    'Parent Email',
    'Parent Mobile',
    'Interest Level',
    'Source Tag',
    'Timestamp',
    'Duplicate Flag',
    'Status',
    'Assigned Owner',
    'Notes'
];

class WebhookColumnMappingTester {
    constructor() {
        this.doc = null;
        this.sheet = null;
        this.testResults = [];
        this.initialRowCount = 0;
    }

    async initialize() {
        console.log('🔧 Initializing Google Sheets connection for testing...');

        const serviceAccountAuth = new JWT({
            keyFile: CREDENTIALS_PATH,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive',
            ],
        });

        this.doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
        await this.doc.loadInfo();

        this.sheet = this.doc.sheetsByIndex[0];
        await this.sheet.loadHeaderRow();

        console.log(`✅ Connected to: ${this.doc.title}`);
        console.log(`📊 Sheet headers: [${this.sheet.headerValues.join(', ')}]`);

        // Record initial state
        const rows = await this.sheet.getRows();
        this.initialRowCount = rows.length;
        console.log(`📋 Initial row count: ${this.initialRowCount}`);
    }

    async testWebhookPayload(testName, payload, webhookUrl = WEBHOOK_URL) {
        console.log(`\n🧪 Testing: ${testName}`);
        console.log(`📤 Payload:`, JSON.stringify(payload, null, 2));

        try {
            // Get rows before webhook call
            const rowsBefore = await this.sheet.getRows();
            const countBefore = rowsBefore.length;

            // Send webhook request
            const response = await axios.post(webhookUrl, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });

            console.log(`✅ Webhook response: ${response.status}`);
            console.log(`📋 Response data:`, JSON.stringify(response.data, null, 2));

            // Wait a moment for data to propagate
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Get rows after webhook call
            const rowsAfter = await this.sheet.getRows();
            const countAfter = rowsAfter.length;

            if (countAfter > countBefore) {
                const newRow = rowsAfter[rowsAfter.length - 1];
                const rowData = this.extractRowData(newRow);

                console.log(`🆕 New row added:`, JSON.stringify(rowData, null, 2));

                // Validate column mapping
                const validation = this.validateColumnMapping(payload, rowData);

                this.testResults.push({
                    testName,
                    success: true,
                    payload,
                    rowData,
                    validation,
                    timestamp: new Date().toISOString()
                });

                console.log(`🔍 Validation results:`, validation);

                if (validation.isValid) {
                    console.log(`✅ ${testName}: PASSED - Column mapping is correct`);
                } else {
                    console.log(`❌ ${testName}: FAILED - Column mapping issues found`);
                    console.log(`   Issues: ${validation.issues.join(', ')}`);
                }
            } else {
                console.log(`❌ ${testName}: FAILED - No new row was added`);
                this.testResults.push({
                    testName,
                    success: false,
                    error: 'No new row added',
                    payload,
                    timestamp: new Date().toISOString()
                });
            }

        } catch (error) {
            console.log(`❌ ${testName}: ERROR - ${error.message}`);
            this.testResults.push({
                testName,
                success: false,
                error: error.message,
                payload,
                timestamp: new Date().toISOString()
            });
        }
    }

    extractRowData(row) {
        return {
            'Child Name': row.get('Child Name') || '',
            'Parent Name': row.get('Parent Name') || '',
            'Parent Email': row.get('Parent Email') || '',
            'Parent Mobile': row.get('Parent Mobile') || '',
            'Interest Level': row.get('Interest Level') || '',
            'Source Tag': row.get('Source Tag') || '',
            'Timestamp': row.get('Timestamp') || '',
            'Duplicate Flag': row.get('Duplicate Flag') || '',
            'Status': row.get('Status') || '',
            'Assigned Owner': row.get('Assigned Owner') || '',
            'Notes': row.get('Notes') || ''
        };
    }

    validateColumnMapping(payload, rowData) {
        const issues = [];
        let isValid = true;

        const formData = payload.formData || {};

        // Check direct field mappings
        const directMappings = {
            'Child Name': 'Child Name',
            'Parent Name': 'Parent Name',
            'Parent Email': 'Parent Email',
            'Parent Mobile': 'Parent Mobile'
        };

        for (const [formField, columnName] of Object.entries(directMappings)) {
            if (formData[formField] && rowData[columnName] !== formData[formField]) {
                issues.push(`${formField} -> ${columnName}: expected "${formData[formField]}", got "${rowData[columnName]}"`);
                isValid = false;
            }
        }

        // Check transformed field mappings
        if (formData.interestLevel && rowData['Interest Level'] !== formData.interestLevel) {
            issues.push(`interestLevel -> Interest Level: expected "${formData.interestLevel}", got "${rowData['Interest Level']}"`);
            isValid = false;
        }

        if (formData.sourceTag && rowData['Source Tag'] !== formData.sourceTag) {
            issues.push(`sourceTag -> Source Tag: expected "${formData.sourceTag}", got "${rowData['Source Tag']}"`);
            isValid = false;
        }

        // Check for data in wrong columns (common corruption patterns)
        const timestampPattern = /^\d{1,2}\/\d{1,2}\/\d{4}/;
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (timestampPattern.test(rowData['Child Name'])) {
            issues.push('Timestamp found in Child Name column');
            isValid = false;
        }

        if (emailPattern.test(rowData['Parent Mobile'])) {
            issues.push('Email found in Parent Mobile column');
            isValid = false;
        }

        // Check required fields are populated
        if (!rowData['Status']) {
            issues.push('Status field is empty');
            isValid = false;
        }

        if (!rowData['Duplicate Flag']) {
            issues.push('Duplicate Flag field is empty');
            isValid = false;
        }

        return { isValid, issues };
    }

    async runAllTests() {
        console.log('🧪 WEBHOOK COLUMN MAPPING TEST SUITE');
        console.log('====================================\\n');

        await this.initialize();

        // Test 1: Basic form submission
        await this.testWebhookPayload('Basic Form Submission', {
            formData: {
                'Child Name': 'Test Child Column Mapping',
                'Parent Name': 'Test Parent Column Mapping',
                'Parent Email': 'column.test@mapping.com',
                'Parent Mobile': '9876543210',
                interestLevel: 'High',
                sourceTag: 'returning_students'
            },
            source: 'test',
            metadata: { formName: 'Column Mapping Test' }
        });

        // Test 2: Minimal payload (test defaults)
        await this.testWebhookPayload('Minimal Payload', {
            formData: {
                'Child Name': 'Minimal Child',
                'Parent Name': 'Minimal Parent',
                'Parent Email': 'minimal@test.com',
                sourceTag: 'website'
            },
            source: 'test',
            metadata: { formName: 'Minimal Test' }
        });

        // Test 3: Different source tags
        await this.testWebhookPayload('ATS Qualifiers Source', {
            formData: {
                'Child Name': 'ATS Child',
                'Parent Name': 'ATS Parent',
                'Parent Email': 'ats@test.com',
                'Parent Mobile': '9999999999',
                interestLevel: 'Medium',
                sourceTag: 'ats_qualifiers'
            },
            source: 'test',
            metadata: { formName: 'ATS Test' }
        });

        // Test 4: Website source
        await this.testWebhookPayload('Website Source', {
            formData: {
                'Child Name': 'Website Child',
                'Parent Name': 'Website Parent',
                'Parent Email': 'website@test.com',
                'Parent Mobile': '8888888888',
                interestLevel: 'Low',
                sourceTag: 'website'
            },
            source: 'test',
            metadata: { formName: 'Website Test' }
        });

        // Test 5: Early bird source
        await this.testWebhookPayload('Early Bird Source', {
            formData: {
                'Child Name': 'Early Bird Child',
                'Parent Name': 'Early Bird Parent',
                'Parent Email': 'earlybird@test.com',
                'Parent Mobile': '7777777777',
                interestLevel: 'High',
                sourceTag: 'early_bird'
            },
            source: 'test',
            metadata: { formName: 'Early Bird Test' }
        });

        this.generateTestReport();
    }

    async testProductionWebhook() {
        console.log('\\n🌐 TESTING PRODUCTION WEBHOOK');
        console.log('=============================\\n');

        await this.testWebhookPayload('Production Webhook Test', {
            child_name: 'Prod Test Child',
            parent_name: 'Prod Test Parent',
            parent_email: 'prod.test@mapping.com',
            parent_mobile: '5555555555',
            interest_level: 'Medium',
            source_tag: 'website'
        }, PROD_WEBHOOK_URL);
    }

    generateTestReport() {
        console.log('\\n📊 TEST SUMMARY');
        console.log('================');

        const passed = this.testResults.filter(test => test.success && test.validation?.isValid).length;
        const failed = this.testResults.filter(test => !test.success || !test.validation?.isValid).length;
        const total = this.testResults.length;

        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📊 Total: ${total}`);
        console.log(`🎯 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

        // Detailed results
        console.log('\\n📋 DETAILED RESULTS:');
        this.testResults.forEach((test, index) => {
            const status = test.success && test.validation?.isValid ? '✅' : '❌';
            console.log(`${index + 1}. ${status} ${test.testName}`);

            if (test.validation && !test.validation.isValid) {
                console.log(`   Issues: ${test.validation.issues.join(', ')}`);
            }

            if (test.error) {
                console.log(`   Error: ${test.error}`);
            }
        });

        // Save detailed report
        const reportPath = `/Users/rajeshpanchanathan/code/pre-sales-monitoring/webhook_column_mapping_test_report_${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            summary: { passed, failed, total, successRate: ((passed / total) * 100).toFixed(1) + '%' },
            tests: this.testResults
        }, null, 2));

        console.log(`\\n📄 Detailed report saved: ${reportPath}`);

        if (failed === 0) {
            console.log('\\n🎉 ALL TESTS PASSED! Column mapping is working correctly.');
        } else {
            console.log('\\n⚠️  Some tests failed. Column mapping needs attention.');
        }
    }
}

// Main execution
async function main() {
    const tester = new WebhookColumnMappingTester();

    try {
        await tester.runAllTests();

        // Optionally test production webhook (uncomment if needed)
        // await tester.testProductionWebhook();

    } catch (error) {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { WebhookColumnMappingTester };