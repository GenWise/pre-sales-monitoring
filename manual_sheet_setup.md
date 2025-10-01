# Manual Google Sheets Setup Instructions

Due to service account storage quota limitations, please follow these steps to manually create the master database:

## Step 1: Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click "Create" → "Blank spreadsheet"
3. Rename it to: **Pre-sales Monitoring Master Database**

## Step 2: Set up the columns

Add these exact column headers in row 1 (A1 to K1):

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Child Name | Parent Name | Parent Email | Parent Mobile | Interest Level | Source Tag | Timestamp | Duplicate Flag | Status | Assigned Owner | Notes |

## Step 3: Format the header row

1. Select row 1 (A1:K1)
2. Set background color to dark blue (#3366CC)
3. Set text color to white
4. Make text bold
5. Center align the text

## Step 4: Freeze the header row

1. Select row 2 (click on row number 2)
2. Go to View → Freeze → 1 row

## Step 5: Set up data validation

### Interest Level (Column E):
1. Select E2:E1000
2. Data → Data validation
3. Criteria: List of items
4. Add: High, Medium, Low
5. Check "Show dropdown list in cell"
6. Check "Reject input when data is invalid"

### Source Tag (Column F):
1. Select F2:F1000
2. Data → Data validation
3. Criteria: List of items
4. Add: returning_students, ats_qualifiers, website, early_bird
5. Check "Show dropdown list in cell"
6. Check "Reject input when data is invalid"

### Duplicate Flag (Column H):
1. Select H2:H1000
2. Data → Data validation
3. Criteria: List of items
4. Add: Yes, No
5. Check "Show dropdown list in cell"
6. Check "Reject input when data is invalid"

### Status (Column I):
1. Select I2:I1000
2. Data → Data validation
3. Criteria: List of items
4. Add: New Parent, Existing Parent, First Call Pending, Warm, Hot, Not Interested
5. Check "Show dropdown list in cell"
6. Check "Reject input when data is invalid"

## Step 6: Share with Service Account

1. Click the "Share" button (top right)
2. Add this email address: `sheets-and-python-340711@sheets-and-python-340711.iam.gserviceaccount.com`
3. Set permission to "Editor"
4. Uncheck "Notify people" (since it's a service account)
5. Click "Send"

## Step 7: Get the Sheet ID

1. Copy the URL of your sheet
2. The Sheet ID is the long string between `/d/` and `/edit` in the URL
3. For example, if your URL is: `https://docs.google.com/spreadsheets/d/1ABC123DEF456GHI789JKL/edit#gid=0`
4. Your Sheet ID is: `1ABC123DEF456GHI789JKL`

## Step 8: Update the .env file

Create or update the `.env` file in your project root with:
```
PRESALES_MASTER_SHEET_ID=YOUR_SHEET_ID_HERE
```

Replace `YOUR_SHEET_ID_HERE` with the actual Sheet ID from Step 7.