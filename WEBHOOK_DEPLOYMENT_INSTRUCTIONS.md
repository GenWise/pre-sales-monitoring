# URGENT: Webhook Fix Required - Manual Deployment

## CRITICAL ISSUE IDENTIFIED
The website form submissions aren't appearing in the master sheet because of a **data mapping mismatch** between the Google Apps Script and webhook.php.

- **Google Apps Script sends**: `"Child Name"`, `"Parent Name"`, etc.
- **Webhook.php expected**: `"child_name"`, `"parent_name"`, etc.

## MANUAL DEPLOYMENT REQUIRED

1. **Replace webhook.php** on production server with the fixed version:
   - Location: `/home/u191176295/domains/giftedworld.org/public_html/dashboard/webhook.php`
   - Replace with: `webhook_fixed.php` (provided in this directory)

2. **Test the fix** after deployment:
```bash
curl -X POST https://dashboard.giftedworld.org/webhook.php \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "Child Name": "Test Child Fix",
      "Parent Name": "Test Parent Fix",
      "Parent Email": "test-fix@example.com",
      "Parent Mobile": "+9876543210",
      "Interest Level": "High",
      "sourceTag": "website",
      "timestamp": "2025-10-01T19:00:00.000Z"
    },
    "source": "google-apps-script-form-bound"
  }'
```

## EXPECTED RESULT
After deployment, you should see:
- `"extracted_data"` populated with the actual form values
- Data correctly appearing in master sheet
- All form submissions flowing to the master sheet

## STATUS
- ✅ Google Apps Script: Deployed and working
- ✅ Webhook URL: Accessible and functional
- ❌ Data mapping: **FIXED but needs deployment**
- ❌ Form pipeline: **Will work after webhook deployment**