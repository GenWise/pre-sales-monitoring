# Google Apps Script Deployment Instructions

## Overview
This guide explains how to set up Google Apps Script triggers to automatically sync form submissions to your master Google Sheet.

**Master Sheet ID**: `1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ`

## Current Status
- ✅ returning_students filled out (needs automation setup)
- ❌ ats_qualifiers, website, early_bird (need automation setup)

---

## Part 1: Deploy Script for returning_students

### returning_students Details
- **Form ID**: `1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA`
- **Source Tag**: `returning_students`
- **Form URL**: https://docs.google.com/forms/d/1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA

### Step-by-Step Deployment for returning_students

#### Step 1: Open Google Apps Script
1. Go to [script.google.com](https://script.google.com)
2. Click **"New Project"**
3. Rename the project to: `returning_students-MasterSheet-Integration`

#### Step 2: Replace Default Code
1. Delete all existing code in the editor
2. Copy the entire contents of `/Users/rajeshpanchanathan/code/pre-sales-monitoring/scripts/gas/directSheetsIntegration.gs`
3. Paste it into the Google Apps Script editor

#### Step 3: Configure the Script
1. Find these lines at the top of the script:
   ```javascript
   const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
   const FORM_SOURCE_TAG = 'returning_students';
   ```
2. Verify they are correct (they should be for returning_students)

#### Step 4: Save and Authorize
1. Click **Save** (Ctrl+S)
2. When prompted, give the project a name: `returning_students-MasterSheet-Integration`
3. Click **Run** (on the `onFormSubmit` function) to authorize
4. Click **Review permissions**
5. Choose your Google account
6. Click **Advanced** → **Go to returning_students-MasterSheet-Integration (unsafe)**
7. Click **Allow**

#### Step 5: Connect to returning_students
1. In Google Apps Script, click **Deploy** → **New Deployment**
2. Choose **"Web app"** as the type
3. Set **Execute as**: "Me"
4. Set **Who has access**: "Anyone"
5. Click **Deploy**
6. Copy the Web App URL (you might need this later)

#### Step 6: Bind Script to returning_students
1. Open returning_students: https://docs.google.com/forms/d/1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA
2. Click the **three dots menu** (⋮) in the top right
3. Select **"Script editor"**
4. Delete any existing code
5. Paste the same script from Step 2
6. Make sure `FORM_SOURCE_TAG = 'returning_students'`
7. Click **Save**

#### Step 7: Set Up Form Submit Trigger
1. In the script editor (still bound to returning_students), click **Triggers** (clock icon) in the left sidebar
2. Click **"+ Add Trigger"**
3. Configure the trigger:
   - **Choose which function to run**: `onFormSubmit`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `From form`
   - **Select event type**: `On form submit`
4. Click **Save**

#### Step 8: Test the Integration
1. In the script editor, click **Run** on the `testIntegration` function
2. Check the **Execution log** for success messages
3. Verify a test row appears in your master sheet

#### Step 9: Process Existing returning_students Response
Since returning_students was already filled out, run this to catch the existing response:
1. In the script editor, click **Run** on the `processExistingResponses` function
2. This will process the existing form submission and add it to the master sheet

---

## Part 2: Deploy Scripts for Other Forms

### ats_qualifiers Deployment
**Form ID**: `1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ`

1. Follow Steps 1-8 above, but change:
   ```javascript
   const FORM_SOURCE_TAG = 'ats_qualifiers';
   ```
2. Form URL: https://docs.google.com/forms/d/1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ
3. Project name: `ats_qualifiers-MasterSheet-Integration`

### website Deployment
**Form ID**: `1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg`

1. Follow Steps 1-8 above, but change:
   ```javascript
   const FORM_SOURCE_TAG = 'website';
   ```
2. Form URL: https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg
3. Project name: `website-MasterSheet-Integration`

### early_bird Deployment
**Form ID**: `1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY`

1. Follow Steps 1-8 above, but change:
   ```javascript
   const FORM_SOURCE_TAG = 'early_bird';
   ```
2. Form URL: https://docs.google.com/forms/d/1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY
3. Project name: `early_bird-MasterSheet-Integration`

---

## Part 3: Verification and Testing

### Verify Trigger Setup
For each form, check that triggers are working:

1. Open the form-bound script
2. Go to **Triggers** in the left sidebar
3. You should see a trigger like:
   ```
   onFormSubmit | On form submit | Form | rajeshpanch@genwise.in
   ```

### Test Each Form
1. Submit a test response to each form
2. Check that new rows appear in the master sheet
3. Verify the **Source Tag** column shows the correct form (returning_students, ats_qualifiers, etc.)

### Check Master Sheet Structure
Your master sheet should have these columns:
- Child Name
- Parent Name
- Parent Email
- Parent Mobile
- Interest Level
- Source Tag
- Timestamp
- Duplicate Flag
- Status
- Assigned Owner
- Notes

---

## Part 4: Troubleshooting

### Common Issues and Solutions

#### Issue 1: "This script must be bound to a Google Form"
**Solution**: Make sure you're running the script from the form-bound editor, not a standalone project.

1. Open the Google Form
2. Click three dots → Script editor
3. Paste the script there
4. Set up triggers from that script editor

#### Issue 2: Trigger Not Firing
**Symptoms**: Form submissions don't appear in master sheet

**Solutions**:
1. **Check trigger exists**:
   - Go to script editor → Triggers
   - Ensure "On form submit" trigger exists for `onFormSubmit`

2. **Recreate trigger**:
   - Delete existing trigger
   - Run `setupTrigger()` function manually

3. **Check permissions**:
   - Re-run authorization process
   - Ensure script has permission to access Google Sheets

#### Issue 3: Permission Denied Errors
**Solution**:
1. In script editor, click **Run** on any function
2. Complete authorization process again
3. Ensure you grant all requested permissions

#### Issue 4: Data Not Appearing in Master Sheet
**Check these**:
1. **Verify Master Sheet ID**:
   ```javascript
   const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
   ```

2. **Check execution log**:
   - Script editor → Executions
   - Look for error messages

3. **Test manually**:
   - Run `testIntegration()` function
   - Should create a test row

#### Issue 5: Duplicate Detection Not Working
**Solution**:
1. Ensure email field mapping is correct
2. Check that the master sheet has the "Parent Email" column
3. Verify email data is being captured from forms

#### Issue 6: Wrong Source Tag
**Solution**:
1. Check `FORM_SOURCE_TAG` constant in each script
2. Should be: 'returning_students', 'ats_qualifiers', 'website', 'early_bird'
3. Make sure each form has its own script with correct tag

### Emergency Recovery

If automation completely fails, you can manually sync data:

1. **Process missed responses**:
   ```javascript
   // Run this in any form's script editor
   processExistingResponses(50); // Process last 50 responses
   ```

2. **Manual data entry**:
   - Check each form's response sheet
   - Manually copy missing data to master sheet

### Debug Functions

Use these functions in script editor for debugging:

1. **`getScriptInfo()`** - Shows current configuration
2. **`testIntegration()`** - Tests master sheet connection
3. **`processExistingResponses(10)`** - Processes last 10 responses

---

## Part 5: Monitoring and Maintenance

### Daily Checks
1. Verify new form submissions appear in master sheet
2. Check that Source Tag column is populated correctly
3. Monitor duplicate detection (Duplicate Flag column)

### Weekly Maintenance
1. Review script execution logs for errors
2. Test email notifications are working
3. Verify dashboard data is updating

### Monthly Tasks
1. Archive old form responses if needed
2. Review and update field mappings
3. Check for new form fields that need mapping

---

## Expected Results

After successful deployment:

1. **returning_students → Master Sheet**: ✅ Automatic sync working
2. **ats_qualifiers → Master Sheet**: ✅ Automatic sync working
3. **website → Master Sheet**: ✅ Automatic sync working
4. **early_bird → Master Sheet**: ✅ Automatic sync working
5. **Email Notifications**: ✅ Triggered by master sheet updates
6. **Dashboard Display**: ✅ Shows real-time data from master sheet

The complete workflow will be:
```
Form Submission → Google Apps Script → Master Sheet → Email Notifications → Dashboard
```

All forms will feed into the single master database with proper source tagging and duplicate detection.