#!/usr/bin/env node
/**
 * Test note creation to see the exact error
 */

require('dotenv').config();

const FreshSalesClient = require('./src/api/freshsalesClientAxios');
const FreshSalesMapper = require('./src/api/freshsalesMapper');

async function testNoteCreation() {
    console.log('🧪 Testing note creation to identify HTTP 400 error...\n');

    const client = new FreshSalesClient({
        mockMode: false
    });

    const mapper = new FreshSalesMapper();

    // Use the contact we created in the last test
    const contactId = '402174694226';

    try {
        // Test 1: See what data the mapper generates
        const noteData = {
            title: 'New Lead from Pre-sales System',
            content: 'Contact created from pre-sales lead. Original timestamp: 2025-10-02T16:00:44.164Z\n\nCHANGE TRACKING ID: test_id'
        };

        console.log('📋 Note data input:');
        console.log(JSON.stringify(noteData, null, 2));

        const activityData = mapper.mapNoteToActivity(contactId, noteData);

        console.log('\n🔄 Mapped activity data:');
        console.log(JSON.stringify(activityData, null, 2));

        // Test 2: Try to create the activity
        console.log('\n📤 Creating activity...');
        const result = await client.createActivity(activityData);

        console.log('✅ Activity created successfully!');
        console.log('Activity ID:', result.activity?.id);

    } catch (error) {
        console.error('\n❌ Activity creation failed:');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.statusCode);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }

        // Test 3: Get activity types from FreshSales to see valid values
        console.log('\n🔍 Let me check available activity types...');
        try {
            const response = await client.axiosInstance.get('/settings/activities/activity_types');
            console.log('Available activity types:');
            console.log(JSON.stringify(response.data, null, 2));
        } catch (settingsError) {
            console.log('Could not fetch activity types:', settingsError.message);
        }
    }
}

if (require.main === module) {
    testNoteCreation().catch(console.error);
}

module.exports = { testNoteCreation };