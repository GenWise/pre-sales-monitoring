#!/usr/bin/env node

const FreshSalesSync = require('./src/api/freshsalesSync');
const path = require('path');

(async () => {
  const sync = new FreshSalesSync({
    masterSheetId: '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ',
    serviceAccountFile: path.join(__dirname, 'credentials', 'service-account-key.json')
  });

  console.log('=== MASTER SHEET FILTERING DEBUG ===\n');

  // Load ALL leads
  const allLeads = await sync.loadLeadsFromMasterDatabase({ syncEligibleOnly: false, limit: 10 });
  console.log('Total leads in sheet:', allLeads.length);

  if (allLeads.length > 0) {
    console.log('\nFirst 5 leads Status values:');
    allLeads.slice(0, 5).forEach((lead, i) => {
      const status = lead.Status || lead.status || lead['Interest Level'] || 'MISSING';
      const crmLink = lead.crm_contact_link || lead['CRM Contact Link'] || lead.crmContactLink || '';
      console.log(`  [${i+1}] Status: '${status}' | CRM Link: '${crmLink ? 'HAS_LINK' : 'EMPTY'}'`);
    });
  }

  // Load sync-eligible leads
  const syncLeads = await sync.loadLeadsFromMasterDatabase({ syncEligibleOnly: true });
  console.log(`\nSync-eligible leads (status=Warm|Hot|Not Interested, no CRM link): ${syncLeads.length}`);

  if (syncLeads.length === 0) {
    console.log('\n❌ ISSUE FOUND: No sync-eligible leads!');
    console.log('Checking each filter condition:');

    const warmHotNotInterested = allLeads.filter(lead => {
      const status = (lead.Status || lead.status || lead['Interest Level'] || '').toLowerCase();
      return ['warm', 'hot', 'not interested'].includes(status);
    });
    console.log(`  - Leads with status Warm|Hot|Not Interested: ${warmHotNotInterested.length}`);

    const withoutCrmLink = allLeads.filter(lead => {
      const crmLink = lead.crm_contact_link || lead['CRM Contact Link'] || lead.crmContactLink;
      return !crmLink || crmLink === '';
    });
    console.log(`  - Leads without CRM link: ${withoutCrmLink.length}`);

    const both = allLeads.filter(lead => {
      const status = (lead.Status || lead.status || lead['Interest Level'] || '').toLowerCase();
      const crmLink = lead.crm_contact_link || lead['CRM Contact Link'] || lead.crmContactLink;
      const statusMatch = ['warm', 'hot', 'not interested'].includes(status);
      const noCrmLink = !crmLink || crmLink === '';
      return statusMatch && noCrmLink;
    });
    console.log(`  - Leads matching BOTH conditions: ${both.length}`);
  }
})();
