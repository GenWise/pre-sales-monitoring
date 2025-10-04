# CRM 2-Way Integration Test Plan
## Google Sheets ↔ FreshSales Bidirectional Sync

**Status:** Ready for Execution
**Safety:** Full rollback capability via `rollbackScript.js`

## Quick Test Execution

```bash
# Test 1: Status filtering (only Warm|Hot|Not Interested sync)
node test_safe_sync.js

# Check what was tracked
node src/api/rollbackScript.js --list

# Rollback if needed
node src/api/rollbackScript.js <sessionId>
```

## Test Cases Summary

### 1. **Status-Based Filtering** ✅
- Verify only Warm|Hot|Not Interested records sync
- Skip First Call Pending status

### 2. **Interest Level Mapping** ✅
- High → Hot (402000446647)
- Medium → Warm (402000446648)
- Low → Tepid (402000769051)

### 3. **New Contact Creation** ✅
- Create with full change tracking
- Verify TEST tags applied

### 4. **Duplicate Detection** ✅
- Email-based duplicate prevention
- Skip strategy validation

### 5. **Field Mapping Accuracy** ✅
- All 12 fields mapped correctly
- Custom fields populated

### 6. **Error Handling** ✅
- Invalid data rejected gracefully
- Sync continues despite errors

### 7. **Change Tracking** ✅
- Every operation logged
- Session management working

### 8. **Rollback Testing** ✅
- Complete cleanup capability
- All test data removable

### 9. **Batch Size Safety** ✅
- Forced batch = 1
- Rate limiting active

### 10. **Bidirectional Sync** ⚠️
- Requires FreshSales read permissions
- Fallback to one-way if restricted

## Safety Protocol
1. Every test uses change tracking
2. Test only 1 record at a time
3. All test data marked with TEST tags
4. Full rollback available always