# Server Operations Guide

## Quick Reference: DigitalOcean Production Server

**Server IP**: 165.232.134.106
**SSH Key**: `~/.ssh/macmini_do_droplet`
**User**: root
**Service Location**: `/root/pre-sales-monitoring/`
**PM2 Process Name**: `freshsales-sync`

---

## SSH Access

```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106
```

---

## Service Management

### Check Service Status
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 status"
```

### View Logs (Live)
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 logs freshsales-sync"
```

### View Last 50 Lines
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 logs freshsales-sync --lines 50 --nostream"
```

### Restart Service
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 restart freshsales-sync"
```

### Stop Service
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 stop freshsales-sync"
```

### Start Service
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 start freshsales-sync"
```

### View Detailed Info
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 show freshsales-sync"
```

---

## Deployment

### Quick Deploy (Single File)
```bash
scp -i ~/.ssh/macmini_do_droplet <local-file> root@165.232.134.106:/root/pre-sales-monitoring/
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 restart freshsales-sync"
```

### Full Deployment
```bash
./deploy.sh  # Uses rsync + npm install + PM2 restart
```

---

## Monitoring

### Health Check
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "curl -s http://localhost:3003/status | python3 -m json.tool"
```

### Check Environment Variables
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "cat /root/pre-sales-monitoring/.env | grep -E 'GOOGLE|FRESHSALES|SLACK'"
```

### Disk Space
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "df -h /root/pre-sales-monitoring"
```

### Memory Usage
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "free -h"
```

---

## Troubleshooting

### Service Won't Start
```bash
# Check error logs
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 logs freshsales-sync --err --lines 100"

# Check if port 3003 is in use
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "lsof -i :3003"

# Verify Node.js version
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "node --version"
```

### Google Sheets API 403 Errors
```bash
# Verify service account file exists
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "ls -la /root/pre-sales-monitoring/credentials/"

# Check google-auth-library version (must be v9.x)
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "cd /root/pre-sales-monitoring && npm list google-auth-library"
```

### FreshSales API Issues
```bash
# Test API key directly
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 'curl -H "Authorization: Token token=awiMf4YWS-S4wE_10pUmHQ" "https://genwisecrm.myfreshworks.com/crm/sales/api/search?q=test&include=contact&per_page=1"'
```

### Slack Notifications Not Working
```bash
# Verify webhook URL is loaded
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "grep SLACK_WEBHOOK /root/pre-sales-monitoring/.env"

# Test webhook directly
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 'curl -X POST -H "Content-type: application/json" --data "{\"text\":\"Test from server\"}" "REDACTED_SLACK_WEBHOOK"'
```

---

## Sync Schedule

**To FreshSales (Master Sheet → CRM)**: Hourly at :00 (`0 * * * *`)
**From FreshSales (CRM → Master Sheet)**: Every 2 hours at :00 (`0 */2 * * *`)
**Health Checks**: Every 6 hours at :00 (`0 */6 * * *`)

### Manual Sync Triggers
```bash
# SSH into server first
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106

# Trigger sync manually (requires implementing manual trigger endpoint)
# Or restart service to trigger health check
pm2 restart freshsales-sync
```

---

## Log Files

### PM2 Logs
- **Output**: `/root/.pm2/logs/freshsales-sync-out.log`
- **Errors**: `/root/.pm2/logs/freshsales-sync-error.log`

### Application Logs
- **Service Log**: `/root/pre-sales-monitoring/logs/freshsales-sync.log`
- **Notification Log**: `/root/pre-sales-monitoring/logs/notification-manager.log`

### View Specific Log
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "tail -100 /root/pre-sales-monitoring/logs/freshsales-sync.log"
```

---

## Backup & Recovery

### Backup Current State
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "cd /root && tar -czf pre-sales-monitoring-backup-$(date +%Y%m%d).tar.gz pre-sales-monitoring/"
```

### Download Backup
```bash
scp -i ~/.ssh/macmini_do_droplet root@165.232.134.106:/root/pre-sales-monitoring-backup-*.tar.gz ~/Downloads/
```

---

## Emergency Procedures

### Service Crash Loop
```bash
# Stop service
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 stop freshsales-sync"

# Check recent errors
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 logs freshsales-sync --err --lines 200"

# Fix issue, then restart
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 restart freshsales-sync"
```

### Out of Memory
```bash
# Check memory
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "free -h && pm2 monit"

# Increase max_memory_restart in ecosystem.config.js if needed
# Current limit: 300MB
```

### Revert Deployment
```bash
# From local machine with git history
git log --oneline -10  # Find commit hash before bad deploy
git checkout <commit-hash> -- <files>
./deploy.sh
```

---

## Useful One-Liners

### Check if sync ran in last hour
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 logs freshsales-sync --nostream | grep 'Starting scheduled sync' | tail -5"
```

### Count errors in last 100 log lines
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 logs freshsales-sync --nostream --lines 100 | grep -i error | wc -l"
```

### Watch logs in real-time with filtering
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 logs freshsales-sync | grep -E 'sync|error|health'"
```

### Restart and immediately watch
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 restart freshsales-sync && sleep 3 && pm2 logs freshsales-sync --lines 30"
```

---

## Master Sheet & Forms

### Master Sheet
https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ

### Form URLs (Public Submission)
- **Returning Students**: https://docs.google.com/forms/d/e/1FAIpQLSc3AJbrG1tifHuUj_pHQwPQhNM0IMnBlXLJd_Gf2BmJ1qGsBA/viewform
- **ATS Qualifiers**: https://docs.google.com/forms/d/e/1FAIpQLSdraBQF7TmbK6d5P0QZF58VOQsaW8oeGhnciaZLSJ8Mu3uigg/viewform
- **Website**: https://docs.google.com/forms/d/e/1FAIpQLScAEQXMJgbxWEl40xR3X1QgrvVZRphlbK4wzWXOnMxukAiXMw/viewform
- **Early Bird**: https://docs.google.com/forms/d/e/1FAIpQLScoaWU3LuM5os8ebZrC65S3FWvw7wltfVDvLP_2lbNcxKG6eA/viewform

---

## FreshSales

**CRM URL**: https://genwisecrm.myfreshworks.com/crm/sales
**API Docs**: https://developers.freshworks.com/crm/api/

### Test API Access
```bash
curl -H "Authorization: Token token=awiMf4YWS-S4wE_10pUmHQ" \
  "https://genwisecrm.myfreshworks.com/crm/sales/api/search?q=test&include=contact&per_page=5"
```

---

## Contact

**Notifications Email**: rajesh@genwise.in
**Production Emails**: gifted@genwise.in, eklavya@genwise.in, ashish@genwise.in
**Slack Channel**: #gsp26
