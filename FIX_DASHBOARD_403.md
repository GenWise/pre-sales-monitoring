# Fix Dashboard 403 Error - Google Sheets API

## Problem Identified
The dashboard at dashboard.giftedworld.org is getting a **403 PERMISSION_DENIED** error because:
- API Key `AIzaSyDcSU0QHFQmdudhLff3-LQNFCsXArvqXY8` has HTTP referrer restrictions
- Requests are being blocked with error: "API_KEY_HTTP_REFERRER_BLOCKED"

## Solution Options

### Option 1: Update API Key Restrictions (RECOMMENDED)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Find API key: `AIzaSyDcSU0QHFQmdudhLff3-LQNFCsXArvqXY8`
4. Click on it to edit
5. Under **Application restrictions**, choose one of:
   - **None** (least secure but works immediately)
   - **HTTP referrers** and add these:
     ```
     http://localhost:8080/*
     http://127.0.0.1:8080/*
     https://dashboard.giftedworld.org/*
     http://dashboard.giftedworld.org/*
     ```
6. Click **SAVE**
7. Wait 1-2 minutes for changes to propagate

### Option 2: Make Google Sheet Public (SIMPLER)

1. Open the Google Sheet: https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ
2. Click **Share** button
3. Change to **"Anyone with the link can view"**
4. Update the dashboard code to remove API key from requests

### Option 3: Use Service Account (MOST SECURE)

Since you already have a service account (`sheetspython@sheets-and-python-340711.iam.gserviceaccount.com`) with editor access, we could:
1. Create a backend API endpoint that uses service account
2. Dashboard calls your backend instead of Google Sheets directly
3. No CORS or API key issues

## Quick Test
After fixing, test with:
```bash
curl "https://sheets.googleapis.com/v4/spreadsheets/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ?key=AIzaSyDcSU0QHFQmdudhLff3-LQNFCsXArvqXY8"
```

Should return sheet metadata instead of 403 error.

## Current Status
- Sheet ID: `1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ` ✅
- API Key: `AIzaSyDcSU0QHFQmdudhLff3-LQNFCsXArvqXY8` ✅
- Service Account: Has editor access ✅
- Issue: API key HTTP referrer restrictions ❌