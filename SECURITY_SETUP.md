# Security Setup Guide - Environment Variables

This guide explains how to securely configure the pre-sales monitoring system after the security fix for leaked API keys.

## Overview

All hardcoded API keys and credentials have been removed from the codebase and replaced with environment variable references. You must now configure these variables before the system will function.

## Quick Setup

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the .env file with your actual values:**
   ```bash
   # Use your preferred editor
   nano .env
   # or
   code .env
   ```

## Required Environment Variables

### Google Sheets API
```bash
GOOGLE_SHEETS_API_KEY=your_actual_api_key_here
```
- Get from: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Used for: Dashboard data fetching, webhook processing

### FreshSales CRM
```bash
FRESHSALES_API_KEY=your_actual_freshsales_key_here
FRESHSALES_DOMAIN=your_domain.myfreshworks.com
```
- Get from: FreshSales Admin Settings → API Settings
- Used for: CRM integration and bidirectional sync

## Production Deployment

### For PHP (Shared Hosting)
Set environment variables in your hosting control panel or use:
```php
putenv('GOOGLE_SHEETS_API_KEY=your_key_here');
putenv('FRESHSALES_API_KEY=your_key_here');
```

### For Node.js Applications
Ensure your .env file is in the root directory and use:
```javascript
require('dotenv').config();
```

### For Docker
Use environment files or pass variables directly:
```bash
docker run -e GOOGLE_SHEETS_API_KEY=your_key_here your_app
```

## Security Best Practices Applied

✅ **Removed hardcoded credentials** - No API keys in source code
✅ **Environment variable pattern** - All secrets via ENV vars
✅ **Enhanced .gitignore** - Prevents future credential leaks
✅ **Template configuration** - .env.example shows required vars
✅ **Documentation updated** - All references use ENV var names

## Verification

After setting up environment variables, test the system:

1. **Dashboard access:** Visit your dashboard URL
2. **API connectivity:** Check browser console for errors
3. **Data loading:** Verify leads appear in dashboard
4. **FreshSales sync:** Run test scripts if applicable

## What Was Fixed

The security alert identified these leaked credentials:
- Google Sheets API key: `AIzaSy...` (now removed)
- FreshSales API key: `awiMf4...` (now removed)

All instances across 6+ files have been replaced with environment variable references.

## Support

If you encounter issues after setup:
1. Verify all required environment variables are set
2. Check variable names match exactly (case-sensitive)
3. Ensure API keys are valid and have proper permissions
4. Review application logs for specific error messages

The system is now secure and follows industry best practices for credential management.