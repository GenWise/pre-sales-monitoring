# FreshSales CRM Sync Workflow

## Overview

Complete bidirectional sync logic between Master Sheet (Google Sheets) and FreshSales CRM with duplicate detection, parent/child relationship management, and sync state tracking.

## Master Sheet Required Columns

| Column | Type | Purpose | Protection |
|--------|------|---------|------------|
| Parent Email | Text | Contact identification | Editable |
| Parent Mobile | Text | Contact identification | Editable |
| Child Name | Text | Deal identification | Editable |
| Status | Dropdown | Sync eligibility (Hot/Warm/Not Interested) | Editable |
| new_existing | Dropdown | "New Parent" / "Existing Parent" | Auto-updated by sync |
| assigned_owner | Dropdown | Kevin/Agnes/Ashish/Eklavya | Auto-updated by sync |
| Last Synced | Timestamp | Sync state tracking | **Protected (owner-only)** |

## Sync Workflow

### STEP 1: Duplicate Detection & Reverse Sync

**Trigger**: All records where `new_existing = "New Parent"`

**Process**:
1. For each "New Parent" record in Master Sheet:
   - Extract `parent_email` and `parent_mobile`
   - Search FreshSales CRM:
     - Match against ALL `contact.emails[]` values (contacts can have multiple emails)
     - Match against `contact.mobile_number`

2. If contact found in CRM:
   - **Master Sheet Update**:
     - `new_existing` → "Existing Parent"
     - `assigned_owner` → `contact.custom_field.cf_parent_owner` (reverse sync from CRM)

3. If not found:
   - No changes (remains "New Parent")

**Search Logic**:
```javascript
// Pseudo-code
for each master_record where new_existing = "New Parent":
    search_results = CRM.searchContacts(master_record.parent_email)
    if not found:
        search_results = CRM.searchContacts(master_record.parent_mobile)

    if search_results.contacts.length > 0:
        existing_contact = search_results.contacts[0]
        master_record.new_existing = "Existing Parent"
        master_record.assigned_owner = existing_contact.cf_parent_owner
        master_record.save()
```

---

### STEP 2: CRM Sync Pass

**Eligibility Filter**:
- `Status` = "Hot" OR "Warm" OR "Not Interested"
- `Last Synced` = empty (never synced before)

**Process Flow**:

#### **Case A: New Parent** (`new_existing = "New Parent"`)

1. **Create Contact** (Parent):
   - Map all fields from Master Sheet → FreshSales contact
   - Two-step process:
     - POST /contacts (create)
     - PUT /contacts/:id (update contact_status_id + cf_parent_owner)
   - Add tags: `gsp2026_{source_tag}_form`, `pre_sales_lead`

2. **Create Deal** (Child):
   - Link to parent contact via `contacts_added_list`
   - Deal name = `child_name` from Master Sheet

3. **Create Note**:
   - Attach to contact with submission details

4. **Update Master Sheet**:
   - `Last Synced` → current timestamp

---

#### **Case B: Existing Parent** (`new_existing = "Existing Parent"`)

1. **Skip Contact Creation** (already exists in CRM)

2. **Deal Duplicate Check**:
   - Search existing Deals linked to this contact
   - Compare `master_record.child_name` with `deal.name` values

   **If child name matches existing deal**:
   - Skip deal creation (duplicate submission for same child)

   **If child name is NEW**:
   - Create new Deal (sibling/second child for same parent)
   - Link to parent contact via `contacts_added_list`

3. **Update Contact** (selective fields only):
   - `contact_status_id` → Replace with current Master Sheet status (could be this year's vs last year's)
   - `tags` → ADD new source tag (preserve all existing tags)
   - **Do NOT overwrite**: name, email, mobile, cf_parent_owner, or any other fields

4. **Update Master Sheet**:
   - `Last Synced` → current timestamp

---

## Field Mapping Reference

### Master Sheet → FreshSales Contact

| Master Sheet | FreshSales Contact | Notes |
|--------------|-------------------|-------|
| Parent Name | first_name | Single-word names only |
| Parent Email | emails[0].value | Primary email |
| Parent Mobile | mobile_number | Direct mapping |
| Status | contact_status_id | Hot=402000446647, Warm=402000446648, Not Interested=402000769051 |
| assigned_owner | cf_parent_owner | TEXT values: "Kevin", "Agnes", "Ashish", "Eklavya" |
| source_tag | tags[] | Add `gsp2026_{source_tag}_form` |

### Master Sheet → FreshSales Deal

| Master Sheet | FreshSales Deal | Notes |
|--------------|----------------|-------|
| Child Name | name | Deal name |
| Parent Contact | contacts_added_list | Array with parent contact ID |

### FreshSales → Master Sheet (Reverse Sync)

| FreshSales | Master Sheet | When |
|-----------|--------------|------|
| contact.cf_parent_owner | assigned_owner | During duplicate detection |

---

## Critical API Behaviors

### FreshSales API Quirks

1. **contact_status_id**:
   - POST /contacts → Field silently ignored
   - PUT /contacts/:id → Field updates successfully
   - GET /contacts/:id → NOT in response by default
   - GET with `?include=contact_status` → Returns field

2. **cf_parent_owner**:
   - Accepts TEXT values only: "Kevin", "Agnes", "Ashish", "Eklavya"
   - Numeric IDs (596, 573, 944, 1998) are silently ignored
   - Field type: Dropdown with text choices

3. **Tags**:
   - Only supported on Contact entity, NOT on Deal
   - PUT updates replace entire tags array (must preserve existing)

4. **Search**:
   - Contacts can have multiple emails in emails[] array
   - Search matches against ANY email in the array
   - Mobile search matches mobile_number field only

---

## Sync State Management

### Last Synced Timestamp

**Purpose**: Prevent duplicate syncing of same record

**Behavior**:
- Empty = Eligible for sync
- Has timestamp = Already synced, skip on future runs

**Re-sync Strategy**:
- **Never re-sync** once timestamp is set
- **To force re-sync**: Admin manually deletes "Last Synced" value
- **Protection**: Column is protected (owner-only edit) to prevent accidental deletion

**Implementation**:
```javascript
// Filter eligible records
const eligibleRecords = allRecords.filter(record => {
    const hasEligibleStatus = ['Hot', 'Warm', 'Not Interested'].includes(record.Status);
    const notSynced = !record['Last Synced'] || record['Last Synced'] === '';
    return hasEligibleStatus && notSynced;
});
```

---

## Data Integrity Rules

### Contact Updates (Existing Parent)

**ONLY update these fields**:
- ✅ contact_status_id (current status)
- ✅ tags (append new, preserve old)

**NEVER update these fields**:
- ❌ first_name, last_name
- ❌ email, mobile_number
- ❌ cf_parent_owner
- ❌ Any other custom fields

**Rationale**: CRM is source of truth for contact identity and ownership. Master Sheet only updates status and adds source tags.

### Deal Duplicate Logic

**Duplicate = Same parent + Same child name**

**Example**:
- Parent: john@example.com
- Existing Deal: "Sarah Smith"
- New submission: "Sarah Smith" → **Skip deal creation**
- New submission: "Michael Smith" → **Create new deal** (sibling)

---

## Test Scenarios

### Test 2: Duplicate Detection
**Setup**:
- Master Sheet: test_warm@test.com, new_existing="New Parent", assigned_owner=empty
- CRM: Contact 402174862235 (email=test_warm@test.com, cf_parent_owner="Kevin")

**Expected**:
- ✅ Duplicate detection finds contact
- ✅ Master Sheet: new_existing → "Existing Parent"
- ✅ Master Sheet: assigned_owner → "Kevin"

### Test 3: Existing Parent - Same Child
**Setup**:
- Master Sheet: child_name="TEST_Child_Warm", Status="Hot", Last Synced=empty
- CRM: Contact has Deal named "TEST_Child_Warm"

**Expected**:
- ✅ Skip deal creation (duplicate)
- ✅ Update contact_status_id to Hot
- ✅ Add new source tag
- ✅ Set Last Synced timestamp

### Test 4: Existing Parent - New Sibling
**Setup**:
- Master Sheet: child_name="TEST_Child_Sibling", Status="Warm", Last Synced=empty
- CRM: Contact has Deal named "TEST_Child_Warm"

**Expected**:
- ✅ Create new deal "TEST_Child_Sibling"
- ✅ Update contact_status_id to Warm
- ✅ Add new source tag
- ✅ Set Last Synced timestamp

### Test 5: Multiple Eligible Records
**Setup**:
- Record A: Status=Hot, Last Synced=empty, new_existing="New Parent"
- Record B: Status=Warm, Last Synced=2025-10-03, new_existing="New Parent"
- Record C: Status=First Call Pending, Last Synced=empty, new_existing="New Parent"

**Expected**:
- ✅ Record A: Synced (eligible)
- ✅ Record B: Skipped (already synced)
- ✅ Record C: Skipped (status not eligible)

---

## Implementation Files

| File | Purpose |
|------|---------|
| `src/api/freshsalesSync.js` | Main sync orchestration |
| `src/api/freshsalesMapper.js` | Field mapping logic |
| `src/api/freshsalesClientAxios.js` | API client |
| `duplicate_detection.js` | Step 1: Duplicate detection script |
| `full_sync.js` | Combined Step 1 + Step 2 sync |

---

## Safety Features

1. **Change Tracking**: All CRM operations logged via `crmChangeTracker.js`
2. **Rollback Capability**: `rollbackScript.js` can undo operations by session ID
3. **Protected Fields**: "Last Synced" column protected from accidental edits
4. **Batch Processing**: No artificial batch limits - process all eligible records
5. **Tag Preservation**: Always append to tags array, never replace

---

## Operational Notes

### Running Sync

**Full Sync** (Step 1 + Step 2):
```bash
node full_sync.js
```

**Duplicate Detection Only** (Step 1):
```bash
node duplicate_detection.js
```

**CRM Sync Only** (Step 2):
```bash
node test_safe_sync.js --skip-duplicate-check
```

### Monitoring

**Check Last Sync Results**:
- Master Sheet: Review "Last Synced" column for timestamp updates
- Console logs: Track processed/created/updated/skipped counts

**Verify CRM Data**:
- FreshSales: Check contacts for new tags and status updates
- FreshSales: Check deals for new child records

### Troubleshooting

**Record not syncing**:
1. Check Status field (must be Hot/Warm/Not Interested)
2. Check "Last Synced" field (must be empty)
3. Check console logs for errors

**Duplicate not detected**:
1. Verify email/mobile format matches CRM exactly
2. Check CRM search API permissions
3. Try manual search in FreshSales UI

**Field not updating**:
1. Check field mapping in freshsalesMapper.js
2. Verify FreshSales API permissions
3. Review two-step process logs for contact_status_id

---

## Version History

- **2025-10-04**: Initial sync logic documentation
- **Test 1 Status**: ✅ Two-step contact creation validated
- **Test 2 Status**: 🚧 Pending implementation
