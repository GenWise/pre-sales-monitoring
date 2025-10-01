#!/usr/bin/env python3
"""
Script to create the Pre-sales Monitoring Master Database in Google Sheets
"""

import json
import gspread
from google.oauth2.service_account import Credentials
import sys

# Google Sheets API scopes
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

# Service account credentials file path
CREDENTIALS_FILE = "/Users/rajeshpanchanathan/Documents/genwise/projects/rzrpy/sheets-and-python-340711-e964234d8202.json"

def create_master_sheet():
    """Create and configure the master database sheet"""

    # Authenticate with Google Sheets API
    print("Authenticating with Google Sheets API...")
    credentials = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=SCOPES)
    gc = gspread.authorize(credentials)

    # Create new spreadsheet in a specific folder or drive
    print("Creating new Google Sheet...")
    sheet_name = "Pre-sales Monitoring Master Database"
    try:
        spreadsheet = gc.create(sheet_name)
    except Exception as e:
        print(f"Error creating sheet with service account: {e}")
        print("Please manually create a Google Sheet named 'Pre-sales Monitoring Master Database'")
        print("and share it with the service account email: sheets-and-python-340711@sheets-and-python-340711.iam.gserviceaccount.com")
        print("Then enter the Sheet ID when prompted.")

        sheet_id = input("Enter the Sheet ID: ").strip()
        spreadsheet = gc.open_by_key(sheet_id)

    # Get the first worksheet
    worksheet = spreadsheet.sheet1

    # Define the column headers
    headers = [
        "Child Name",
        "Parent Name",
        "Parent Email",
        "Parent Mobile",
        "Interest Level",
        "Source Tag",
        "Timestamp",
        "Duplicate Flag",
        "Status",
        "Assigned Owner",
        "Notes"
    ]

    print("Setting up column headers...")
    # Add headers to the first row
    worksheet.update('A1:K1', [headers])

    # Format the header row
    print("Formatting header row...")
    worksheet.format('A1:K1', {
        'backgroundColor': {'red': 0.2, 'green': 0.2, 'blue': 0.8},
        'textFormat': {'bold': True, 'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}},
        'horizontalAlignment': 'CENTER'
    })

    # Freeze the header row
    print("Freezing header row...")
    worksheet.freeze(rows=1)

    # Set column widths for better readability
    print("Adjusting column widths...")
    worksheet.update_dimension_range('A:A', 'columnWidths', 120)  # Child Name
    worksheet.update_dimension_range('B:B', 'columnWidths', 120)  # Parent Name
    worksheet.update_dimension_range('C:C', 'columnWidths', 200)  # Parent Email
    worksheet.update_dimension_range('D:D', 'columnWidths', 120)  # Parent Mobile
    worksheet.update_dimension_range('E:E', 'columnWidths', 100)  # Interest Level
    worksheet.update_dimension_range('F:F', 'columnWidths', 100)  # Source Tag
    worksheet.update_dimension_range('G:G', 'columnWidths', 150)  # Timestamp
    worksheet.update_dimension_range('H:H', 'columnWidths', 100)  # Duplicate Flag
    worksheet.update_dimension_range('I:I', 'columnWidths', 150)  # Status
    worksheet.update_dimension_range('J:J', 'columnWidths', 120)  # Assigned Owner
    worksheet.update_dimension_range('K:K', 'columnWidths', 200)  # Notes

    # Set up data validation
    print("Setting up data validation...")

    # Interest Level validation (Column E)
    interest_levels = ['High', 'Medium', 'Low']
    worksheet.add_data_validation('E2:E1000', {
        'condition': {
            'type': 'ONE_OF_LIST',
            'values': [{'userEnteredValue': level} for level in interest_levels]
        },
        'showCustomUi': True,
        'strict': True
    })

    # Status validation (Column I)
    status_options = ['New Parent', 'Existing Parent', 'First Call Pending', 'Warm', 'Hot', 'Not Interested']
    worksheet.add_data_validation('I2:I1000', {
        'condition': {
            'type': 'ONE_OF_LIST',
            'values': [{'userEnteredValue': status} for status in status_options]
        },
        'showCustomUi': True,
        'strict': True
    })

    # Source Tag validation (Column F)
    source_tags = ['returning_students', 'ats_qualifiers', 'website', 'early_bird']
    worksheet.add_data_validation('F2:F1000', {
        'condition': {
            'type': 'ONE_OF_LIST',
            'values': [{'userEnteredValue': tag} for tag in source_tags]
        },
        'showCustomUi': True,
        'strict': True
    })

    # Duplicate Flag validation (Column H)
    duplicate_flags = ['Yes', 'No']
    worksheet.add_data_validation('H2:H1000', {
        'condition': {
            'type': 'ONE_OF_LIST',
            'values': [{'userEnteredValue': flag} for flag in duplicate_flags]
        },
        'showCustomUi': True,
        'strict': True
    })

    # Share the sheet with the service account email to ensure access
    print("Configuring sheet permissions...")
    service_account_email = credentials.service_account_email
    spreadsheet.share(service_account_email, perm_type='user', role='writer')

    # Make the sheet viewable by anyone with the link (optional)
    # Uncomment the line below if you want to make it publicly viewable
    # spreadsheet.share('', perm_type='anyone', role='reader')

    # Get the sheet ID and URL
    sheet_id = spreadsheet.id
    sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"

    print(f"\n✅ Successfully created Pre-sales Monitoring Master Database!")
    print(f"📊 Sheet Name: {sheet_name}")
    print(f"🔗 Sheet URL: {sheet_url}")
    print(f"📋 Sheet ID: {sheet_id}")
    print(f"📧 Service Account: {service_account_email}")

    return sheet_id, sheet_url

if __name__ == "__main__":
    try:
        sheet_id, sheet_url = create_master_sheet()

        # Write the sheet ID to a file for the Node.js module to use
        env_content = f"PRESALES_MASTER_SHEET_ID={sheet_id}\n"

        with open('/Users/rajeshpanchanathan/code/pre-sales-monitoring/.env', 'w') as f:
            f.write(env_content)

        print(f"\n✅ Updated .env file with PRESALES_MASTER_SHEET_ID")

    except Exception as e:
        print(f"❌ Error creating sheet: {str(e)}")
        sys.exit(1)