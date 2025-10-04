# Google Sheets 403 Error - Root Cause & Fix

## Problem Statement
Service deployed to DigitalOcean received 403 "Method doesn't allow unregistered callers" when accessing Google Sheets API.

## Initial Diagnosis (INCORRECT)
- Suspected: API not enabled in Cloud Console
- Suspected: Service account lacking permissions
- Suspected: IP restrictions blocking server

## Root Cause (ACTUAL)
**Peer dependency version mismatch causing silent authentication failure**

`google-spreadsheet@4.1.4` requires `google-auth-library` **v8.x or v9.x**
Server had `google-auth-library@10.3.0` installed

### Why This Happened
1. Local development used `google-auth-library@10.3.0` (worked locally - timing issue?)
2. Deployment with `--legacy-peer-deps` bypassed peer dependency check during install
3. Runtime incompatibility caused JWT authentication to fail silently
4. No Authorization header added to requests → 403 error

## Evidence

### Failed Request (Before Fix)
```http
GET /v4/spreadsheets/{id}/ HTTP/1.1
Accept: application/json, text/plain, */*
User-Agent: axios/1.12.2
Host: sheets.googleapis.com
```

**Missing**: `Authorization: Bearer {token}`

### Package Conflict
```
npm list google-auth-library

google-auth-library@10.3.0 deduped invalid: "^8.8.0 || ^9.0.0" from node_modules/google-spreadsheet
```

## Solution

### On Server
```bash
npm uninstall google-auth-library
npm install google-auth-library@^9.0.0 --save
pm2 restart freshsales-sync
```

### In Repository
Update `package.json`:
```json
{
  "dependencies": {
    "google-auth-library": "^9.0.0",  // Was: ^10.3.0
    "google-spreadsheet": "^4.1.4"
  }
}
```

## Verification

### Test Authentication
```bash
ssh root@165.232.134.106
cd /root/pre-sales-monitoring
node test_sheets_auth.js
```

**Expected Output**:
```
✅ SUCCESS! Connected to: **Pre-sales Monitoring Master Database**
Sheets: 1
```

### Check PM2 Logs
```bash
pm2 logs freshsales-sync --lines 20
```

**Expected**:
```
✅ Google Sheets connection healthy
googleSheets: { status: 'success', message: 'Google Sheets accessible' }
```

## Lessons Learned

1. **Version constraints matter**: Peer dependencies exist for compatibility reasons
2. **--legacy-peer-deps hides problems**: Bypassing peer deps during install doesn't fix runtime issues
3. **Test on target environment**: Local success ≠ deployment success
4. **Check request headers**: Missing Authorization header was the smoking gun
5. **Read error messages carefully**: "unregistered callers" = authentication failure, not API restrictions

## Why Local Development Worked (Speculation)

Possible explanations:
1. Local had older cached `google-auth-library@9.x` that worked
2. Timing: local tests ran before v10 was installed
3. Different Node.js version handling dependency resolution differently
4. `node_modules` state differences between clean install (server) vs incremental install (local)

## Related Issues

### google-spreadsheet v5+ and PM2
`google-spreadsheet@5.x` uses ESM modules, incompatible with PM2's CommonJS loader.
**Solution**: Stay on `google-spreadsheet@4.1.4` for PM2-managed services.

### googleapis Package
`googleapis@126.0.1` requires `google-auth-library@9.15.1` (compatible).
No conflicts after downgrade to v9.

## Production Status

✅ **RESOLVED**: Google Sheets API working on server
⚠️ **BLOCKER**: FreshSales API 403 permission issue (separate - see HANDOVER.md)

## References

- google-spreadsheet npm: https://www.npmjs.com/package/google-spreadsheet
- google-auth-library compatibility: https://github.com/googleapis/google-auth-library-nodejs
- Issue history: HANDOVER.md "Blockers/Risks" section
