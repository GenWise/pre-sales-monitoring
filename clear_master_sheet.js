/**
 * Master Sheet Data Clearing Script
 *
 * CRITICAL OPERATION: Backs up existing data then clears all entries
 * Implements CLEAN SLATE APPROACH as per REVISED TIGHT IMPLEMENTATION PLAN
 *
 * Usage: node clear_master_sheet.js
 *
 * Steps:
 * 1. Export existing data to backup file with timestamp
 * 2. Clear all data rows (keep headers only)
 * 3. Verify empty sheet ready for clean pipeline
 */

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Configuration
const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
const SERVICE_ACCOUNT_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || './credentials/service-account-key.json';
const BACKUP_DIR = './backups';

// Expected column headers after clearing (corrected structure)
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

class MasterSheetCleaner {
  constructor() {
    this.doc = null;
  }

  async initialize() {
    console.log('🔐 Authenticating with Google Sheets...');

    try {
      // Set up JWT authentication
      const serviceAccountAuth = new JWT({
        keyFile: SERVICE_ACCOUNT_FILE,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive',
        ],
      });

      // Connect to the document
      this.doc = new GoogleSpreadsheet(MASTER_SHEET_ID, serviceAccountAuth);
      await this.doc.loadInfo();

      console.log(`✅ Connected to sheet: ${this.doc.title}`);
      console.log(`📊 Sheet count: ${this.doc.sheetCount}`);

      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      return false;
    }
  }

  async backupExistingData() {
    console.log('💾 Backing up existing data...');

    try {
      const sheet = this.doc.sheetsByIndex[0];
      await sheet.loadHeaderRow();
      const rows = await sheet.getRows();

      console.log(`📋 Found ${rows.length} data rows to backup`);
      console.log(`📋 Current headers: ${sheet.headerValues.join(', ')}`);

      // Create backup directory if it doesn't exist
      try {
        await fs.mkdir(BACKUP_DIR, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      // Prepare backup data
      const backupData = {
        metadata: {
          backupTimestamp: new Date().toISOString(),
          originalSheetId: MASTER_SHEET_ID,
          originalSheetTitle: this.doc.title,
          originalSheetName: sheet.title,
          originalHeaders: sheet.headerValues,
          totalRows: rows.length,
          reason: 'Pre-cleanup backup for CLEAN SLATE implementation'
        },
        headers: sheet.headerValues,
        data: []
      };

      // Extract all row data
      rows.forEach((row, index) => {
        const rowData = {};
        sheet.headerValues.forEach(header => {
          rowData[header] = row[header] || '';
        });
        backupData.data.push({
          rowIndex: index + 2, // Google Sheets row numbers start at 1, headers at 1, data at 2
          data: rowData
        });
      });

      // Save backup file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `master_sheet_backup_${timestamp}.json`;
      const backupPath = path.join(BACKUP_DIR, backupFilename);

      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

      console.log(`✅ Backup saved: ${backupPath}`);
      console.log(`📊 Backed up ${backupData.data.length} rows`);

      return { success: true, backupPath, rowCount: backupData.data.length };

    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async clearDataRows() {
    console.log('🧹 Clearing all data rows (keeping headers)...');

    try {
      const sheet = this.doc.sheetsByIndex[0];
      await sheet.loadHeaderRow();
      const rows = await sheet.getRows();
      const originalRowCount = rows.length;

      console.log(`🗑️ Clearing ${originalRowCount} data rows using efficient clear method...`);

      // Get sheet dimensions
      const rowCount = sheet.rowCount;
      const colCount = sheet.columnCount;

      if (originalRowCount > 0) {
        // Clear all data (rows 2 onwards) while keeping headers (row 1)
        const clearRange = `A2:${String.fromCharCode(64 + colCount)}${rowCount}`;
        console.log(`   Clearing range: ${clearRange}`);

        await sheet.clear(clearRange);
        console.log('✅ All data rows cleared efficiently');
      } else {
        console.log('ℹ️ No data rows to clear');
      }

      // Update headers to corrected structure
      await sheet.setHeaderRow(EXPECTED_HEADERS);
      console.log('✅ Headers updated to corrected structure');
      console.log(`📋 New headers: ${EXPECTED_HEADERS.join(', ')}`);

      return { success: true, clearedRows: originalRowCount };

    } catch (error) {
      console.error('❌ Clear operation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async verifyEmptySheet() {
    console.log('🔍 Verifying empty sheet...');

    try {
      const sheet = this.doc.sheetsByIndex[0];
      await sheet.loadHeaderRow();
      const rows = await sheet.getRows();

      const verification = {
        headerCount: sheet.headerValues.length,
        headers: sheet.headerValues,
        dataRowCount: rows.length,
        headersMatch: JSON.stringify(sheet.headerValues) === JSON.stringify(EXPECTED_HEADERS),
        isEmpty: rows.length === 0
      };

      console.log('📊 Verification Results:');
      console.log(`  Headers: ${verification.headerCount} (expected: ${EXPECTED_HEADERS.length})`);
      console.log(`  Data rows: ${verification.dataRowCount} (expected: 0)`);
      console.log(`  Headers match: ${verification.headersMatch ? '✅' : '❌'}`);
      console.log(`  Sheet empty: ${verification.isEmpty ? '✅' : '❌'}`);

      if (!verification.headersMatch) {
        console.log('❌ Header mismatch:');
        console.log(`  Current: ${verification.headers.join(', ')}`);
        console.log(`  Expected: ${EXPECTED_HEADERS.join(', ')}`);
      }

      return verification;

    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async run() {
    console.log('🚀 Starting Master Sheet Cleaning Process...');
    console.log('📋 CLEAN SLATE APPROACH - Backing up and clearing all data');
    console.log();

    // Step 1: Initialize connection
    const connected = await this.initialize();
    if (!connected) {
      process.exit(1);
    }

    // Step 2: Backup existing data
    console.log();
    const backup = await this.backupExistingData();
    if (!backup.success) {
      console.error('❌ Cannot proceed without successful backup');
      process.exit(1);
    }

    // Step 3: Clear data rows
    console.log();
    const clearing = await this.clearDataRows();
    if (!clearing.success) {
      console.error('❌ Data clearing failed');
      process.exit(1);
    }

    // Step 4: Verify empty sheet
    console.log();
    const verification = await this.verifyEmptySheet();

    // Final report
    console.log();
    console.log('🎉 MASTER SHEET CLEANING COMPLETE');
    console.log('=====================================');
    console.log(`✅ Backup saved: ${backup.backupPath}`);
    console.log(`✅ Cleared ${clearing.clearedRows} data rows`);
    console.log(`✅ Headers set to corrected structure (${EXPECTED_HEADERS.length} columns)`);
    console.log(`✅ Sheet ready for clean data pipeline`);
    console.log();
    console.log('Next steps:');
    console.log('1. Update form-bound scripts with correct column indices (0-11)');
    console.log('2. Add data validation dropdowns');
    console.log('3. Deploy updated scripts to Google Forms');
    console.log('4. Test form submissions with clean data');

    return {
      success: true,
      backup,
      clearing,
      verification
    };
  }
}

// Execute if run directly
if (require.main === module) {
  const cleaner = new MasterSheetCleaner();
  cleaner.run().catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = MasterSheetCleaner;