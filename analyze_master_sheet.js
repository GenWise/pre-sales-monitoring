const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const credentials = require('./credentials/service-account-key.json');

async function checkMasterSheetIssues() {
  try {
    const serviceAccountAuth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet('1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ', serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow();

    // Get all rows to check for issues
    const rows = await sheet.getRows();
    console.log('Total rows in master sheet:', rows.length);

    // Check for data quality issues
    let emailInWrongColumn = 0;
    let mobileInWrongColumn = 0;
    let emptyRequiredFields = 0;
    let invalidSourceTags = 0;

    console.log('\n=== DATA QUALITY ANALYSIS ===');

    rows.forEach((row, index) => {
      const childName = row.get('Child Name') || '';
      const parentName = row.get('Parent Name') || '';
      const parentEmail = row.get('Parent Email') || '';
      const parentMobile = row.get('Parent Mobile') || '';
      const sourceTag = row.get('Source Tag') || '';

      // Check if email appears to be in wrong column
      if (parentEmail.includes('@') && parentMobile.includes('@')) {
        emailInWrongColumn++;
      }

      // Check if mobile appears to be in wrong column
      if (parentEmail.match(/^\d+$/)) {
        mobileInWrongColumn++;
      }

      // Check for empty required fields
      if (!childName || !parentName) {
        emptyRequiredFields++;
      }

      // Check for invalid source tags
      const validSourceTags = ['returning_students', 'ats_qualifiers', 'website', 'early_bird', 'Form1', 'Form2', 'Form3', 'Form4'];
      if (sourceTag && !validSourceTags.includes(sourceTag)) {
        invalidSourceTags++;
      }
    });

    console.log('Emails in wrong column:', emailInWrongColumn);
    console.log('Mobile numbers in wrong column:', mobileInWrongColumn);
    console.log('Rows with empty required fields:', emptyRequiredFields);
    console.log('Invalid source tags:', invalidSourceTags);

    // Show last 3 rows to see most recent data
    console.log('\n=== LAST 3 ROWS (Most Recent Data) ===');
    const lastRows = rows.slice(-3);
    lastRows.forEach((row, index) => {
      console.log(`Row ${rows.length - 2 + index}:`);
      sheet.headerValues.forEach(header => {
        console.log(`  ${header}: '${row.get(header) || ''}'`);
      });
      console.log('---');
    });

    // Check for any data that looks suspicious
    console.log('\n=== CHECKING FOR SUSPICIOUS DATA ===');
    rows.forEach((row, index) => {
      const parentEmail = row.get('Parent Email') || '';
      const parentMobile = row.get('Parent Mobile') || '';
      const childName = row.get('Child Name') || '';

      // Look for signs of column misalignment
      if (parentEmail.match(/^\d{10}$/)) {
        console.log(`ROW ${index + 1}: Email field contains phone number: ${parentEmail}`);
      }

      if (parentMobile.includes('@')) {
        console.log(`ROW ${index + 1}: Mobile field contains email: ${parentMobile}`);
      }

      if (childName.includes('@')) {
        console.log(`ROW ${index + 1}: Child name field contains email: ${childName}`);
      }
    });

  } catch (error) {
    console.error('Error analyzing master sheet:', error.message);
  }
}

checkMasterSheetIssues();