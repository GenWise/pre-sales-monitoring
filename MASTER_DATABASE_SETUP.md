# Pre-sales Monitoring Master Database Setup

This document provides complete setup instructions for the Google Sheets master database integration.

## Quick Setup (Recommended)

### Step 1: Create the Google Sheet Manually

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Rename it to: **Pre-sales Monitoring Master Database**

### Step 2: Run the Setup Helper

```bash
node get_sheet_id.js
```

This will guide you through:
- Extracting the Sheet ID from your URL
- Automatically updating your .env file

### Step 3: Complete Manual Setup

Follow the detailed instructions in `manual_sheet_setup.md` to:
- Set up column headers
- Add data validation
- Format the sheet properly
- Share with the service account

### Step 4: Test the Integration

```bash
node test_master_database.js
```

## Manual Setup (Detailed)

If you prefer to set up everything manually, follow the complete instructions in `manual_sheet_setup.md`.

## Files Created

- **`.env`** - Environment configuration with Sheet ID
- **`src/sheets/masterDatabase.js`** - Main database integration module
- **`test_master_database.js`** - Test script and usage examples
- **`get_sheet_id.js`** - Helper to extract Sheet ID from URL
- **`manual_sheet_setup.md`** - Detailed manual setup instructions

## Database Schema

The master database contains the following columns:

| Column | Type | Validation | Description |
|--------|------|------------|-------------|
| Child Name | Text | None | Name of the child/student |
| Parent Name | Text | None | Name of the parent/guardian |
| Parent Email | Email | None | Parent's email address (primary key) |
| Parent Mobile | Text | None | Parent's mobile number |
| Interest Level | Dropdown | High, Medium, Low | Level of interest shown |
| Source Tag | Dropdown | returning_students, ats_qualifiers, website, early_bird | Source form identifier |
| Timestamp | DateTime | None | When the lead was created |
| Duplicate Flag | Dropdown | Yes, No | Whether this is a duplicate lead |
| Status | Dropdown | New Parent, Existing Parent, First Call Pending, Warm, Hot, Not Interested | Current lead status |
| Assigned Owner | Text | None | Sales person assigned to this lead |
| Notes | Text | None | Additional notes and comments |

## Usage Examples

### Basic Operations

```javascript
const MasterDatabase = require('./src/sheets/masterDatabase');

// Initialize
const db = new MasterDatabase();
await db.connect();

// Add a new lead
const lead = {
    childName: 'Emma Smith',
    parentName: 'Sarah Smith',
    parentEmail: 'sarah@example.com',
    parentMobile: '+91-9876543210',
    interestLevel: 'High',
    sourceTag: 'returning_students',
    status: 'New Parent',
    notes: 'Interested in advanced math program'
};

await db.addLead(lead);
```

### Duplicate Detection

```javascript
// Check for duplicates before adding
const isDuplicate = await db.checkForDuplicate('sarah@example.com', '+91-9876543210');

if (isDuplicate) {
    console.log('This lead already exists!');
} else {
    await db.addLead(lead);
}
```

### Update Existing Leads

```javascript
// Update lead status
await db.updateLead('sarah@example.com', {
    status: 'First Call Pending',
    assignedOwner: 'John Doe',
    notes: 'First call scheduled for tomorrow'
});
```

### Retrieve and Filter Leads

```javascript
// Get all leads
const allLeads = await db.getLeads();

// Get leads by status
const hotLeads = await db.getLeads({ status: 'Hot' });

// Get leads by source
const form1Leads = await db.getLeads({ sourceTag: 'returning_students' });

// Get leads by multiple filters
const priorityLeads = await db.getLeads({
    interestLevel: 'High',
    status: 'New Parent'
});
```

### Bulk Import

```javascript
const bulkLeads = [
    {
        childName: 'Child 1',
        parentName: 'Parent 1',
        parentEmail: 'parent1@example.com',
        sourceTag: 'returning_students'
    },
    {
        childName: 'Child 2',
        parentName: 'Parent 2',
        parentEmail: 'parent2@example.com',
        sourceTag: 'ats_qualifiers'
    }
];

const result = await db.bulkImportLeads(bulkLeads);
console.log(`Added: ${result.added}, Duplicates: ${result.duplicates}, Errors: ${result.errors.length}`);
```

### Get Statistics

```javascript
const stats = await db.getStats();
console.log('Total leads:', stats.totalLeads);
console.log('Duplicates:', stats.duplicates);
console.log('By status:', stats.byStatus);
console.log('By source:', stats.bySource);
console.log('By interest level:', stats.byInterestLevel);
```

## Error Handling

The module includes comprehensive error handling:

```javascript
try {
    await db.addLead(leadData);
} catch (error) {
    if (error.message.includes('Missing required field')) {
        console.log('Please provide all required fields');
    } else if (error.message.includes('not found')) {
        console.log('Lead does not exist');
    } else {
        console.log('Unexpected error:', error.message);
    }
}
```

## Integration with Forms

To integrate with your Google Forms:

1. Set up form submission webhooks
2. Use the appropriate `sourceTag` for each form (returning_students, ats_qualifiers, website, early_bird)
3. Call `db.addLead()` with the form data
4. The system will automatically detect duplicates and flag them

## Security Notes

- The service account credentials are stored locally
- The Google Sheet should only be shared with necessary personnel
- All API operations are logged for auditing
- Sensitive data should be handled according to your privacy policy

## Troubleshooting

### Common Issues

1. **"Sheet ID not set"**: Update your .env file with the correct Sheet ID
2. **"Credentials file not found"**: Verify the path to your service account JSON file
3. **"Permission denied"**: Ensure the sheet is shared with the service account email
4. **"Quota exceeded"**: The service account has reached its storage limit

### Getting Help

1. Run `node test_master_database.js --examples` to see usage examples
2. Check the console logs for detailed error messages
3. Verify your .env file contains the correct values
4. Ensure the Google Sheet is properly formatted and shared

## Performance Considerations

- The module caches the sheet connection to improve performance
- Bulk operations are more efficient than individual calls
- Consider implementing local caching for frequently accessed data
- Monitor API usage to avoid hitting Google's quotas