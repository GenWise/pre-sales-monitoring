#!/usr/bin/env node
/**
 * Safe CRM Sync Test - Single Record Test with Full Tracking
 *
 * This script tests the FreshSales sync with maximum safety:
 * - Processes only 1 record at a time
 * - Tracks all CRM changes
 * - Provides rollback capability
 * - Uses real CRM (not mock mode)
 */

// Load environment variables
require('dotenv').config();

const FreshSalesSync = require('./src/api/freshsalesSync');
const path = require('path');

async function runSafeTest() {
    console.log('🛡️  SAFE CRM SYNC TEST - Single Record Only\n');

    // Initialize sync with safety settings
    const sync = new FreshSalesSync({
        testSessionId: `safe_test_${Date.now()}`,
        mockMode: false, // Real CRM testing
        batchSize: 1,    // Already forced in constructor
        masterSheetId: '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ',
        serviceAccountFile: './service-account-key.json'
    });

    try {
        console.log('🔍 Step 1: Testing status-based filtering...');

        // Test with limit of 1 record only
        const result = await sync.syncLeadsToFreshSales({
            limit: 1,
            syncEligibleOnly: true
        });

        console.log('\n📊 Sync Results:');
        console.log(`   Records processed: ${result.stats?.processed || 0}`);
        console.log(`   Created: ${result.stats?.created || 0}`);
        console.log(`   Updated: ${result.stats?.updated || 0}`);
        console.log(`   Skipped: ${result.stats?.skipped || 0}`);
        console.log(`   Errors: ${result.stats?.errors || 0}`);

        console.log('\n🛡️  Change Tracking Summary:');
        const summary = sync.changeTracker.getSessionSummary();
        console.log(`   Session ID: ${summary.sessionId}`);
        console.log(`   Total operations: ${summary.totalOperations}`);
        console.log(`   Successful: ${summary.successful}`);
        console.log(`   Needs rollback: ${summary.needsRollback}`);

        if (summary.needsRollback > 0) {
            console.log('\n🚨 ROLLBACK AVAILABLE:');
            console.log(`   node src/api/rollbackScript.js ${summary.sessionId}`);
            console.log('   OR');
            console.log(`   node src/api/rollbackScript.js --list`);
        }

        console.log('\n✅ Safe test completed successfully!');
        console.log('\n📋 Next Steps:');
        console.log('   1. Check FreshSales CRM for any new/updated contacts');
        console.log('   2. Use rollback script if needed to clean up');
        console.log('   3. Ready for production deployment');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);

        console.log('\n🛡️  Safety Check:');
        const summary = sync.changeTracker.getSessionSummary();
        if (summary.needsRollback > 0) {
            console.log(`   Use rollback: node src/api/rollbackScript.js ${summary.sessionId}`);
        } else {
            console.log('   No CRM changes made - safe to retry');
        }
    }
}

// Run the test
if (require.main === module) {
    runSafeTest().catch(console.error);
}

module.exports = { runSafeTest };