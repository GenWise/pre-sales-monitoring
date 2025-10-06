const FreshSalesClient = require('./src/api/freshsalesClientAxios');

(async () => {
  const client = new FreshSalesClient('awiMf4YWS-S4wE_10pUmHQ');

  // Test: Get contact 402174970388 and add new email parent_test@fmail.com
  const existingContact = { id: 402174970388 };
  const newContactData = {
    emails: [{ value: 'parent_test@fmail.com', is_primary: true, label: 'work' }]
  };

  console.log('Testing additive email update for contact 402174970388...\n');

  // Simulate buildAdditiveUpdate logic
  const fullContact = await client.getContact(existingContact.id);
  const existingEmails = fullContact.contact?.emails || [];

  console.log('Existing emails:', existingEmails.map(e => e.value));

  const newEmail = newContactData.emails[0].value;
  const emailExists = existingEmails.some(e => e.value?.toLowerCase() === newEmail.toLowerCase());

  if (!emailExists) {
    const updatedEmails = [
      ...existingEmails,
      { value: newEmail, is_primary: false, label: 'work' }
    ];

    console.log('\nWill update with emails:', updatedEmails.map(e => `${e.value} (primary: ${e.is_primary})`));

    const updateResponse = await client.updateContact(existingContact.id, { emails: updatedEmails });
    console.log('\n✅ Update successful!');

    // Verify
    const updated = await client.getContact(existingContact.id);
    console.log('\nAfter update:', updated.contact.emails.map(e => `${e.value} (primary: ${e.is_primary})`));
  } else {
    console.log('\nEmail already exists, no update needed');
  }
})().catch(console.error);
