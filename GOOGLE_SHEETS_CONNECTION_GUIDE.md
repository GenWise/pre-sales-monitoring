# Google Sheets Dashboard Connection Guide

This guide will help you connect your live dashboard to the Google Sheets database you created following the `manual_sheet_setup.md` instructions.

## Prerequisites

Before starting, ensure you have:
- ✅ Created the Google Sheet with the proper column structure (following `manual_sheet_setup.md`)
- ✅ Service account email: `sheets-and-python-340711@sheets-and-python-340711.iam.gserviceaccount.com`
- ✅ Service account JSON file at: `/Users/rajeshpanchanathan/Documents/genwise/projects/rzrpy/sheets-and-python-340711-e964234d8202.json`
- ✅ Dashboard deployed at: `https://dashboard.giftedworld.org`

## Step 1: Find Your Sheet ID

1. **Open your Google Sheet** that you created following the manual setup guide
2. **Copy the URL** from your browser's address bar
3. **Extract the Sheet ID** from the URL:
   - Look for the long string between `/d/` and `/edit`
   - Example URL: `https://docs.google.com/spreadsheets/d/1ABC123DEF456GHI789JKL/edit#gid=0`
   - Your Sheet ID: `1ABC123DEF456GHI789JKL`
4. **Save this ID** - you'll need it in Step 4

## Step 2: Enable Google Sheets API v4

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select your project**: `sheets-and-python-340711`
3. **Navigate to APIs & Services** → **Library**
4. **Search for "Google Sheets API"**
5. **Click on "Google Sheets API"**
6. **Click "Enable"** (if not already enabled)
7. **Wait for confirmation** that the API is enabled

## Step 3: Create API Key

1. **In Google Cloud Console**, go to **APIs & Services** → **Credentials**
2. **Click "Create Credentials"** → **API Key**
3. **Copy the generated API key** immediately
4. **Click "Restrict Key"** for security
5. **Under "API restrictions"**:
   - Select **"Restrict key"**
   - Check **"Google Sheets API"**
6. **Under "Application restrictions"** (optional but recommended):
   - Select **"HTTP referrers (websites)"**
   - Add: `https://dashboard.giftedworld.org/*`
   - Add: `http://localhost:*` (for testing)
7. **Click "Save"**
8. **Important**: Save this API key securely - you'll need it in Step 4

## Step 4: Configure Dashboard API Connection

You need to update the `api.js` file in your dashboard. The current file is located at:
`/Users/rajeshpanchanathan/code/pre-sales-monitoring/src/dashboard/js/api.js`

### Method A: Direct Code Update (Recommended)

1. **Edit the api.js file** and replace these lines:
   ```javascript
   this.SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // Line 5
   this.API_KEY = 'YOUR_API_KEY_HERE'; // Line 6
   this.SHEET_NAME = 'Sheet1'; // Line 7
   ```

2. **With your actual values**:
   ```javascript
   this.SPREADSHEET_ID = 'YOUR_ACTUAL_SHEET_ID_FROM_STEP_1';
   this.API_KEY = 'YOUR_ACTUAL_API_KEY_FROM_STEP_3';
   this.SHEET_NAME = 'Sheet1'; // Keep as 'Sheet1' unless you renamed your sheet
   ```

3. **Example with sample values**:
   ```javascript
   this.SPREADSHEET_ID = '1ABC123DEF456GHI789JKL';
   this.API_KEY = 'AIzaSyDFGHIJKLMNOPQRSTUVWXYZ1234567890';
   this.SHEET_NAME = 'Sheet1';
   ```

### Method B: URL Parameter Configuration (Alternative)

If you prefer not to hardcode the values, you can pass them as URL parameters:

1. **Keep the default placeholders** in `api.js`
2. **Access your dashboard with parameters**:
   ```
   https://dashboard.giftedworld.org/?spreadsheetId=YOUR_SHEET_ID&apiKey=YOUR_API_KEY&sheetName=Sheet1
   ```

## Step 5: Upload Updated Files to Server

After updating the `api.js` file:

1. **Connect to your server** (via FTP, cPanel File Manager, or SSH)
2. **Navigate to**: `/home/u191176295/domains/giftedworld.org/public_html/dashboard/js/`
3. **Upload the updated `api.js` file**
4. **Ensure file permissions** are set correctly (644 or 755)

## Step 6: Configure Sheet Sharing Permissions

1. **Open your Google Sheet**
2. **Click the "Share" button** (top right corner)
3. **Add the service account email**:
   ```
   sheets-and-python-340711@sheets-and-python-340711.iam.gserviceaccount.com
   ```
4. **Set permission to "Editor"**
5. **Uncheck "Notify people"** (since it's a service account)
6. **Click "Send"**

## Step 7: Test the Connection

1. **Open your dashboard**: https://dashboard.giftedworld.org
2. **Open browser Developer Tools** (F12)
3. **Check the Console tab** for messages:
   - ✅ Success: "Google Sheets API configured"
   - ✅ Success: "API connection successful"
   - ❌ Error: Check troubleshooting section below

4. **Verify data loading**:
   - If configured correctly, you should see real data from your sheet
   - If using mock data, you'll see the demo leads

5. **Test API connection explicitly**:
   - Open browser console
   - Type: `LeadsAPI.testConnection()`
   - Press Enter
   - Check the returned result

## Step 8: Add Test Data (Optional)

To verify the connection is working:

1. **Add a test row** to your Google Sheet:
   ```
   Child Name: Test Child
   Parent Name: Test Parent
   Parent Email: test@example.com
   Parent Mobile: +91-9876543210
   Interest Level: High
   Source Tag: returning_students
   Timestamp: 2024-01-20 10:30:00
   Duplicate Flag: No
   Status: New Parent
   Assigned Owner: Test Owner
   Notes: Test entry for dashboard verification
   ```

2. **Refresh your dashboard**
3. **Verify the test data appears** in the dashboard

## Troubleshooting Common Issues

### Issue 1: "API not configured" message
**Symptoms**: Dashboard shows mock data, console shows "API not configured"
**Solutions**:
- Verify SPREADSHEET_ID and API_KEY are correctly set in api.js
- Ensure no extra spaces or quotes around the values
- Check that you uploaded the updated api.js file to the server

### Issue 2: "HTTP 403 Forbidden" error
**Symptoms**: API calls fail with 403 error
**Solutions**:
- Verify Google Sheets API is enabled in Google Cloud Console
- Check API key restrictions - ensure dashboard domain is allowed
- Verify the sheet is shared with the service account email

### Issue 3: "HTTP 404 Not Found" error
**Symptoms**: API calls fail with 404 error
**Solutions**:
- Double-check the Sheet ID is correct
- Ensure the sheet URL is accessible (not private)
- Verify the sheet name matches the SHEET_NAME in api.js

### Issue 4: "No data found" message
**Symptoms**: API connects but returns no data
**Solutions**:
- Verify the sheet has data in the expected format
- Check that headers match the expected column names
- Ensure data starts in row 2 (row 1 should be headers)

### Issue 5: Data formatting issues
**Symptoms**: Data appears but looks incorrect
**Solutions**:
- Verify column headers match exactly: "Child Name", "Parent Name", etc.
- Check date formats are readable (YYYY-MM-DD preferred)
- Ensure no empty rows between data

### Issue 6: CORS errors
**Symptoms**: Browser blocks API requests
**Solutions**:
- Verify API key restrictions include your domain
- Check that you're accessing via HTTPS (not HTTP)
- Clear browser cache and try again

## Column Mapping Reference

The dashboard expects these column names in your Google Sheet:

| Sheet Column | Dashboard Field | Required |
|--------------|----------------|----------|
| Child Name | name | ✅ Yes |
| Parent Email | email | ✅ Yes |
| Parent Mobile | mobile | No |
| Status | status | No |
| Source Tag | source | No |
| Timestamp | date | No |
| Notes | notes | No |
| Interest Level | interest | No |
| Parent Name | company | No |
| Assigned Owner | assigned_to | No |

## Security Best Practices

1. **API Key Security**:
   - Never commit API keys to version control
   - Use HTTP referrer restrictions
   - Regularly rotate API keys

2. **Sheet Access**:
   - Only share with necessary service accounts
   - Use "Editor" permission (not "Owner")
   - Monitor sheet access logs

3. **Dashboard Security**:
   - Use HTTPS for dashboard access
   - Implement proper authentication if needed
   - Monitor dashboard access logs

## Advanced Configuration

### Custom Sheet Names
If your sheet is named differently than "Sheet1":
```javascript
this.SHEET_NAME = 'Your Custom Sheet Name';
```

### Multiple Sheets
To read from a specific tab/sheet within your spreadsheet:
```javascript
this.SHEET_NAME = 'Leads Data'; // Name of the specific tab
```

### Cache Configuration
To adjust how long data is cached:
```javascript
this.cacheTimeout = 10 * 60 * 1000; // 10 minutes (in milliseconds)
```

## Performance Optimization

1. **Enable Caching**: The dashboard caches data for 5 minutes by default
2. **Limit Data Range**: If you have many rows, consider limiting the range
3. **Pagination**: For large datasets, implement pagination in the dashboard
4. **Background Refresh**: Set up automatic refresh without full page reload

## Monitoring and Maintenance

1. **Regular Testing**: Test the connection weekly
2. **API Quota Monitoring**: Monitor Google Sheets API usage in Cloud Console
3. **Data Validation**: Regularly check data quality and format
4. **Backup Strategy**: Keep backups of your sheet data

## Next Steps

After successful connection:
1. **Set up automated data ingestion** from your forms
2. **Configure real-time notifications** for new leads
3. **Implement lead assignment workflows**
4. **Set up reporting and analytics**

## Support Information

If you encounter issues not covered in this guide:
1. Check the browser console for detailed error messages
2. Verify all steps were completed in order
3. Test with a simple sheet containing just a few rows
4. Review Google Sheets API documentation for advanced troubleshooting

---

**Last Updated**: September 30, 2024
**Dashboard Version**: 1.0
**API Version**: Google Sheets API v4