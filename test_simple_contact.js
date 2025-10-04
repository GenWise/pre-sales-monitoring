#!/usr/bin/env node
/**
 * Test simple contact creation to verify FreshSales authentication and basic API functionality
 */

require('dotenv').config();

const FreshSalesClient = require('./src/api/freshsalesClientAxios');

async function testSimpleContact() {
    console.log('🧪 Testing simple contact creation...\n');

    const client = new FreshSalesClient({
        mockMode: false // Real API testing
    });

    try {
        // Test 1: Simple contact data that's known to work
        const simpleContactData = {
            first_name: 'TEST',
            last_name: 'Simple',
            mobile_number: '+1234567890'
        };

        console.log('📤 Creating simple contact with data:');
        console.log(JSON.stringify(simpleContactData, null, 2));

        const result = await client.createContact(simpleContactData);

        console.log('\n✅ Simple contact creation successful!');
        console.log('📥 Response:', JSON.stringify(result, null, 2));

        // Store the contact ID for cleanup if needed
        const contactId = result.contact?.id;
        if (contactId) {
            console.log(`\n🆔 Contact ID for cleanup: ${contactId}`);
            console.log(`🗑️  To delete: Run manual FreshSales deletion for contact ${contactId}`);
        }

        return { success: true, contactId, result };

    } catch (error) {
        console.error('\n❌ Simple contact creation failed:');
        console.error('Error:', error.message);

        if (error.response) {
            console.error('Status:', error.response.statusCode);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }

        return { success: false, error };
    }
}

// Run the test
if (require.main === module) {
    testSimpleContact().then(result => {
        if (result.success) {
            console.log('\n🎉 Simple contact test completed successfully!');
            process.exit(0);
        } else {
            console.log('\n💥 Simple contact test failed!');
            process.exit(1);
        }
    }).catch(console.error);
}

module.exports = { testSimpleContact };