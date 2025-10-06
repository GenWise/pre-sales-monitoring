---
description: Deploy Google Forms script with step-by-step instructions
argument-hint: "<form-name>"
---

# Deploy Form Script

Automate deployment of form-bound Apps Scripts to Google Forms with proper OAuth configuration.

## Usage

```bash
/deploy-form <form-name>
```

**Form Names:**
- `website`
- `returning_students`
- `ats_qualifiers`
- `early_bird`

**Example:**
```bash
/deploy-form website
```

## What It Does

1. **Validates** that `deploy/<form>/Code.gs` exists
2. **Displays** exact copy-paste deployment instructions
3. **Reminds** about OAuth re-authorization requirements
4. **Shows** test submission checklist

## Deployment Steps (Auto-generated)

When you run this command, it will:

### Step 1: Open Form Script Editor
```
1. Navigate to form editor URL (shown for each form)
2. Click Extensions → Apps Script
```

### Step 2: Deploy Code.gs
```
3. Delete default Code.gs content
4. Copy content from: /Users/rajeshpanchanathan/code/pre-sales-monitoring/deploy/<form>/Code.gs
5. Paste entire content into Apps Script editor
6. Save (Cmd+S)
```

### Step 3: Update OAuth Manifest
```
7. Click gear icon (⚙️) → Show "appsscript.json" manifest file
8. Copy content from: /Users/rajeshpanchanathan/code/pre-sales-monitoring/deploy/<form>/appsscript.json
9. Paste entire content, replacing existing manifest
10. Save (Cmd+S)
```

### Step 4: Authorize & Test
```
11. Select function: testIntegration
12. Click Run
13. Authorize as: rajesh@genwise.in
14. Check execution log for success
15. Submit REAL test form
16. Verify:
    ✓ New row in master sheet (1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ)
    ✓ Email notification sent
    ✓ Slack notification posted
```

## Form Editor URLs

- **returning_students**: https://docs.google.com/forms/d/1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA/edit
- **ats_qualifiers**: https://docs.google.com/forms/d/1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ/edit
- **website**: https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg/edit
- **early_bird**: https://docs.google.com/forms/d/1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY/edit

## OAuth Authorization Notes

- **Required scope**: `script.external_request` (for Slack notifications)
- **Must authorize as**: rajesh@genwise.in (admin account)
- **Triggers re-auth**: First run of testIntegration() after scope change
- **Permission popup**: Click "Review Permissions" → Advanced → Go to Project (unsafe) → Allow

## Troubleshooting

**Issue: "You do not have permission to call UrlFetchApp.fetch"**
- Cause: Missing OAuth scope
- Fix: Verify appsscript.json includes script.external_request

**Issue: "Invalid Interest Level"**
- Cause: Form response doesn't match lookup table
- Check: Execution logs show normalized value comparison
- Fix: Add missing option to interest level mappings

**Issue: Status column blank**
- Cause: defaultValues not including STATUS field
- Check: FORM_CONFIG.defaultValues has 'First Call Pending'

**Issue: clasp push doesn't update**
- Cause: Form-bound scripts don't sync reliably via clasp
- Fix: Use manual copy-paste to Apps Script editor (this command)

## Time Estimate

- First-time deployment: ~15 minutes (includes OAuth authorization)
- Subsequent deployments: ~5 minutes

## When to Use

- Deploying new form script for first time
- Updating existing form script after code changes
- Re-deploying after OAuth scope changes
- Troubleshooting deployment issues (reminds of all steps)

## Success Criteria

✅ All 3 verification checks pass:
1. New row appears in master sheet with correct data
2. Email sent to development/production recipients
3. Slack notification posted to #leads channel

✅ Execution log shows:
- Interest level mapping successful
- Status default applied
- No error messages
