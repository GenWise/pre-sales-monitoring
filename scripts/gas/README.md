# Google Apps Script Files for Real-time Form Integration

This directory contains Google Apps Script files that enable real-time synchronization of form responses to your master database.

## Files

### `formTrigger.gs`
Main Google Apps Script code that handles form submissions and sends data to your webhook endpoint.

## Setup Instructions

### Step 1: Create the Webhook Endpoint

First, ensure you have a webhook endpoint running that can receive form data. You can use the forms integration module to create this endpoint.

### Step 2: Deploy Script to Each Form

For each of your 4 Google Forms, follow these steps:

1. **Open Google Apps Script**
   - Go to [script.google.com](https://script.google.com)
   - Click "New Project"

2. **Add the Script Code**
   - Delete the default `myFunction()` code
   - Copy and paste the entire contents of `formTrigger.gs`

3. **Configure the Script**
   - Update `WEBHOOK_URL` with your actual webhook endpoint
   - Update `FORM_SOURCE_TAG` with the correct tag:
     - Form 1: `'returning_students'`
     - Form 2: `'ats_qualifiers'`
     - Form 3: `'website'`
     - Form 4: `'early_bird'`

4. **Bind to the Form**
   - Click on "Resources" → "Current project's triggers" (or "Triggers" in new interface)
   - Click "Add Trigger"
   - Choose function: `onFormSubmit`
   - Event type: "From form"
   - Select event: "On form submit"
   - Save the trigger

5. **Test the Integration**
   - Run the `testIntegration()` function to verify everything works
   - Submit a test response to your form to confirm real-time sync

### Step 3: Alternative Deployment Method

If you prefer to bind the script directly to the form:

1. **From Google Form**
   - Open your Google Form
   - Click the three dots (⋮) menu
   - Select "Script editor"
   - This creates a script bound to your form

2. **Add the Code**
   - Replace the default code with `formTrigger.gs` contents
   - Update the configuration variables

3. **Set Up Trigger**
   - Run the `setupTrigger()` function once to automatically create the form submission trigger

## Configuration Variables

```javascript
// Update these in each deployed script
const WEBHOOK_URL = 'https://your-server.com/api/webhook/form-response';
const FORM_SOURCE_TAG = 'returning_students'; // returning_students, ats_qualifiers, website, or early_bird
```

## Available Functions

### `onFormSubmit(e)`
Main function triggered when a form is submitted. Automatically processes the response and sends it to your webhook.

### `setupTrigger()`
Run this once to automatically set up the form submission trigger.

### `testIntegration()`
Test function to verify the webhook connection is working properly.

### `getScriptInfo()`
Returns information about the current form and script configuration.

## Webhook Payload Format

The script sends data to your webhook in this format:

```json
{
  "formData": {
    "Parent Name": "John Doe",
    "Child Name": "Jane Doe",
    "Parent Email": "john@example.com",
    "Parent Mobile": "+1234567890",
    "Interest Level": "High",
    "responseId": "response-id-from-google",
    "submissionTime": "2024-01-01T12:00:00.000Z",
    "sourceTag": "returning_students",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "formId": "1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA"
  },
  "source": "google-apps-script",
  "version": "1.0"
}
```

## Error Handling

The script includes comprehensive error handling:

- **Logging**: All successes and errors are logged to the Google Apps Script console
- **Retry Logic**: Failed webhook calls can be retried manually
- **Data Validation**: Validates form data before sending
- **Graceful Degradation**: Continues working even if some fields are missing

## Monitoring

### View Logs
1. Go to Google Apps Script console
2. Click "Executions" to see recent runs
3. Click on any execution to see detailed logs

### Common Issues

1. **"Script not authorized"**
   - Run any function manually first to authorize the script
   - Grant necessary permissions when prompted

2. **"Webhook not responding"**
   - Verify your webhook URL is correct and accessible
   - Check if your server is running

3. **"No form attached"**
   - Make sure the script is bound to a form
   - Or use the manual trigger setup method

4. **"Trigger not firing"**
   - Verify the trigger is set up correctly
   - Run `setupTrigger()` to recreate triggers

## Security Considerations

- The script only sends form response data, not form configuration
- Use HTTPS for webhook URLs
- Consider adding authentication to your webhook endpoint
- Review Apps Script permissions regularly

## Testing

### Manual Testing
1. Run `testIntegration()` function
2. Check the logs for success/error messages
3. Verify data appears in your master database

### Live Testing
1. Submit a test response to your form
2. Check Google Apps Script execution logs
3. Verify the data appears in your master database
4. Confirm duplicate detection is working

## Troubleshooting

### Script Execution Errors
- Check the "Executions" tab in Google Apps Script
- Look for error messages in the logs
- Verify all configuration variables are set correctly

### Webhook Connection Issues
- Test your webhook URL directly with a tool like Postman
- Check server logs for incoming requests
- Verify the webhook endpoint accepts POST requests

### Form Data Issues
- Use `getScriptInfo()` to verify form binding
- Check that form field names match expected patterns
- Verify the form is accepting responses

## Performance Notes

- Scripts have a 6-minute execution time limit
- Consider batching if you expect high volumes
- The webhook approach is more efficient than polling
- Google Apps Script has daily quotas for external requests

## Support

If you encounter issues:

1. Check the Google Apps Script execution logs
2. Verify your webhook endpoint is working
3. Test with the `testIntegration()` function
4. Review the form field mappings in your webhook handler