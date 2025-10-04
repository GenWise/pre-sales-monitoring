/**
 * Phase 1: Clean Master Sheet - Delete all data, keep headers only
 * Master Sheet ID: 1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Configuration
const SPREADSHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
const SHEET_NAME = 'Sheet1';

// Correct column structure (indices 0-11)
const CORRECT_HEADERS = [
  'child_name',      // 0
  'parent_name',     // 1
  'parent_email',    // 2
  'parent_mobile',   // 3
  'new_existing',    // 4
  'interest_level',  // 5
  'source_tag',      // 6
  'timestamp',       // 7
  'duplicate_flag',  // 8
  'status',          // 9
  'assigned_owner',  // 10
  'notes'           // 11
];

async function cleanMasterSheet() {
  console.log('🧹 Phase 1: Starting Master Sheet Cleanup...\n');

  try {
    // Load credentials
    const keyPath = path.join(__dirname, 'credentials', 'service-account-key.json');
    if (!fs.existsSync(keyPath)) {
      throw new Error('Service account key not found at: ' + keyPath);
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Step 1: Get current sheet data to see how many rows to delete
    console.log('📊 Step 1: Checking current sheet data...');
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:L`
    });

    const currentData = getResponse.data.values || [];
    const totalRows = currentData.length;
    console.log(`   - Found ${totalRows} total rows (including header)`);
    console.log(`   - Will delete ${Math.max(0, totalRows - 1)} data rows\n`);

    // Step 2: Clear all data except header row
    if (totalRows > 1) {
      console.log('🗑️  Step 2: Deleting all data rows...');
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A2:L${totalRows}`
      });
      console.log('   ✅ All data rows deleted\n');
    } else {
      console.log('   ℹ️  No data rows to delete\n');
    }

    // Step 3: Set correct headers
    console.log('📝 Step 3: Setting correct headers...');
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:L1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [CORRECT_HEADERS]
      }
    });
    console.log('   ✅ Headers set correctly\n');

    // Step 4: Add data validation rules
    console.log('🔒 Step 4: Adding data validation dropdowns...');

    const requests = [
      // new_existing dropdown (Column E)
      {
        setDataValidation: {
          range: {
            sheetId: 0,
            startRowIndex: 1,
            startColumnIndex: 4,
            endColumnIndex: 5
          },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: [
                { userEnteredValue: 'New Parent' },
                { userEnteredValue: 'Existing Parent' }
              ]
            },
            showCustomUi: true,
            strict: true
          }
        }
      },
      // interest_level dropdown (Column F)
      {
        setDataValidation: {
          range: {
            sheetId: 0,
            startRowIndex: 1,
            startColumnIndex: 5,
            endColumnIndex: 6
          },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: [
                { userEnteredValue: 'High' },
                { userEnteredValue: 'Medium' },
                { userEnteredValue: 'Low' }
              ]
            },
            showCustomUi: true,
            strict: true
          }
        }
      },
      // source_tag dropdown (Column G)
      {
        setDataValidation: {
          range: {
            sheetId: 0,
            startRowIndex: 1,
            startColumnIndex: 6,
            endColumnIndex: 7
          },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: [
                { userEnteredValue: 'returning_students' },
                { userEnteredValue: 'ats_qualifiers' },
                { userEnteredValue: 'website' },
                { userEnteredValue: 'early_bird' }
              ]
            },
            showCustomUi: true,
            strict: true
          }
        }
      },
      // duplicate_flag dropdown (Column I)
      {
        setDataValidation: {
          range: {
            sheetId: 0,
            startRowIndex: 1,
            startColumnIndex: 8,
            endColumnIndex: 9
          },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: [
                { userEnteredValue: 'Yes' },
                { userEnteredValue: 'No' }
              ]
            },
            showCustomUi: true,
            strict: true
          }
        }
      },
      // status dropdown (Column J)
      {
        setDataValidation: {
          range: {
            sheetId: 0,
            startRowIndex: 1,
            startColumnIndex: 9,
            endColumnIndex: 10
          },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: [
                { userEnteredValue: 'First Call Pending' },
                { userEnteredValue: 'Warm' },
                { userEnteredValue: 'Hot' },
                { userEnteredValue: 'Not Interested' }
              ]
            },
            showCustomUi: true,
            strict: true
          }
        }
      },
      // assigned_owner dropdown (Column K)
      {
        setDataValidation: {
          range: {
            sheetId: 0,
            startRowIndex: 1,
            startColumnIndex: 10,
            endColumnIndex: 11
          },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: [
                { userEnteredValue: 'Unassigned' },
                { userEnteredValue: 'Kevin' },
                { userEnteredValue: 'Agnes' },
                { userEnteredValue: 'Eklavya' },
                { userEnteredValue: 'Ashish' }
              ]
            },
            showCustomUi: true,
            strict: true
          }
        }
      }
    ];

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests }
    });
    console.log('   ✅ Data validation dropdowns added\n');

    // Step 5: Verify clean state
    console.log('✅ Step 5: Verifying clean sheet state...');
    const verifyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:L2`
    });

    const finalData = verifyResponse.data.values || [];
    console.log('   - Headers:', finalData[0] || 'No headers');
    console.log('   - Data rows:', finalData.length - 1);
    console.log('   - Sheet is clean and ready for data pipeline!\n');

    console.log('🎉 PHASE 1 COMPLETE!');
    console.log('====================');
    console.log('✅ Master sheet cleaned');
    console.log('✅ Correct column structure implemented');
    console.log('✅ Data validation dropdowns added');
    console.log('✅ Sheet ready for clean data pipeline');
    console.log('\n📋 Next: Phase 2 - Deploy form scripts');

  } catch (error) {
    console.error('❌ Error cleaning master sheet:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the cleanup
cleanMasterSheet();