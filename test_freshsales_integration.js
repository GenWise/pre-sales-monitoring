#!/usr/bin/env node

/**
 * FreshSales Integration Test Script
 *
 * This script tests the complete FreshSales integration:
 * 1. Load leads from Google Sheets master database
 * 2. Sync leads to FreshSales CRM
 * 3. Test bidirectional sync (if API permissions allow)
 * 4. Generate comprehensive report
 */

require('dotenv').config();
const FreshSalesSync = require('./src/api/freshsalesSync');
const path = require('path');

// Configuration
const config = {
    masterSheetId: '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ',
    serviceAccountFile: path.join(__dirname, 'credentials', 'service-account-key.json'),
    apiKey: 'awiMf4YWS-S4wE_10pUmHQ', // Correct parameter name
    domain: 'genwisecrm.myfreshworks.com', // Correct parameter name
    mockMode: true, // Enable mock mode initially for testing
    batchSize: 5,
    duplicateStrategy: 'skip', // 'skip', 'update', 'create_new'
    syncDirection: 'to_crm' // Start with one-way sync first
};

async function main() {
    console.log('='.repeat(60));
    console.log('FreshSales Integration Test & Verification');
    console.log('='.repeat(60));
    console.log(`Master Sheet: ${config.masterSheetId}`);
    console.log(`FreshSales Domain: ${config.freshSalesDomain}`);
    console.log(`Mock Mode: ${config.mockMode}`);
    console.log(`Sync Direction: ${config.syncDirection}`);
    console.log('='.repeat(60));

    try {
        // Initialize FreshSales sync
        const freshSalesSync = new FreshSalesSync(config);

        // Test 1: API connectivity and basic functionality
        console.log('\n🧪 STAGE 1: Testing API Connectivity & Basic Functions');
        console.log('-'.repeat(50));

        const connectivityTest = await freshSalesSync.testSync();
        console.log('\nConnectivity Test Results:');
        console.log(JSON.stringify(connectivityTest, null, 2));

        // Test 2: Load leads from master database
        console.log('\n🧪 STAGE 2: Loading Leads from Master Database');
        console.log('-'.repeat(50));

        const leads = await freshSalesSync.loadLeadsFromMasterDatabase({ limit: 10 });
        console.log(`✅ Loaded ${leads.length} leads from master database`);

        if (leads.length > 0) {
            console.log('\nSample lead data:');
            console.log(JSON.stringify(leads[0], null, 2));
        }

        // Test 3: Sync leads to FreshSales
        console.log('\n🧪 STAGE 3: Syncing Leads to FreshSales CRM');
        console.log('-'.repeat(50));

        const syncToFreshSalesResult = await freshSalesSync.syncLeadsToFreshSales({ limit: 3 });
        console.log('\nSync to FreshSales Results:');
        console.log(JSON.stringify(syncToFreshSalesResult, null, 2));

        // Test 4: Bidirectional sync (if enabled)
        if (config.syncDirection === 'bidirectional') {
            console.log('\n🧪 STAGE 4: Testing Bidirectional Sync');
            console.log('-'.repeat(50));

            const bidirectionalResult = await freshSalesSync.performBidirectionalSync({ limit: 3 });
            console.log('\nBidirectional Sync Results:');
            console.log(JSON.stringify(bidirectionalResult, null, 2));
        }

        // Test 5: Generate comprehensive report
        console.log('\n📊 FINAL REPORT: FreshSales Integration Status');
        console.log('='.repeat(60));

        const report = generateComprehensiveReport({
            connectivityTest,
            leadsCount: leads.length,
            syncToFreshSalesResult,
            bidirectionalResult: config.syncDirection === 'bidirectional' ? bidirectionalResult : null,
            config
        });

        console.log(report);

        // Save report to file
        const fs = require('fs').promises;
        const reportFile = path.join(__dirname, `freshsales_integration_report_${new Date().getTime()}.json`);
        await fs.writeFile(reportFile, JSON.stringify({
            timestamp: new Date().toISOString(),
            connectivityTest,
            leadsCount: leads.length,
            sampleLead: leads[0] || null,
            syncToFreshSalesResult,
            bidirectionalResult: config.syncDirection === 'bidirectional' ? bidirectionalResult : null,
            config
        }, null, 2));

        console.log(`\n💾 Detailed report saved to: ${reportFile}`);

        return { success: true, report };

    } catch (error) {
        console.error('❌ FreshSales Integration Test Failed:', error.message);
        console.error('Stack trace:', error.stack);

        return {
            success: false,
            error: error.message,
            stack: error.stack
        };
    }
}

function generateComprehensiveReport(data) {
    const { connectivityTest, leadsCount, syncToFreshSalesResult, bidirectionalResult, config } = data;

    let report = `
FRESHSALES INTEGRATION VERIFICATION REPORT
==========================================

Configuration:
- Master Sheet: ${config.masterSheetId}
- FreshSales Domain: ${config.freshSalesDomain}
- Mock Mode: ${config.mockMode}
- Sync Direction: ${config.syncDirection}
- Batch Size: ${config.batchSize}
- Duplicate Strategy: ${config.duplicateStrategy}

Test Results:
=============

1. API Connectivity: ${connectivityTest.tests.connectivity?.status === 'success' ? '✅ SUCCESS' : '❌ FAILED'}
   ${connectivityTest.tests.connectivity?.status === 'error' ? `   Error: ${connectivityTest.tests.connectivity.message}` : ''}

2. Field Mapping: ${connectivityTest.tests.fieldMapping?.status === 'success' ? '✅ SUCCESS' : '❌ FAILED'}
   ${connectivityTest.tests.fieldMapping?.status === 'error' ? `   Error: ${connectivityTest.tests.fieldMapping.message}` : ''}

3. Mock Sync: ${connectivityTest.tests.mockSync?.status === 'success' ? '✅ SUCCESS' : '❌ FAILED'}
   ${connectivityTest.tests.mockSync?.status === 'error' ? `   Error: ${connectivityTest.tests.mockSync.message}` : ''}

4. Master Database Load: ${leadsCount > 0 ? '✅ SUCCESS' : '❌ NO DATA'}
   Loaded ${leadsCount} leads from master database

5. Sync to FreshSales: ${syncToFreshSalesResult.success ? '✅ SUCCESS' : '❌ FAILED'}
   - Processed: ${syncToFreshSalesResult.stats?.processed || 0}
   - Created: ${syncToFreshSalesResult.stats?.created || 0}
   - Updated: ${syncToFreshSalesResult.stats?.updated || 0}
   - Skipped: ${syncToFreshSalesResult.stats?.skipped || 0}
   - Errors: ${syncToFreshSalesResult.stats?.errors || 0}
   ${!syncToFreshSalesResult.success ? `   Error: ${syncToFreshSalesResult.message}` : ''}
`;

    if (bidirectionalResult) {
        report += `
6. Bidirectional Sync: ${bidirectionalResult.fromFreshSales?.success ? '✅ SUCCESS' : '❌ FAILED/LIMITED'}
   To FreshSales: ${bidirectionalResult.toFreshSales?.success ? 'Success' : 'Failed'}
   From FreshSales: ${bidirectionalResult.fromFreshSales?.success ? 'Success' : 'Failed/Limited Permissions'}
   ${!bidirectionalResult.fromFreshSales?.success ? `   Error: ${bidirectionalResult.fromFreshSales?.message}` : ''}
`;
    }

    report += `
Overall Status:
===============
${getOverallStatus(data)}

Recommendations:
================
${generateRecommendations(data)}

Next Steps:
===========
${generateNextSteps(data)}
`;

    return report;
}

function getOverallStatus(data) {
    const { connectivityTest, leadsCount, syncToFreshSalesResult, bidirectionalResult } = data;

    const connectivityOk = connectivityTest.tests.connectivity?.status === 'success';
    const mappingOk = connectivityTest.tests.fieldMapping?.status === 'success';
    const dataLoaded = leadsCount > 0;
    const syncOk = syncToFreshSalesResult.success;

    if (connectivityOk && mappingOk && dataLoaded && syncOk) {
        return '🎉 FULLY FUNCTIONAL - FreshSales integration is working correctly';
    } else if (connectivityOk && mappingOk && dataLoaded) {
        return '⚠️  PARTIALLY FUNCTIONAL - API works but sync has issues';
    } else if (connectivityOk && dataLoaded) {
        return '⚠️  LIMITED FUNCTIONALITY - API connection works, mapping issues detected';
    } else {
        return '❌ NOT FUNCTIONAL - Critical issues preventing integration';
    }
}

function generateRecommendations(data) {
    const { connectivityTest, syncToFreshSalesResult, config } = data;
    const recommendations = [];

    if (connectivityTest.tests.connectivity?.status === 'error') {
        recommendations.push('- Check FreshSales API key and domain configuration');
        recommendations.push('- Verify network connectivity to FreshSales API');
    }

    if (connectivityTest.tests.fieldMapping?.status === 'error') {
        recommendations.push('- Review field mapping configuration in FreshSalesMapper');
        recommendations.push('- Check data types and required fields');
    }

    if (!syncToFreshSalesResult.success) {
        recommendations.push('- Review sync error logs for specific issues');
        recommendations.push('- Check FreshSales API permissions and rate limits');
    }

    if (syncToFreshSalesResult.stats?.errors > 0) {
        recommendations.push('- Investigate individual record sync failures');
        recommendations.push('- Consider using mock mode for testing without API calls');
    }

    if (config.mockMode) {
        recommendations.push('- Disable mock mode for production deployment');
        recommendations.push('- Test with real API calls in development environment');
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '- No specific recommendations - system appears to be working correctly';
}

function generateNextSteps(data) {
    const { syncToFreshSalesResult, config } = data;
    const steps = [];

    if (syncToFreshSalesResult.success) {
        steps.push('1. Schedule regular sync operations (e.g., every 15 minutes)');
        steps.push('2. Implement webhook triggers for real-time sync');
        steps.push('3. Set up monitoring and alerting for sync failures');
        steps.push('4. Test with larger data sets and edge cases');
    } else {
        steps.push('1. Resolve sync issues identified in the report');
        steps.push('2. Test with individual records to isolate problems');
        steps.push('3. Enable mock mode for development and testing');
        steps.push('4. Contact FreshSales support if API permission issues persist');
    }

    steps.push('5. Integrate FreshSales sync into production webhook pipeline');
    steps.push('6. Set up automated testing for integration health checks');

    return steps.join('\n');
}

// Run the test if this script is executed directly
if (require.main === module) {
    main().then(result => {
        if (result.success) {
            console.log('\n🎉 FreshSales integration test completed successfully');
            process.exit(0);
        } else {
            console.log('\n❌ FreshSales integration test failed');
            process.exit(1);
        }
    }).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { main, generateComprehensiveReport };