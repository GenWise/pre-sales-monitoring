#!/usr/bin/env node
/**
 * Test complex contact creation using FreshSalesMapper to identify HTTP 400 issues
 */

require('dotenv').config();

const FreshSalesClient = require('./src/api/freshsalesClientAxios');
const FreshSalesMapper = require('./src/api/freshsalesMapper');

async function testMapperContact() {
    console.log('🧪 Testing complex contact creation with FreshSalesMapper...\n');

    const client = new FreshSalesClient({
        mockMode: false // Real API testing
    });

    const mapper = new FreshSalesMapper();

    try {
        // Sample lead data from master sheet format
        const uniqueId = Date.now();
        const sampleLeadData = {
            'Child Name': 'Test Mapper Child',
            'Parent Name': 'Test Parent',
            'Parent Email': `test.mapper.${uniqueId}@example.com`,
            'Parent Mobile': `+1234567${String(uniqueId).slice(-3)}`,
            'Interest Level': 'High',
            'Child Grade': '5th Grade',
            'Program': 'Summer Program',
            'Geography': 'USA',
            'Source Tag': 'website',
            'Timestamp': '2025-10-02T13:40:00.000Z'
        };

        console.log('📋 Sample lead data:');
        console.log(JSON.stringify(sampleLeadData, null, 2));

        // Use mapper to convert to FreshSales format
        const mappedContactData = mapper.mapLeadToContact(sampleLeadData);

        console.log('\n🔄 Mapped contact data:');
        console.log(JSON.stringify(mappedContactData, null, 2));

        // Try to create the contact
        console.log('\n📤 Creating contact with mapped data...');

        const result = await client.createContact(mappedContactData);

        console.log('\n✅ Complex contact creation successful!');
        console.log('📥 Response:', JSON.stringify(result, null, 2));

        // Store the contact ID for cleanup if needed
        const contactId = result.contact?.id;
        if (contactId) {
            console.log(`\n🆔 Contact ID for cleanup: ${contactId}`);
            console.log(`🗑️  To delete: Run manual FreshSales deletion for contact ${contactId}`);
        }

        return { success: true, contactId, result, mappedData: mappedContactData };

    } catch (error) {
        console.error('\n❌ Complex contact creation failed:');
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
    testMapperContact().then(result => {
        if (result.success) {
            console.log('\n🎉 Mapper contact test completed successfully!');
            process.exit(0);
        } else {
            console.log('\n💥 Mapper contact test failed!');
            process.exit(1);
        }
    }).catch(console.error);
}

module.exports = { testMapperContact };