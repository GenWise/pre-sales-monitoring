# Pre-Sales Monitoring - Session Handover

## Session Metadata
- Date: 2026-08-19 11:35 IST
- Previous entry: 2025-10-19 (notes sync fix — see History below)

## Current Status
✅ **Two reliability fixes, live on the droplet.** No open work.

## Exact Position
- ✅ `duplicate_detection.js loadMasterSheet` now retries transient Google Sheets
  failures — 3 attempts, 2s/4s/8s backoff, 5xx and 429 only, then rethrows.
  A bare 503 on 2026-08-17 06:33 UTC had aborted an entire sync run.
- ✅ `src/api/freshsalesClient.js updateRateLimits` warns once hourly quota drops
  below 25%. On 2026-08-17 the account burned all 1,000 hourly calls and nothing
  could say what spent them — FreshSales has no usage history and no audit-log
  endpoint, so attribution has to be logged as it happens.
- ✅ Both deployed by scp to `/root/pre-sales-monitoring` and `pm2 restart
  freshsales-sync`; `.bak-20260819` copies left beside each file on the droplet.
- ⏭️ Nothing pending on this repo.

## Critical Context
1. **The droplet copy is not a git repo.** No `.git` in `/root/pre-sales-monitoring`;
   deploys are scp of individual files. The running code can drift from this repo
   with nothing to diff against. Tracked in `~/code/TODO.md`, due 2026-09-05.
2. **PM2 logs are empty** — logrotate truncates them. The real log is
   `/root/pre-sales-monitoring/logs/freshsales-sync.log`, JSON lines.
3. **This sync is small and is not a quota risk.** Measured 2026-08-17: 5 records
   per run, 5 runs a day, typically 0 created / 0 updated / 5 skipped. If something
   is burning FreshSales API calls, look elsewhere — it ran 12:30–12:32 UTC that
   day and the lockout came at 13:37.
4. FreshSales limits: 1,000/hour and 400/minute, returned live in `x-ratelimit-*`
   and `per-min-x-ratelimit-*` response headers.

---

# Previous session (2025-10-19)

## Session Metadata
- Date: 2025-10-19 14:15 IST
- Duration: ~2 hours
- Thread Context: 97K tokens used

## Current Status
✅ **Notes Sync Fixed** - Column L notes now sync to FreshSales for both new AND existing parents. Production verified with 12 backfilled contacts.

## Exact Position on Implementation
- ✅ Phase 3: CRM integration complete with notes functionality
- ✅ Bug fix: handleExistingParent now creates notes from Column L
- ✅ Enhanced logging: 3-layer debug (sync, client, API) with payloads/responses
- ✅ Production deployed: DO droplet, PM2 restarted, checksums verified
- ✅ Backfill verified: 12/12 contacts successful (HTTP 200)
- ⏭️ Next: Monitor hourly sync logs for automatic note creation

## Critical Context
1. **Bug discovered**: Notes only created for new contacts (createNewContact path), existing parents silently dropped notes
2. **Root cause**: handleExistingParent had 7 steps but no note creation (STEP 7 added)
3. **Use case**: Existing parents from 2025 receive NEW call notes in 2026 (Column L = fresh notes, not historical)
4. **Logging visibility**: Now shows note preview (100 chars), length, API payload (300 chars), HTTP status
5. **Production sync**: Runs hourly at :05 UTC = :35 IST (next at 14:35 IST)

## Decisions Made (With Rationale)
- **Add note creation to handleExistingParent as STEP 7**
  **Rationale:** Existing parents from last year get new call notes this year. Notes are contact-level, not deal-level. Each master sheet row with notes = one note in CRM.

- **Three-layer debug logging (sync → client → API)**
  **Rationale:** Previous logs showed success/failure but not what was sent. Need visibility into exact payloads and responses to diagnose API issues.

- **Immediate backfill execution vs waiting for hourly sync**
  **Rationale:** Immediate verification confirms Notes API works. Faster feedback loop (minutes vs 30-min wait). Independent test of note creation before relying on automatic sync.

## Blockers/Risks
None - notes working for all scenarios (new parent, existing parent, siblings).

## Files Modified This Session
- `src/api/freshsalesSync.js` - Added STEP 7 note creation in handleExistingParent (lines 639-654), enhanced addContactNote logging (866-871)
- `src/api/freshsalesClientAxios.js` - Added debug logging in createNote (324, 332, 339)
- `sync_specific_contact_notes.js` - Created one-time backfill script for 12 contacts
- `HISTORY.md` - Created documentation history tracking file

## Handover Prompt
"Pre-sales monitoring system: Notes from Column L now sync to FreshSales for both new and existing parents. Bug fixed in handleExistingParent (added STEP 7). Enhanced 3-layer logging shows exact API payloads. Production verified with 12 backfilled contacts (100% success). Next: Monitor automatic note creation in hourly syncs."
