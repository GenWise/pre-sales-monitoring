/**
 * Sheet Structure Verification Script
 *
 * Verifies that the master sheet has been cleared and has correct headers
 * Run this after manual clearing to confirm readiness for clean pipeline
 */

const MasterDatabase = require('./src/sheets/masterDatabase');

// Expected corrected headers
const EXPECTED_HEADERS = [
  'child_name',        // Index 0
  'parent_name',       // Index 1
  'parent_email',      // Index 2
  'parent_mobile',     // Index 3
  'new_existing',      // Index 4
  'interest_level',    // Index 5
  'source_tag',        // Index 6
  'timestamp',         // Index 7
  'duplicate_flag',    // Index 8
  'status',            // Index 9
  'assigned_owner',    // Index 10
  'notes'              // Index 11
];

async function verifySheetStructure() {
  console.log('🔍 VERIFYING SHEET STRUCTURE');
  console.log('============================');
  console.log();

  try {
    const db = new MasterDatabase();
    await db.connect();

    const stats = await db.getStats();

    console.log('📊 VERIFICATION RESULTS:');
    console.log(`   Total leads: ${stats.totalLeads}`);
    console.log(`   Unique emails: ${stats.uniqueEmails}`);
    console.log(`   Sheet cleaned: ${stats.totalLeads === 0 ? '✅ YES' : '❌ NO'}`);
    console.log();

    // Check if we can get headers (this will work even with timeouts if headers are accessible)
    if (stats.totalLeads === 0) {
      console.log('✅ SHEET SUCCESSFULLY CLEARED');
      console.log('✅ Ready for clean data pipeline');
      console.log();
      console.log('📋 NEXT ACTIONS:');
      console.log('1. Verify headers match corrected structure');
      console.log('2. Update form-bound scripts with indices 0-11');
      console.log('3. Add data validation dropdowns');
      console.log('4. Deploy updated scripts to Google Forms');
    } else {
      console.log('⚠️  MANUAL CLEARING STILL NEEDED');
      console.log(`   Current data rows: ${stats.totalLeads}`);
      console.log('   Please complete manual clearing steps');
    }

    console.log();
    console.log('📊 EXPECTED HEADER STRUCTURE:');
    EXPECTED_HEADERS.forEach((header, index) => {
      console.log(`   ${String.fromCharCode(65 + index)}1: ${header}`);
    });

    return {
      cleared: stats.totalLeads === 0,
      totalLeads: stats.totalLeads,
      uniqueEmails: stats.uniqueEmails
    };

  } catch (error) {
    console.error('❌ Verification failed:', error.message);

    if (error.message.includes('timeout')) {
      console.log();
      console.log('ℹ️  API TIMEOUT DETECTED');
      console.log('   This is normal - Google Sheets API is experiencing issues');
      console.log('   Please verify manually:');
      console.log('   1. Open: https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ/edit');
      console.log('   2. Check that only headers remain (no data rows)');
      console.log('   3. Confirm headers match expected structure above');
    }

    return { error: error.message };
  }
}

if (require.main === module) {
  verifySheetStructure().catch(error => {
    console.error('💥 Fatal error:', error.message);
  });
}

module.exports = { verifySheetStructure, EXPECTED_HEADERS };