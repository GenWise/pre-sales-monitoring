/**
 * Master Sheet Within-Sheet Duplicate Detection
 * Automatically flags duplicate parent emails within the master sheet
 *
 * SETUP INSTRUCTIONS:
 * 1. Open Master Sheet: https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ
 * 2. Go to Extensions → Apps Script
 * 3. Create new file: masterSheetDuplicateDetection.gs
 * 4. Paste this code
 * 5. Run setupDuplicateDetection() function once
 * 6. Authorize when prompted
 */

// Configuration
const DUPLICATE_CONFIG = {
  // Column indices (0-based)
  PARENT_EMAIL_COL: 2,    // Column C (parent_email)
  DUPLICATE_FLAG_COL: 8,  // Column I (duplicate_flag)

  // Header row
  HEADER_ROW: 1,

  // Values
  DUPLICATE_YES: 'Yes',
  DUPLICATE_NO: 'No'
};

/**
 * Main onEdit trigger - fires when any cell is edited
 */
function onSheetEdit(e) {
  try {
    if (!e || !e.range) {
      return;
    }

    const sheet = e.range.getSheet();
    const editedRow = e.range.getRow();
    const editedCol = e.range.getColumn();

    // Only process if parent_email column was edited (Column C = index 3)
    if (editedCol !== DUPLICATE_CONFIG.PARENT_EMAIL_COL + 1) {
      return;
    }

    // Skip header row
    if (editedRow <= DUPLICATE_CONFIG.HEADER_ROW) {
      return;
    }

    console.log(`Email edited in row ${editedRow}, checking for duplicates...`);

    // Run full duplicate check
    checkAllDuplicates(sheet);

  } catch (error) {
    console.error('Error in onSheetEdit:', error.toString());
  }
}

/**
 * Check all rows for duplicate emails and flag accordingly
 * LOGIC: First occurrence = No, subsequent occurrences = Yes
 */
function checkAllDuplicates(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow <= DUPLICATE_CONFIG.HEADER_ROW) {
    console.log('No data rows to check');
    return;
  }

  // Get all emails and duplicate flags
  const emailRange = sheet.getRange(
    DUPLICATE_CONFIG.HEADER_ROW + 1,
    DUPLICATE_CONFIG.PARENT_EMAIL_COL + 1,
    lastRow - DUPLICATE_CONFIG.HEADER_ROW,
    1
  );
  const emails = emailRange.getValues().map(row => row[0]);

  const flagRange = sheet.getRange(
    DUPLICATE_CONFIG.HEADER_ROW + 1,
    DUPLICATE_CONFIG.DUPLICATE_FLAG_COL + 1,
    lastRow - DUPLICATE_CONFIG.HEADER_ROW,
    1
  );
  const flags = flagRange.getValues();

  // Track first occurrence of each email
  const emailFirstOccurrence = {};
  const updates = [];

  emails.forEach((email, index) => {
    const cleanEmail = (email || '').toString().trim().toLowerCase();

    if (!cleanEmail || cleanEmail === '') {
      // Empty email - set to No
      updates.push([DUPLICATE_CONFIG.DUPLICATE_NO]);
      return;
    }

    if (emailFirstOccurrence[cleanEmail] === undefined) {
      // First occurrence - set to No
      emailFirstOccurrence[cleanEmail] = index;
      updates.push([DUPLICATE_CONFIG.DUPLICATE_NO]);
    } else {
      // Duplicate - set to Yes
      updates.push([DUPLICATE_CONFIG.DUPLICATE_YES]);
    }
  });

  // Batch update all flags
  flagRange.setValues(updates);

  const duplicateCount = updates.filter(row => row[0] === DUPLICATE_CONFIG.DUPLICATE_YES).length;
  console.log(`✅ Duplicate check complete: ${duplicateCount} duplicates flagged`);

  return duplicateCount;
}

/**
 * Manual function to run full duplicate check on entire sheet
 * Useful for initial setup or data cleanup
 */
function runFullDuplicateCheck() {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const duplicateCount = checkAllDuplicates(sheet);

    Browser.msgBox(
      'Duplicate Check Complete',
      `✅ Checked all rows.\n\n${duplicateCount} duplicate emails flagged.`,
      Browser.Buttons.OK
    );

  } catch (error) {
    console.error('Error in runFullDuplicateCheck:', error.toString());
    Browser.msgBox('Error', 'Failed to check duplicates: ' + error.toString(), Browser.Buttons.OK);
  }
}

/**
 * Setup onEdit trigger
 * Run this function ONCE to install the trigger
 */
function setupDuplicateDetection() {
  try {
    // Delete existing onEdit triggers for this function to avoid duplicates
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onSheetEdit') {
        ScriptApp.deleteTrigger(trigger);
        console.log('Deleted existing onEdit trigger');
      }
    });

    // Create new onEdit trigger
    const spreadsheet = SpreadsheetApp.getActive();

    ScriptApp.newTrigger('onSheetEdit')
      .forSpreadsheet(spreadsheet)
      .onEdit()
      .create();

    console.log('✅ onEdit trigger created successfully');

    // Run initial duplicate check
    const sheet = spreadsheet.getActiveSheet();
    const duplicateCount = checkAllDuplicates(sheet);

    Browser.msgBox(
      'Setup Complete',
      `✅ Duplicate detection trigger installed!\n\n` +
      `Initial scan found ${duplicateCount} duplicate emails.\n\n` +
      `The system will now automatically flag duplicates when parent_email is edited.`,
      Browser.Buttons.OK
    );

    return { success: true, duplicatesFound: duplicateCount };

  } catch (error) {
    console.error('❌ Error setting up duplicate detection:', error.toString());
    Browser.msgBox('Error', 'Failed to setup: ' + error.toString(), Browser.Buttons.OK);
    return { success: false, error: error.toString() };
  }
}

/**
 * Remove onEdit trigger
 */
function removeDuplicateDetection() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;

    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onSheetEdit') {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
      }
    });

    console.log(`✅ Removed ${deletedCount} onEdit trigger(s)`);
    Browser.msgBox('Trigger Removed', `Removed ${deletedCount} duplicate detection trigger(s)`, Browser.Buttons.OK);

    return { success: true, deletedCount: deletedCount };

  } catch (error) {
    console.error('❌ Error removing trigger:', error.toString());
    Browser.msgBox('Error', 'Failed to remove trigger: ' + error.toString(), Browser.Buttons.OK);
    return { success: false, error: error.toString() };
  }
}
