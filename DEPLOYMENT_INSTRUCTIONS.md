
# 🤖 AUTOMATED FORMS DEPLOYMENT INSTRUCTIONS

## Overview
This system automates Google Forms integration with your master database.
All scripts have been generated and are ready for deployment.

## Master Sheet Data
📊 **Dropdown Values Found:**
   status: New Parent, Contacted, Follow-up, Enrolled, Not Interested
   interestLevel: High, Medium, Low
   sourceTag: returning_students, ats_qualifiers, website, early_bird
   assignedOwner: Unassigned, Rajesh, Team Member

## 🚀 DEPLOYMENT STEPS

### Step 1: Start the Webhook Server
```bash
# Install dependencies if needed
npm install express cors

# Start the webhook server
node webhook_server.js
```

The webhook will be available at: http://localhost:3001/webhook/form-submission

### Step 2: Deploy Apps Scripts to Each Form


#### 1. returning_students (returning_students)
1. **Open Google Apps Script**: https://script.google.com/
2. **Create New Project**: Click "New project"
3. **Copy the generated code** from: `/Users/rajeshpanchanathan/code/pre-sales-monitoring/generated_scripts/returning_students_automation.js`
4. **Paste into the script editor** (replace default code)
5. **Update WEBHOOK_URL** in the script to: `http://localhost:3001/webhook/form-submission`
6. **Save the project** with name: "returning_students Automation"
7. **Authorize permissions** when prompted
8. **Run setupFormTrigger()** function once to create the form submit trigger
9. **Test with testWebhook()** function
10. **Verify with getStatus()** function

**Form URL**: https://docs.google.com/forms/d/1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA/edit
**Response Sheet**: Check the form for linked Google Sheet


#### 2. ats_qualifiers (ats_qualifiers)
1. **Open Google Apps Script**: https://script.google.com/
2. **Create New Project**: Click "New project"
3. **Copy the generated code** from: `/Users/rajeshpanchanathan/code/pre-sales-monitoring/generated_scripts/ats_qualifiers_automation.js`
4. **Paste into the script editor** (replace default code)
5. **Update WEBHOOK_URL** in the script to: `http://localhost:3001/webhook/form-submission`
6. **Save the project** with name: "ats_qualifiers Automation"
7. **Authorize permissions** when prompted
8. **Run setupFormTrigger()** function once to create the form submit trigger
9. **Test with testWebhook()** function
10. **Verify with getStatus()** function

**Form URL**: https://docs.google.com/forms/d/1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ/edit
**Response Sheet**: Check the form for linked Google Sheet


#### 3. website (website)
1. **Open Google Apps Script**: https://script.google.com/
2. **Create New Project**: Click "New project"
3. **Copy the generated code** from: `/Users/rajeshpanchanathan/code/pre-sales-monitoring/generated_scripts/website_automation.js`
4. **Paste into the script editor** (replace default code)
5. **Update WEBHOOK_URL** in the script to: `http://localhost:3001/webhook/form-submission`
6. **Save the project** with name: "website Automation"
7. **Authorize permissions** when prompted
8. **Run setupFormTrigger()** function once to create the form submit trigger
9. **Test with testWebhook()** function
10. **Verify with getStatus()** function

**Form URL**: https://docs.google.com/forms/d/1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg/edit
**Response Sheet**: Check the form for linked Google Sheet


#### 4. early_bird (early_bird)
1. **Open Google Apps Script**: https://script.google.com/
2. **Create New Project**: Click "New project"
3. **Copy the generated code** from: `/Users/rajeshpanchanathan/code/pre-sales-monitoring/generated_scripts/early_bird_automation.js`
4. **Paste into the script editor** (replace default code)
5. **Update WEBHOOK_URL** in the script to: `http://localhost:3001/webhook/form-submission`
6. **Save the project** with name: "early_bird Automation"
7. **Authorize permissions** when prompted
8. **Run setupFormTrigger()** function once to create the form submit trigger
9. **Test with testWebhook()** function
10. **Verify with getStatus()** function

**Form URL**: https://docs.google.com/forms/d/1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY/edit
**Response Sheet**: Check the form for linked Google Sheet


### Step 3: Test the Complete System

1. **Test webhook endpoint**:
   ```bash
   curl -X GET http://localhost:3001/webhook/health
   ```

2. **Submit a test form** in each of the 4 forms
3. **Check the webhook logs** for incoming data
4. **Verify data appears** in your master sheet
5. **Run getStatus()** in each Apps Script to check for errors

### Step 4: Process Existing Submissions

Each generated script includes functionality to handle existing submissions.
The system will automatically:
- ✅ Send new submissions to webhook
- ✅ Fall back to direct sheet updates if webhook fails
- ✅ Store failed submissions for retry
- ✅ Log errors for investigation

## 📊 MONITORING AND MAINTENANCE

### Available Functions in Each Script:
- `onFormSubmit()` - Main trigger (auto-runs on form submission)
- `setupFormTrigger()` - Run once during setup
- `testWebhook()` - Test connectivity
- `getStatus()` - Get current status and stats
- `retryFailedSubmissions()` - Retry any failed submissions

### Webhook Endpoints:
- `GET /webhook/health` - Health check
- `GET /webhook/status` - Processing statistics
- `POST /webhook/form-submission` - Main form submission endpoint

## 🔧 TROUBLESHOOTING

### If Apps Script API is still disabled:
1. Visit: https://console.developers.google.com/apis/api/script.googleapis.com/overview?project=1024532710053
2. Click "Enable"
3. Wait 2-3 minutes
4. Retry the automated deployment with: `node deploy_forms_automation.js`

### If webhook fails:
- Forms will automatically fall back to direct sheet updates
- Failed submissions are stored for retry
- Check Apps Script logs for details

### Common Issues:
1. **Webhook URL not updated** - Update WEBHOOK_URL in each script
2. **Permissions not granted** - Run each script once to authorize
3. **Trigger not created** - Run setupFormTrigger() in each script
4. **Network issues** - Check webhook server is running

## 📈 SUCCESS METRICS

✅ **Deployment Complete When:**
- All 4 Apps Scripts are deployed and authorized
- Form submit triggers are active in all scripts
- Webhook server is running and healthy
- Test submissions flow to master sheet
- getStatus() shows no errors in any script

✅ **System Working When:**
- New form submissions automatically appear in master sheet
- Webhook logs show incoming data
- No failed submissions in script status
- Data mapping is correct for all fields

Your forms automation system is now ready! 🎉
