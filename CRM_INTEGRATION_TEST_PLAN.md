# CRM 2-Way Integration Test Plan
## Google Sheets ↔ FreshSales Bidirectional Sync

**Test Plan Version:** 1.0
**Created:** October 2, 2025
**System:** Pre-Sales Monitoring CRM Integration

---

## Executive Summary

This test plan validates the bidirectional integration between our Google Sheets Master Database and FreshSales CRM. The system includes comprehensive safety mechanisms: change tracking, rollback capabilities, and single-record processing to prevent data corruption.

**Key Safety Features:**
- All CRM operations tracked with unique change IDs
- Complete rollback capability via `rollbackScript.js`
- Forced batch size = 1 for controlled testing
- Status-based filtering (only Warm|Hot|Not Interested records sync)
- Interest Level mapping: High→Hot, Medium→Warm, Low→Tepid

---

## Test Case 1: Status-Based Filtering Validation

**Objective:** Verify only eligible status records sync to CRM

**Pre-conditions:**
- Master Sheet contains records with various status values
- At least one record each with status: Warm, Hot, Not Interested, First Call Pending

**Execution Steps:**
1. Run: `node test_safe_sync.js`
2. Verify only records with status "Warm|Hot|Not Interested" are processed
3. Check records with "First Call Pending" status are skipped

**Expected Results:**
- Only 3 status types processed: Warm, Hot, Not Interested
- All other statuses (First Call Pending, etc.) skipped
- Console shows: "sync-eligible records from master database (status: Warm|Hot|Not Interested)"

**Rollback Requirements:**
- Note session ID from output
- Ready to execute: `node src/api/rollbackScript.js <sessionId>` if needed

**Success Criteria:**
- Zero records with ineligible status sent to FreshSales
- Skipped count matches expected non-eligible records
- No errors in filtering logic

---

## Test Case 2: Interest Level Mapping Validation

**Objective:** Verify correct Interest Level → FreshSales Status mapping

**Pre-conditions:**
- Test records with Interest Level: High, Medium, Low
- FreshSales account accessible

**Execution Steps:**
1. Create test record in Master Sheet with Interest Level = "High"
2. Run: `node test_safe_sync.js` with limit=1
3. Check FreshSales contact has contact_status_id = 402000446647 (Hot)
4. Repeat for Medium → Warm (402000446648) and Low → Tepid (402000769051)

**Expected Results:**
- High → Hot (402000446647)
- Medium → Warm (402000446648)
- Low → Tepid (402000769051)
- Contact created with correct status in FreshSales

**Rollback Requirements:**
- Track change ID from console output
- Verify rollback available with: `node src/api/rollbackScript.js --list`

**Success Criteria:**
- 100% accurate mapping between Interest Level and FreshSales status
- No mapping errors or defaults used incorrectly

---

## Test Case 3: New Contact Creation with Safety Tracking

**Objective:** Verify new contact creation with full change tracking

**Pre-conditions:**
- Test contact that doesn't exist in FreshSales
- Ensure email is unique to avoid duplicates

**Execution Steps:**
1. Add TEST record to Master Sheet:
   - Child Name: "TEST Child Safe Sync"
   - Parent Email: "test.safe.sync@example.com"
   - Interest Level: "High"
   - Status: "Hot"
2. Run: `node test_safe_sync.js`
3. Verify change tracking ID appears in console
4. Check FreshSales for new contact

**Expected Results:**
- New contact created in FreshSales
- Console shows: "🚨 CREATING CONTACT with change tracking: [changeId]"
- Console shows: "🛡️ Change tracked as: [changeId]"
- Contact has TEST tags for identification

**Rollback Requirements:**
- Change ID recorded and available
- Contact can be deleted via rollback script
- Test data clearly marked with TEST identifiers

**Success Criteria:**
- Contact successfully created
- All fields mapped correctly
- Change tracking operational
- Rollback script shows the new contact in session summary

---

## Test Case 4: Duplicate Detection and Handling

**Objective:** Verify duplicate detection by email and mobile

**Pre-conditions:**
- Existing contact in FreshSales with known email
- Duplicate strategy set to 'skip' (default)

**Execution Steps:**
1. Create Master Sheet record with same email as existing FreshSales contact
2. Run: `node test_safe_sync.js`
3. Verify duplicate detection logic activates
4. Confirm no new contact created

**Expected Results:**
- Console shows: "Skipping duplicate contact: [contactId]"
- Sync stats show: skipped = 1, created = 0
- No new contact in FreshSales
- Original contact unchanged

**Rollback Requirements:**
- No CRM changes made, so no rollback needed
- Session should show 0 operations requiring rollback

**Success Criteria:**
- Duplicate correctly identified
- No duplicate contacts created
- Original contact data preserved

---

## Test Case 5: Field Mapping Accuracy Test

**Objective:** Verify all field mappings are accurate and complete

**Pre-conditions:**
- Test record with complete data set
- All Master Sheet fields populated

**Execution Steps:**
1. Create comprehensive test record:
   ```
   Child Name: "Test Complete Mapping"
   Parent Name: "Test Parent Mapping"
   Parent Email: "complete.mapping@test.com"
   Parent Mobile: "+1234567890"
   Interest Level: "Medium"
   Child Grade: "Grade 5"
   Program: "GSP"
   Geography: "Test City"
   Status: "Warm"
   ```
2. Run: `node test_safe_sync.js`
3. Verify FreshSales contact has all fields correctly mapped

**Expected Results:**
- first_name = "Test"
- last_name = "Complete Mapping"
- emails[0].value = "complete.mapping@test.com"
- mobile_number = "+1234567890"
- contact_status_id = 402000446648 (Warm)
- cf_child_grade = "Grade 5"
- cf_program = "GSP"
- country = "Test City"

**Rollback Requirements:**
- Full contact creation tracked
- All custom fields included in rollback data

**Success Criteria:**
- 100% field mapping accuracy
- No data loss or corruption
- Custom fields properly populated

---

## Test Case 6: Error Handling and Recovery

**Objective:** Test system behavior with invalid/malformed data

**Pre-conditions:**
- Records with invalid email formats
- Records with missing required fields

**Execution Steps:**
1. Create test record with invalid email: "invalid.email.format"
2. Create test record with empty Child Name
3. Run: `node test_safe_sync.js`
4. Verify error handling doesn't crash system

**Expected Results:**
- Invalid records skipped with appropriate warnings
- System continues processing valid records
- Error count incremented in sync stats
- No CRM corruption from bad data

**Rollback Requirements:**
- Only successful operations tracked for rollback
- Failed operations don't require cleanup

**Success Criteria:**
- System handles errors gracefully
- No invalid data reaches FreshSales
- Sync continues despite individual record errors

---

## Test Case 7: Change Tracking and Session Management

**Objective:** Verify comprehensive change tracking system

**Pre-conditions:**
- Clean state with no pending rollbacks
- Access to logs directory

**Execution Steps:**
1. Run: `node src/api/rollbackScript.js --list` (should show clean state)
2. Execute: `node test_safe_sync.js`
3. Run: `node src/api/rollbackScript.js --list` (should show new session)
4. Verify session details and operation counts

**Expected Results:**
- New session appears in tracking list
- Session ID format: `safe_test_[timestamp]`
- Operations count matches actual CRM changes
- Status shows "🚨 NEEDS ROLLBACK" if changes made

**Rollback Requirements:**
- Session properly logged
- All operations within session trackable

**Success Criteria:**
- 100% operation tracking accuracy
- Session management working correctly
- Rollback preparation complete

---

## Test Case 8: Rollback Functionality Validation

**Objective:** Test complete rollback capability for safety

**Pre-conditions:**
- Completed test case with CRM changes
- Session ID available from previous test

**Execution Steps:**
1. Identify session with changes: `node src/api/rollbackScript.js --list`
2. Execute rollback: `node src/api/rollbackScript.js [sessionId]`
3. Type "YES" when prompted for confirmation
4. Verify all CRM changes reversed

**Expected Results:**
- Rollback script prompts for confirmation
- All test contacts deleted from FreshSales
- Session marked as rolled back
- Console shows: "✅ Rollback completed"

**Rollback Requirements:**
- This IS the rollback test - validates safety system

**Success Criteria:**
- All test data successfully removed from CRM
- No orphaned contacts remain
- System ready for fresh testing

---

## Test Case 9: Batch Processing with Safety Limits

**Objective:** Verify forced batch size = 1 for safety

**Pre-conditions:**
- Multiple eligible records in Master Sheet
- Batch size forced to 1 in code

**Execution Steps:**
1. Ensure Master Sheet has 3+ eligible records
2. Run: `node test_safe_sync.js`
3. Monitor console output for batch processing
4. Verify rate limiting between records

**Expected Results:**
- Console shows: "Processing batch 1/3", "Processing batch 2/3", etc.
- Each batch contains exactly 1 record
- 1-second delay between batches
- Total batches = total eligible records

**Rollback Requirements:**
- Each record creates separate change tracking entry
- All records tracked individually for rollback

**Success Criteria:**
- Batch size override working (always = 1)
- Safe processing speed maintained
- Individual record tracking operational

---

## Test Case 10: Bidirectional Sync Validation

**Objective:** Test FreshSales → Master Sheet sync capability

**Pre-conditions:**
- Contact exists in FreshSales with updates
- FreshSales API permissions allow contact reading

**Execution Steps:**
1. Manually update contact status in FreshSales (Hot → Warm)
2. Add FreshSales ID to Master Sheet record
3. Run bidirectional sync (if permissions allow)
4. Verify Master Sheet reflects FreshSales changes

**Expected Results:**
- IF permissions allow: Master Sheet updated with FreshSales data
- IF permissions denied: Warning about read permissions
- No data corruption in either direction

**Rollback Requirements:**
- Master Sheet changes should be tracked
- Backup available before bidirectional sync

**Success Criteria:**
- Sync works when permissions available
- Graceful degradation when permissions insufficient
- Data integrity maintained in both systems

---

## Safety Protocols Summary

### Before Each Test:
1. ✅ Verify rollback script functional: `node src/api/rollbackScript.js --list`
2. ✅ Check Master Sheet has test data with TEST identifiers
3. ✅ Confirm FreshSales access working

### During Each Test:
1. ✅ Monitor console for change tracking IDs
2. ✅ Note session IDs for potential rollback
3. ✅ Verify batch size = 1 enforcement

### After Each Test:
1. ✅ Document change tracking session
2. ✅ Verify expected vs actual results
3. ✅ Clean up test data via rollback if needed

### Emergency Procedures:
- **Immediate cleanup**: `node src/api/rollbackScript.js [sessionId]`
- **Mass cleanup**: `node src/api/rollbackScript.js --all` (DANGER - use carefully)
- **Session review**: `node src/api/rollbackScript.js --list`

---

## Test Environment Requirements

- **Google Sheets**: Access to Master Sheet with service account auth
- **FreshSales**: API token with contact create permissions
- **Node.js**: All dependencies installed
- **Test Data**: Clearly marked with TEST identifiers
- **Cleanup**: Rollback scripts tested and ready

**Ready for User Approval and Execution**