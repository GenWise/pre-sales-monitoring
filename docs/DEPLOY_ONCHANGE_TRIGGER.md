# Deploy Master Sheet onChange Notification Trigger

## Overview
This guide shows how to deploy the onChange trigger to the Master Sheet for real-time email notifications when new leads are submitted.

## Prerequisites
- Master Sheet URL: https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ
- Script file: `scripts/gas/masterSheetNotifications.gs`
- Email recipient: rajesh@genwise.in

## Deployment Steps

### 1. Open Master Sheet Apps Script Editor

1. Open the Master Sheet: https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ
2. Click **Extensions** → **Apps Script**
3. If code already exists, delete it (or save backup first)

### 2. Add the Notification Script

1. Copy the entire contents of `scripts/gas/masterSheetNotifications.gs`
2. Paste into the Apps Script editor
3. Name the project: **"Master Sheet Notifications"**
4. Click **Save** (💾 icon or Cmd+S)

### 3. Configure Recipients (Optional)

By default, emails go to `rajesh@genwise.in`. To change recipients:

```javascript
const CONFIG = {
  EMAIL_RECIPIENTS: 'rajesh@genwise.in,other@email.com',  // Comma-separated
  // ... rest of config
};
```

### 4. Install the onChange Trigger

**CRITICAL**: You must run this function to activate notifications.

1. In Apps Script editor, select function: **setupOnChangeTrigger**
2. Click **Run** (▶️ icon)
3. When prompted "Authorization required":
   - Click **Review Permissions**
   - Select your Google account
   - Click **Advanced** → **Go to Master Sheet Notifications (unsafe)**
   - Click **Allow**
4. You should see a success popup: "✅ onChange trigger has been installed successfully!"

### 5. Test the Notification

1. Select function: **testNotification**
2. Click **Run** (▶️ icon)
3. Check your email (rajesh@genwise.in) for a test notification
4. The test uses the last row of data from the Master Sheet

### 6. Verify Trigger is Active

1. In Apps Script editor, click **Triggers** (⏰ icon on left sidebar)
2. You should see:
   - **Function**: onSheetChange
   - **Event Type**: On change
   - **Spreadsheet**: Master Sheet

## Testing End-to-End

### Option A: Submit a test via a Google Form
1. Submit a test form response
2. Wait for form script to write to Master Sheet
3. Check email for notification (should arrive within seconds)

### Option B: Manual row addition
1. Open Master Sheet
2. Add a new row with test data (include email address)
3. Check email for notification

## Troubleshooting

### No notification received after trigger setup

**Check trigger installation:**
```
Apps Script → Triggers (⏰ icon) → Verify "onSheetChange" exists
```

**Check execution logs:**
```
Apps Script → Executions (📊 icon on left) → Look for recent executions
```

**Common issues:**
- Trigger not installed: Run `setupOnChangeTrigger()` again
- Authorization not granted: Re-authorize when running setup
- Email quota exceeded: Google limits ~100 emails/day for free accounts

### Notification sent but not received

**Check spam folder** - Gmail may filter automated emails

**Verify email recipient:**
```javascript
// In CONFIG object
EMAIL_RECIPIENTS: 'rajesh@genwise.in'  // Correct email?
```

### Multiple notifications per submission

**Check for duplicate triggers:**
```
Apps Script → Triggers → Delete extra "onSheetChange" triggers
```

Then run `removeOnChangeTrigger()` and `setupOnChangeTrigger()` again.

## Customization Options

### Add Slack Notifications

1. Get Slack webhook URL from Slack workspace settings
2. Update configuration:
```javascript
const CONFIG = {
  SLACK_WEBHOOK_URL: 'REDACTED_SLACK_WEBHOOK',
  SEND_SLACK: true,
  // ...
};
```

### Change Email Template

Modify the `sendEmailNotification()` function to customize:
- Subject line
- HTML formatting
- Fields displayed
- Conditional formatting based on interest level

### Filter Notifications

To only notify on specific conditions (e.g., High interest only):

```javascript
function onSheetChange(e) {
  // ... existing code ...

  const leadData = parseRowData(rowData);

  // Add filter condition
  if (leadData.interestLevel !== 'High') {
    console.log('Not high interest, skipping notification');
    return;
  }

  // Continue with notifications...
}
```

## Monitoring

### View Execution History
```
Apps Script → Executions (📊 icon) → Filter by function "onSheetChange"
```

### Check Logs
```
Apps Script → Executions → Click on execution → View logs
```

### Email Quota
Check remaining email quota:
```
Apps Script → Run getConfig() → Check logs
```

## Maintenance

### Temporarily Disable Notifications
Run function: `removeOnChangeTrigger()`

### Re-enable Notifications
Run function: `setupOnChangeTrigger()`

### Update Script
1. Make changes to script code
2. Click **Save**
3. No need to reinstall trigger (it will use updated code automatically)

## Security Notes

- Script has access to: Master Sheet, Gmail (sending only), Spreadsheet triggers
- All emails sent via your Google account (quotas apply)
- Slack webhook is optional and disabled by default
- No external servers or third-party services (except optional Slack)

## Support

For issues or questions:
- Check execution logs in Apps Script
- Review error notifications sent to rajesh@genwise.in
- Test with `testNotification()` function to isolate issues
