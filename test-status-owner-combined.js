const FreshSalesClient = require('./src/api/freshsalesClientAxios');

(async () => {
  const client = new FreshSalesClient('awiMf4YWS-S4wE_10pUmHQ');

  // Test: Update with BOTH contact_status_id and custom_field in ONE request
  const contactId = 402174976850; // t_test_parent

  console.log('Testing UPDATE with BOTH fields in ONE request...\n');

  const updateData = {
    contact_status_id: 402000446648, // Warm
    custom_field: { cf_parent_owner: 'Agnes' }
  };

  console.log('Sending:', JSON.stringify(updateData, null, 2));

  const response = await client.updateContact(contactId, updateData);

  console.log('\nResponse contact_status_id:', response.contact?.contact_status_id || 'NOT IN RESPONSE');
  console.log('Response cf_parent_owner:', response.contact?.custom_field?.cf_parent_owner || 'NOT IN RESPONSE');

  // Verify with GET
  console.log('\nVerifying with GET...');
  const verification = await client.getContact(contactId);
  console.log('Actual contact_status_id:', verification.contact?.contact_status_id);
  console.log('Actual cf_parent_owner:', verification.contact?.custom_field?.cf_parent_owner);

})().catch(console.error);
