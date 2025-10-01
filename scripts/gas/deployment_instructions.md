# Google Apps Script Deployment Instructions
## Pre-Sales Monitoring System - Form Integration

### CRITICAL REQUIREMENTS

**MUST READ BEFORE DEPLOYMENT:**
- Each form MUST map to EXACT dropdown values in the master sheet
- Scripts include validation that REJECTS submissions with invalid values
- Master Sheet ID: `1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ`

### Master Sheet Dropdown Values (CANNOT BE CHANGED):
- **Status**: "New Parent", "Contacted", "Follow-up", "Enrolled", "Not Interested"
- **Interest Level**: "High", "Medium", "Low"
- **Source Tag**: "returning_students", "ats_qualifiers", "website", "early_bird"
- **Duplicate Flag**: "Yes", "No"
- **Assigned Owner**: "Unassigned", "Rajesh", "Team Member"

---

## Form 1 Deployment

### Form Details:
- **Form ID**: `1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA`
- **Source Tag**: returning_students
- **Script File**: `form1_deploy.gs`

### Interest Level Mapping (returning_students Specific):
```
'Very High' -> 'High'
'Very Interested' -> 'High'
'High' -> 'High'
'Interested' -> 'High'
'Moderate' -> 'Medium'
'Medium' -> 'Medium'
'Somewhat Interested' -> 'Medium'
'Low' -> 'Low'
'Not Very Interested' -> 'Low'
'Maybe' -> 'Low'
```

### Deployment Steps:
1. **Open Google Apps Script**
   - Go to https://script.google.com
   - Click "New Project"

2. **Set Up Project**
   - Name: "returning_students-MasterSheet-Integration"
   - Delete default code
   - Copy entire content from `form1_deploy.gs`
   - Save project (Ctrl+S)

3. **Bind to Form**
   - Go to https://docs.google.com/forms/d/1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA/edit
   - Click "More" (three dots) → "Script editor"
   - If no existing script, create new one and paste `form1_deploy.gs` content

4. **Set Up Trigger**
   - In Apps Script editor, run `setupTrigger()` function once
   - Verify output shows correct Form ID

5. **Test Integration**
   - Run `testIntegration()` function
   - Verify test data appears in master sheet
   - Check that Interest Level mapping works correctly

---

## Form 2 Deployment

### Form Details:
- **Form ID**: `1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ`
- **Source Tag**: ats_qualifiers
- **Script File**: `form2_deploy.gs`

### Interest Level Mapping (ats_qualifiers Specific):
```
'Urgent' -> 'High'
'High Priority' -> 'High'
'High' -> 'High'
'Normal' -> 'Medium'
'Medium' -> 'Medium'
'Low Priority' -> 'Low'
'Low' -> 'Low'
```

### Deployment Steps:
1. **Open Google Apps Script**
   - Go to https://script.google.com
   - Click "New Project"

2. **Set Up Project**
   - Name: "ats_qualifiers-MasterSheet-Integration"
   - Delete default code
   - Copy entire content from `form2_deploy.gs`
   - Save project (Ctrl+S)

3. **Bind to Form**
   - Go to https://docs.google.com/forms/d/1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ/edit
   - Click "More" (three dots) → "Script editor"
   - If no existing script, create new one and paste `form2_deploy.gs` content

4. **Set Up Trigger**
   - In Apps Script editor, run `setupTrigger()` function once
   - Verify output shows correct Form ID

5. **Test Integration**
   - Run `testIntegration()` function
   - Verify test data appears in master sheet
   - Check that Interest Level mapping works correctly

---

## Form 3 Deployment

### Form Details:
- **Form ID**: `1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg`
- **Source Tag**: website
- **Script File**: `form3_deploy.gs`

### Interest Level Mapping (website Specific):
```
'Very Likely' -> 'High'
'Definitely' -> 'High'
'Likely' -> 'High'
'Maybe' -> 'Medium'
'Possibly' -> 'Medium'
'Unlikely' -> 'Low'
'Not Sure' -> 'Low'
```

### Deployment Steps:
1. **Open Google Apps Script**
   - Go to https://script.google.com
   - Click "New Project"

2. **Set Up Project**
   - Name: "website-MasterSheet-Integration"
   - Delete default code
   - Copy entire content from `form3_deploy.gs`
   - Save project (Ctrl+S)

3. **Bind to Form**
   - Go to https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg/edit
   - Click "More" (three dots) → "Script editor"
   - If no existing script, create new one and paste `form3_deploy.gs` content

4. **Set Up Trigger**
   - In Apps Script editor, run `setupTrigger()` function once
   - Verify output shows correct Form ID

5. **Test Integration**
   - Run `testIntegration()` function
   - Verify test data appears in master sheet
   - Check that Interest Level mapping works correctly

---

## Form 4 Deployment

### Form Details:
- **Form ID**: `1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY`
- **Source Tag**: early_bird
- **Script File**: `form4_deploy.gs`

### Interest Level Mapping (early_bird Specific):
```
'Immediate' -> 'High'
'ASAP' -> 'High'
'High' -> 'High'
'Soon' -> 'Medium'
'Medium' -> 'Medium'
'Later' -> 'Low'
'Low' -> 'Low'
```

### Deployment Steps:
1. **Open Google Apps Script**
   - Go to https://script.google.com
   - Click "New Project"

2. **Set Up Project**
   - Name: "early_bird-MasterSheet-Integration"
   - Delete default code
   - Copy entire content from `form4_deploy.gs`
   - Save project (Ctrl+S)

3. **Bind to Form**
   - Go to https://docs.google.com/forms/d/1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY/edit
   - Click "More" (three dots) → "Script editor"
   - If no existing script, create new one and paste `form4_deploy.gs` content

4. **Set Up Trigger**
   - In Apps Script editor, run `setupTrigger()` function once
   - Verify output shows correct Form ID

5. **Test Integration**
   - Run `testIntegration()` function
   - Verify test data appears in master sheet
   - Check that Interest Level mapping works correctly

---

## Critical Validation Features

### STRICT VALIDATION
Each script includes validation that:
- **REJECTS** form submissions if dropdown values don't match master sheet exactly
- **LOGS** validation failures with detailed error messages
- **PREVENTS** invalid data from entering the master sheet

### Validation Errors
If validation fails, the script will:
1. Log detailed error message to console
2. Call `sendValidationFailureNotification()` (can be configured for email alerts)
3. **NOT** write data to master sheet
4. Prevent corruption of master database

### Error Types:
- Invalid Status values
- Invalid Interest Level values (after mapping)
- Invalid Source Tag values
- Invalid Duplicate Flag values
- Invalid Assigned Owner values

---

## Testing & Verification

### After Each Deployment:

1. **Run setupTrigger()**
   - Verify correct Form ID is displayed
   - Check that trigger is created successfully

2. **Run testIntegration()**
   - Verify test data writes to master sheet
   - Check Interest Level mapping works
   - Confirm validation passes

3. **Test Real Submission**
   - Submit test response through actual form
   - Verify data appears in master sheet
   - Check all mappings are correct

### Troubleshooting:

**If setupTrigger() fails:**
- Check you're bound to correct form
- Verify Form ID matches expected ID
- Ensure you have edit permissions on form

**If testIntegration() fails:**
- Check Google Sheets permissions
- Verify Master Sheet ID is correct
- Check console for detailed error messages

**If validation failures occur:**
- Check Interest Level mappings are correct
- Verify form questions match expected field names
- Review console logs for specific validation errors

---

## Important Notes

### Security:
- Each script validates Form ID to prevent deployment to wrong form
- Strict validation prevents database corruption
- All errors are logged for debugging

### Permissions:
- Scripts need access to Google Sheets API
- Scripts need access to Google Forms API
- First run will require authorization

### Maintenance:
- If form questions change, update fieldMapping in appropriate script
- If master sheet dropdown values change, update ALLOWED_VALUES
- Always test after any changes

### Contact:
For issues or questions:
- **Development**: rajesh@genwise.in
- **Master Sheet**: https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ/edit

---

## Deployment Checklist

### Form 1:
- [ ] Script deployed to correct Form ID
- [ ] setupTrigger() run successfully
- [ ] testIntegration() passes
- [ ] Real form submission tested
- [ ] Interest Level mapping verified

### Form 2:
- [ ] Script deployed to correct Form ID
- [ ] setupTrigger() run successfully
- [ ] testIntegration() passes
- [ ] Real form submission tested
- [ ] Interest Level mapping verified

### Form 3:
- [ ] Script deployed to correct Form ID
- [ ] setupTrigger() run successfully
- [ ] testIntegration() passes
- [ ] Real form submission tested
- [ ] Interest Level mapping verified

### Form 4:
- [ ] Script deployed to correct Form ID
- [ ] setupTrigger() run successfully
- [ ] testIntegration() passes
- [ ] Real form submission tested
- [ ] Interest Level mapping verified

### Final Verification:
- [ ] All forms sending data to master sheet
- [ ] Dropdown validation working on all forms
- [ ] Duplicate detection working
- [ ] Error logging functional
- [ ] Dashboard showing updated data