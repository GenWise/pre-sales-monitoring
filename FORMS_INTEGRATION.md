# Google Forms Integration for Pre-sales Monitoring

This document provides comprehensive documentation for the Google Forms integration system that automatically syncs form responses to your master database.

## Overview

The integration system consists of:

1. **Field Mapping Configuration** (`/src/sheets/formsMapping.js`) - Defines how form fields map to master database
2. **Forms Integration Module** (`/src/sheets/formsIntegration.js`) - Node.js module for processing responses
3. **Google Apps Script** (`/scripts/gas/formTrigger.gs`) - Real-time webhook triggers
4. **Webhook Server** (`webhook-example.js`) - Express server for receiving form data
5. **Test Suite** (`test_forms_integration.js`) - Comprehensive testing tools

## Quick Start

### 1. Installation

All required dependencies are already in your `package.json`. If needed:

```bash
npm install
```

### 2. Configuration

Make sure your `.env` file has:

```env
PRESALES_MASTER_SHEET_ID=your_master_sheet_id
GOOGLE_SERVICE_ACCOUNT_FILE=./credentials/service-account.json
```

### 3. Test the Integration

```bash
# Test all form connections
npm run test:forms

# Test field mapping only
npm run test:forms:mapping

# Show setup instructions
npm run test:forms:setup
```

### 4. Start the Webhook Server

```bash
# Production
npm run webhook:start

# Development with auto-restart
npm run webhook:dev
```

## Form Configuration

The system is pre-configured for your 4 Google Forms:

| Form | ID | Source Tag | Description |
|------|----|-----------| ------------|
| Form 1 | `1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA` | `returning_students` | Pre-sales Form 1 |
| Form 2 | `1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ` | `ats_qualifiers` | Pre-sales Form 2 |
| Form 3 | `1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg` | `website` | Pre-sales Form 3 |
| Form 4 | `1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY` | `early_bird` | Pre-sales Form 4 |

## Field Mapping

The system automatically maps common form field variations to your master database schema:

### Master Database Fields

- **Child Name** - Name of the student
- **Parent Name** - Name of the parent/guardian
- **Parent Email** - Primary contact email (key for duplicate detection)
- **Parent Mobile** - Contact phone number
- **Interest Level** - High/Medium/Low priority
- **Source Tag** - returning_students, ats_qualifiers, website, or early_bird
- **Timestamp** - When the response was received
- **Duplicate Flag** - Automatically detected duplicates
- **Status** - Lead processing status
- **Assigned Owner** - Sales person assigned
- **Notes** - Additional information

### Supported Form Field Variations

The system recognizes many field name variations:

**Child/Student Names:**
- "Child Name", "Child's Name", "Student Name", "Name of Child", "Kid Name", "Learner Name"

**Parent Names:**
- "Parent Name", "Guardian Name", "Your Name", "Father's Name", "Mother's Name", "Contact Person"

**Email Fields:**
- "Email", "Email Address", "Parent Email", "Guardian Email", "Contact Email", "Your Email"

**Phone Fields:**
- "Mobile", "Phone", "Contact Number", "Parent Mobile", "WhatsApp Number", "Phone Number"

**Interest Level:**
- "Interest Level", "How interested are you?", "Priority", "Urgency", "How likely are you to enroll?"

## Real-time Sync Setup

### 1. Deploy Google Apps Script

For each form:

1. Go to [script.google.com](https://script.google.com)
2. Create a new project
3. Copy contents of `/scripts/gas/formTrigger.gs`
4. Update these variables:
   ```javascript
   const WEBHOOK_URL = 'https://your-server.com/api/webhook/form-response';
   const FORM_SOURCE_TAG = 'returning_students'; // Change for each form
   ```

### 2. Set up Form Triggers

Run the `setupTrigger()` function in your Apps Script to automatically create form submission triggers.

### 3. Test the Integration

Use the `testIntegration()` function in Apps Script to verify everything works.

## API Endpoints

When running the webhook server, these endpoints are available:

### `POST /api/webhook/form-response`
Main webhook endpoint for receiving form submissions from Google Apps Script.

### `GET /api/health`
Health check endpoint showing system status.

### `POST /api/process-all-forms`
Manually process all form responses in batch mode.

### `GET /api/test-connections`
Test connections to all configured forms.

### `GET /api/stats`
Get processing statistics and database metrics.

### `POST /api/reset-state`
Reset processing state (useful for testing).

## Usage Examples

### Basic Form Processing

```javascript
const FormsIntegration = require('./src/sheets/formsIntegration');

// Initialize
const integration = new FormsIntegration();
await integration.initialize();

// Process all forms
const results = await integration.processAllForms();
console.log(`Processed ${results.totalAdded} new leads, ${results.totalDuplicates} duplicates`);
```

### Process Specific Form

```javascript
// Process by form key
const result = await integration.pullFormResponses('form1');

// Process by form ID
const result = await integration.processFormById('1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA');
```

### Test Form Connections

```javascript
// Test all forms
const connections = await integration.testAllFormConnections();

// Test specific form
const result = await integration.testFormConnection('form1');
```

### Custom Field Mapping

```javascript
const { FormMappingUtils } = require('./src/sheets/formsMapping');

// Map custom form response
const formData = {
    'Student Name': 'John Doe',
    'Guardian Email': 'parent@example.com'
};

const mapped = FormMappingUtils.mapFormResponse(formData, FORMS_CONFIG.form1);
const formatted = FormMappingUtils.formatForMasterDatabase(mapped);
```

## Duplicate Detection

The system automatically detects duplicates based on:

1. **Email matching** (case-insensitive)
2. **Phone number matching** (exact match)

When a duplicate is found:
- The record is still added to maintain audit trail
- `Duplicate Flag` is set to "Yes"
- Processing statistics track duplicate counts

## Error Handling

The system includes comprehensive error handling:

### Form Access Errors
- Invalid form IDs
- Permission denied (service account not shared)
- Network connectivity issues

### Data Validation Errors
- Missing required fields (email or contact info)
- Invalid data formats
- Field mapping failures

### Database Errors
- Google Sheets API quota exceeded
- Connection timeouts
- Invalid data types

### Recovery Strategies

1. **Retry Logic**: Automatic retries for transient failures
2. **Graceful Degradation**: Skip problematic records, continue processing
3. **Error Logging**: Detailed logs for troubleshooting
4. **Manual Recovery**: Tools to reprocess failed records

## Performance Considerations

### API Limits
- Google Sheets API: 100 requests per 100 seconds per user
- Google Apps Script: 6-minute execution limit
- Form responses API: Read quotas apply

### Optimization Strategies
1. **Batch Processing**: Process multiple responses together
2. **Incremental Updates**: Only process new responses
3. **Connection Reuse**: Maintain persistent connections
4. **Rate Limiting**: Respect API quotas

### Monitoring
- Processing statistics tracking
- Error rate monitoring
- Performance metrics logging
- Health check endpoints

## Security

### Authentication
- Service account credentials for Google APIs
- Webhook endpoints can be secured with API keys
- HTTPS recommended for production webhooks

### Data Privacy
- Form responses processed in real-time
- No permanent storage of sensitive data in transit
- Access logs for audit purposes

### Permissions
- Minimum required Google API scopes
- Read-only access to form responses
- Write access only to master database

## Troubleshooting

### Common Issues

**"No configuration found for form"**
- Check form ID in formsMapping.js
- Verify FORM_SOURCE_TAG in Google Apps Script

**"Permission denied"**
- Share form response sheets with service account email
- Check Google API credentials

**"Failed to connect to Google Sheets"**
- Verify PRESALES_MASTER_SHEET_ID in .env
- Check service account file path
- Ensure sheet is shared with service account

**"Webhook not responding"**
- Verify webhook server is running
- Check WEBHOOK_URL in Google Apps Script
- Test with curl or Postman

### Debug Tools

```bash
# Test form connections
npm run test:forms

# Test field mapping with sample data
npm run test:forms:mapping

# Show detailed setup instructions
npm run test:forms:setup

# Start webhook server with debug logging
npm run webhook:dev
```

### Log Analysis

Check these logs for troubleshooting:
- Google Apps Script execution logs
- Webhook server console output
- Google Sheets API error messages
- Master database processing logs

## Monitoring and Maintenance

### Regular Tasks

1. **Monitor Processing Statistics**
   ```bash
   curl http://localhost:3000/api/stats
   ```

2. **Test Form Connections Weekly**
   ```bash
   curl http://localhost:3000/api/test-connections
   ```

3. **Review Error Logs**
   - Check Google Apps Script executions
   - Review webhook server logs
   - Monitor duplicate detection accuracy

### Performance Monitoring

- Track processing times
- Monitor API quota usage
- Watch for increase in error rates
- Review duplicate detection effectiveness

### Scaling Considerations

- Consider database sharding for high volumes
- Implement queue systems for batch processing
- Add load balancing for webhook endpoints
- Monitor memory usage for large datasets

## Advanced Configuration

### Custom Field Mappings

Edit `/src/sheets/formsMapping.js` to add new field mappings:

```javascript
// Add new field mappings
'Custom Field Name': MASTER_FIELDS.NOTES,

// Add interest level mappings
interestLevelMapping: {
    'Very Interested': 'High',
    'Custom Level': 'Medium'
}
```

### Additional Forms

To add a new form:

1. Add configuration to `FORMS_CONFIG` in formsMapping.js
2. Deploy Google Apps Script with appropriate SOURCE_TAG
3. Share form response sheet with service account
4. Test connection with `testFormConnection()`

### Webhook Customization

Extend the webhook server in `webhook-example.js`:

```javascript
// Add custom processing logic
app.post('/api/webhook/custom-form', async (req, res) => {
    // Custom form processing
});

// Add authentication
app.use('/api/webhook', authenticateRequest);
```

## Support and Maintenance

For issues or questions:

1. Check the troubleshooting section
2. Run the test suite to identify problems
3. Review Google Apps Script execution logs
4. Verify service account permissions
5. Test webhook connectivity

The integration system is designed to be robust and self-healing, but regular monitoring ensures optimal performance.