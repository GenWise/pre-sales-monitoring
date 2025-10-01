# Notification System Setup Guide

## Overview

The pre-sales monitoring system includes a comprehensive notification system that sends alerts via:
- **Slack** - Rich interactive messages to #gsp26 channel
- **Email** - Professional HTML emails to the sales team

## Files Created

### Core Components
1. `/src/notifications/slackNotifier.js` - Slack webhook integration with rich message formatting
2. `/src/notifications/emailNotifier.js` - Gmail SMTP email sender with HTML templates
3. `/src/notifications/notificationManager.js` - Central coordinator with retry logic and rate limiting
4. `/test_notifications.js` - Comprehensive test script for all notification functions

### Features Implemented

#### Slack Notifications
- Rich interactive message blocks with lead details
- Action buttons for quick responses (call, email, dashboard)
- Different templates for new leads vs duplicates
- Priority indicators based on lead characteristics
- Error handling and retry logic

#### Email Notifications
- Professional HTML email templates
- Plain text fallbacks for accessibility
- Priority-based styling (high/medium/normal)
- Action links for immediate response
- Duplicate lead warnings with history

#### Notification Manager
- Centralized coordination of all notification types
- Rate limiting (10 notifications per 5-minute window)
- Retry logic with exponential backoff (3 attempts)
- Comprehensive error handling
- Statistics and monitoring

## Setup Instructions

### 1. Email Configuration (Already Working ✅)

The email system is already configured and tested successfully using:
- Gmail SMTP with app password authentication
- Recipients: gifted@genwise.in, eklavya@genwise.in, ashish@genwise.in

Current configuration in `.env`:
```env
GMAIL_USERNAME=rajesh@genwise.in
GMAIL_APP_PASSWORD=bdfn mpbc zmgk kaic
PRESALES_NOTIFICATION_EMAILS=gifted@genwise.in,eklavya@genwise.in,ashish@genwise.in
```

### 2. Slack Configuration (Needs Setup)

To enable Slack notifications:

#### Step 1: Create Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App" > "From scratch"
3. Name: "Pre-Sales Monitor"
4. Select your GenWise workspace

#### Step 2: Enable Incoming Webhooks
1. In your app settings, go to "Incoming Webhooks"
2. Toggle "Activate Incoming Webhooks" to ON
3. Click "Add New Webhook to Workspace"
4. Select the #gsp26 channel
5. Copy the webhook URL (starts with [REDACTED_SLACK_WEBHOOK]...)

#### Step 3: Update Configuration
Update your `.env` file:
```env
SLACK_WEBHOOK_URL=[REDACTED_SLACK_WEBHOOK]
```

## Testing the System

### Run All Tests
```bash
node test_notifications.js
```

### Run Specific Tests
```bash
# Test configuration
node test_notifications.js config

# Test connectivity
node test_notifications.js connectivity

# Test new lead notifications
node test_notifications.js new-lead

# Test duplicate notifications
node test_notifications.js duplicate

# Test error handling
node test_notifications.js errors
```

### Current Test Results
- **Email System**: ✅ Working (test email sent successfully)
- **Slack System**: ❌ Needs webhook URL configuration
- **Rate Limiting**: ✅ Working
- **Error Handling**: ✅ Working
- **Retry Logic**: ✅ Working

## Usage in Your Application

### Basic Usage
```javascript
const NotificationManager = require('./src/notifications/notificationManager');

const notificationManager = new NotificationManager();

// Send notifications for a new lead
const leadData = {
    id: 'lead-001',
    name: 'John Doe',
    email: 'john@company.com',
    phone: '+1-555-123-4567',
    company: 'ABC Corp',
    source: 'contact-form',
    message: 'Interested in your services'
};

const result = await notificationManager.sendNewLeadNotifications(leadData);

if (result.success) {
    console.log('Notifications sent successfully');
} else {
    console.log('Some notifications failed:', result.results);
}
```

### Advanced Usage
```javascript
// Send with custom options
const result = await notificationManager.sendNewLeadNotifications(leadData, {
    includeSlack: true,
    includeEmail: true,
    customRecipients: ['special@genwise.in'],
    priority: 'high'
});

// Send duplicate lead notification
const duplicateInfo = {
    firstSeen: '2024-01-15',
    lastContact: '2024-02-20',
    count: 3,
    status: 'contacted'
};

await notificationManager.sendDuplicateLeadNotifications(leadData, duplicateInfo);
```

### Integration with Lead Processing
```javascript
// In your lead processing pipeline
async function processNewLead(leadData) {
    try {
        // 1. Save to database/sheets
        await saveLeadToDatabase(leadData);

        // 2. Check for duplicates
        const duplicateInfo = await checkForDuplicates(leadData);

        // 3. Send appropriate notifications
        if (duplicateInfo) {
            await notificationManager.sendDuplicateLeadNotifications(leadData, duplicateInfo);
        } else {
            await notificationManager.sendNewLeadNotifications(leadData);
        }

        return { success: true };
    } catch (error) {
        console.error('Lead processing failed:', error);
        return { success: false, error: error.message };
    }
}
```

## Configuration Options

All settings can be customized in your `.env` file:

```env
# Slack Configuration
SLACK_WEBHOOK_URL=your_webhook_url
SLACK_CHANNEL=#gsp26

# Email Configuration
GMAIL_USERNAME=your_username
GMAIL_APP_PASSWORD=your_app_password
PRESALES_NOTIFICATION_EMAILS=email1@domain.com,email2@domain.com

# Rate Limiting
NOTIFICATION_RATE_LIMIT_WINDOW=300000  # 5 minutes in ms
NOTIFICATION_MAX_PER_WINDOW=10         # Max notifications per window

# Retry Configuration
NOTIFICATION_MAX_RETRIES=3             # Number of retry attempts
NOTIFICATION_RETRY_DELAY=2000          # Base delay in ms

# Dashboard URL (for action buttons)
DASHBOARD_URL=http://localhost:3000
```

## Monitoring and Logs

### Log Files
- `logs/slack-notifications.log` - Slack notification activity
- `logs/email-notifications.log` - Email notification activity
- `logs/notification-manager.log` - Overall system activity
- `logs/notification-test-results.json` - Detailed test results

### Monitoring Functions
```javascript
// Check configuration status
const status = notificationManager.getConfigurationStatus();

// Get statistics
const stats = notificationManager.getStatistics();

// Clear rate limits (for testing)
notificationManager.clearRateLimits();
```

## Troubleshooting

### Common Issues

#### Email Not Working
1. Verify Gmail app password is correct
2. Check if 2FA is enabled on the Gmail account
3. Ensure "Less secure app access" is not blocking (use app passwords instead)

#### Slack Not Working
1. Verify webhook URL is correct and complete
2. Check if the Slack app has proper permissions
3. Ensure the target channel exists and bot has access

#### Rate Limiting Issues
1. Check current rate limit status in logs
2. Adjust `NOTIFICATION_MAX_PER_WINDOW` if needed
3. Use `clearRateLimits()` for testing

### Error Codes
- `Rate limit exceeded` - Too many notifications sent recently
- `SMTP connection verification failed` - Gmail credentials issue
- `Slack webhook URL not configured` - Missing Slack setup

## Security Considerations

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use app passwords** - Don't use your main Gmail password
3. **Restrict webhook URLs** - Keep Slack webhooks private
4. **Monitor rate limits** - Prevent spam/abuse
5. **Validate input data** - Sanitize lead data before sending

## Next Steps

1. **Configure Slack webhook URL** to enable Slack notifications
2. **Test with real lead data** once fully configured
3. **Integrate with your lead processing pipeline**
4. **Monitor logs** for any issues in production
5. **Customize templates** as needed for your brand

The notification system is production-ready with the email component already working. Once you add the Slack webhook URL, both notification channels will be fully operational.