#!/usr/bin/env node

/**
 * FreshSales CRM Integration Usage Examples
 *
 * This file demonstrates how to use the FreshSales CRM integration
 * with various scenarios and configurations.
 */

require('dotenv').config();

const FreshSalesClient = require('./src/api/freshsalesClient');
const FreshSalesMapper = require('./src/api/freshsalesMapper');
const FreshSalesSync = require('./src/api/freshsalesSync');

async function demonstrateBasicUsage() {
    console.log('=== FreshSales CRM Integration Demo ===\n');

    // Example 1: Basic API Client Usage
    console.log('1. Basic API Client Usage:');
    console.log('---------------------------');

    const client = new FreshSalesClient({
        mockMode: true, // Set to false for live API
        apiKey: process.env.FRESHSALES_API_KEY,
        domain: process.env.FRESHSALES_DOMAIN
    });

    // Test connection
    try {
        const connectionTest = await client.testConnection();
        console.log('✅ API Connection:', connectionTest.mockMode ? 'Mock Mode' : 'Live API');
        console.log('   Rate Limits:', client.getRateLimitStatus());
    } catch (error) {
        console.log('❌ Connection failed:', error.message);
    }

    console.log('');

    // Example 2: Field Mapping
    console.log('2. Field Mapping Examples:');
    console.log('--------------------------');

    const mapper = new FreshSalesMapper();

    // Sample lead data (from Google Sheets)
    const sampleLead = {
        'Timestamp': '2024-01-15 10:30:00',
        'Child Name': 'Alice Johnson',
        'Parent Name': 'Sarah Johnson',
        'Parent Email': 'sarah.johnson@email.com',
        'Parent Mobile': '+91-9876543210',
        'Interest Level': 'Hot',
        'Child Grade': 'Grade 4',
        'Program': 'Coding Bootcamp',
        'Geography': 'Mumbai',
        'Notes': 'Very interested in weekend batch'
    };

    console.log('Original Lead Data:', JSON.stringify(sampleLead, null, 2));

    // Map to FreshSales format
    const mappedContact = mapper.mapLeadToContact(sampleLead);
    console.log('\nMapped to FreshSales Contact:', JSON.stringify(mappedContact, null, 2));

    // Reverse mapping
    const sampleContact = {
        id: 'fs_123456',
        first_name: 'Alice',
        last_name: 'Johnson',
        emails: [{ value: 'sarah.johnson@email.com', is_primary: true }],
        mobile_number: '+919876543210',
        contact_status_id: 402000446647, // Hot
        cf_child_grade: 'Grade 4',
        cf_program: 'Coding Bootcamp',
        created_at: '2024-01-15T10:30:00Z'
    };

    const reverseMapped = mapper.mapContactToLead(sampleContact);
    console.log('\nReverse Mapped to Lead:', JSON.stringify(reverseMapped, null, 2));

    console.log('');

    // Example 3: Individual Operations
    console.log('3. Individual CRM Operations:');
    console.log('-----------------------------');

    try {
        // Create contact (will work in mock mode, may fail with 403 in live mode)
        const newContact = await client.createContact(mappedContact);
        console.log('✅ Contact Created:', newContact.contact?.id || 'Mock ID');

        // Add a note
        if (newContact.contact?.id) {
            const noteData = mapper.mapNoteToActivity(newContact.contact.id, {
                type: 'note',
                title: 'Follow-up Required',
                content: 'Parent showed strong interest in weekend batch. Schedule demo.'
            });

            const activity = await client.createActivity(noteData);
            console.log('✅ Note Added:', activity.activity?.id || 'Mock Activity ID');
        }

        // Search for existing contact
        const searchResults = await client.searchContacts('sarah.johnson@email.com');
        console.log('✅ Search Results:', searchResults.contacts?.length || 0, 'contacts found');

    } catch (error) {
        if (error.message.includes('API_PERMISSION_DENIED')) {
            console.log('⚠️  API Permissions Required:', error.message);
        } else {
            console.log('❌ Operation failed:', error.message);
        }
    }

    console.log('');

    // Example 4: Batch Sync Operations
    console.log('4. Batch Sync Operations:');
    console.log('-------------------------');

    const sync = new FreshSalesSync({
        mockMode: true, // Safe for testing
        batchSize: 5,
        duplicateStrategy: 'skip' // 'skip', 'update', 'create_new'
    });

    try {
        // Test sync functionality
        const testResults = await sync.testSync();
        console.log('✅ Sync Test Results:');
        console.log('   Connectivity:', testResults.tests.connectivity?.status || 'N/A');
        console.log('   Field Mapping:', testResults.tests.fieldMapping?.status || 'N/A');
        console.log('   Mock Sync:', testResults.tests.mockSync?.status || 'N/A');

        // Simulate sync with limited data
        const syncResult = await sync.syncLeadsToFreshSales({
            limit: 3, // Only sync 3 leads for demo
            since: '2024-01-01' // Only leads after this date
        });

        console.log('\n✅ Sync Completed:');
        console.log('   Success:', syncResult.success);
        console.log('   Processed:', syncResult.stats.processed);
        console.log('   Created:', syncResult.stats.created);
        console.log('   Updated:', syncResult.stats.updated);
        console.log('   Errors:', syncResult.stats.errors);

    } catch (error) {
        console.log('❌ Sync failed:', error.message);
    }

    console.log('');

    // Example 5: Error Handling Scenarios
    console.log('5. Error Handling Examples:');
    console.log('---------------------------');

    // Rate limit checking
    const rateLimitStatus = client.checkRateLimits();
    console.log('Rate Limit Status:', rateLimitStatus.canProceed ? '✅ OK' : '⚠️  Limited');

    // Invalid data handling
    const invalidLead = {
        'Child Name': '', // Empty name
        'Parent Email': 'invalid-email', // Invalid email
        'Interest Level': 'Unknown Status' // Unknown status
    };

    try {
        const invalidMapped = mapper.mapLeadToContact(invalidLead);
        console.log('Invalid lead mapping result:', Object.keys(invalidMapped));
    } catch (error) {
        console.log('❌ Mapping error handled:', error.message);
    }

    console.log('');

    // Example 6: Status and Field Options
    console.log('6. Available Options:');
    console.log('--------------------');

    const statusOptions = mapper.getContactStatusOptions();
    console.log('Available Contact Statuses:');
    statusOptions.forEach(status => {
        console.log(`   ${status.name} (${status.category}): ${status.id}`);
    });

    console.log('\n=== Demo Complete ===');
}

async function demonstrateProductionWorkflow() {
    console.log('\n=== Production Workflow Example ===\n');

    console.log('1. Pre-deployment Checklist:');
    console.log('   □ API permissions granted by FreshSales admin');
    console.log('   □ Environment variables configured (.env)');
    console.log('   □ Google Sheets access working');
    console.log('   □ Test suite passes: node test_freshsales.js');

    console.log('\n2. Production Sync Example:');

    const sync = new FreshSalesSync({
        mockMode: process.env.FRESHSALES_MOCK_MODE === 'true',
        batchSize: parseInt(process.env.FRESHSALES_SYNC_BATCH_SIZE) || 10,
        duplicateStrategy: process.env.FRESHSALES_DUPLICATE_STRATEGY || 'skip'
    });

    // This would be the actual production sync
    console.log('   // Production sync command:');
    console.log('   const result = await sync.syncLeadsToFreshSales();');
    console.log('   console.log("Sync completed:", result);');

    console.log('\n3. Monitoring Example:');
    console.log('   // Set up daily sync with monitoring');
    console.log('   const cron = require("cron");');
    console.log('   const job = new cron.CronJob("0 9 * * *", async () => {');
    console.log('       const result = await sync.syncLeadsToFreshSales();');
    console.log('       if (!result.success) {');
    console.log('           // Send alert notification');
    console.log('       }');
    console.log('   });');

    console.log('\n=== Production Example Complete ===');
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--help')) {
        console.log(`
FreshSales CRM Integration Examples

Usage:
  node freshsales_example.js [options]

Options:
  --production    Show production workflow examples
  --help          Show this help

Examples:
  node freshsales_example.js                 # Basic usage demo
  node freshsales_example.js --production    # Production workflow
        `);
        process.exit(0);
    }

    if (args.includes('--production')) {
        demonstrateProductionWorkflow().catch(console.error);
    } else {
        demonstrateBasicUsage().catch(console.error);
    }
}

module.exports = {
    demonstrateBasicUsage,
    demonstrateProductionWorkflow
};