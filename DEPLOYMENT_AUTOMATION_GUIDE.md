# Google Forms Script Deployment Automation

## Overview

This automation tool uses Puppeteer to automatically deploy Google Apps Scripts directly into Google Forms via browser automation. It eliminates the need for manual script editor navigation and deployment.

## Features

- **Full Automation**: No manual steps required during deployment
- **Multi-Form Support**: Deploy to all 4 forms in sequence
- **Error Handling**: Robust retry logic and error capture
- **Screenshot Debugging**: Visual debugging with automatic screenshots
- **Authentication Management**: Handles Google OAuth flow
- **Verification Testing**: Automatic webhook testing after deployment
- **Comprehensive Reporting**: Detailed deployment status reports

## Quick Start

### 1. Install Dependencies

```bash
# Install automation dependencies
npm run deploy:scripts:setup
```

### 2. Run Deployment

```bash
# Run the automated deployment
npm run deploy:scripts
```

### 3. Manual Authentication

When prompted:
1. Complete Google authentication in the browser
2. Ensure you have edit access to all forms
3. The automation will handle the rest

## Files Deployed

The automation will deploy these scripts to their respective forms:

- **returning_students** (`1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA`): `corrected_scripts/returning_students_bound_script.js`
- **ats_qualifiers** (`1gGyfmy4NmEgAdZrbex0ffoqGlI1B_LuRUfzvQeOCHCQ`): `corrected_scripts/ats_qualifiers_bound_script.js`
- **website** (`1M3hRWVqCZbF1DhVGuFAzh68pWbLxyF9BZd_ShDrRzKg`): `corrected_scripts/website_bound_script.js`
- **early_bird** (`1IJVMLXOThuQE8WVI4bYiruJrTyxsznTomotkS2rfyYY`): `corrected_scripts/early_bird_bound_script.js`

## Automation Process

For each form, the automation:

1. **Navigates** to the Google Form edit URL
2. **Opens Script Editor** via the More (⋮) menu
3. **Clears** existing code in the Apps Script editor
4. **Deploys** the new form-bound script
5. **Saves** the project (Ctrl+S / Cmd+S)
6. **Tests** the webhook function if possible
7. **Captures** screenshots for debugging
8. **Reports** success/failure status

## Configuration

### Form Configuration

Edit `deploy_scripts_automation.js` to modify form configurations:

```javascript
const CONFIG = {
  forms: [
    {
      name: 'returning_students',
      id: '1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA',
      url: 'https://docs.google.com/forms/d/1mHTbp510IlULY5FkXXRuu8M3t1UiceLEkOr4gp_VSDA/edit',
      scriptPath: '/Users/rajeshpanchanathan/code/pre-sales-monitoring/corrected_scripts/returning_students_bound_script.js'
    }
    // ... more forms
  ]
};
```

### Timeouts and Retries

```javascript
timeouts: {
  navigation: 30000,  // Page navigation timeout
  element: 10000,     // Element wait timeout
  script: 5000,       // Script deployment timeout
  save: 15000         // Save operation timeout
},

retries: {
  maxAttempts: 3,     // Maximum retry attempts
  delay: 2000         // Delay between retries
}
```

### Screenshots

```javascript
screenshots: {
  enabled: true,      // Enable/disable screenshots
  directory: '/Users/rajeshpanchanathan/code/pre-sales-monitoring/screenshots'
}
```

## Troubleshooting

### Common Issues

#### 1. Authentication Problems

**Symptoms**: Browser stays on login page
**Solutions**:
- Ensure you have valid Google account access
- Clear browser cache/cookies
- Try incognito mode
- Check for 2FA requirements

#### 2. Script Editor Not Found

**Symptoms**: "Could not find Script editor option"
**Solutions**:
- Verify you have edit permissions on the form
- Try refreshing the form page
- Check Google Forms interface hasn't changed

#### 3. Permission Errors

**Symptoms**: "Authorization required" dialogs
**Solutions**:
- Complete authorization manually when prompted
- Ensure service account has proper permissions
- Check Google Apps Script execution policy

#### 4. Save Failures

**Symptoms**: Script deployed but not saved
**Solutions**:
- Manual save with Cmd+S/Ctrl+S
- Check for Google Apps Script editor errors
- Verify script syntax is valid

### Debug Information

The automation captures:

- **Screenshots**: Saved to `screenshots/` directory
- **Console Logs**: Detailed step-by-step progress
- **Deployment Report**: JSON report in `deployment_report.json`

### Manual Verification

After automation completes:

1. **Check Each Form**:
   - Go to form → More (⋮) → Script editor
   - Verify script is deployed correctly
   - Run `testWebhook()` function manually

2. **Test Form Submissions**:
   - Submit test data to each form
   - Check webhook endpoint receives data
   - Verify master sheet gets updated

3. **Check Triggers**:
   - Apps Script → Triggers tab
   - Ensure `onFormSubmit` trigger exists
   - Verify trigger is enabled

## Advanced Usage

### Run with Custom Configuration

```javascript
// Modify deploy_scripts_automation.js before running
const deployer = new GoogleFormsScriptDeployer();
await deployer.deploy();
```

### Headless Mode

For server deployment, enable headless mode:

```javascript
this.browser = await puppeteer.launch({
  headless: true,  // Run without browser UI
  // ... other options
});
```

### Custom Script Deployment

To deploy different scripts:

```javascript
// Modify the forms array in CONFIG
forms: [
  {
    name: 'CustomForm',
    id: 'your-form-id',
    url: 'https://docs.google.com/forms/d/your-form-id/edit',
    scriptPath: '/path/to/your/script.js'
  }
]
```

## Security Considerations

- **Credentials**: Never commit Google credentials to version control
- **Permissions**: Use least-privilege access for service accounts
- **Network**: Run on secure network connections
- **Audit**: Review deployment reports for security compliance

## Dependencies

- **puppeteer**: Browser automation framework
- **readline-sync**: Interactive command-line prompts
- **chalk**: Colored console output for better UX

## Output Files

After deployment:

- `deployment_report.json`: Comprehensive deployment status
- `screenshots/*.png`: Visual debugging screenshots
- Console logs with detailed progress information

## Support

For issues with the automation:

1. Check the deployment report for specific error details
2. Review screenshots for visual debugging
3. Verify all prerequisites are met
4. Test manual deployment steps first

## Next Steps

After successful deployment:

1. **Test All Forms**: Submit test data to verify webhook connectivity
2. **Monitor Logs**: Check Google Apps Script execution logs
3. **Verify Integration**: Ensure master sheet receives form data
4. **Set Up Monitoring**: Monitor form submission processing

---

**Note**: This automation requires active browser interaction for Google authentication. Ensure you're available to complete the OAuth flow during deployment.