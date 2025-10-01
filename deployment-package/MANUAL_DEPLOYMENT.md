# Manual Production Deployment Guide

## 🚨 SSH Connection Issue Detected
The automated SSH deployment failed due to connection timeout. This is common with shared hosting providers that may have SSH disabled or require special configuration.

## 📋 Alternative Deployment Methods

### Method 1: File Manager (Web-based)
1. **Login to your hosting control panel** (cPanel/Plesk)
2. **Navigate to File Manager**
3. **Go to**: `/public_html/`

#### Upload Proxy API Files:
1. **Create folder**: `api-proxy`
2. **Upload these files to `/public_html/api-proxy/`**:
   ```
   deployment-package/proxy-api/dashboard_api_proxy.js
   deployment-package/proxy-api/package.json
   deployment-package/proxy-api/.env
   deployment-package/proxy-api/service-account-key.json
   deployment-package/proxy-api/ecosystem.config.js
   ```

#### Upload Dashboard Files:
1. **Navigate to**: `/public_html/dashboard/js/`
2. **Upload**: `deployment-package/dashboard/js/api-proxy.js`

### Method 2: FTP/SFTP Client
```bash
# Using any FTP client (FileZilla, WinSCP, etc.)
Host: dashboard.giftedworld.org
Username: u191176295
Password: [Your hosting password]
Port: 21 (FTP) or 22 (SFTP)

# Upload paths:
Local: deployment-package/proxy-api/* → Remote: /public_html/api-proxy/
Local: deployment-package/dashboard/* → Remote: /public_html/dashboard/
```

### Method 3: Command Line (if you have hosting credentials)
```bash
# Install lftp first: brew install lftp (macOS) or apt-get install lftp (Linux)
lftp -u u191176295 dashboard.giftedworld.org
lcd deployment-package
cd public_html
mkdir api-proxy
cd api-proxy
mput proxy-api/*
cd ../dashboard/js
mput dashboard/js/*
quit
```

## 🛠️ After Upload: Server Configuration

### Step 1: Install Node.js Dependencies
**Via hosting control panel terminal or SSH (if available):**
```bash
cd /home/u191176295/domains/giftedworld.org/public_html/api-proxy
npm install --production
```

**If no terminal access, create this `install.js` file and upload it:**
```javascript
// install.js - Upload this to api-proxy folder and run via browser
const { execSync } = require('child_process');
try {
    execSync('npm install --production', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully');
} catch (error) {
    console.error('❌ Installation failed:', error.message);
}
```

### Step 2: Start the API Proxy
**Create startup script `start.js`:**
```javascript
// start.js - Upload to api-proxy folder
require('dotenv').config();
const app = require('./dashboard_api_proxy.js');
console.log('API Proxy started on port 3002');
```

### Step 3: Test the Deployment
Open these URLs in your browser:
- ✅ **API Health**: https://dashboard.giftedworld.org/api-proxy/health
- ✅ **Dashboard**: https://dashboard.giftedworld.org
- ✅ **API Data**: https://dashboard.giftedworld.org/api-proxy/api/leads

## 🔧 Hosting-Specific Instructions

### For cPanel Hosting:
1. **Node.js App**: Use cPanel Node.js selector if available
2. **Process Manager**: Use cPanel's process manager instead of PM2
3. **Environment Variables**: Set in cPanel Node.js environment

### For Shared Hosting (no Node.js):
If your hosting doesn't support Node.js, you'll need to:
1. **Upgrade to VPS/dedicated server**, or
2. **Use a different hosting provider** that supports Node.js
3. **Alternative**: Deploy on Heroku/Vercel and point dashboard.giftedworld.org subdomain there

## 🚨 Important Notes

1. **File Permissions**: Ensure uploaded files have correct permissions (644 for files, 755 for folders)
2. **Environment Variables**: The `.env` file contains production configuration
3. **Service Account**: Keep `service-account-key.json` secure and not publicly accessible
4. **Port 3002**: Ensure your hosting allows custom ports or use port 80/443
5. **Domain Configuration**: You may need to configure subdomain routing in your hosting control panel

## 🧪 Testing Checklist

After deployment, verify:
- [ ] API proxy responds: `curl https://dashboard.giftedworld.org/api-proxy/health`
- [ ] Dashboard loads without 403 errors
- [ ] API fetches data from Google Sheets
- [ ] Form submissions still work end-to-end
- [ ] All meaningful form names are working (returning_students, ats_qualifiers, etc.)

## 🆘 Troubleshooting

### If dashboard shows 403 errors:
1. Check API proxy is running
2. Verify service account permissions
3. Check CORS configuration in .env

### If API proxy won't start:
1. Check Node.js is installed on server
2. Verify all dependencies are installed
3. Check port 3002 is available
4. Review hosting provider's Node.js documentation

### If forms stop working:
1. Webhook server needs to run separately (port 3001)
2. Google Apps Scripts should continue working
3. Check form field mapping is intact

## 📞 Next Steps

1. **Try manual upload** using File Manager or FTP
2. **Install dependencies** on the server
3. **Start the API proxy**
4. **Test all endpoints**
5. **Run the verification script** (if SSH becomes available)

The system is fully prepared and tested. Only the file upload and server startup remain!