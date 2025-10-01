# Pre-Sales Monitoring System - Deployment Guide

## Overview
This guide covers the complete deployment process for the pre-sales monitoring system to your giftedworld.org self-hosted WordPress environment.

## Architecture
```
Google Forms → Google Sheets → Dashboard (dashboard.giftedworld.org)
     ↓              ↓                    ↓
Notifications   FreshSales Sync    Real-time Updates
```

## Pre-Deployment Checklist

### 1. ✅ System Requirements
- [x] Node.js v16+ installed
- [x] NPM dependencies installed
- [x] Google Service Account configured
- [x] Gmail SMTP credentials ready
- [x] FreshSales API access (permissions pending)

### 2. 🔧 Manual Setup Required

#### Google Sheets Master Database
1. **Create Master Sheet** (follow manual_sheet_setup.md)
   - Create new Google Sheet: "Pre-sales Monitoring Master Database"
   - Set up columns: Child Name, Parent Name, Parent Email, etc.
   - Configure data validation dropdowns
   - Share with service account: `sheets-and-python-340711@sheets-and-python-340711.iam.gserviceaccount.com`
   - Update `.env`: `PRESALES_MASTER_SHEET_ID=YOUR_SHEET_ID`

#### Google Forms Integration
1. **Form Response Sheet Access**
   - Share each form's response sheet with service account
   - Grant "Editor" permissions
   - Test access with: `node test_forms_integration.js`

#### Slack Webhook Setup
1. **Create Slack App**
   - Go to https://api.slack.com/apps
   - Create "Pre-Sales Monitor" app
   - Enable Incoming Webhooks
   - Add to #gsp26 channel
   - Update `.env`: `SLACK_WEBHOOK_URL=[REDACTED_SLACK_WEBHOOK]...`

### 3. 📊 FreshSales API Permissions
**Current Status**: Limited permissions (read-only metadata)
**Required**: Contact read/write permissions

**Contact your FreshSales admin with:**
```
Subject: API Permissions Request - Pre-sales Integration

API Key: N4wWW4utZkWt83cooXIuWA
Domain: genwisecrm.myfreshworks.com

Required Permissions:
- Contact Read (/api/contacts GET)
- Contact Write (/api/contacts POST)
- Contact Update (/api/contacts PUT)
- Activities/Notes (/api/activities)

Current Issue: 403 Forbidden on contact endpoints
```

## Deployment Options

### Option 1: Self-Hosted WordPress Subdomain (Recommended)
**Target**: `dashboard.giftedworld.org`

#### Steps:
1. **Create Subdomain in cPanel/Admin Panel**
   ```bash
   # Create subdomain pointing to /public_html/dashboard/
   Subdomain: dashboard
   Document Root: /public_html/dashboard/
   ```

2. **Upload Dashboard Files**
   ```bash
   # Copy dashboard files to WordPress server
   scp -r src/dashboard/* user@giftedworld.org:/public_html/dashboard/
   ```

3. **Configure API Access**
   - Enable Google Sheets API v4 in Google Cloud Console
   - Add domain to CORS: `dashboard.giftedworld.org`
   - Update `js/api.js` with production settings

### Option 2: WordPress Page Integration
**Target**: `giftedworld.org/pre-sales-dashboard`

#### Steps:
1. **Create WordPress Page**
   - New Page: "Pre-sales Dashboard"
   - Use Custom HTML block or create custom template

2. **Embed Dashboard**
   ```html
   <!-- WordPress page content -->
   <div id="dashboard-container">
     <iframe src="/dashboard-static/index.html"
             width="100%"
             height="100%"
             frameborder="0">
     </iframe>
   </div>
   ```

### Option 3: Static File Hosting
**Target**: Upload to `/public_html/dashboard-static/`

## Backend Services Deployment

### 1. Node.js Backend (Optional)
If you want server-side processing:

```bash
# On your server
cd /var/www/pre-sales-api/
npm install
pm2 start server.js --name "pre-sales-api"
pm2 save
pm2 startup
```

### 2. Webhook Endpoint
For real-time Google Forms integration:

```bash
# Configure webhook endpoint
node webhook-example.js --port 3001
```

## Environment Configuration

### Production .env File
Create `/var/www/pre-sales-monitoring/.env`:
```bash
# Copy from user-level .env
cp ~/.env /var/www/pre-sales-monitoring/.env

# Add production-specific variables
echo "NODE_ENV=production" >> .env
echo "DASHBOARD_URL=https://dashboard.giftedworld.org" >> .env
echo "API_BASE_URL=https://giftedworld.org/api/pre-sales" >> .env
```

## SSL Certificate Setup

### Let's Encrypt (Recommended)
```bash
# Install certbot
sudo snap install --classic certbot

# Generate certificate for subdomain
sudo certbot --nginx -d dashboard.giftedworld.org
```

## Monitoring & Maintenance

### 1. Log Files
```bash
# Application logs
tail -f /var/log/pre-sales-monitoring/app.log

# Error monitoring
tail -f /var/log/pre-sales-monitoring/error.log
```

### 2. Health Checks
```bash
# Test all components
npm run health-check

# Test individual services
npm run test:sheets
npm run test:forms
npm run test:notifications
npm run test:freshsales
```

### 3. Automated Backups
```bash
# Daily backup of Google Sheets data
0 2 * * * /usr/local/bin/backup-sheets.sh
```

## Testing Deployment

### 1. Pre-deployment Tests
```bash
# Run full test suite
npm test

# Test with production settings
npm run test:production
```

### 2. Post-deployment Verification
1. **Dashboard Access**: Visit dashboard.giftedworld.org
2. **API Connectivity**: Check Google Sheets integration
3. **Form Integration**: Submit test form entry
4. **Notifications**: Verify Slack/Email alerts
5. **Mobile Responsiveness**: Test on various devices

## Troubleshooting

### Common Issues

#### 1. Google Sheets API 403 Error
```bash
# Check service account permissions
# Verify spreadsheet sharing settings
# Confirm API is enabled in Google Cloud Console
```

#### 2. Slack Notifications Not Working
```bash
# Verify webhook URL in .env
# Check channel permissions
# Test webhook: curl -X POST -H 'Content-type: application/json' --data '{"text":"Test"}' $SLACK_WEBHOOK_URL
```

#### 3. Dashboard Loading Issues
```bash
# Check CORS settings
# Verify file permissions
# Check browser console for errors
```

## Performance Optimization

### 1. Caching
- Enable browser caching for static assets
- Implement Google Sheets data caching (5-minute intervals)
- Use CDN for Chart.js and other libraries

### 2. Database Optimization
- Index important columns in Google Sheets
- Implement pagination for large datasets
- Use batch operations for bulk updates

## Security Considerations

### 1. API Security
- Never expose API keys in client-side code
- Implement rate limiting on webhook endpoints
- Use HTTPS for all communications

### 2. Data Privacy
- Implement data retention policies
- Regular audit of access logs
- Secure storage of credentials

## Maintenance Schedule

### Daily
- [ ] Monitor notification delivery
- [ ] Check error logs
- [ ] Verify form submissions

### Weekly
- [ ] Review lead conversion metrics
- [ ] Update dashboard if needed
- [ ] Test backup systems

### Monthly
- [ ] Update dependencies
- [ ] Security audit
- [ ] Performance review

## Support & Documentation

- **Setup Issues**: See individual component README files
- **API Problems**: Check FRESHSALES_INTEGRATION.md
- **Dashboard Issues**: Check src/dashboard/README.md
- **Form Integration**: Check FORMS_INTEGRATION.md

## Next Steps After Deployment

1. **User Training**: Train sales team on dashboard features
2. **Data Migration**: Import existing lead data if needed
3. **Process Integration**: Align with current sales workflow
4. **Monitoring Setup**: Configure alerts and reporting
5. **Continuous Improvement**: Gather feedback and iterate

---

**Deployment Status Tracking:**
- [ ] Google Sheets Setup Complete
- [ ] Slack Webhook Configured
- [ ] Dashboard Deployed
- [ ] Forms Integration Active
- [ ] FreshSales Permissions Obtained
- [ ] SSL Certificate Installed
- [ ] Monitoring Configured
- [ ] User Training Complete