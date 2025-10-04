# Fix FreshSales API 403 Permission Error

## Problem
API key `awiMf4YWS-S4wE_10pUmHQ` can search contacts but cannot list/read individual contacts.

## Evidence
```bash
✅ GET /search?q=test → Returns contacts
✅ GET /settings/contacts/fields → Returns metadata
❌ GET /contacts?per_page=1 → 403 "You are not authorized"
❌ GET /contacts/:id → 404 "You don't have permission"
```

## Root Cause
FreshSales user associated with this API key has restricted permissions. Likely:
- User role lacks "View all contacts" permission
- OR User only has "View own contacts" permission
- OR API key was generated with restricted scopes

## Solution: Fix User Permissions in FreshSales

### Step 1: Identify API Key Owner

1. **Log into FreshSales**: https://genwisecrm.myfreshworks.com
2. **Navigate to**: Admin Settings → API Settings
3. **Find the API key** ending in `...10pUmHQ`
4. **Note the user** this API key belongs to

### Step 2: Check User Permissions

1. **Navigate to**: Admin Settings → Users & Control → Users
2. **Find the user** from Step 1
3. **Check their role** (e.g., "Admin", "Sales Manager", "Sales Rep")

### Step 3: Fix Permissions

**Option A: Change User Role (Easiest)**
1. Edit the user
2. Change role to **"Admin"** or **"Sales Manager"** (roles with full contact access)
3. Save

**Option B: Modify Role Permissions**
1. Navigate to: Admin Settings → Users & Control → Roles
2. Find the user's current role
3. Edit role permissions
4. Ensure these are enabled:
   - ✅ **View all contacts** (not just "View own contacts")
   - ✅ **Edit all contacts**
   - ✅ **Create contacts**
5. Save

### Step 4: Regenerate API Key (If needed)

If permissions still don't work after role change:
1. Navigate to: Admin Settings → API Settings
2. **Delete the old API key**
3. **Generate new API key** (will have updated permissions)
4. **Update .env files** with new key:
   - Local: `~/.env`
   - Server: `/root/pre-sales-monitoring/.env`
   - Update `FRESHSALES_API_KEY=<new_key>`
5. Restart service: `pm2 restart freshsales-sync`

### Step 5: Verify Fix

Test the API key after permission change:

```bash
# Should now return contacts instead of 403
curl -H "Authorization: Token token=awiMf4YWS-S4wE_10pUmHQ" \
  "https://genwisecrm.myfreshworks.com/crm/sales/api/contacts?per_page=1"
```

**Expected**: JSON with contacts array, not 403 error

## Alternative: Use Search API Workaround (Code Change)

If you cannot change FreshSales permissions, modify the code to use `/search` instead of `/contacts`.

### Files to Modify

1. **Health check** in `freshsales-sync-service.js`:
```javascript
// OLD (fails with 403):
const contacts = await this.client.getContacts(1);

// NEW (use search instead):
const searchResults = await this.client.searchContacts('*', 1);
```

2. **Contact retrieval** in `src/api/freshsalesClient.js`:
Add method to use search for listing:
```javascript
async getContactsViaSearch(limit = 100) {
    // Use search API instead of list API
    const response = await this.makeRequest(
        'GET',
        '/search',
        { q: '*', include: 'contact', per_page: limit }
    );
    return response.data;
}
```

3. **Duplicate detection** already uses search (✅ no change needed)

### Trade-offs
- ✅ Works with restricted API key
- ❌ Search API less efficient than direct list
- ❌ Code maintenance burden
- ❌ May hit different rate limits

**Recommendation**: Fix permissions instead of code workaround.

## Quick Check Commands

```bash
# Check if list endpoint works (should return contacts, not 403)
curl -s -H "Authorization: Token token=awiMf4YWS-S4wE_10pUmHQ" \
  "https://genwisecrm.myfreshworks.com/crm/sales/api/contacts?per_page=1"

# Verify search works (should already work)
curl -s -H "Authorization: Token token=awiMf4YWS-S4wE_10pUmHQ" \
  "https://genwisecrm.myfreshworks.com/crm/sales/api/search?q=test&include=contact"

# Test creating contact (verify write permission still works)
curl -s -X POST \
  -H "Authorization: Token token=awiMf4YWS-S4wE_10pUmHQ" \
  -H "Content-Type: application/json" \
  -d '{"contact":{"first_name":"Test","last_name":"Permission","email":"test_perm@example.com"}}' \
  "https://genwisecrm.myfreshworks.com/crm/sales/api/contacts"
```

## FreshSales Permission Documentation

- **Admin Guide**: https://crmsupport.freshworks.com/en/support/solutions/articles/50000002947
- **API Permissions**: https://developers.freshworks.com/crm/api/#authentication
- **User Roles**: Admin Settings → Users & Control → Roles

## Status After Fix

Once permissions are corrected:
- Health check will pass (no more 403 errors)
- Bidirectional sync will work fully
- Service can run unattended on DigitalOcean

## Testing After Fix

```bash
# On server - should show healthy FreshSales connection
ssh -i ~/.ssh/macmini_do_droplet root@165.232.134.106
cd /root/pre-sales-monitoring
pm2 restart freshsales-sync
pm2 logs freshsales-sync --lines 30

# Look for:
# ✅ FreshSales connection healthy
# freshsales: { status: 'success', ... }
```
