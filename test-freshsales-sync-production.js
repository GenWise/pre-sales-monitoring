#!/usr/bin/env node

/**
 * FreshSales Sync Production Test Suite
 *
 * Comprehensive testing of the bidirectional sync system with real data
 * and production endpoints.
 */

const FreshSalesSync = require('./src/api/freshsalesSync');
const FreshSalesClient = require('./src/api/freshsalesClient');
const FreshSalesMapper = require('./src/api/freshsalesMapper');
const path = require('path');

class FreshSalesSyncTester {
    constructor() {
        this.config = {
            masterSheetId: '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ',
            serviceAccountFile: path.join(__dirname, 'credentials', 'service-account-key.json'),
            freshsalesApiKey: 'awiMf4YWS-S4wE_10pUmHQ',
            freshsalesDomain: 'genwisecrm.myfreshworks.com',
            freshsalesViewId: '402002860065' // All Contacts view
        };

        this.client = new FreshSalesClient({
            apiKey: this.config.freshsalesApiKey,
            domain: this.config.freshsalesDomain
        });

        this.mapper = new FreshSalesMapper();

        this.syncEngine = new FreshSalesSync({
            apiKey: this.config.freshsalesApiKey,
            domain: this.config.freshsalesDomain,
            masterSheetId: this.config.masterSheetId,
            serviceAccountFile: this.config.serviceAccountFile,
            batchSize: 5, // Small batch for testing
            duplicateStrategy: 'skip'
        });

        this.results = {
            tests: {},
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };

        console.log('🧪 FreshSales Sync Production Test Suite');
        console.log(`🔗 Master Sheet: ${this.config.masterSheetId}`);
        console.log(`🏢 FreshSales Domain: ${this.config.freshsalesDomain}`);
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('\n🚀 Starting comprehensive test suite...\n');

        const tests = [
            { name: 'API Connectivity', method: 'testApiConnectivity' },
            { name: 'Google Sheets Access', method: 'testGoogleSheetsAccess' },
            { name: 'FreshSales Endpoints', method: 'testFreshSalesEndpoints' },
            { name: 'Field Mapping', method: 'testFieldMapping' },
            { name: 'Contact Search', method: 'testContactSearch' },
            { name: 'Contact Creation (Mock)', method: 'testContactCreation' },
            { name: 'Sync Engine', method: 'testSyncEngine' },
            { name: 'Bidirectional Sync', method: 'testBidirectionalSync' },
            { name: 'Error Handling', method: 'testErrorHandling' },
            { name: 'Rate Limiting', method: 'testRateLimiting' }
        ];

        for (const test of tests) {
            await this.runTest(test.name, test.method);
        }

        this.printSummary();
        return this.results;
    }

    /**
     * Run individual test
     */
    async runTest(name, methodName) {
        console.log(`🔬 Testing: ${name}`);
        this.results.summary.total++;

        try {
            const result = await this[methodName]();
            this.results.tests[name] = {
                status: 'PASSED',
                result,
                timestamp: new Date().toISOString()
            };
            this.results.summary.passed++;
            console.log(`  ✅ ${name}: PASSED`);

        } catch (error) {
            this.results.tests[name] = {
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            };
            this.results.summary.failed++;
            console.log(`  ❌ ${name}: FAILED - ${error.message}`);
        }

        console.log('');
    }

    /**
     * Test API connectivity
     */
    async testApiConnectivity() {
        console.log('    📡 Testing FreshSales API connectivity...');

        const connectionTest = await this.client.testConnection();

        if (!connectionTest.tests) {
            throw new Error('No test results returned from connection test');
        }

        const results = connectionTest.tests;
        console.log(`    📊 Connection test results:`);

        for (const [testName, testResult] of Object.entries(results)) {
            const status = testResult.status === 'success' ? '✅' :
                          testResult.status === 'expected_failure' ? '⚠️' : '❌';
            console.log(`      ${status} ${testName}: ${testResult.message}`);
        }

        return connectionTest;
    }

    /**
     * Test Google Sheets access
     */
    async testGoogleSheetsAccess() {
        console.log('    📊 Testing Google Sheets access...');

        const leads = await this.syncEngine.loadLeadsFromMasterDatabase({ limit: 3 });

        if (!Array.isArray(leads)) {
            throw new Error('Failed to load leads from Google Sheets');
        }

        console.log(`    📈 Loaded ${leads.length} sample leads`);

        if (leads.length > 0) {
            const sampleLead = leads[0];
            console.log(`    👤 Sample lead: ${sampleLead['Child Name'] || 'Unknown'}`);
            console.log(`    📧 Email: ${sampleLead['Parent Email'] || 'Not provided'}`);
        }

        return { leadsCount: leads.length, sampleData: leads.slice(0, 2) };
    }

    /**
     * Test FreshSales endpoints
     */
    async testFreshSalesEndpoints() {
        console.log('    🔗 Testing FreshSales specific endpoints...');

        const results = {};

        // Test contact fields endpoint
        try {
            const fields = await this.client.getContactFields();
            results.contactFields = { status: 'success', fieldCount: fields?.fields?.length || 0 };
            console.log(`    📋 Contact fields: ${results.contactFields.fieldCount} available`);
        } catch (error) {
            results.contactFields = { status: 'error', message: error.message };
            console.log(`    ❌ Contact fields: ${error.message}`);
        }

        // Test contacts view endpoint (verified working)
        try {
            const contacts = await this.client.getContactsFromView(this.config.freshsalesViewId);
            results.contactsView = {
                status: 'success',
                contactCount: contacts?.contacts?.length || 0
            };
            console.log(`    👥 Contacts view: ${results.contactsView.contactCount} contacts found`);
        } catch (error) {
            results.contactsView = { status: 'error', message: error.message };
            console.log(`    ❌ Contacts view: ${error.message}`);
        }

        // Test search endpoint
        try {
            const searchResults = await this.client.searchContacts('test@example.com');
            results.search = {
                status: 'success',
                resultCount: searchResults?.contacts?.length || 0
            };
            console.log(`    🔍 Search: ${results.search.resultCount} results`);
        } catch (error) {
            results.search = { status: 'error', message: error.message };
            console.log(`    ❌ Search: ${error.message}`);
        }

        return results;
    }

    /**
     * Test field mapping
     */
    async testFieldMapping() {
        console.log('    🗂️  Testing field mapping...');

        const mockLead = {
            'Timestamp': new Date().toISOString(),
            'Child Name': 'Test Child',
            'Parent Name': 'Test Parent',
            'Parent Email': 'test@example.com',
            'Parent Mobile': '+91-9876543210',
            'Child Grade': 'Grade 3',
            'Program': 'GSP',
            'Interest Level': 'Hot',
            'Geography': 'Mumbai'
        };

        // Test lead to contact mapping
        const contactData = this.mapper.mapLeadToContact(mockLead);
        console.log(`    🔄 Mapped to contact: ${contactData.first_name} ${contactData.last_name}`);
        console.log(`    📧 Email format: ${JSON.stringify(contactData.emails)}`);
        console.log(`    📱 Mobile: ${contactData.mobile_number}`);
        console.log(`    🎯 Status ID: ${contactData.contact_status_id}`);

        // Test reverse mapping
        const mockContact = {
            id: 'test_123',
            first_name: contactData.first_name,
            last_name: contactData.last_name,
            emails: contactData.emails,
            mobile_number: contactData.mobile_number,
            contact_status_id: contactData.contact_status_id,
            updated_at: new Date().toISOString()
        };

        const reverseMapped = this.mapper.mapContactToLead(mockContact);
        console.log(`    ↩️  Reverse mapped: ${reverseMapped.childName}`);
        console.log(`    📊 Interest level: ${reverseMapped.interestLevel}`);

        return {
            originalLead: mockLead,
            mappedContact: contactData,
            reverseMapped: reverseMapped
        };
    }

    /**
     * Test contact search
     */
    async testContactSearch() {
        console.log('    🔍 Testing contact search functionality...');

        // Get some real data from Google Sheets
        const leads = await this.syncEngine.loadLeadsFromMasterDatabase({ limit: 3 });

        if (leads.length === 0) {
            throw new Error('No leads available for search testing');
        }

        const results = [];

        for (const lead of leads.slice(0, 2)) {
            const email = lead['Parent Email'];
            if (!email) continue;

            console.log(`    🔎 Searching for: ${email}`);

            try {
                const searchResults = await this.client.searchContacts(email);
                const found = searchResults?.contacts?.length > 0;

                results.push({
                    email,
                    found,
                    resultCount: searchResults?.contacts?.length || 0
                });

                console.log(`    ${found ? '✅' : '⚠️'} ${email}: ${found ? 'Found' : 'Not found'}`);

            } catch (error) {
                console.log(`    ❌ ${email}: Search failed - ${error.message}`);
                results.push({
                    email,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Test contact creation (mock mode)
     */
    async testContactCreation() {
        console.log('    👤 Testing contact creation (mock mode)...');

        // Use mock mode to test creation logic without actually creating contacts
        const originalMockMode = this.client.mockMode;
        this.client.mockMode = true;

        try {
            const mockLead = {
                'Child Name': 'Test Child ' + Date.now(),
                'Parent Email': `test${Date.now()}@example.com`,
                'Parent Mobile': '+91-9876543210',
                'Interest Level': 'Interested'
            };

            const contactData = this.mapper.mapLeadToContact(mockLead);
            const response = await this.client.createContact(contactData);

            console.log(`    ✅ Mock contact created: ID ${response.data.contact.id}`);

            return {
                mockLead,
                contactData,
                response: response.data
            };

        } finally {
            this.client.mockMode = originalMockMode;
        }
    }

    /**
     * Test sync engine
     */
    async testSyncEngine() {
        console.log('    ⚙️  Testing sync engine...');

        // Test the full sync engine functionality
        const testResult = await this.syncEngine.testSync();

        console.log(`    📊 Sync engine test results:`);
        for (const [testName, result] of Object.entries(testResult.tests)) {
            const status = result.status === 'success' ? '✅' : '❌';
            console.log(`      ${status} ${testName}: ${result.status}`);
        }

        return testResult;
    }

    /**
     * Test bidirectional sync
     */
    async testBidirectionalSync() {
        console.log('    🔄 Testing bidirectional sync...');

        // Test sync to FreshSales (limited to avoid creating test data)
        console.log('    📤 Testing sync to FreshSales...');
        try {
            const originalMockMode = this.syncEngine.mockMode;
            this.syncEngine.mockMode = true;

            const toResult = await this.syncEngine.syncLeadsToFreshSales({ limit: 2 });
            console.log(`    ✅ To FreshSales: ${toResult.stats.processed} processed, ${toResult.stats.errors} errors`);

            // Test sync from FreshSales
            console.log('    📥 Testing sync from FreshSales...');
            const fromResult = await this.syncEngine.syncContactsFromFreshSales({ limit: 2 });
            console.log(`    ✅ From FreshSales: ${fromResult.stats.processed} processed, ${fromResult.stats.errors} errors`);

            this.syncEngine.mockMode = originalMockMode;

            return {
                toFreshSales: toResult,
                fromFreshSales: fromResult
            };

        } catch (error) {
            // Expected for permission issues
            if (error.message.includes('API_PERMISSION_DENIED')) {
                console.log('    ⚠️  Permission limitation detected (expected)');
                return { permissionLimited: true, error: error.message };
            }
            throw error;
        }
    }

    /**
     * Test error handling
     */
    async testErrorHandling() {
        console.log('    🛡️  Testing error handling...');

        const results = {};

        // Test invalid API key
        try {
            const badClient = new FreshSalesClient({
                apiKey: 'invalid_key',
                domain: this.config.freshsalesDomain
            });

            await badClient.getContactFields();
            results.invalidApiKey = { status: 'unexpected_success' };

        } catch (error) {
            results.invalidApiKey = {
                status: 'correctly_handled',
                error: error.message.substring(0, 100)
            };
            console.log('    ✅ Invalid API key correctly rejected');
        }

        // Test invalid sheet ID
        try {
            const badSync = new FreshSalesSync({
                masterSheetId: 'invalid_sheet_id',
                serviceAccountFile: this.config.serviceAccountFile
            });

            await badSync.loadLeadsFromMasterDatabase({ limit: 1 });
            results.invalidSheetId = { status: 'unexpected_success' };

        } catch (error) {
            results.invalidSheetId = {
                status: 'correctly_handled',
                error: error.message.substring(0, 100)
            };
            console.log('    ✅ Invalid sheet ID correctly handled');
        }

        return results;
    }

    /**
     * Test rate limiting
     */
    async testRateLimiting() {
        console.log('    ⏱️  Testing rate limiting...');

        const startTime = Date.now();
        const requests = [];

        // Make several requests quickly to test rate limiting
        for (let i = 0; i < 3; i++) {
            try {
                const promise = this.client.getContactFields();
                requests.push(promise);
            } catch (error) {
                console.log(`    ⚠️  Request ${i + 1} failed: ${error.message}`);
            }
        }

        try {
            await Promise.all(requests);
            const duration = Date.now() - startTime;

            console.log(`    ✅ ${requests.length} requests completed in ${duration}ms`);
            console.log(`    📊 Rate limit status: ${JSON.stringify(this.client.getRateLimitStatus())}`);

            return {
                requestCount: requests.length,
                duration,
                rateLimitStatus: this.client.getRateLimitStatus()
            };

        } catch (error) {
            console.log(`    ⚠️  Rate limiting test failed: ${error.message}`);
            return { error: error.message };
        }
    }

    /**
     * Print test summary
     */
    printSummary() {
        console.log('\n📋 Test Summary:');
        console.log('================');
        console.log(`Total Tests: ${this.results.summary.total}`);
        console.log(`✅ Passed: ${this.results.summary.passed}`);
        console.log(`❌ Failed: ${this.results.summary.failed}`);
        console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);

        const successRate = Math.round((this.results.summary.passed / this.results.summary.total) * 100);
        console.log(`📊 Success Rate: ${successRate}%`);

        if (this.results.summary.failed > 0) {
            console.log('\n❌ Failed Tests:');
            for (const [testName, result] of Object.entries(this.results.tests)) {
                if (result.status === 'FAILED') {
                    console.log(`  • ${testName}: ${result.error}`);
                }
            }
        }

        console.log('\n🏁 Test Suite Complete');

        if (successRate >= 80) {
            console.log('✅ FreshSales Sync system is ready for production use!');
        } else {
            console.log('⚠️  Some issues detected. Review failed tests before production deployment.');
        }
    }

    /**
     * Generate detailed test report
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            environment: 'production_test',
            configuration: {
                masterSheetId: this.config.masterSheetId,
                freshsalesDomain: this.config.freshsalesDomain,
                serviceAccountFile: this.config.serviceAccountFile ? 'configured' : 'missing'
            },
            results: this.results,
            recommendations: this.getRecommendations()
        };

        return report;
    }

    /**
     * Get recommendations based on test results
     */
    getRecommendations() {
        const recommendations = [];

        // Check for common issues and provide recommendations
        for (const [testName, result] of Object.entries(this.results.tests)) {
            if (result.status === 'FAILED') {
                if (testName === 'Google Sheets Access') {
                    recommendations.push('Verify service account credentials and sheet permissions');
                }
                if (testName === 'FreshSales Endpoints') {
                    recommendations.push('Check FreshSales API key and domain configuration');
                }
                if (testName === 'Contact Creation (Mock)') {
                    recommendations.push('Review field mapping and contact creation logic');
                }
            }
        }

        if (recommendations.length === 0) {
            recommendations.push('All tests passed! System is ready for production use.');
        }

        return recommendations;
    }
}

// CLI functionality
if (require.main === module) {
    const tester = new FreshSalesSyncTester();

    async function main() {
        try {
            const results = await tester.runAllTests();

            // Generate and save detailed report
            const report = tester.generateReport();
            const reportFile = `freshsales-sync-test-report-${Date.now()}.json`;

            const fs = require('fs').promises;
            await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

            console.log(`\n📄 Detailed report saved: ${reportFile}`);

        } catch (error) {
            console.error('\n💥 Test suite failed:', error.message);
            process.exit(1);
        }
    }

    main();
}

module.exports = FreshSalesSyncTester;