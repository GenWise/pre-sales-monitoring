#!/usr/bin/env node
/**
 * Cleanup Test Data - Delete all test contacts and associated deals/notes
 */

require('dotenv').config();
const FreshSalesClient = require('./src/api/freshsalesClientAxios');

async function cleanupTestData() {
    console.log('🧹 Cleaning up all test data from FreshSales CRM...\n');

    const client = new FreshSalesClient({
        apiKey: process.env.FRESHSALES_API_KEY || 'awiMf4YWS-S4wE_10pUmHQ'
    });

    try {
        // Search for test contacts by email pattern
        console.log('🔍 Searching for test contacts...');
        const searchQueries = [
            'test_hot@test.com',
            'test_warm@test.com',
            'test@test.com',
            'TEST'
        ];

        const contactsToDelete = new Set();

        for (const query of searchQueries) {
            try {
                const results = await client.searchContacts(query);
                if (results.contacts && results.contacts.length > 0) {
                    results.contacts.forEach(c => contactsToDelete.add(c.id));
                    console.log(`   Found ${results.contacts.length} contacts matching "${query}"`);
                }
            } catch (error) {
                console.warn(`   Search for "${query}" failed: ${error.message}`);
            }
        }

        if (contactsToDelete.size === 0) {
            console.log('\n✅ No test contacts found - database is clean!');
            return;
        }

        console.log(`\n🗑️  Deleting ${contactsToDelete.size} test contacts...`);
        let deletedCount = 0;
        let errorCount = 0;

        for (const contactId of contactsToDelete) {
            try {
                console.log(`   Deleting contact ${contactId}...`);
                await client.deleteContact(contactId);
                deletedCount++;
                console.log(`   ✅ Deleted contact ${contactId}`);

                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                errorCount++;
                console.error(`   ❌ Failed to delete contact ${contactId}: ${error.message}`);
            }
        }

        console.log('\n📊 Cleanup Summary:');
        console.log(`   Contacts deleted: ${deletedCount}`);
        console.log(`   Errors: ${errorCount}`);
        console.log('\n✅ Cleanup completed!');

    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        throw error;
    }
}

if (require.main === module) {
    cleanupTestData().catch(console.error);
}

module.exports = { cleanupTestData };
