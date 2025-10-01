# Quick Deployment Guide - Google Apps Script

## Immediate Action Required

You have a form submission waiting to be processed! Follow these steps to get returning_students automation working:

### returning_students - PRIORITY (Already has submission)
**Form URL**: https://docs.google.com/forms/d/1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA

#### Quick Setup (5 minutes):

1. **Open returning_students**: Click the link above
2. **Open Script Editor**: Three dots menu (⋮) → "Script editor"
3. **Replace Code**: Delete existing code, paste the script from `directSheetsIntegration.gs`
4. **Verify Settings**:
   ```javascript
   const MASTER_SHEET_ID = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
   const FORM_SOURCE_TAG = 'returning_students';
   ```
5. **Save**: Ctrl+S
6. **Authorize**: Run any function → Allow permissions
7. **Set Trigger**: Triggers tab → Add Trigger → "onFormSubmit" → "On form submit"
8. **Process Existing**: Run `processExistingResponses()` to catch the submitted form

### Verification
- Check master sheet for new row with Source Tag "returning_students"
- Should show the existing form submission

### Next Steps
Once returning_students is working, repeat for Forms 2, 3, and 4 with their respective source tags.

## Form Details
- **returning_students**: `1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA` → Source Tag: 'returning_students'
- **ats_qualifiers**: `1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ` → Source Tag: 'ats_qualifiers'
- **website**: `1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg` → Source Tag: 'website'
- **early_bird**: `1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY` → Source Tag: 'early_bird'

## Master Sheet
**ID**: `1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ`
**URL**: https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ/edit