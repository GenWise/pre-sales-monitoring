# Production Deployment Instructions

## 🚀 Automated Deployment

### Quick Deploy
```bash
cd deployment-package
./deploy.sh
```

### Verify Deployment
```bash
./verify.sh
```

## 📋 Manual Steps (if needed)

### 1. Upload Files
```bash
# Proxy API
rsync -avz ./proxy-api/ u191176295@dashboard.giftedworld.org:/home/u191176295/domains/giftedworld.org/public_html/api-proxy/

# Dashboard
rsync -avz ./dashboard/ u191176295@dashboard.giftedworld.org:/home/u191176295/domains/giftedworld.org/public_html/dashboard/
```

### 2. Install Dependencies
```bash
ssh u191176295@dashboard.giftedworld.org
cd /home/u191176295/domains/giftedworld.org/public_html/api-proxy
npm install --production
```

### 3. Start Proxy API with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
```

### 4. Test Endpoints
- Health: https://dashboard.giftedworld.org/api-proxy/health
- Leads: https://dashboard.giftedworld.org/api-proxy/api/leads
- Dashboard: https://dashboard.giftedworld.org

## 🔧 Production URLs

- **Dashboard**: https://dashboard.giftedworld.org
- **API Proxy Health**: https://dashboard.giftedworld.org/api-proxy/health
- **API Leads**: https://dashboard.giftedworld.org/api-proxy/api/leads

## 📊 Monitoring

```bash
# Check PM2 status
ssh u191176295@dashboard.giftedworld.org "pm2 status"

# View logs
ssh u191176295@dashboard.giftedworld.org "pm2 logs dashboard-api-proxy"

# Restart if needed
ssh u191176295@dashboard.giftedworld.org "pm2 restart dashboard-api-proxy"
```

## 🎯 Components Deployed

### Proxy API Files
- dashboard_api_proxy.js (Express server with Google Sheets integration)
- package.json (production dependencies)
- .env (production configuration)
- service-account-key.json (Google Sheets authentication)
- ecosystem.config.js (PM2 configuration)

### Dashboard Files
- js/api-proxy.js (Updated with meaningful form names)

## ✅ Success Criteria

1. ✅ API Proxy responds to /health endpoint
2. ✅ API Proxy fetches data from Google Sheets
3. ✅ Dashboard loads without 403 errors
4. ✅ End-to-end form submission works
5. ✅ PM2 process manager running stably

## 🆘 Troubleshooting

### 403 Errors
- Check service account permissions
- Verify CORS origins in production .env
- Test API proxy health endpoint

### Dashboard Not Loading
- Check browser console for errors
- Verify API proxy is running (PM2 status)
- Test API endpoints directly

### Form Submissions Not Working
- Check webhook server is running (separate from dashboard)
- Verify Google Apps Scripts are deployed
- Test form field mapping
