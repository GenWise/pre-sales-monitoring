# Summer Program 2026 Form Integration Deployment Guide

## URGENT: Deploy GenWise Summer Program'26 Form to Monitoring System

### Form Details
- **Form ID**: `1FAIpQLScAEQXMJgbxWEl40xR3X1QgrvVZRphlbK4wzWXOnMxukAiXMw`
- **Published URL**: https://forms.gle/pVnfgLKDhR4gmAhCA
- **Form Title**: GenWise Summer Program'26
- **Source Tag**: `summer_program_2026`

### Files Updated ✅

1. **Forms Mapping Configuration** - `/Users/rajeshpanchanathan/code/pre-sales-monitoring/src/sheets/formsMapping.js`
   - Added summer_program_2026 configuration with comprehensive field mapping
   - Default interest level set to "High" (appropriate for summer program)

2. **Google Apps Script Created** - `/Users/rajeshpanchanathan/code/pre-sales-monitoring/corrected_scripts/summer_program_2026_bound_script.js`
   - Form-bound script ready for deployment
   - Includes webhook integration and direct sheet backup

3. **All Existing Scripts Updated** - Updated dropdown validation in:
   - `/Users/rajeshpanchanathan/code/pre-sales-monitoring/corrected_scripts/returning_students_bound_script.js`
   - `/Users/rajeshpanchanathan/code/pre-sales-monitoring/corrected_scripts/ats_qualifiers_bound_script.js`
   - `/Users/rajeshpanchanathan/code/pre-sales-monitoring/corrected_scripts/website_bound_script.js`
   - `/Users/rajeshpanchanathan/code/pre-sales-monitoring/corrected_scripts/early_bird_bound_script.js`

4. **Master Sheet Validation Updated**:
   - `/Users/rajeshpanchanathan/code/pre-sales-monitoring/create_master_sheet.js`
   - `/Users/rajeshpanchanathan/code/pre-sales-monitoring/enable_apis_and_deploy.js`
   - `/Users/rajeshpanchanathan/code/pre-sales-monitoring/src/dashboard/js/api.js`

### CRITICAL DEPLOYMENT STEPS

#### 1. Deploy Google Apps Script to Form (MANUAL STEP REQUIRED)

**IMPORTANT**: This script MUST be deployed directly in the Google Form's script editor.

1. **Open the Google Form**:
   - Go to: https://docs.google.com/forms/d/1FAIpQLScAEQXMJgbxWEl40xR3X1QgrvVZRphlbK4wzWXOnMxukAiXMw/edit

2. **Access Script Editor**:
   - Click the three dots menu (⋮) in the form editor
   - Select "Script editor"

3. **Deploy the Script**:
   - Copy the entire contents of `/Users/rajeshpanchanathan/code/pre-sales-monitoring/corrected_scripts/summer_program_2026_bound_script.js`
   - Paste into the script editor, replacing any existing code
   - Save the script (Ctrl+S or Cmd+S)

4. **Set Up Trigger** (AUTOMATIC):
   - Form-bound scripts automatically create onFormSubmit triggers
   - No manual trigger setup required

#### 2. Update Master Sheet Validation (IF NEEDED)

If the master sheet doesn't already include `summer_program_2026` in the Source Tag dropdown:

```bash
cd /Users/rajeshpanchanathan/code/pre-sales-monitoring
node create_master_sheet.js
```

#### 3. Test the Integration

**Test Script Functions**:
1. In the Google Apps Script editor, run:
   - `testWebhook()` - Test webhook connectivity
   - `testSheetConnection()` - Test master sheet access
   - `getStatus()` - Check script configuration

**Test Form Submission**:
1. Submit a test entry via: https://forms.gle/pVnfgLKDhR4gmAhCA
2. Verify data appears in master sheet with source tag `summer_program_2026`
3. Check dashboard at https://dashboard.giftedworld.org for new entry

### Expected Result

After deployment:
- New form submissions will automatically flow to master sheet
- Data will appear in dashboard with `summer_program_2026` source tag
- Webhook processing will handle data validation and storage
- All existing forms continue working without disruption

### Troubleshooting

**If webhook fails**:
- Script has fallback to write directly to master sheet
- Check webhook URL in script: `https://dashboard.giftedworld.org/webhook`

**If validation errors occur**:
- Script includes comprehensive field mapping for common variations
- Default interest level set to "High" for summer program leads

**If script deployment fails**:
- Ensure you're deploying inside the form (not as standalone project)
- Form-bound scripts require `FormApp.getActiveForm()` to work

### Integration Status: READY FOR DEPLOYMENT ✅

All configuration files updated. System ready to accept summer_program_2026 form submissions immediately after script deployment.