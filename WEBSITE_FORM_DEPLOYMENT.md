# Website Form Script Deployment Instructions

## Form Details
- **Form Name**: Website Form
- **Form ID**: `1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg`
- **EDITOR ACCESS**: https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg/edit
- **RESPONDER LINK**: https://docs.google.com/forms/d/e/1FAIpQLScAEQXMJgbxWEl40xR3X1QgrvVZRphlbK4wzWXOnMxukAiXMw/viewform
- **Script File**: `/corrected_scripts/website_bound_script.js`

## Manual Deployment Steps

### 1. Open the Google Form
Go to: https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg/edit

### 2. Access Script Editor
1. Click the **three dots menu** (⋮) in the top-right
2. Select **"Script editor"** (or **"<> Script editor"**)
3. This opens the Apps Script editor for this form

### 3. Clear Existing Code
1. Delete ALL existing code in the editor
2. Make sure the editor is completely empty

### 4. Copy the Script
1. Open the file: `/corrected_scripts/website_bound_script.js`
2. Copy ALL the code (Cmd+A, then Cmd+C)
3. Paste into the Google Apps Script editor

### 5. Save the Script
1. Click **File → Save** (or use Cmd+S)
2. Name it: "Website Form Automation"

### 6. Set Up the Trigger
1. Click on **"Triggers"** (clock icon) in the left sidebar
2. Click **"+ Add Trigger"** button
3. Configure:
   - Choose function: `onFormSubmit`
   - Event source: `From form`
   - Event type: `On form submit`
4. Click **Save**
5. Authorize when prompted (use your Google account)

### 7. Test the Deployment
1. Submit a test response through the form
2. Check the master sheet for the new entry
3. Verify all fields map correctly

## Master Sheet
The data will be written to: https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ

## Expected Column Mapping
- Column 0: child_name
- Column 1: parent_name
- Column 2: parent_email
- Column 3: parent_mobile
- Column 4: new_existing (automated)
- Column 5: interest_level (from form question)
- Column 6: source_tag ("website")
- Column 7: timestamp
- Column 8: duplicate_flag (automated)
- Column 9: status ("First Call Pending")
- Column 10: assigned_owner ("Unassigned")
- Column 11: notes

## Verification Checklist
- [ ] Script saved in Apps Script editor
- [ ] Trigger created and authorized
- [ ] Test submission successful
- [ ] Data appears in master sheet
- [ ] All columns mapped correctly
- [ ] source_tag = "website"