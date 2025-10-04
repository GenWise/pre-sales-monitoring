# Pre-Sales Monitoring - Session Handover

## Session Metadata
- Date: 2025-10-04 17:30
- Duration: ~3 hours
- Thread Context: 142K tokens used

## Current Status
FreshSales sync service deployed to DigitalOcean but not operational - Google Sheets API blocked (403 error), notification system missing.

## Exact Position on Implementation
- ✅ Phase 3: CRM integration complete (tests 1-7 passing)
- ⏸️ Deployment: Service running on DigitalOcean (PM2 id:7) but APIs blocked
- ⏭️ Next: Enable Google Sheets API + add Master Sheet onChange notification trigger

## Critical Context
1. **google-spreadsheet v5.x incompatible with PM2** - Uses ESM modules; downgraded to v4.1.4 (CommonJS)
2. **Google Sheets API 403 from server IP** - Works locally, blocked from 165.232.134.106 (needs Cloud Console API enablement)
3. **PM2 env loading requires code-level dotenv.config()** - .env file alone insufficient
4. **SSH access via macmini_do_droplet key** - ~/.ssh/macmini_do_droplet for root@165.232.134.106
5. **Missing notification system** - No email/Slack alerts when forms submit to Master Sheet

## Decisions Made (With Rationale)

- **Downgrade google-spreadsheet from v5 to v4.1.4**
  **Rationale:** v5 uses ESM modules causing "ERR_REQUIRE_ESM" in PM2's CommonJS loader; v4 uses CommonJS natively and works with require()

- **Add dotenv.config() at top of freshsales-sync-service.js**
  **Rationale:** PM2 ecosystem.config.js env_file doesn't auto-load process.env; explicit config() ensures vars available before imports

- **Master Sheet onChange trigger for notifications (not form triggers)**
  **Rationale:** Single centralized trigger vs 4 separate form-bound triggers; detects any new row addition regardless of source

- **Hourly sync schedule (0 * * * * cron)**
  **Rationale:** User requirement; changed from 5min default to match hourly sync expectation

- **Use ecosystem.config.js for PM2**
  **Rationale:** PM2 CLI args don't reliably load .env; ecosystem config provides env_file and better process management

## Blockers/Risks
- [ ] Google Sheets API 403 - Enable Sheets API for project `sheets-and-python-340711` from server IP 165.232.134.106
- [ ] FreshSales API 403 permission (not 401 auth) - API key loads but may need additional CRM permissions
- [ ] Master Sheet notification system unimplemented - Need Apps Script onChange trigger

## Files Modified This Session
- `freshsales-sync-service.js` - Added dotenv.config(), changed toFreshSales sync from */5 to hourly (0 * * * *)
- `package.json` - Downgraded google-spreadsheet: ^5.0.2 → ^4.1.4 for CommonJS compatibility
- `package-lock.json` - Updated dependencies with --legacy-peer-deps
- `deploy.sh` - Created deployment automation with SSH key and rsync
- `ecosystem.config.js` - Created PM2 config with env_file, cwd, memory limits
- Server `.env` - Fixed GOOGLE_SERVICE_ACCOUNT_FILE path from Mac (/Users/rajeshpanchanathan) to server (/root/pre-sales-monitoring)

## Deployment Details
- **Server**: DigitalOcean 165.232.134.106 (1GB RAM, 10GB disk, Ubuntu 22.04)
- **PM2 Process**: freshsales-sync (id: 7, mode: cluster, 73MB RAM)
- **Deploy Command**: `./deploy.sh` (requires ~/.ssh/macmini_do_droplet key)
- **Service Location**: /root/pre-sales-monitoring/
- **Status Check**: `ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106 "pm2 logs freshsales-sync --lines 20"`

## Handover Prompt
"Pre-sales monitoring FreshSales sync: Service deployed to DigitalOcean but Google Sheets API blocked (403 'unregistered callers' from server IP). Enable Sheets API for project sheets-and-python-340711, then add Master Sheet onChange trigger for email/Slack notifications to rajesh@genwise.in. Service running PM2 id:7, hourly sync configured. See HANDOVER.md."
