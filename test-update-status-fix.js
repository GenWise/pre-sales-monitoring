#!/usr/bin/env node

/**
 * Test: Does PUT /contacts/:id need ?include=contact_status parameter?
 */

const FreshSalesClient = require('./src/api/freshsalesClientAxios');

(async () => {
  const client = new FreshSalesClient({
    apiKey: 'awiMf4YWS-S4wE_10pUmHQ',
    domain: 'genwisecrm.myfreshworks.com'
  });

  // Use the contact created at 11:05 IST
  const contactId = '402174982265';

  console.log('=== TESTING UPDATE WITH ?include=contact_status ===\n');

  // Test 1: Get current contact status
  console.log('Test 1: GET contact WITH ?include=contact_status');
  const currentContact = await client.getContact(contactId);
  console.log('  Current status:', currentContact.contact?.contact_status_id || 'NOT IN RESPONSE');
  console.log('  Current owner:', currentContact.contact?.custom_field?.cf_parent_owner || currentContact.contact?.cf_parent_owner || 'NOT IN RESPONSE');

  // Test 2: Update WITHOUT ?include parameter (current broken behavior)
  console.log('\nTest 2: PUT WITHOUT ?include parameter (current code)');
  const response1 = await client.axiosInstance({
    method: 'put',
    url: `/contacts/${contactId}`,
    data: {
      contact: {
        contact_status_id: 402000446648 // Warm
      }
    }
  });
  console.log('  Response status_id:', response1.data.contact?.contact_status_id || 'NOT IN RESPONSE');

  // Test 3: Update WITH ?include=contact_status parameter (hypothesis fix)
  console.log('\nTest 3: PUT WITH ?include=contact_status (hypothesis)');
  const response2 = await client.axiosInstance({
    method: 'put',
    url: `/contacts/${contactId}?include=contact_status`,
    data: {
      contact: {
        contact_status_id: 402000446647 // Hot
      }
    }
  });
  console.log('  Response status_id:', response2.data.contact?.contact_status_id || 'NOT IN RESPONSE');

  // Test 4: Verify final state
  console.log('\nTest 4: GET final contact state');
  const finalContact = await client.getContact(contactId);
  console.log('  Final status:', finalContact.contact?.contact_status_id || 'NOT IN RESPONSE');

  if (finalContact.contact?.contact_status_id === 402000446647) {
    console.log('\n✅ SUCCESS! Update WITH ?include parameter WORKS');
  } else {
    console.log('\n❌ FAILED! Status did not update');
    console.log('  Expected: 402000446647 (Hot)');
    console.log('  Got:', finalContact.contact?.contact_status_id);
  }
})();
