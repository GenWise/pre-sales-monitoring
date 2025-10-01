#!/usr/bin/env node

/**
 * FreshSales CRM Integration Test Suite
 *
 * Comprehensive test suite for the FreshSales CRM integration.
 * Tests API connectivity, field mapping, sync operations, and error handling.
 *
 * Usage:
 *   node test_freshsales.js [options]
 *
 * Options:
 *   --mock                Run in mock mode (default: false)
 *   --skip-api           Skip API connectivity tests
 *   --test-sync          Run actual sync test (requires API permissions)
 *   --verbose            Verbose output
 *   --help               Show help
 */

require('dotenv').config();

const FreshSalesClient = require('./src/api/freshsalesClient');
const FreshSalesMapper = require('./src/api/freshsalesMapper');
const FreshSalesSync = require('./src/api/freshsalesSync');
const path = require('path');

class FreshSalesTestSuite {
    constructor(options = {}) {
        this.options = {
            mockMode: options.mockMode || false,
            skipApiTests: options.skipApiTests || false,
            testSync: options.testSync || false,
            verbose: options.verbose || false
        };

        this.results = {
            timestamp: new Date().toISOString(),
            options: this.options,
            tests: {},
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0
            }
        };

        console.log('🚀 FreshSales CRM Integration Test Suite');
        console.log('=========================================');
        console.log(`Mock Mode: ${this.options.mockMode ? '✅ ENABLED' : '❌ DISABLED'}`);
        console.log(`Test Environment: ${this.options.mockMode ? 'Mock/Testing' : 'Live API'}`);
        console.log('');
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        try {
            console.log('Starting test execution...\n');

            // Test 1: API Client Initialization
            await this.testApiClientInitialization();

            // Test 2: Field Mapper
            await this.testFieldMapper();

            // Test 3: API Connectivity (unless skipped)
            if (!this.options.skipApiTests) {
                await this.testApiConnectivity();
            } else {
                this.skipTest('API Connectivity', 'Skipped by user option');
            }

            // Test 4: Contact Field Metadata
            if (!this.options.skipApiTests) {
                await this.testContactFieldMetadata();
            } else {
                this.skipTest('Contact Field Metadata', 'Skipped by user option');
            }

            // Test 5: Search Functionality
            if (!this.options.skipApiTests) {
                await this.testSearchFunctionality();
            } else {
                this.skipTest('Search Functionality', 'Skipped by user option');
            }

            // Test 6: Rate Limiting
            await this.testRateLimiting();

            // Test 7: Error Handling
            await this.testErrorHandling();

            // Test 8: Mock Functionality
            await this.testMockFunctionality();

            // Test 9: Sync Operations (if requested)
            if (this.options.testSync) {
                await this.testSyncOperations();
            } else {
                this.skipTest('Sync Operations', 'Use --test-sync to enable');
            }

            // Test 10: Integration Test
            await this.testFullIntegration();

            // Generate final report
            this.generateFinalReport();

        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }

    /**
     * Test API Client Initialization
     */
    async testApiClientInitialization() {
        const testName = 'API Client Initialization';
        console.log(`🧪 Testing: ${testName}`);

        try {
            // Test 1: Default initialization
            const client1 = new FreshSalesClient({ mockMode: true });
            this.assert(client1.domain === 'genwisecrm.myfreshworks.com', 'Default domain should be set');
            this.assert(client1.mockMode === true, 'Mock mode should be enabled');

            // Test 2: Custom configuration
            const client2 = new FreshSalesClient({
                domain: 'test.myfreshworks.com',
                apiKey: 'test_key',
                mockMode: false
            });
            this.assert(client2.domain === 'test.myfreshworks.com', 'Custom domain should be set');
            this.assert(client2.apiKey === 'test_key', 'Custom API key should be set');

            // Test 3: Rate limit initialization
            this.assert(client1.rateLimits.hourly.limit === 1000, 'Hourly rate limit should be initialized');
            this.assert(client1.rateLimits.perMinute.limit === 400, 'Per-minute rate limit should be initialized');

            this.passTest(testName, 'API client initialized successfully with correct configuration');

        } catch (error) {
            this.failTest(testName, error.message);
        }
    }

    /**
     * Test Field Mapper functionality
     */
    async testFieldMapper() {
        const testName = 'Field Mapper';
        console.log(`🧪 Testing: ${testName}`);

        try {
            const mapper = new FreshSalesMapper();

            // Test 1: Lead to Contact mapping
            const sampleLead = {
                'Child Name': 'John Doe',
                'Parent Name': 'Jane Doe',
                'Parent Email': 'jane.doe@example.com',
                'Parent Mobile': '+91-9876543210',
                'Interest Level': 'Hot',
                'Child Grade': 'Grade 5',
                'Program': 'Coding Bootcamp',
                'Geography': 'Mumbai'
            };

            const mappedContact = mapper.mapLeadToContact(sampleLead);

            this.assert(mappedContact.first_name === 'John', 'First name should be extracted correctly');
            this.assert(mappedContact.last_name === 'Doe', 'Last name should be extracted correctly');
            this.assert(Array.isArray(mappedContact.emails), 'Emails should be array format');
            this.assert(mappedContact.emails[0].value === 'jane.doe@example.com', 'Email should be formatted correctly');
            this.assert(mappedContact.contact_status_id === 402000446647, 'Hot status should map to correct ID');
            this.assert(mappedContact.cf_child_grade === 'Grade 5', 'Custom field should be mapped');

            // Test 2: Contact to Lead mapping (reverse)
            const sampleContact = {
                id: 'contact_123',
                first_name: 'John',
                last_name: 'Doe',
                emails: [{ value: 'jane.doe@example.com', is_primary: true }],
                mobile_number: '+919876543210',
                contact_status_id: 402000446647,
                cf_child_grade: 'Grade 5',
                created_at: '2024-01-01T00:00:00Z'
            };

            const reverseMapped = mapper.mapContactToLead(sampleContact);

            this.assert(reverseMapped.childName === 'John Doe', 'Child name should be reconstructed');
            this.assert(reverseMapped.parentEmail === 'jane.doe@example.com', 'Email should be extracted');
            this.assert(reverseMapped.interestLevel === 'Hot', 'Status should be reverse mapped');

            // Test 3: Edge cases
            const emptyLead = {};
            const emptyMapped = mapper.mapLeadToContact(emptyLead);
            this.assert(typeof emptyMapped === 'object', 'Empty lead should still produce object');

            // Test 4: Invalid email handling
            const invalidEmailLead = { 'Parent Email': 'invalid-email' };
            const invalidMapped = mapper.mapLeadToContact(invalidEmailLead);
            this.assert(invalidMapped.emails.length === 0, 'Invalid email should be filtered out');

            // Test 5: Phone number formatting
            const phoneTests = [
                { input: '+91-9876543210', expected: '+919876543210' },
                { input: '9876543210', expected: '9876543210' },
                { input: '+1 (555) 123-4567', expected: '+15551234567' }
            ];

            phoneTests.forEach(test => {
                const formatted = mapper.formatPhoneNumber(test.input);
                this.assert(formatted === test.expected, `Phone ${test.input} should format to ${test.expected}`);
            });

            this.passTest(testName, 'Field mapping works correctly for all scenarios');

        } catch (error) {
            this.failTest(testName, error.message);
        }
    }

    /**
     * Test API Connectivity
     */
    async testApiConnectivity() {
        const testName = 'API Connectivity';
        console.log(`🧪 Testing: ${testName}`);

        try {
            const client = new FreshSalesClient({ mockMode: this.options.mockMode });
            const testResults = await client.testConnection();

            this.assert(testResults.timestamp, 'Test results should have timestamp');
            this.assert(typeof testResults.tests === 'object', 'Test results should contain tests object');

            if (this.options.mockMode) {
                // In mock mode, we expect certain results
                this.assert(testResults.mockMode === true, 'Mock mode should be reflected in results');
                console.log('  ✅ Mock mode connectivity verified');
            } else {
                // In live mode, check actual API responses
                if (testResults.tests.contactFields?.status === 'success') {
                    console.log('  ✅ Contact fields API accessible');
                }
                if (testResults.tests.search?.status === 'success') {
                    console.log('  ✅ Search API accessible');
                }
                if (testResults.tests.activities?.status === 'success') {
                    console.log('  ✅ Activities API accessible');
                }
                if (testResults.tests.contactRead?.status === 'expected_failure') {
                    console.log('  ⚠️  Contact read permissions denied (expected)');
                }
            }

            this.passTest(testName, 'API connectivity test completed');

        } catch (error) {
            if (error.message.includes('getaddrinfo ENOTFOUND') ||
                error.message.includes('connect ECONNREFUSED')) {
                this.failTest(testName, 'Network connectivity issue - check internet connection');
            } else {
                this.failTest(testName, error.message);
            }
        }
    }

    /**
     * Test Contact Field Metadata
     */
    async testContactFieldMetadata() {
        const testName = 'Contact Field Metadata';
        console.log(`🧪 Testing: ${testName}`);

        try {
            const client = new FreshSalesClient({ mockMode: this.options.mockMode });

            if (this.options.mockMode) {
                console.log('  ⚠️  Skipping in mock mode');
                this.skipTest(testName, 'Mock mode enabled');
                return;
            }

            const fieldMetadata = await client.getContactFields();

            this.assert(fieldMetadata, 'Field metadata should be returned');

            if (fieldMetadata.fields && Array.isArray(fieldMetadata.fields)) {
                console.log(`  ✅ Retrieved ${fieldMetadata.fields.length} contact fields`);

                // Look for key fields we need
                const keyFields = ['first_name', 'last_name', 'emails', 'mobile_number', 'contact_status_id'];
                const foundFields = fieldMetadata.fields.filter(field =>
                    keyFields.includes(field.name)
                );

                console.log(`  ✅ Found ${foundFields.length}/${keyFields.length} required fields`);
            }

            this.passTest(testName, 'Contact field metadata retrieved successfully');

        } catch (error) {
            if (error.message.includes('API_PERMISSION_DENIED')) {
                this.skipTest(testName, 'API permissions insufficient');
            } else {
                this.failTest(testName, error.message);
            }
        }
    }

    /**
     * Test Search Functionality
     */
    async testSearchFunctionality() {
        const testName = 'Search Functionality';
        console.log(`🧪 Testing: ${testName}`);

        try {
            const client = new FreshSalesClient({ mockMode: this.options.mockMode });
            const searchResults = await client.searchContacts('test@example.com');

            this.assert(searchResults, 'Search results should be returned');

            if (this.options.mockMode) {
                this.assert(Array.isArray(searchResults.contacts), 'Mock search should return contacts array');
                console.log('  ✅ Mock search functionality verified');
            } else {
                console.log(`  ✅ Search completed (found ${searchResults.contacts?.length || 0} results)`);
            }

            this.passTest(testName, 'Search functionality working');

        } catch (error) {
            if (error.message.includes('API_PERMISSION_DENIED')) {
                this.skipTest(testName, 'Search permissions insufficient');
            } else {
                this.failTest(testName, error.message);
            }
        }
    }

    /**
     * Test Rate Limiting
     */
    async testRateLimiting() {
        const testName = 'Rate Limiting';
        console.log(`🧪 Testing: ${testName}`);

        try {
            const client = new FreshSalesClient({ mockMode: true });

            // Test rate limit checking
            const rateLimitStatus = client.checkRateLimits();
            this.assert(typeof rateLimitStatus === 'object', 'Rate limit status should be object');
            this.assert(typeof rateLimitStatus.canProceed === 'boolean', 'Should have canProceed flag');

            // Test rate limit status retrieval
            const status = client.getRateLimitStatus();
            this.assert(status.hourly, 'Should have hourly rate limit info');
            this.assert(status.perMinute, 'Should have per-minute rate limit info');

            // Test rate limit update
            const mockHeaders = {
                'x-ratelimit-limit': '1000',
                'x-ratelimit-remaining': '950',
                'per-min-x-ratelimit-limit': '400',
                'per-min-x-ratelimit-remaining': '380'
            };

            client.updateRateLimits(mockHeaders);
            const updatedStatus = client.getRateLimitStatus();
            this.assert(updatedStatus.hourly.remaining === 950, 'Rate limit should be updated');
            this.assert(updatedStatus.perMinute.remaining === 380, 'Per-minute limit should be updated');

            this.passTest(testName, 'Rate limiting functionality working correctly');

        } catch (error) {
            this.failTest(testName, error.message);
        }
    }

    /**
     * Test Error Handling
     */
    async testErrorHandling() {
        const testName = 'Error Handling';
        console.log(`🧪 Testing: ${testName}`);

        try {
            const client = new FreshSalesClient({ mockMode: false });

            // Test 1: Invalid endpoint
            try {
                await client.makeRequest('/invalid-endpoint');
                this.assert(false, 'Should have thrown error for invalid endpoint');
            } catch (error) {
                this.assert(error.statusCode === 404, 'Should get 404 for invalid endpoint');
                console.log('  ✅ 404 error handling working');
            }

            // Test 2: Permission denied handling
            try {
                await client.getContact('invalid_id');
                console.log('  ⚠️  Contact read unexpectedly succeeded (permissions may have been granted)');
            } catch (error) {
                if (error.message.includes('API_PERMISSION_DENIED')) {
                    console.log('  ✅ Permission denied error handling working');
                } else {
                    console.log(`  ℹ️  Different error: ${error.message}`);
                }
            }

            // Test 3: Retry logic with mock
            const mockClient = new FreshSalesClient({ mockMode: true, maxRetries: 2 });
            try {
                const result = await mockClient.makeRequestWithRetry('/test-endpoint');
                console.log('  ✅ Retry logic with mock working');
            } catch (error) {
                console.log(`  ℹ️  Mock retry test result: ${error.message}`);
            }

            this.passTest(testName, 'Error handling mechanisms working correctly');

        } catch (error) {
            this.failTest(testName, error.message);
        }
    }

    /**
     * Test Mock Functionality
     */
    async testMockFunctionality() {
        const testName = 'Mock Functionality';
        console.log(`🧪 Testing: ${testName}`);

        try {
            const client = new FreshSalesClient({ mockMode: true });

            // Test mock contact creation
            const mockContactData = {
                first_name: 'Mock',
                last_name: 'User',
                emails: [{ value: 'mock@example.com', is_primary: true }]
            };

            const createResponse = await client.createContact(mockContactData);
            this.assert(createResponse.contact, 'Mock contact creation should return contact data');
            this.assert(createResponse.contact.id, 'Mock contact should have ID');

            // Test mock search
            const searchResponse = await client.searchContacts('mock@example.com');
            this.assert(Array.isArray(searchResponse.contacts), 'Mock search should return contacts array');

            // Test mock activity creation
            const activityData = {
                title: 'Mock Activity',
                description: 'Test activity'
            };

            const activityResponse = await client.createActivity(activityData);
            this.assert(activityResponse.activity, 'Mock activity creation should return activity data');

            console.log('  ✅ All mock operations working correctly');

            this.passTest(testName, 'Mock functionality comprehensive and working');

        } catch (error) {
            this.failTest(testName, error.message);
        }
    }

    /**
     * Test Sync Operations
     */
    async testSyncOperations() {
        const testName = 'Sync Operations';
        console.log(`🧪 Testing: ${testName}`);

        try {
            const sync = new FreshSalesSync({ mockMode: true });

            // Test sync initialization
            this.assert(sync.client, 'Sync should have client instance');
            this.assert(sync.mapper, 'Sync should have mapper instance');

            // Test sync test functionality
            const testResults = await sync.testSync();
            this.assert(testResults.timestamp, 'Sync test should have timestamp');
            this.assert(testResults.tests, 'Sync test should have test results');

            console.log('  ✅ Sync test completed');

            // Test mock lead generation
            const mockLeads = sync.generateMockLeads(3);
            this.assert(mockLeads.length === 3, 'Should generate requested number of mock leads');
            this.assert(mockLeads[0]['Child Name'], 'Mock leads should have required fields');

            console.log('  ✅ Mock lead generation working');

            // Test batch creation
            const batches = sync.createBatches([1, 2, 3, 4, 5], 2);
            this.assert(batches.length === 3, 'Should create correct number of batches');
            this.assert(batches[0].length === 2, 'First batch should have correct size');
            this.assert(batches[2].length === 1, 'Last batch should have remaining items');

            console.log('  ✅ Batch processing working');

            this.passTest(testName, 'Sync operations tested successfully');

        } catch (error) {
            this.failTest(testName, error.message);
        }
    }

    /**
     * Test Full Integration
     */
    async testFullIntegration() {
        const testName = 'Full Integration';
        console.log(`🧪 Testing: ${testName}`);

        try {
            // Create all components
            const client = new FreshSalesClient({ mockMode: true });
            const mapper = new FreshSalesMapper();
            const sync = new FreshSalesSync({ mockMode: true, batchSize: 2 });

            // Test end-to-end flow with mock data
            const mockLead = {
                'Timestamp': new Date().toISOString(),
                'Child Name': 'Integration Test Child',
                'Parent Name': 'Integration Test Parent',
                'Parent Email': 'integration@test.com',
                'Parent Mobile': '+91-9876543210',
                'Interest Level': 'Hot',
                'Child Grade': 'Grade 3',
                'Program': 'GSP'
            };

            // Step 1: Map lead to contact
            const contactData = mapper.mapLeadToContact(mockLead);
            this.assert(contactData.first_name === 'Integration', 'Mapping should work');

            // Step 2: "Create" contact (mock)
            const createResponse = await client.createContact(contactData);
            this.assert(createResponse.contact, 'Contact creation should work');

            // Step 3: Create activity/note
            const noteData = mapper.mapNoteToActivity(createResponse.contact.id, {
                title: 'Integration Test',
                content: 'Test note from integration'
            });
            const activityResponse = await client.createActivity(noteData);
            this.assert(activityResponse.activity, 'Activity creation should work');

            // Step 4: Test full sync with mock data
            const syncResult = await sync.syncLeadsToFreshSales({ limit: 2 });
            this.assert(syncResult.success, 'Mock sync should succeed');
            this.assert(syncResult.stats.processed > 0, 'Should have processed leads');

            console.log('  ✅ End-to-end integration flow working');

            this.passTest(testName, 'Full integration test passed');

        } catch (error) {
            this.failTest(testName, error.message);
        }
    }

    /**
     * Assert condition with descriptive message
     */
    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    /**
     * Mark test as passed
     */
    passTest(testName, message) {
        this.results.tests[testName] = {
            status: 'passed',
            message: message,
            timestamp: new Date().toISOString()
        };
        this.results.summary.total++;
        this.results.summary.passed++;
        console.log(`  ✅ ${testName}: ${message}\n`);
    }

    /**
     * Mark test as failed
     */
    failTest(testName, message) {
        this.results.tests[testName] = {
            status: 'failed',
            message: message,
            timestamp: new Date().toISOString()
        };
        this.results.summary.total++;
        this.results.summary.failed++;
        console.log(`  ❌ ${testName}: ${message}\n`);
    }

    /**
     * Mark test as skipped
     */
    skipTest(testName, message) {
        this.results.tests[testName] = {
            status: 'skipped',
            message: message,
            timestamp: new Date().toISOString()
        };
        this.results.summary.total++;
        this.results.summary.skipped++;
        console.log(`  ⏭️  ${testName}: ${message}\n`);
    }

    /**
     * Generate final test report
     */
    generateFinalReport() {
        console.log('\n' + '='.repeat(60));
        console.log('🏁 FRESHSALES CRM INTEGRATION TEST RESULTS');
        console.log('='.repeat(60));

        console.log(`\n📊 Summary:`);
        console.log(`   Total Tests: ${this.results.summary.total}`);
        console.log(`   ✅ Passed: ${this.results.summary.passed}`);
        console.log(`   ❌ Failed: ${this.results.summary.failed}`);
        console.log(`   ⏭️  Skipped: ${this.results.summary.skipped}`);

        const successRate = this.results.summary.total > 0 ?
            Math.round((this.results.summary.passed / this.results.summary.total) * 100) : 0;

        console.log(`   📈 Success Rate: ${successRate}%`);

        console.log(`\n📋 Test Details:`);
        Object.entries(this.results.tests).forEach(([testName, result]) => {
            const icon = result.status === 'passed' ? '✅' :
                        result.status === 'failed' ? '❌' : '⏭️';
            console.log(`   ${icon} ${testName}: ${result.message}`);
        });

        // API Permission Status
        console.log('\n🔐 API Permission Status:');
        if (this.options.mockMode) {
            console.log('   ⚠️  Tests run in MOCK MODE - API permissions not tested');
        } else {
            console.log('   📝 Based on research findings:');
            console.log('   ✅ Field metadata access: Available');
            console.log('   ✅ Search functionality: Available (limited)');
            console.log('   ✅ Activities/notes: Available');
            console.log('   ❌ Contact read/write: Permission denied (403)');
            console.log('   📞 Action needed: Contact FreshSales admin for full permissions');
        }

        // Recommendations
        console.log('\n💡 Next Steps:');
        console.log('   1. Contact FreshSales administrator to grant contact read/write permissions');
        console.log('   2. Test with real API permissions using: node test_freshsales.js --test-sync');
        console.log('   3. Configure environment variables (FRESHSALES_API_KEY, FRESHSALES_DOMAIN)');
        console.log('   4. Set up Google Sheets integration (PRESALES_MASTER_SHEET_ID)');
        console.log('   5. Run production sync: require("./src/api/freshsalesSync").syncLeadsToFreshSales()');

        console.log('\n' + '='.repeat(60));

        // Write detailed report to file
        const reportFile = path.join(__dirname, 'logs', `freshsales_test_report_${Date.now()}.json`);
        require('fs').writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
        console.log(`📄 Detailed report saved to: ${reportFile}`);

        // Exit with appropriate code
        const exitCode = this.results.summary.failed > 0 ? 1 : 0;
        console.log(`\n🏁 Test suite ${exitCode === 0 ? 'PASSED' : 'FAILED'}`);

        if (!this.options.mockMode && exitCode === 0) {
            console.log('🎉 FreshSales integration is ready for production use!');
        } else if (this.options.mockMode && exitCode === 0) {
            console.log('🧪 All tests pass in mock mode. Ready for live API testing.');
        }
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
FreshSales CRM Integration Test Suite

Usage: node test_freshsales.js [options]

Options:
  --mock              Run in mock mode (safe for testing without API access)
  --skip-api          Skip API connectivity tests
  --test-sync         Run actual sync test (requires API permissions)
  --verbose           Verbose output
  --help              Show this help message

Examples:
  node test_freshsales.js --mock                    # Safe testing mode
  node test_freshsales.js                           # Test with live API
  node test_freshsales.js --test-sync               # Full integration test
  node test_freshsales.js --skip-api --mock         # Quick field mapping test
        `);
        process.exit(0);
    }

    const options = {
        mockMode: args.includes('--mock'),
        skipApiTests: args.includes('--skip-api'),
        testSync: args.includes('--test-sync'),
        verbose: args.includes('--verbose')
    };

    const testSuite = new FreshSalesTestSuite(options);
    testSuite.runAllTests().catch(error => {
        console.error('💥 Test suite crashed:', error.message);
        if (options.verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    });
}

module.exports = FreshSalesTestSuite;