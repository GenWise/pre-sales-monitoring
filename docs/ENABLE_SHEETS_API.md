# Enable Google Sheets API for DigitalOcean Server

## Problem
FreshSales sync service on DigitalOcean (165.232.134.106) receives 403 "unregistered callers" when accessing Google Sheets API.

## Solution
Enable Google Sheets API for the service account project.

### Steps

1. **Go to Google Cloud Console**
   - URL: https://console.cloud.google.com/
   - Select project: `sheets-and-python-340711`

2. **Enable Google Sheets API**
   - Navigate to: APIs & Services → Library
   - Search for: "Google Sheets API"
   - Click "Enable" if not already enabled

3. **Verify Service Account Permissions**
   - Navigate to: IAM & Admin → Service Accounts
   - Locate: `sheetspython@sheets-and-python-340711.iam.gserviceaccount.com`
   - Ensure it has "Editor" role or equivalent

4. **Check API Restrictions (if still failing)**
   - Navigate to: APIs & Services → Credentials
   - Check if there are IP restrictions
   - Add DigitalOcean server IP: `165.232.134.106`

5. **Verify Master Sheet Permissions**
   - Open: https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ
   - Share → Add: `sheetspython@sheets-and-python-340711.iam.gserviceaccount.com`
   - Grant: Editor access

### Test After Enablement

SSH into server and check logs:
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106
pm2 logs freshsales-sync --lines 50
```

Look for successful Google Sheets API calls instead of 403 errors.

### Verification Command
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "cd /root/pre-sales-monitoring && pm2 restart freshsales-sync && pm2 logs freshsales-sync --lines 20"
```
