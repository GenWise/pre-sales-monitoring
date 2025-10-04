/**
 * Manual Sheet Reset Script
 *
 * Pragmatic approach using existing MasterDatabase infrastructure
 * Since we have successful backups, this script provides instructions
 * for manual clearing via web interface and sets up corrected headers
 */

const MasterDatabase = require('./src/sheets/masterDatabase');

async function manualSheetReset() {
  console.log('🔧 MANUAL SHEET RESET APPROACH');
  console.log('===============================');
  console.log();
  console.log('✅ Data Backups Available:');
  console.log('   - backups/master_sheet_backup_2025-10-02T05-33-02-206Z.json (41 rows)');
  console.log('   - backups/master_sheet_backup_2025-10-02T05-33-28-067Z.json (41 rows)');
  console.log();

  console.log('📋 MANUAL STEPS REQUIRED:');
  console.log('1. Open Master Sheet: https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ/edit');
  console.log('2. Select all data rows (rows 2-42)');
  console.log('3. Right-click → Delete rows 2-42');
  console.log('4. Update headers to corrected structure');
  console.log();

  console.log('📊 CORRECTED HEADER STRUCTURE:');
  const correctedHeaders = [
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

  correctedHeaders.forEach((header, index) => {
    console.log(`   ${String.fromCharCode(65 + index)}1: ${header}`);
  });

  console.log();
  console.log('🔬 VERIFICATION SCRIPT:');
  console.log('After manual clearing, run: node verify_sheet_structure.js');
  console.log();

  // Test connection to ensure infrastructure is working
  console.log('🧪 Testing Database Connection...');
  try {
    const db = new MasterDatabase();
    await db.connect();

    const stats = await db.getStats();
    console.log('✅ Database connection successful');
    console.log(`📊 Current stats: ${stats.totalLeads} leads, ${stats.uniqueEmails} unique emails`);

    if (stats.totalLeads === 0) {
      console.log('🎉 Sheet already cleared successfully!');
      console.log('✅ Ready for corrected header structure');
    } else {
      console.log('⚠️  Sheet still contains data - manual clearing needed');
    }

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('ℹ️  Manual approach required due to API issues');
  }

  console.log();
  console.log('🚀 NEXT STEPS AFTER MANUAL CLEARING:');
  console.log('1. Update form-bound scripts with correct column indices');
  console.log('2. Add data validation dropdowns');
  console.log('3. Deploy updated scripts to Google Forms');
  console.log('4. Test form submissions with clean data');
}

if (require.main === module) {
  manualSheetReset().catch(error => {
    console.error('💥 Error:', error.message);
  });
}

module.exports = { manualSheetReset };