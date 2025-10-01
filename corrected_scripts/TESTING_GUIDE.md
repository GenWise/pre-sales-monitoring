# Testing Guide for Form-Bound Scripts

## TESTING APPROACH

After deploying the corrected form-bound scripts, follow this comprehensive testing guide to verify everything works correctly.

## PHASE 1: PRE-DEPLOYMENT VERIFICATION

### Step 1: Run Verification Suite
1. Copy `verification_suite.js` into any Google Apps Script project
2. Run `runFullVerification()` function
3. Check results for:
   - ✅ Master sheet access
   - ✅ Webhook endpoint connectivity
   - ✅ Basic configuration

Expected output:
```
📋 VERIFICATION SUMMARY
{
  "overallStatus": "ready-for-deployment",
  "masterSheetOk": true,
  "webhookOk": true,
  "formsTotal": 4,
  "issues": [],
  "nextSteps": [...]
}
```

## PHASE 2: FORM-BOUND SCRIPT TESTING

### For Each Form (Run in Form's Script Editor):

#### Step 1: Basic Function Tests
```javascript
// Run these functions in order:
getStatus()           // Verify configuration
testSheetConnection() // Test master sheet access
testWebhook()         // Test webhook connectivity
```

Expected `getStatus()` output:
```json
{
  "formName": "returning_students",
  "formId": "1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA",
  "formTitle": "[Form Title]",
  "sourceTag": "returning_students",
  "webhookUrl": "https://dashboard.giftedworld.org/webhook",
  "masterSheetId": "1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ",
  "failedSubmissions": 0,
  "processingErrors": 0,
  "scriptType": "form-bound",
  "dropdownValues": {...}
}
```

#### Step 2: Webhook Test
Run `testWebhook()` and verify:
- ✅ No network errors
- ✅ HTTP 200 response
- ✅ Webhook receives test data
- ✅ Test data added to master sheet

#### Step 3: Sheet Connection Test
Run `testSheetConnection()` and verify:
- ✅ Sheet accessible
- ✅ Correct sheet name
- ✅ Can read last row number

## PHASE 3: END-TO-END TESTING

### Step 1: Live Form Submission Test

For each form:
1. Open the public form URL (not edit URL)
2. Fill out with test data:
   ```
   Child Name: Test Child [FormX]
   Parent Name: Test Parent [FormX]
   Parent Email: test-formX@example.com
   Parent Mobile: +1234567890
   Interest Level: High
   ```
3. Submit the form
4. Check execution log in script editor

### Step 2: Verify Data Flow

After each submission:
1. **Check Script Execution Log**:
   - Look for "Form submission detected"
   - Verify "Webhook successful" or "Data added directly to master sheet"
   - No error messages

2. **Check Master Sheet**:
   - New row added with correct data
   - Source tag matches form (returning_students, ats_qualifiers, etc.)
   - Status = "New Parent"
   - Assigned Owner = "Unassigned"

3. **Check Webhook Endpoint** (if accessible):
   - Verify webhook received POST request
   - Confirm payload structure matches expected format

## PHASE 4: ERROR HANDLING TESTING

### Test Webhook Failure Scenario

1. Temporarily change `WEBHOOK_URL` to invalid URL
2. Submit test form
3. Verify:
   - Error logged but script continues
   - Data still added to master sheet as backup
   - Failed submission stored for retry

### Test Sheet Permission Issues

1. Temporarily change `MASTER_SHEET_ID` to invalid ID
2. Submit test form
3. Verify error handling logs the issue

## PHASE 5: MONITORING AND DIAGNOSTICS

### Regular Monitoring Functions

Run these periodically in each form's script editor:

```javascript
// Check for any issues
getStatus()

// View any failed submissions
const props = PropertiesService.getScriptProperties();
const failed = JSON.parse(props.getProperty('failedSubmissions') || '[]');
console.log('Failed submissions:', failed);

// View processing errors
const errors = JSON.parse(props.getProperty('processingErrors') || '[]');
console.log('Processing errors:', errors);
```

### Monitoring Checklist

Daily/Weekly checks:
- [ ] Run `getStatus()` on all 4 forms
- [ ] Check `failedSubmissions` count is low (< 5)
- [ ] Check `processingErrors` count is low (< 5)
- [ ] Verify recent submissions in master sheet
- [ ] Confirm webhook endpoint is responding

## TROUBLESHOOTING COMMON ISSUES

### Issue: "FormApp.getActiveForm() is not defined"
- **Cause**: Script is standalone, not form-bound
- **Solution**: Delete project, redeploy inside form

### Issue: "No triggers found"
- **Cause**: Form-bound triggers auto-create when script is saved
- **Solution**: Save the script again, verify it's inside form

### Issue: "Permission denied accessing sheet"
- **Cause**: Sheet not shared with script's Google account
- **Solution**: Share master sheet with script author

### Issue: "Webhook timeout"
- **Cause**: Webhook endpoint slow or unavailable
- **Solution**: Check server status, fallback to sheet-only mode

### Issue: "Data not appearing in sheet"
- **Cause**: Field mapping issues or validation errors
- **Solution**: Check execution logs, verify field names match

## SUCCESS CRITERIA

### Deployment is successful when:
- [ ] All 4 forms have scripts deployed in form-bound mode
- [ ] `getStatus()` returns success for all forms
- [ ] Test submissions work end-to-end
- [ ] Data appears correctly in master sheet
- [ ] Webhook receives data (if endpoint working)
- [ ] No persistent errors in execution logs
- [ ] Failed submission counts remain low

### Data Flow Verification:
- [ ] Form submission → Script trigger fires
- [ ] Script extracts form data correctly
- [ ] Webhook call succeeds OR falls back to sheet
- [ ] Master sheet receives new row
- [ ] Field mapping works correctly
- [ ] Dropdown values match master sheet requirements

## ROLLBACK PLAN

If issues persist:
1. Document specific error messages
2. Check Google Apps Script quotas/limits
3. Verify all permissions are correct
4. Consider temporary webhook bypass (sheet-only mode)
5. Contact support with execution logs

## NEXT STEPS AFTER TESTING

Once all tests pass:
1. Monitor for 24-48 hours
2. Set up regular monitoring schedule
3. Document any form-specific field mappings needed
4. Train team on monitoring procedures
5. Set up alerts for high error counts