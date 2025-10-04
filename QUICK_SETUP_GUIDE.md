# Quick Setup Guide: Deploy Master Sheet Notifications

## Current Status
✅ Service deployed to DigitalOcean (PM2 id: 7)
✅ Google Sheets API working (fixed via google-auth-library v10→v9 downgrade)
⚠️ FreshSales API 403 permission issue (separate blocker - API key lacks contact read permission)
❌ Master Sheet onChange notifications not configured

## Completed

### ✅ Google Sheets API Fixed

**Problem**: Server got 403 "unregistered callers" error
**Root Cause**: `google-auth-library@10.3.0` incompatible with `google-spreadsheet@4.1.4` (needs v8/v9)
**Solution**: Downgraded to `google-auth-library@9.15.1`
**Status**: Working - PM2 logs show `✅ Google Sheets connection healthy`

**Details**: See `docs/GOOGLE_SHEETS_403_FIX.md`

## Required Actions

### Deploy Master Sheet onChange Trigger (10 minutes)

**What it does**: Sends email to rajesh@genwise.in when new leads are submitted

**Steps**:
1. Open Master Sheet: https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ
2. Go to **Extensions** → **Apps Script**
3. Copy/paste code from: `scripts/gas/masterSheetNotifications.gs`
4. Save as "Master Sheet Notifications"
5. Run function: `setupOnChangeTrigger()`
6. Authorize when prompted
7. Test with: `testNotification()`

**Detailed instructions**: See `docs/DEPLOY_ONCHANGE_TRIGGER.md`

**Email template includes**:
- Child name, parent name, email, mobile
- Interest level, source tag, status
- Duplicate flag warning (if applicable)
- High interest priority indicator
- Link to Master Sheet

**Recipients**: rajesh@genwise.in (configurable in script)

---

## Verification Checklist

After deploying onChange trigger:

- [x] Google Sheets API working (verified via PM2 logs)
- [x] Service account has Editor access to Master Sheet
- [x] PM2 logs show successful Sheets API calls
- [ ] onChange trigger deployed to Master Sheet
- [ ] Test notification received in email
- [ ] Submit a test form and verify notification arrives

---

## Quick Reference

**Master Sheet**: https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ

**Server SSH**:
```bash
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106
```

**PM2 Commands**:
```bash
pm2 logs freshsales-sync --lines 50    # View logs
pm2 restart freshsales-sync            # Restart service
pm2 status                             # Check status
```

**Service Details**:
- Process: freshsales-sync (PM2 id: 7)
- Location: /root/pre-sales-monitoring/
- Cron: Hourly sync (0 * * * *)
- Service account: sheetspython@sheets-and-python-340711.iam.gserviceaccount.com

---

## Next Steps After Setup

Once both blockers are resolved:

1. **Monitor for 24 hours**: Check that hourly sync runs successfully
2. **Test form submissions**: Submit test via all 4 forms
3. **Verify notifications**: Confirm emails arrive for each submission
4. **Check FreshSales sync**: Verify data syncs to CRM correctly
5. **Production notification**: Update email recipients if needed:
   - Development: rajesh@genwise.in
   - Production: gifted@genwise.in, eklavya@genwise.in, ashish@genwise.in

---

## Support Files

- `docs/ENABLE_SHEETS_API.md` - Detailed Google Cloud Console steps
- `docs/DEPLOY_ONCHANGE_TRIGGER.md` - Full onChange trigger deployment guide
- `scripts/gas/masterSheetNotifications.gs` - Apps Script code
- `HANDOVER.md` - Session context and decisions
