# Dashboard Subdomain Setup Guide
## Setting up dashboard.giftedworld.org on Self-Hosted WordPress

This guide covers setting up a subdomain for your Pre-Sales Monitoring Dashboard on a self-hosted WordPress environment.

## Overview
- **Main Site**: giftedworld.org (WordPress)
- **Subdomain**: dashboard.giftedworld.org (Static HTML Dashboard)
- **Dashboard Files**: Located at `/Users/rajeshpanchanathan/code/pre-sales-monitoring/src/dashboard/`

## Prerequisites
- Admin access to hosting control panel
- FTP/SFTP access or File Manager access
- Access to DNS management (usually through hosting provider)

---

## Method 1: cPanel Setup (Most Common)

### Step 1: Create the Subdomain
1. **Login to cPanel**
   - Access your hosting provider's cPanel
   - Look for "Subdomains" under "Domains" section

2. **Add New Subdomain**
   - Subdomain: `dashboard`
   - Domain: `giftedworld.org` (select from dropdown)
   - Document Root: `/public_html/dashboard` (auto-generated, note this path)
   - Click "Create"

### Step 2: Upload Dashboard Files
1. **Access File Manager**
   - Go to "File Manager" in cPanel
   - Navigate to `/public_html/dashboard/` directory

2. **Upload Files**
   - Delete the default `index.html` if present
   - Upload all files from your local dashboard directory:
     ```
     /dashboard/
     ├── index.html
     ├── css/
     │   └── styles.css
     └── js/
         ├── dashboard.js
         └── api.js
     ```

3. **Set File Permissions**
   - Select all uploaded files
   - Set permissions to `644` for files
   - Set permissions to `755` for directories

### Step 3: SSL Certificate Setup
1. **Let's Encrypt (Free)**
   - Go to "SSL/TLS" → "Let's Encrypt"
   - Add `dashboard.giftedworld.org` to certificate
   - Click "Issue"

2. **Force HTTPS Redirect**
   - Create/edit `.htaccess` in `/public_html/dashboard/`:
   ```apache
   RewriteEngine On
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   ```

---

## Method 2: Plesk Setup

### Step 1: Create Subdomain
1. **Login to Plesk**
   - Go to "Websites & Domains"
   - Click "Add Subdomain"

2. **Configure Subdomain**
   - Subdomain name: `dashboard`
   - Document root: `/httpdocs/dashboard`
   - Click "OK"

### Step 2: Upload Files
1. **File Manager**
   - Navigate to `Websites & Domains` → `dashboard.giftedworld.org`
   - Click "File Manager"
   - Go to `/httpdocs/` directory

2. **Upload Dashboard Files**
   - Upload the entire dashboard structure
   - Ensure proper file permissions (644 for files, 755 for directories)

### Step 3: SSL Setup
1. **SSL/TLS Certificates**
   - Go to subdomain settings
   - Click "SSL/TLS Certificates"
   - Select "Let's Encrypt" and issue certificate

---

## Method 3: DirectAdmin Setup

### Step 1: Create Subdomain
1. **Login to DirectAdmin**
   - Go to "Subdomain Management"
   - Click "Add Subdomain"

2. **Add Subdomain**
   - Subdomain: `dashboard`
   - Domain: Select `giftedworld.org`
   - Click "Add"

### Step 2: File Upload
1. **File Manager Access**
   - Go to "File Manager"
   - Navigate to `/domains/giftedworld.org/public_html/dashboard/`

2. **Upload Process**
   - Remove default files
   - Upload your dashboard files maintaining directory structure

---

## Method 4: Manual DNS + Directory Setup (Advanced)

### Step 1: DNS Configuration
If your hosting provider doesn't support subdomain creation through control panel:

1. **DNS Management**
   - Access your domain's DNS settings
   - Add A Record:
     - Name: `dashboard`
     - Type: `A`
     - Value: `[Your server IP address]`
     - TTL: `3600`

2. **Alternative: CNAME Record**
   - Name: `dashboard`
   - Type: `CNAME`
   - Value: `giftedworld.org`
   - TTL: `3600`

### Step 2: Server Configuration
1. **Apache Virtual Host** (if you have access)
   ```apache
   <VirtualHost *:80>
       ServerName dashboard.giftedworld.org
       DocumentRoot /path/to/public_html/dashboard
       ErrorLog ${APACHE_LOG_DIR}/dashboard_error.log
       CustomLog ${APACHE_LOG_DIR}/dashboard_access.log combined
   </VirtualHost>

   <VirtualHost *:443>
       ServerName dashboard.giftedworld.org
       DocumentRoot /path/to/public_html/dashboard
       SSLEngine on
       SSLCertificateFile /path/to/certificate.crt
       SSLCertificateKeyFile /path/to/private.key
   </VirtualHost>
   ```

2. **Nginx Configuration** (alternative)
   ```nginx
   server {
       listen 80;
       server_name dashboard.giftedworld.org;
       root /path/to/public_html/dashboard;
       index index.html;

       location / {
           try_files $uri $uri/ =404;
       }
   }
   ```

---

## File Upload Checklist

### Required File Structure
```
/public_html/dashboard/
├── index.html              (Main dashboard file)
├── css/
│   └── styles.css         (Dashboard styles)
└── js/
    ├── dashboard.js       (Main dashboard logic)
    └── api.js            (API integration)
```

### File Permissions
- **Directories**: `755` (rwxr-xr-x)
- **Files**: `644` (rw-r--r--)

### Upload Methods
1. **File Manager** (Control Panel)
2. **FTP/SFTP Client** (FileZilla, WinSCP)
3. **SSH/Terminal** (for advanced users)

---

## Testing Your Setup

### Step 1: Basic Connectivity
1. **DNS Propagation Check**
   ```bash
   nslookup dashboard.giftedworld.org
   ```

2. **Browser Test**
   - Visit `http://dashboard.giftedworld.org`
   - Verify page loads correctly

### Step 2: HTTPS Verification
1. **SSL Certificate Check**
   - Visit `https://dashboard.giftedworld.org`
   - Check for valid SSL certificate (green lock icon)

2. **SSL Testing Tools**
   - Use SSL Labs Test: `https://www.ssllabs.com/ssltest/`
   - Enter: `dashboard.giftedworld.org`

### Step 3: Functionality Testing
1. **Dashboard Features**
   - Verify all CSS and JS files load
   - Test dashboard functionality
   - Check browser console for errors

2. **Mobile Responsiveness**
   - Test on mobile devices
   - Verify responsive design works

---

## Troubleshooting Common Issues

### Issue 1: Subdomain Not Accessible
**Symptoms**: "Site can't be reached" or 404 errors

**Solutions**:
1. Check DNS propagation (can take 24-48 hours)
2. Verify subdomain creation in hosting control panel
3. Check document root path is correct
4. Ensure files are uploaded to correct directory

### Issue 2: CSS/JS Files Not Loading
**Symptoms**: Dashboard appears unstyled or non-functional

**Solutions**:
1. Verify file paths in `index.html` are correct
2. Check file permissions (644 for files, 755 for directories)
3. Ensure files uploaded to correct subdirectory structure
4. Check browser console for 404 errors

### Issue 3: SSL Certificate Issues
**Symptoms**: "Not secure" warning or SSL errors

**Solutions**:
1. Wait for Let's Encrypt certificate propagation (up to 1 hour)
2. Check if subdomain is included in SSL certificate
3. Force HTTPS redirect with `.htaccess`
4. Contact hosting provider for SSL support

### Issue 4: Mixed Content Warnings
**Symptoms**: HTTPS page loading HTTP resources

**Solutions**:
1. Ensure all external resources use HTTPS
2. Check for hardcoded HTTP links in dashboard files
3. Update any HTTP CDN links to HTTPS versions

---

## Alternative Approaches

### Option 1: WordPress Subdirectory
If subdomain creation is complex:

1. **Create Directory**
   - Create `/public_html/dashboard/` manually
   - Upload files directly

2. **Access Via**
   - `https://giftedworld.org/dashboard/`
   - No DNS changes required

### Option 2: Third-Party Hosting
For maximum simplicity:

1. **Netlify/Vercel**
   - Host dashboard on free tier
   - Point custom domain `dashboard.giftedworld.org`

2. **GitHub Pages**
   - Upload to GitHub repository
   - Enable Pages with custom domain

### Option 3: Cloudflare Pages
1. **Connect Repository**
   - Link dashboard files to Cloudflare Pages
   - Set custom domain `dashboard.giftedworld.org`

---

## Security Considerations

### Access Control
```apache
# .htaccess for basic auth (optional)
AuthType Basic
AuthName "Dashboard Access"
AuthUserFile /path/to/.htpasswd
Require valid-user
```

### File Security
- Never upload sensitive configuration files
- Use environment variables for API keys
- Implement proper CORS headers if needed

### Regular Updates
- Keep SSL certificates updated
- Monitor for security patches
- Regular backup of dashboard files

---

## Post-Setup Checklist

- [ ] Subdomain created successfully
- [ ] All dashboard files uploaded
- [ ] File permissions set correctly (644/755)
- [ ] SSL certificate installed and working
- [ ] HTTPS redirect configured
- [ ] Dashboard loads without errors
- [ ] All functionality tested
- [ ] Mobile responsiveness verified
- [ ] DNS propagation complete
- [ ] Security measures implemented

---

## Support Resources

### Hosting Provider Documentation
- **cPanel**: Check your host's cPanel documentation
- **Plesk**: Plesk official documentation
- **DirectAdmin**: DirectAdmin user guide

### Online Tools
- **DNS Checker**: `https://dnschecker.org/`
- **SSL Test**: `https://www.ssllabs.com/ssltest/`
- **Website Speed Test**: `https://pagespeed.web.dev/`

### Common Hosting Providers
- **Namecheap**: cPanel-based, supports subdomains
- **Bluehost**: cPanel with easy subdomain creation
- **SiteGround**: Custom panel with subdomain support
- **HostGator**: cPanel-based hosting

---

This guide should cover most scenarios for setting up your dashboard subdomain. Choose the method that matches your hosting environment and technical comfort level.