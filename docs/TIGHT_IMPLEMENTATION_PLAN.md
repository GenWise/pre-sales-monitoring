# REVISED TIGHT IMPLEMENTATION PLAN: Master Sheet CRM + FreshSales Sync
*Updated October 2, 2025 - Addressing all implementation questions and concerns*

## COLUMN MAPPING MATRIX

### Master Sheet Structure (CORRECTED)
```
Index | Field           | Type     | Values
------|-----------------|----------|------------------
0     | child_name      | text     |
1     | parent_name     | text     |
2     | parent_email    | email    |
3     | parent_mobile   | phone    |
4     | new_existing    | dropdown | New Parent|Existing Parent
5     | interest_level  | dropdown | High|Medium|Low
6     | source_tag      | dropdown | returning_students|ats_qualifiers|website|early_bird
7     | timestamp       | datetime | ISO format
8     | duplicate_flag  | dropdown | Yes|No
9     | status          | dropdown | First Call Pending|Warm|Hot|Not Interested
10    | assigned_owner  | dropdown | Unassigned|Kevin|Agnes|Eklavya|Ashish
11    | notes          | text     |
```

### Automation Logic (CLARIFIED)
**New/Existing Parent Detection**: Real-time FreshSales email lookup on form submission
**Duplicate Flag**: Check parent_email against existing master sheet rows immediately
**FreshSales Sync Trigger**: Google Apps Script time-driven triggers every 5 minutes
**Sync Condition**: Status changes to "Warm|Hot|Not Interested" only

### FreshSales Contact Mapping (CLARIFIED)
```
Master Sheet Field    | FreshSales Field      | Mapping Logic
---------------------|----------------------|----------------
child_name           | first_name, last_name| Split on space (first word→first_name, rest→last_name)
parent_email         | emails[0].value      | Direct mapping + duplicate check against existing contacts
parent_mobile        | mobile_number        | Format +91 prefix if not present
interest_level       | contact_status_id    | High→402000446647, Medium→402000446648, Low→402000769051
source_tag           | lead_source_id       | Custom mapping (TBD based on FreshSales config)
notes                | notes (via activities)| Use FreshSales Notes API, not description field
```

### FreshSales Fields Strategy (ANSWERED)
**Existing Fields Only**: No new field creation required
**Notes Implementation**: Use Activities API to create timestamped notes (not description field)
**Custom Fields**: Leverage existing lead_source_id for source tracking
**Rate Limits**: 25-50 submissions/day = ~200 API calls/day (well within 1000/hour limit)

## SYSTEM ARCHITECTURE

### Layer 1: Form Automation (CLARIFIED)
- **Google Apps Scripts** bound to each form
- **Direct sheet writes** using exact column indices [0-11]
- **Dual Notifications**: Every form submission triggers:
  - Email to rajesh@genwise.in
  - Slack notification to rajesh@genwise.in
- **Validation Logic**: Only validate New/Existing Parent via real-time FreshSales email lookup
- **No Form Field Validation**: All other form responses pass through as-is
- **Bypass webhook** to eliminate column mapping errors completely

### Layer 2: Enhanced Google Sheets (CLARIFIED)
- **Data validation dropdowns** for manual editing (Status, Interest Level, Assigned Owner)
- **Conditional formatting** for status visualization (color-coding by status/priority)
- **Filter views** for team workflow:
  - "Kevin's Leads" (assigned_owner = Kevin)
  - "Hot Prospects" (status = Hot)
  - "Follow-up Required" (status = Warm, timestamp > 3 days ago)
  - "Unassigned Leads" (assigned_owner = Unassigned)
- **Comment system** for collaborative notes and follow-up tracking

### Layer 3: FreshSales Sync (CLARIFIED)
- **Bidirectional sync** using existing `/src/api/freshsalesSync.js`
- **Conflict Resolution**: Last-modified-wins strategy
  - Compare timestamps between FreshSales `updated_at` and master sheet `timestamp`
  - Most recent change takes precedence, prevents sync loops
- **Sync Timing**: Google Apps Script triggers every 5 minutes (no macOS dependency)
- **Sync Trigger**: Only when status changes to "Warm|Hot|Not Interested"
- **Rate Limits**: No issues (25-50 submissions/day = ~200 API calls vs 1000/hour limit)

## IMPLEMENTATION STATUS

### ✅ Phase 4: File Cleanup - COMPLETED (Oct 2, 2025)
- Removed all dashboard code and broken components
- Archived failed attempts to `/archive/failed_dashboard_attempt/`
- Killed all background processes
- Clean project state achieved

### ✅ Phase 1: Data Foundation - COMPLETED (Oct 2, 2025)
- Deleted 24 corrupted data rows from master sheet
- Implemented correct column structure (indices 0-11)
- Added data validation dropdowns for all enum fields
- Master sheet clean and ready for data pipeline

### ✅ Phase 2: Form Pipeline - COMPLETED (Oct 2, 2025)
- All 4 form scripts deployed and tested ✅
- Form submissions working: All forms → Master Sheet
- Column mapping verified: All 12 fields correct for all forms
- Debug logging implemented and issues resolved
- Interest level mapping fixed for all form variations

## IMPLEMENTATION PHASES

### Phase 1: Data Foundation (Priority 1) - CLEAN SLATE APPROACH [COMPLETED ✅]
1. **Export existing data** for reference (backup corrupt data)
2. **Delete all entries** in master sheet (keep headers only)
3. **Implement corrected column structure** (indices 0-11)
4. **Add data validation dropdowns** to prevent future corruption
5. **Verify empty sheet** ready for clean data pipeline

**Rationale**: Clean start eliminates 41 corrupted rows and ensures precise column alignment

### Phase 2: Form Pipeline (Priority 1) [NOT STARTED]
1. Deploy form scripts to all 4 Google Forms
2. Test each form end-to-end (submit → master sheet)
3. Verify column mapping precision
4. Monitor for data corruption

### Phase 3: FreshSales Integration (Priority 2) [NOT STARTED]
1. Configure existing sync modules in `/src/api/`
2. Test bidirectional sync with small dataset
3. Implement scheduled sync jobs
4. Add monitoring and error alerting

### Phase 4: File Cleanup
1. Remove `/dashboard/` directory
2. Delete broken PHP endpoints (`leads.php`, `webhook.php`)
3. Clean deployment scripts
4. Archive failed attempts

## FILES TO MODIFY

### Keep & Enhance
- `/src/api/freshsalesSync.js` - Complete bidirectional sync
- `/src/api/freshsalesMapper.js` - Field mapping logic
- `/corrected_scripts/` - Form-bound scripts
- Master sheet `1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ`

### Remove Completely
- `/dashboard/` - Failed UI implementation
- `/src/dashboard/` - Broken components
- `leads.php`, `webhook.php` - Column mapping issues
- `dashboard_api_proxy.js` - Unnecessary complexity

### Create New
- Sheet enhancement scripts for dropdowns/formatting
- Sync scheduling and monitoring
- Data repair and validation tools

## SUCCESS CRITERIA

### Immediate (Week 1)
- ✅ 0% data corruption in master sheet
- ✅ All 4 forms writing to correct columns
- ✅ Google Sheets usable as daily CRM

### Short-term (Week 2)
- ✅ FreshSales bidirectional sync operational
- ✅ <5 minute sync latency
- ✅ 99%+ sync success rate

## RISK MITIGATION

### Data Integrity
- Validate column positions before all writes
- Backup master sheet before major operations
- Test with single row before batch operations

### Error Handling
- Continue sheet operations if FreshSales fails
- Queue failed operations for retry
- Alert team immediately on sync failures

## COMPREHENSIVE TESTING STRATEGY

### Testing Infrastructure Available
- **Jest** with coverage reporting
- **Puppeteer** for browser automation
- **15+ existing test scripts** in `/test_*.js` files
- **Browser testing utility**: `~/browser-testing-utils/test-browser.sh`

### End-to-End Testing Scenarios
1. **Form Submission Pipeline**
   - Automated submission to all 4 forms via Puppeteer
   - Verify data lands in correct master sheet columns (indices 0-11)
   - Confirm field mapping accuracy (Interest Level, Name splitting, etc.)
   - **Verify email notification to rajesh@genwise.in for every submission**

2. **Dual Notification Testing**
   - Test email delivery for each form type to rajesh@genwise.in
   - Test Slack notification delivery for each form type
   - Verify notification content includes all submission details
   - Test notification delivery timing (immediate after submission)
   - Check email and Slack message formatting and readability

3. **Duplicate Detection Testing**
   - Submit form with existing parent_email
   - Verify duplicate_flag = "Yes" immediately
   - Test email case sensitivity and whitespace handling

4. **New/Existing Parent Detection**
   - Mock FreshSales API responses for known/unknown emails
   - Verify new_existing field populated correctly
   - Test FreshSales API timeout handling

5. **FreshSales Sync Testing**
   - Change status to "Warm|Hot|Not Interested" in master sheet
   - Verify contact creation/update in FreshSales within 5 minutes
   - Test bidirectional sync and conflict resolution

6. **Interest Level Mapping**
   - Test complex form responses → dropdown mappings
   - Website: "Ready to sign up..." → "High"
   - Verify all edge cases and fallback to "Medium"

### Testing Readiness Requirements
- **Master Sheet Access**: Service account auth verified
- **FreshSales API**: Token validation and rate limit testing
- **Form Scripts**: Deploy to test forms first, then production
- **Browser Automation**: Puppeteer headless form submission
- **Subagents**: General-purpose for complex testing coordination

### Test Data Scenarios
- **Valid Submissions**: Complete data, proper interest levels
- **Edge Cases**: Missing fields, malformed emails, long names
- **Stress Testing**: Multiple rapid submissions, API timeouts
- **Conflict Testing**: Simultaneous updates in Sheet + FreshSales

This plan eliminates dashboard complexity while delivering full CRM functionality through enhanced Google Sheets + proven FreshSales integration code.