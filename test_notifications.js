/**
 * Notification System Test Script
 * Comprehensive testing for all notification components
 */

require('dotenv').config({ path: '/Users/rajeshpanchanathan/.env' });
const NotificationManager = require('./src/notifications/notificationManager');
const path = require('path');
const fs = require('fs');

class NotificationTester {
    constructor() {
        this.notificationManager = new NotificationManager();
        this.testResults = {
            configuration: null,
            systemTests: null,
            newLeadTests: null,
            duplicateLeadTests: null,
            errorTests: null
        };
    }

    /**
     * Run all notification tests
     */
    async runAllTests() {
        console.log('🚀 Starting Notification System Test Suite\n');
        console.log('=' .repeat(60));

        try {
            // Step 1: Check configuration
            await this.testConfiguration();

            // Step 2: Test system connectivity
            await this.testSystemConnectivity();

            // Step 3: Test new lead notifications
            await this.testNewLeadNotifications();

            // Step 4: Test duplicate lead notifications
            await this.testDuplicateLeadNotifications();

            // Step 5: Test error handling
            await this.testErrorHandling();

            // Step 6: Display final results
            this.displayFinalResults();

        } catch (error) {
            console.error('❌ Test suite failed with error:', error.message);
            console.error(error.stack);
        }
    }

    /**
     * Test configuration status
     */
    async testConfiguration() {
        console.log('\n📋 Testing Configuration...\n');

        this.testResults.configuration = this.notificationManager.getConfigurationStatus();

        console.log('Slack Configuration:');
        console.log(`  - Configured: ${this.testResults.configuration.slack.configured ? '✅' : '❌'}`);
        console.log(`  - Webhook URL: ${this.testResults.configuration.slack.webhookUrl}`);
        console.log(`  - Channel: ${this.testResults.configuration.slack.channel}`);

        console.log('\nEmail Configuration:');
        console.log(`  - Configured: ${this.testResults.configuration.email.configured ? '✅' : '❌'}`);
        console.log(`  - SMTP Username: ${this.testResults.configuration.email.smtpUsername}`);
        console.log(`  - SMTP Password: ${this.testResults.configuration.email.smtpPassword}`);
        console.log(`  - Recipients: ${this.testResults.configuration.email.defaultRecipients}`);

        console.log('\nRate Limiting:');
        console.log(`  - Window: ${this.testResults.configuration.rateLimit.windowMinutes} minutes`);
        console.log(`  - Max per window: ${this.testResults.configuration.rateLimit.maxPerWindow}`);
    }

    /**
     * Test system connectivity
     */
    async testSystemConnectivity() {
        console.log('\n🔌 Testing System Connectivity...\n');

        this.testResults.systemTests = await this.notificationManager.testAllSystems();

        console.log('System Test Results:');
        console.log(`  - Slack: ${this.testResults.systemTests.results.slack.success ? '✅' : '❌'} ${this.testResults.systemTests.results.slack.error || ''}`);
        console.log(`  - Email: ${this.testResults.systemTests.results.email.success ? '✅' : '❌'} ${this.testResults.systemTests.results.email.error || ''}`);

        console.log(`\nSummary: ${this.testResults.systemTests.summary.working}/${this.testResults.systemTests.summary.total} systems working`);

        if (this.testResults.systemTests.summary.working === 0) {
            console.log('⚠️  No notification systems are working. Please check your configuration.');
        }
    }

    /**
     * Test new lead notifications
     */
    async testNewLeadNotifications() {
        console.log('\n🆕 Testing New Lead Notifications...\n');

        const sampleLeads = [
            {
                id: 'test-new-001',
                name: 'Alice Johnson',
                email: 'alice.johnson@techcorp.com',
                phone: '+1-555-123-4567',
                company: 'TechCorp Solutions',
                source: 'contact-form',
                message: 'Interested in your enterprise solutions. Please call me back.',
                timestamp: new Date().toISOString()
            },
            {
                id: 'test-new-002',
                name: 'Bob Smith',
                email: 'b.smith@startup.io',
                phone: '+1-555-987-6543',
                company: 'Startup Inc',
                source: 'referral',
                message: 'Looking for AI solutions for our growing team. Urgent.',
                timestamp: new Date().toISOString()
            },
            {
                id: 'test-new-003',
                name: 'Carol Davis',
                email: 'carol@enterprise.com',
                phone: '+1-555-456-7890',
                company: 'Enterprise Corp',
                source: 'demo-request',
                message: 'Need a demo for our 500+ person organization.',
                timestamp: new Date().toISOString()
            }
        ];

        this.testResults.newLeadTests = [];

        for (let i = 0; i < sampleLeads.length; i++) {
            const lead = sampleLeads[i];
            console.log(`Testing lead ${i + 1}/${sampleLeads.length}: ${lead.name}...`);

            const result = await this.notificationManager.sendNewLeadNotifications(lead, {
                includeSlack: true,
                includeEmail: true
            });

            this.testResults.newLeadTests.push({
                lead: lead,
                result: result
            });

            console.log(`  - Result: ${result.success ? '✅' : '❌'} (${result.summary?.successful || 0}/${result.summary?.total || 0} successful)`);

            if (result.results.slack?.error) {
                console.log(`    Slack error: ${result.results.slack.error}`);
            }
            if (result.results.email?.error) {
                console.log(`    Email error: ${result.results.email.error}`);
            }

            // Small delay between tests
            await this.delay(2000);
        }

        const successfulTests = this.testResults.newLeadTests.filter(t => t.result.success).length;
        console.log(`\nNew Lead Test Summary: ${successfulTests}/${sampleLeads.length} tests successful`);
    }

    /**
     * Test duplicate lead notifications
     */
    async testDuplicateLeadNotifications() {
        console.log('\n🔄 Testing Duplicate Lead Notifications...\n');

        const duplicateLead = {
            id: 'test-dup-001',
            name: 'David Wilson',
            email: 'david.wilson@repeat.com',
            phone: '+1-555-111-2222',
            company: 'Repeat Customer Ltd',
            source: 'contact-form',
            message: 'Following up on my previous inquiry.',
            timestamp: new Date().toISOString()
        };

        const duplicateInfo = {
            firstSeen: '2024-01-15',
            lastContact: '2024-02-20',
            count: 3,
            status: 'contacted',
            previousSources: ['website', 'email', 'contact-form']
        };

        console.log(`Testing duplicate notification for: ${duplicateLead.name}...`);

        const result = await this.notificationManager.sendDuplicateLeadNotifications(duplicateLead, duplicateInfo, {
            includeSlack: true,
            includeEmail: true
        });

        this.testResults.duplicateLeadTests = {
            lead: duplicateLead,
            duplicateInfo: duplicateInfo,
            result: result
        };

        console.log(`  - Result: ${result.success ? '✅' : '❌'} (${result.summary?.successful || 0}/${result.summary?.total || 0} successful)`);

        if (result.results.slack?.error) {
            console.log(`    Slack error: ${result.results.slack.error}`);
        }
        if (result.results.email?.error) {
            console.log(`    Email error: ${result.results.email.error}`);
        }
    }

    /**
     * Test error handling and edge cases
     */
    async testErrorHandling() {
        console.log('\n🛡️  Testing Error Handling...\n');

        const errorTests = [];

        // Test 1: Empty lead data
        console.log('Testing with empty lead data...');
        try {
            const result = await this.notificationManager.sendNewLeadNotifications({});
            errorTests.push({
                test: 'empty-data',
                success: true,
                result: result
            });
            console.log('  - ✅ Handled empty data gracefully');
        } catch (error) {
            errorTests.push({
                test: 'empty-data',
                success: false,
                error: error.message
            });
            console.log('  - ❌ Failed on empty data:', error.message);
        }

        // Test 2: Invalid email address
        console.log('Testing with invalid email...');
        try {
            const result = await this.notificationManager.sendNewLeadNotifications({
                name: 'Invalid Email Test',
                email: 'not-an-email',
                source: 'test'
            });
            errorTests.push({
                test: 'invalid-email',
                success: true,
                result: result
            });
            console.log('  - ✅ Handled invalid email gracefully');
        } catch (error) {
            errorTests.push({
                test: 'invalid-email',
                success: false,
                error: error.message
            });
            console.log('  - ❌ Failed on invalid email:', error.message);
        }

        // Test 3: Rate limiting (send multiple rapid notifications)
        console.log('Testing rate limiting...');
        const rapidTests = [];
        for (let i = 0; i < 12; i++) {
            const result = await this.notificationManager.sendNewLeadNotifications({
                id: `rate-test-${i}`,
                name: `Rate Test ${i}`,
                email: `rate${i}@test.com`,
                source: 'rate-limit-test'
            });
            rapidTests.push(result.success);
        }

        const rateLimitedCount = rapidTests.filter(success => !success).length;
        if (rateLimitedCount > 0) {
            console.log(`  - ✅ Rate limiting working: ${rateLimitedCount} requests blocked`);
        } else {
            console.log('  - ⚠️  Rate limiting might not be working properly');
        }

        this.testResults.errorTests = errorTests;
    }

    /**
     * Display final test results
     */
    displayFinalResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 FINAL TEST RESULTS');
        console.log('='.repeat(60));

        // Configuration Summary
        const configOk = this.testResults.configuration.slack.configured || this.testResults.configuration.email.configured;
        console.log(`\n📋 Configuration: ${configOk ? '✅' : '❌'}`);

        // System Tests Summary
        const systemsWorking = this.testResults.systemTests?.summary.working || 0;
        const totalSystems = this.testResults.systemTests?.summary.total || 0;
        console.log(`🔌 System Tests: ${systemsWorking > 0 ? '✅' : '❌'} (${systemsWorking}/${totalSystems} working)`);

        // New Lead Tests Summary
        const newLeadSuccess = this.testResults.newLeadTests?.filter(t => t.result.success).length || 0;
        const newLeadTotal = this.testResults.newLeadTests?.length || 0;
        console.log(`🆕 New Lead Tests: ${newLeadSuccess > 0 ? '✅' : '❌'} (${newLeadSuccess}/${newLeadTotal} successful)`);

        // Duplicate Lead Tests Summary
        const duplicateSuccess = this.testResults.duplicateLeadTests?.result.success;
        console.log(`🔄 Duplicate Tests: ${duplicateSuccess ? '✅' : '❌'}`);

        // Error Handling Summary
        const errorTestsOk = this.testResults.errorTests?.filter(t => t.success).length || 0;
        const errorTestsTotal = this.testResults.errorTests?.length || 0;
        console.log(`🛡️  Error Handling: ${errorTestsOk > 0 ? '✅' : '❌'} (${errorTestsOk}/${errorTestsTotal} passed)`);

        // Overall Status
        const allTestsOk = systemsWorking > 0 && (newLeadSuccess > 0 || duplicateSuccess);
        console.log(`\n🎯 OVERALL STATUS: ${allTestsOk ? '✅ PASSED' : '❌ FAILED'}`);

        if (allTestsOk) {
            console.log('\n🎉 Notification system is ready for production!');
        } else {
            console.log('\n⚠️  Please fix the configuration issues before using in production.');
        }

        // Next Steps
        console.log('\n📝 NEXT STEPS:');
        if (!this.testResults.configuration.slack.configured) {
            console.log('1. Configure Slack webhook URL in .env file');
        }
        if (!this.testResults.configuration.email.configured) {
            console.log('2. Configure Gmail SMTP credentials in .env file');
        }
        if (systemsWorking === 0) {
            console.log('3. Verify network connectivity and credentials');
        }
        console.log('4. Test with real lead data once configured');
        console.log('5. Monitor logs for any issues in production');

        // Save detailed results to file
        this.saveTestResults();
    }

    /**
     * Save test results to file
     */
    saveTestResults() {
        const resultsFile = path.join(__dirname, 'logs', 'notification-test-results.json');

        // Ensure logs directory exists
        const logsDir = path.dirname(resultsFile);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        const detailedResults = {
            timestamp: new Date().toISOString(),
            testResults: this.testResults,
            statistics: this.notificationManager.getStatistics(),
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                workingDirectory: process.cwd()
            }
        };

        try {
            fs.writeFileSync(resultsFile, JSON.stringify(detailedResults, null, 2));
            console.log(`\n💾 Detailed results saved to: ${resultsFile}`);
        } catch (error) {
            console.log(`\n⚠️  Could not save results to file: ${error.message}`);
        }
    }

    /**
     * Helper: delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Run specific test type only
     */
    async runSpecificTest(testType) {
        console.log(`🎯 Running specific test: ${testType}\n`);

        switch (testType) {
            case 'config':
                await this.testConfiguration();
                break;
            case 'connectivity':
                await this.testSystemConnectivity();
                break;
            case 'new-lead':
                await this.testNewLeadNotifications();
                break;
            case 'duplicate':
                await this.testDuplicateLeadNotifications();
                break;
            case 'errors':
                await this.testErrorHandling();
                break;
            default:
                console.log('❌ Unknown test type. Available: config, connectivity, new-lead, duplicate, errors');
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const tester = new NotificationTester();

    if (args.length === 0) {
        // Run all tests
        await tester.runAllTests();
    } else {
        const testType = args[0];
        await tester.runSpecificTest(testType);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Test interrupted by user');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Test suite failed:', error.message);
        process.exit(1);
    });
}

module.exports = NotificationTester;