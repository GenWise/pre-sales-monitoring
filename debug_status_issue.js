#!/usr/bin/env node
/**
 * Debug script to investigate contact_status_id discrepancy
 */

const axios = require('axios');

const API_KEY = 'awiMf4YWS-S4wE_10pUmHQ';
const BASE_URL = 'https://genwisecrm.myfreshworks.com/crm/sales/api';

async function testContactCreation() {
    const axiosInstance = axios.create({
        baseURL: BASE_URL,
        headers: {
            'Authorization': `Token token=${API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    // Exact payload from test_safe_sync.js log
    const testPayload = {
        contact: {
            first_name: "TEST_Parent_Hot",
            emails: [{
                value: "exactrepro2@example.com",
                is_primary: true,
                label: "work"
            }],
            mobile_number: "+919999888877",
            contact_status_id: 402000446648,
            last_source: "Web Form",
            tags: ["gsp2026_ats_qualifiers_form", "pre_sales_lead"],
            description: "Test contact for sync development\n\n[TEST CONTACT - Session: safe_test_1759559818903 - Created: 2025-10-04T06:37:00.597Z]"
        }
    };

    console.log('Creating contact with exact test_safe_sync.js payload...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));

    try {
        const createResponse = await axiosInstance.post('/contacts', testPayload);
        const contactId = createResponse.data.contact.id;
        console.log(`\nContact created: ${contactId}`);

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Fetch with include parameter
        const fetchResponse = await axiosInstance.get(`/contacts/${contactId}?include=contact_status`);
        const contact = fetchResponse.data.contact;

        console.log('\nVERIFICATION:');
        console.log(`  contact_status_id: ${contact.contact_status_id} (expected: 402000446648 = Warm)`);
        console.log(`  description: ${contact.description ? 'Present' : 'None'}`);
        console.log(`  tags: ${JSON.stringify(contact.tags)}`);
        console.log(`\n  RESULT: ${contact.contact_status_id === 402000446648 ? '✅ PASS' : '❌ FAIL - got ' + contact.contact_status_id}`);

        // Now check the original failing contact
        console.log('\n\nChecking original test_safe_sync.js contact (402174844666):');
        const origResponse = await axiosInstance.get('/contacts/402174844666?include=contact_status');
        const origContact = origResponse.data.contact;
        console.log(`  contact_status_id: ${origContact.contact_status_id} (expected: 402000446648)`);
        console.log(`  tags: ${JSON.stringify(origContact.tags)}`);
        console.log(`  RESULT: ${origContact.contact_status_id === 402000446648 ? '✅ PASS' : '❌ FAIL - got ' + origContact.contact_status_id}`);

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testContactCreation();
