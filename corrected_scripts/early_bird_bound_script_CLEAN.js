/**
 * FORM-BOUND Google Apps Script for early_bird form
 * DIRECT MASTER SHEET INTEGRATION - NO WEBHOOK
 *
 * Form ID: 1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY
 * To be deployed: Paste this script into the form's bound script editor
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const FORM_SOURCE_TAG = 'early_bird';
const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
const SHEET_NAME = 'Sheet1';

// Service account key (Base64 encoded)
const SERVICE_ACCOUNT_KEY = `ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAic2hlZXRzLWFuZC1weXRob24tMzQwNzExIiwKICAicHJpdmF0ZV9rZXlfaWQiOiAiZWE3NzNlZWRjZGNjNDI5MmE5NzY3NDJmYzE1YWNiNDE5OWJiYzc5NyIsCiAgInByaXZhdGVfa2V5IjogIi0tLS0tQkVHSU4gUFJJVkFURSBLRVktLS0tLVxuTUlJRXZnSUJBREFOQmdrcWhraUc5dzBCQVFFRkFBU0NCS2d3Z2dTa0FnRUFBb0lCQVFERHIvSmNmQzVvSTNPUVxuSGpHVmJIblBOSlJEUFhqNE5UVkprM2xGb1g0ZVRmTHB2K1g4T01NYmpUYUptNHZJWHEyWmdRRUZtMVg1dk1QK1xuMVBNaUF3UkFMdXBzRW05YTZ5ZjZYcjFRRGczUjBxSDcrMmVTbXlzQ3hwdkg1S1BQK1JRMnBaTFV1QnJkNXpmRFxuNlhaN0E1NjZySlN0eWNTbXptL1VKU2FBeGppUFcrUk1VNzE3ZGtCQ3lUZG9KZE5sMHA1VUFzcjBzNXZoQVJNR1xuZWx2N0Q0bmNybTNKdVhOOHlSSTl1ZitXZGxMWmNjbk5IQVBIK1FYUnpKUitIWUkzZmVJM0ZydXU0bFdva2JZaVxuZXJoZS9zQ08yWDBPeGVSb1VvQW05V0h6R09nT1l3Yk9aQnRNV29zN3FkZk0rbkIyaFlCY1pqQVdxTUNZVUQ0VVxuV0xGS3ZxZGJBZ01CQUFFQ2dnRUJBTEI2K0F2eTNuTG9EZnZtQ21HMHEvUVVLMjdPTWtOYnFvb0ljWXBsVzUrN1xuZlVzSEd6aFNwekhFc1RFOHF0OWx0cWRoWW1PV0JGZXhWSkdCbGR6R3lGU0p1M2FlZ0MrUGcwUFlWaERseVR3VFxuOSsrN3JmeXB5Um5zZjZab2RoVGRsVzhsbVpscFU4K0QveE1lZ1NKbENnUUQrKzRzTVZhQ01rR1NkOFZuZUFKMlxucGppRWlDMjNsUE9qK0JrY2VQOGdlNTJHL3VTMmlGazJKZ0VGZVBETVJPUGRmL08xTU01cVhFYWlhTCtLeVozOVxuOXVZMFZqeTNjN29YL1dMYnFPMjlQSGhFa1kwVmpWRlRDcFhIdHpzN28wb05vcU80YXNQZnB4S2JSQXE1TmxMUlxubVNmSTNQNjMrc2NXNFJUYVg2UWZmS2hZSTZHSklnWDJrWUIyYUEwQ2dZRUEzWUNnOGt1ZTJYTFhiYmNVNnc0cVxuM2RUTHVGdjhvTGR1aGYyc0Z6NFdVWFZ5TWVMWTg4a2cvMUhJYVBjaHdKeFpGRWg5N3F1bGhGbXo1c3ZpbVJNUlxub21JdkNSb3hVclFvbWd2RVdKUU9vZmJ1aUVkZ3Znbi8yQWNkMDlPcnBNdURhVFJHWStRVWYwMHlOODEwSkQ5SFxueVhMQkVCZ3JqaE1oWjA5UVREQ25XTUV1Y3NDbUtnWUVBeHFSUWExcGdYRThJeTR1OGJrN25pNWVLZ2ZsVDFjSFxuWnhFN1hsODU2UXlQNE9tSERYaTAwVVlGN3dEWWdYWHN4dE1zeXJOQXJsbERZN01qMGZ5TlUzSm1GWk55eEEyTVxubXNLMDZzajJFSGlteWVWQWVuc0xJSGpMTWJZelVrNlRNcUcyMlJIZ2dITzJ0R0J0QnZOczB3VytFY3VGTENXQlxuVXNMWXRva0NnWUVBeEFBc1ZkR2FXV0YyVXNhTFI1NmpBRjMvSFN6T1NCa0Y1aStKd1NhOER2SkdkVkpGV3FwdFxuU3N2VnBnVVhVVFlYUlk1ZmVneDNWMTdCOXpJUGYzQUF1eXVNNFdtQmVaVGplQWpmQi9Zby9NVk5Yb3hOS3pPKVxuZURhMG9ybk5EbDNwRlp0ak0rY1R5L21meWNWRkJVYTdsbFJHU2tRZGVVWnVGMGJwZGVWUi9FQ2dZRUF2WGJJRlxudU1RKzNzVDJKeDQ1TGE4TjBLWDlBeGpURlRsWmJLNUFRSVRyUmE0UElIUFBOeC9JcEF4TjlOZ1pVSkpCeFY5ZlxuNUl1Z0M3UVovaDJmcDQ4cDlPRkFjSzM3MjlFZ0pVYktCNGxMWmlBS0g5ZUNaQnZOWG14ZldqQnNnMTNzTmFmTVxuL3R5WmJqS3UrdC9YZzNiQVdLUHozZCtqZCtMeGR3UzU5aGRSa3ZrcUpDYUJnUUNWZlZJOGhHMkN4SEhldUwrelxuSWZXeHIyZmllUjRLWTY5WUphT2NwSkZHdVBaUFJtblRKYXN3ZW1TYUp2QlAyMWJIQ2VRS1dSSE5WUVNXL0tMUFxucFBQaGh6OTBWQU5rOVY4SjBGMlBuRW9FT3Y4ams0M0M5Uy9TTUROY1Q4Y1lQTE8rb1ZOVVMyUmo1WUV1OThKWlxuNkhpZjRxaVQ2L1RJcFY5SkpSRG5yN2pQZlE9PVxuLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLVxuIiwKICAiY2xpZW50X2VtYWlsIjogInNoZWV0c3B5dGhvbkBzaGVldHMtYW5kLXB5dGhvbi0zNDA3MTEuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJjbGllbnRfaWQiOiAiMTA4NDg4NzUxNzk4NDgxMDE0MDU3IiwKICAiYXV0aF91cmkiOiAiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGgiLAogICJ0b2tlbl91cmkiOiAiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLAogICJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YxL2NlcnRzIiwKICAiY2xpZW50X3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vcm9ib3QvdjEvbWV0YWRhdGEveDUwOS9zaGVldHNweXRob24lNDBzaGVldHMtYW5kLXB5dGhvbi0zNDA3MTEuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJ1bml2ZXJzZV9kb21haW4iOiAiZ29vZ2xlYXBpcy5jb20iCn0=`;

// Email configuration
const EMAIL_CONFIG = {
  to: 'rajesh@genwise.in',
  subject: 'New Early Bird Form Submission'
};

// =============================================================================
// MAIN TRIGGER FUNCTION
// =============================================================================

function onFormSubmit(e) {
  console.log('📝 Early bird form submission detected');

  try {
    const form = FormApp.getActiveForm();
    const formResponse = e.response;
    const itemResponses = formResponse.getItemResponses();

    // Extract form data
    const formData = extractFormData(itemResponses);

    // Write to master sheet
    const writeResult = writeToMasterSheet(formData);

    // Send email notification
    sendEmailNotification(formData);

    console.log('✅ Early bird form processing complete');

  } catch (error) {
    console.error('❌ Error processing early bird form:', error);
    // Send error notification
    sendErrorNotification(error);
  }
}

// =============================================================================
// FORM DATA EXTRACTION
// =============================================================================

function extractFormData(itemResponses) {
  const formData = {};

  itemResponses.forEach(itemResponse => {
    const question = itemResponse.getItem().getTitle().toLowerCase();
    const answer = itemResponse.getResponse();

    // Map form questions to database fields - Debug logging
    console.log(`DEBUG: Processing question: "${question}" = "${answer}"`);

    if ((question.includes('child') || question.includes('student')) && question.includes('name')) {
      formData.child_name = answer;
      console.log(`DEBUG: Matched child_name: ${answer}`);
    } else if (question.includes('parent') && question.includes('name')) {
      formData.parent_name = answer;
    } else if (question.includes('email')) {
      formData.parent_email = answer;
    } else if (question.includes('mobile') || question.includes('phone') || question === 'parent mobile number') {
      formData.parent_mobile = answer;
    } else if (question.includes('early bird') || question.includes('discount') || question.includes('registration') || question.includes('interest') || question.includes('program') || question.includes('summer') || question.includes('sign up') || question.includes('enroll')) {
      // Map interest level for early bird registrations
      console.log(`DEBUG: Processing interest question: "${question}" = "${answer}"`);
      if (answer.toLowerCase().includes('register now') ||
          answer.toLowerCase().includes('secure spot') ||
          answer.toLowerCase().includes('definitely interested') ||
          answer.toLowerCase().includes('ready to sign up') ||
          answer.toLowerCase().includes('early bird enrollment')) {
        formData.interest_level = 'High';
        console.log(`DEBUG: Set interest_level to High`);
      } else if (answer.toLowerCase().includes('considering') ||
                 answer.toLowerCase().includes('learn more') ||
                 answer.toLowerCase().includes('maybe') ||
                 answer.toLowerCase().includes('speak to genwise team') ||
                 answer.toLowerCase().includes('resolve questions')) {
        formData.interest_level = 'Medium';
        console.log(`DEBUG: Set interest_level to Medium`);
      } else if (answer.toLowerCase().includes('not ready') ||
                 answer.toLowerCase().includes('too early') ||
                 answer.toLowerCase().includes('not interested')) {
        formData.interest_level = 'Low';
        console.log(`DEBUG: Set interest_level to Low`);
      } else {
        formData.interest_level = 'High'; // default for early bird (showing initiative)
        console.log(`DEBUG: Set interest_level to High (default)`);
      }
    }
  });

  // Add auto-generated fields
  formData.source_tag = FORM_SOURCE_TAG;
  formData.timestamp = new Date().toISOString();
  formData.status = 'First Call Pending';
  formData.assigned_owner = 'Unassigned';
  formData.notes = '';

  // Check for duplicates and set new/existing
  const isDuplicate = checkDuplicate(formData.parent_email);
  formData.duplicate_flag = isDuplicate ? 'Yes' : 'No';
  formData.new_existing = isDuplicate ? 'Existing Parent' : 'New Parent';

  return formData;
}

// =============================================================================
// MASTER SHEET OPERATIONS
// =============================================================================

function writeToMasterSheet(formData) {
  try {
    const sheet = SpreadsheetApp.openById(MASTER_SHEET_ID).getSheetByName(SHEET_NAME);

    // Prepare row data (columns 0-11)
    const rowData = [
      formData.child_name || '',      // 0: child_name
      formData.parent_name || '',     // 1: parent_name
      formData.parent_email || '',    // 2: parent_email
      formData.parent_mobile || '',   // 3: parent_mobile
      formData.new_existing || '',    // 4: new_existing
      formData.interest_level || '',  // 5: interest_level
      formData.source_tag || '',      // 6: source_tag
      formData.timestamp || '',       // 7: timestamp
      formData.duplicate_flag || '',  // 8: duplicate_flag
      formData.status || '',          // 9: status
      formData.assigned_owner || '',  // 10: assigned_owner
      formData.notes || ''            // 11: notes
    ];

    // Append to sheet
    sheet.appendRow(rowData);

    console.log(`✅ Data written to master sheet: ${formData.parent_email}`);
    return { success: true, rowData };

  } catch (error) {
    console.error('❌ Error writing to master sheet:', error);
    throw error;
  }
}

function checkDuplicate(email) {
  if (!email) return false;

  try {
    const sheet = SpreadsheetApp.openById(MASTER_SHEET_ID).getSheetByName(SHEET_NAME);
    const emailColumn = sheet.getRange('C:C').getValues(); // Column C = parent_email

    const normalizedEmail = email.toLowerCase().trim();

    for (let i = 1; i < emailColumn.length; i++) { // Skip header row
      if (emailColumn[i][0] &&
          emailColumn[i][0].toString().toLowerCase().trim() === normalizedEmail) {
        return true;
      }
    }

    return false;

  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
    return false; // Default to not duplicate if check fails
  }
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

function sendEmailNotification(formData) {
  try {
    const subject = `${EMAIL_CONFIG.subject} - ${formData.child_name}`;
    const body = `
New early bird form submission received:

Child Name: ${formData.child_name}
Parent Name: ${formData.parent_name}
Parent Email: ${formData.parent_email}
Parent Mobile: ${formData.parent_mobile}
Interest Level: ${formData.interest_level}
Source: ${formData.source_tag}
Duplicate: ${formData.duplicate_flag}
Status: ${formData.status}
Timestamp: ${formData.timestamp}

View master sheet: https://docs.google.com/spreadsheets/d/${MASTER_SHEET_ID}
    `;

    MailApp.sendEmail(EMAIL_CONFIG.to, subject, body);
    console.log('✅ Email notification sent');

  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

function sendErrorNotification(error) {
  try {
    const subject = 'Early Bird Form Script Error';
    const body = `
Error in early bird form processing:

Error: ${error.message}
Stack: ${error.stack}
Timestamp: ${new Date().toISOString()}

Please check the script and fix the issue.
    `;

    MailApp.sendEmail(EMAIL_CONFIG.to, subject, body);

  } catch (emailError) {
    console.error('❌ Error sending error notification:', emailError);
  }
}