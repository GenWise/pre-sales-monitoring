#!/usr/bin/env node

const FreshSalesSync = require('./src/api/freshsalesSync');
const path = require('path');

(async () => {
  const sync = new FreshSalesSync({
    masterSheetId: '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ',
    serviceAccountFile: path.join(__dirname, 'credentials', 'service-account-key.json')
  });

  console.log('=== TIME FILTER DEBUG ===\n');

  // Load sync-eligible leads WITHOUT time filter
  console.log('Test 1: No time filter');
  const noTimeFilter = await sync.loadLeadsFromMasterDatabase({ syncEligibleOnly: true });
  console.log(`Found: ${noTimeFilter.length} leads`);

  if (noTimeFilter.length > 0) {
    console.log('\nTimestamps:');
    noTimeFilter.slice(0, 3).forEach((lead, i) => {
      const timestamp = lead.Timestamp || lead.timestamp;
      console.log(`  [${i+1}] ${timestamp}`);
    });
  }

  // Load with 24 hour filter (production default)
  const sinceDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  console.log(`\nTest 2: With 24-hour filter (since ${sinceDate.toISOString()})`);
  const with24HourFilter = await sync.loadLeadsFromMasterDatabase({
    syncEligibleOnly: true,
    since: sinceDate
  });
  console.log(`Found: ${with24HourFilter.length} leads`);

  if (with24HourFilter.length === 0) {
    console.log('\n❌ TIME FILTER IS REMOVING ALL LEADS!');
    console.log('Most recent lead timestamps:');
    noTimeFilter.slice(0, 3).forEach((lead, i) => {
      const timestamp = new Date(lead.Timestamp || lead.timestamp);
      const hoursSinceNow = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
      console.log(`  [${i+1}] ${timestamp.toISOString()} (${Math.round(hoursSinceNow)} hours ago)`);
    });
  }

  // Load with 7 day filter
  const since7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  console.log(`\nTest 3: With 7-day filter (since ${since7Days.toISOString()})`);
  const with7DayFilter = await sync.loadLeadsFromMasterDatabase({
    syncEligibleOnly: true,
    since: since7Days
  });
  console.log(`Found: ${with7DayFilter.length} leads`);
})();
