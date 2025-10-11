# FreshSales CRM Integration Guide
**Comprehensive reference for building integrations with FreshSales CRM**

This document captures all hard-won knowledge, API quirks, gotchas, and patterns from production FreshSales integrations. Use this as a reference when building new integrations to avoid common pitfalls.

---

## Table of Contents
1. [FreshSales Data Model](#freshsales-data-model)
2. [Critical API Quirks](#critical-api-quirks)
3. [Authentication Patterns](#authentication-patterns)
4. [Field Mapping Gotchas](#field-mapping-gotchas)
5. [Duplicate Detection Strategy](#duplicate-detection-strategy)
6. [Status and Owner Updates](#status-and-owner-updates)
7. [Error Handling Patterns](#error-handling-patterns)
8. [Testing Strategy](#testing-strategy)
9. [Performance Considerations](#performance-considerations)
10. [Common Pitfalls](#common-pitfalls)

---

## FreshSales Data Model

### Core Entities
**Contact = Parent** | **Deal = Child**

```
Contact (Parent)
├── Basic fields: first_name, last_name, email, mobile_number
├── Status: contact_status_id (dropdown)
├── Custom fields: custom_field.cf_parent_owner, custom_field.cf_*
├── Tags: tags[] (array of strings)
├── Multiple emails: emails[] array with is_primary flag
└── Deals: Related via contacts_added_list

Deal (Child)
├── name: Child's name
├── amount: Deal value
├── deal_pipeline_id, deal_stage_id: Pipeline tracking
└── contacts_added_list: [contact_id] - Links to parent Contact
```

### Critical Rules
1. **Notes attach to Contact, NOT Deal**
2. **Tags only supported on Contact entity, not Deal**
3. **Custom fields must be wrapped**: `custom_field: { cf_parent_owner: "Kevin" }`
4. **Deal linkage**: Use `contacts_added_list` array, NOT `contacts` or `contact_id` fields

---

## Critical API Quirks

### 1. contact_status_id - The Silent Killer ⚠️

**Problem:** POST /contacts SILENTLY IGNORES `contact_status_id` field

**Symptoms:**
```javascript
// This creates contact with DEFAULT status, not the one you specified
await client.createContact({
  first_name: "John",
  contact_status_id: 402000446647  // ❌ IGNORED!
});
```

**Solution:** Two-step create + update pattern
```javascript
// Step 1: Create contact
const response = await client.createContact({
  first_name: "John",
  last_name: "Doe"
  // Do NOT include contact_status_id here
});

const contactId = response.contact.id;

// Step 2: Update with status
await client.updateContact(contactId, {
  contact_status_id: 402000446647
}, true);  // ⚠️ true = include contact_status param (see next quirk)
```

### 2. contact_status_id GET/PUT Quirk ⚠️

**Problem:** Status field has bizarre visibility/update requirements

**GET quirk:** Not returned by default
```javascript
// ❌ Status NOT in response
const contact = await client.getContact(contactId);
console.log(contact.contact.contact_status_id);  // undefined

// ✅ Must explicitly request it
const contact = await client.getContact(contactId, true);  // include=contact_status
console.log(contact.contact.contact_status_id);  // 402000446647
```

**PUT quirk:** Requires query parameter for UPDATE to work
```javascript
// ❌ Update silently FAILS (no error, just ignored)
await client.updateContact(contactId, {
  contact_status_id: 402000446647
});

// ✅ Must include contact_status parameter
await client.updateContact(contactId, {
  contact_status_id: 402000446647
}, true);  // includeContactStatus = true
```

**Implementation in client:**
```javascript
async updateContact(contactId, contactData, includeContactStatus = false) {
  const url = `/contacts/${contactId}${includeContactStatus ? '?include=contact_status' : ''}`;
  // Without ?include=contact_status, status update silently fails!
}
```

### 3. cf_parent_owner - Custom Field Quirk ⚠️

**Problem:** Same two-step issue as contact_status_id

**Solution:**
```javascript
// Step 1: Create (custom fields ignored during POST)
const response = await client.createContact({
  first_name: "John"
});

// Step 2: Update with custom field
await client.updateContact(contactId, {
  custom_field: { cf_parent_owner: "Kevin" }  // Must wrap in custom_field object
}, true);
```

**Field value format:**
- ✅ Use TEXT values: `"Kevin"`, `"Agnes"`, `"Ashish"`, `"Eklavya"`
- ❌ NOT numeric IDs: `12345` (silently ignored)

### 4. lead_source_id - Read-Only Field ⚠️

**Problem:** `lead_source_id` is read-only with `'visible': false` in metadata

**Solution:** Use `last_source` text field instead
```javascript
// ❌ This is ignored
await client.createContact({
  lead_source_id: 402000691518
});

// ✅ Use text field
await client.createContact({
  last_source: "Website Form"
});
```

**Source tracking pattern:** Use tags instead
```javascript
tags: ["gsp2026_website_form", "gsp2026_returning_students_form"]
```

### 5. Deal contacts_added_list - Write-Only Field ⚠️

**Problem:** Field accepted during POST but NOT returned in GET

```javascript
// Create deal with contact linkage
await client.createDeal({
  name: "Child Name",
  contacts_added_list: [contactId]  // ✅ Works
});

// Try to read it back
const deal = await client.getDeal(dealId);
console.log(deal.contacts_added_list);  // ❌ undefined (field is write-only)

// ✅ Verify linkage via contact endpoint
const deals = await client.getContactDeals(contactId);  // This works
```

### 6. Description Field - The Data Destroyer ⚠️

**Problem:** Including `description` field causes API to silently ignore OTHER fields

**Symptoms:**
```javascript
// This will create contact but OTHER fields may be silently dropped
await client.createContact({
  first_name: "John",
  last_name: "Doe",
  description: "Some notes",  // ⚠️ Causes issues
  mobile_number: "+911234567890"  // May be silently ignored!
});
```

**Solution:** Omit description field entirely, use Notes API instead
```javascript
// Create contact without description
const response = await client.createContact({
  first_name: "John",
  last_name: "Doe",
  mobile_number: "+911234567890"
});

// Add notes separately
await client.createNote(contactId, "Some notes");
```

### 7. Search API vs Lookup API ⚠️

**Problem:** Different endpoints have different search scopes

**Lookup API (limited):**
```javascript
// Only searches PRIMARY email
GET /contacts/lookup?f=email&q=john@example.com
```

**Search API (comprehensive):**
```javascript
// Searches ALL emails (primary + secondary) AND ALL phones (mobile + work)
GET /search?q=john@example.com&include=contact
GET /search?q=+911234567890&include=contact
```

**Best practice:** Always use `/search` for duplicate detection
```javascript
async findExistingContact(email, mobile) {
  // Search by email (checks primary + secondary emails)
  const emailResults = await this.searchContacts(email);
  if (emailResults.length > 0) return emailResults[0];

  // Search by mobile (checks mobile_number + work_number)
  const mobileResults = await this.searchContacts(mobile);
  if (mobileResults.length > 0) return mobileResults[0];

  return null;
}
```

### 8. Search API Response Format ⚠️

**Problem:** Search returns direct array, NOT wrapped object

```javascript
// ❌ Wrong - assumes wrapped response
const results = await client.searchContacts(query);
const contact = results.contacts[0];  // TypeError: results.contacts is undefined

// ✅ Correct - search returns array directly
const results = await client.searchContacts(query);
if (Array.isArray(results) && results.length > 0) {
  const contact = results[0];
}
```

---

## Authentication Patterns

### Node.js HTTP Client Incompatibility ⚠️

**Problem:** Native Node.js `https` module has authentication incompatibility with FreshSales

**Symptoms:**
- HTTP 401 errors despite correct API key
- Works in curl but fails in Node.js code

**Solution:** Use axios instead of native https
```javascript
// ❌ Native https - auth fails
const https = require('https');
const options = {
  hostname: 'genwisecrm.myfreshworks.com',
  path: '/crm/sales/api/contacts',
  headers: { 'Authorization': `Token token=${apiKey}` }
};

// ✅ Use axios - auth works
const axios = require('axios');
const response = await axios.get('https://genwisecrm.myfreshworks.com/crm/sales/api/contacts', {
  headers: { 'Authorization': `Token token=${apiKey}` }
});
```

### API Key Format
```javascript
// Correct format
headers: {
  'Authorization': `Token token=${apiKey}`,
  'Content-Type': 'application/json'
}
```

### Testing Authentication
```bash
# Always test with curl first before debugging code
curl -H "Authorization: Token token=YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -X GET "https://your-domain.myfreshworks.com/crm/sales/api/contacts/view/VIEW_ID"
```

---

## Field Mapping Gotchas

### 1. Multiple Emails Pattern

**FreshSales format:**
```javascript
emails: [
  { value: "primary@example.com", is_primary: true, label: "work" },
  { value: "secondary@example.com", is_primary: false, label: "work" }
]
```

**Additive update pattern (duplicate found by mobile, add email):**
```javascript
async buildAdditiveUpdate(existingContact, newContactData) {
  // Fetch FULL contact details (search response is partial)
  const fullContact = await this.client.getContact(existingContact.id);

  const newEmail = newContactData.emails?.[0]?.value;
  const existingEmails = fullContact.contact?.emails || [];

  const emailExists = existingEmails.some(e =>
    e.value?.toLowerCase() === newEmail.toLowerCase()
  );

  if (!emailExists) {
    return {
      emails: [
        ...existingEmails,
        { value: newEmail, is_primary: false, label: 'work' }
      ]
    };
  }
}
```

### 2. Phone Number Handling

**FreshSales fields:**
- `mobile_number`: Primary mobile
- `work_number`: Secondary phone

**Additive update pattern (duplicate found by email, add mobile):**
```javascript
const existingMobile = fullContact.contact?.mobile_number;
const existingWork = fullContact.contact?.work_number;

if (!existingMobile && !existingWork) {
  // No phones at all - add as mobile
  update.mobile_number = newMobile;
} else if (existingMobile !== newMobile && existingWork !== newMobile) {
  // Different number - add as work_number if empty
  if (!existingWork) {
    update.work_number = newMobile;
  }
}
```

### 3. Status Mapping

**Master data to FreshSales:**
```javascript
const statusMap = {
  'Warm': 402000446648,
  'Hot': 402000446647,
  'Not Interested': 402000446646,
  'Tepid': 402000769051
};

function mapStatusToContactStatus(status) {
  const normalizedStatus = status?.toLowerCase().trim();
  return statusMap[status] || null;
}
```

**Important:** Use master data's Status field, NOT Interest Level field

### 4. Name Field Parsing

**Split parent name:**
```javascript
function parseParentName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' ') || parts[0]  // Fallback to first name
  };
}
```

---

## Duplicate Detection Strategy

### Comprehensive Search Pattern

```javascript
async findExistingContact(leadData) {
  const email = leadData.parent_email || leadData.parentEmail;
  const mobile = leadData.parent_mobile || leadData.parentMobile;

  // Search by email first (most reliable)
  if (email) {
    const results = await this.client.searchContacts(email);
    if (Array.isArray(results) && results.length > 0) {
      return results[0];
    }
  }

  // Fallback to mobile search
  if (mobile) {
    const results = await this.client.searchContacts(mobile);
    if (Array.isArray(results) && results.length > 0) {
      return results[0];
    }
  }

  return null;
}
```

### Handling Existing Parents

**Scenario:** Parent already in CRM (`crm_contact_link` populated)

```javascript
async handleExistingParent(contactId, leadData) {
  // 1. Check if Deal for this child already exists
  const existingDeals = await this.client.getContactDeals(contactId);
  const childName = leadData.child_name;
  const childDealExists = existingDeals.some(deal =>
    deal.name?.toLowerCase() === childName?.toLowerCase()
  );

  if (!childDealExists) {
    // 2. Create new Deal (sibling support)
    const dealData = this.mapper.mapLeadToDeal(leadData, contactId);
    await this.client.createDeal(dealData);
  }

  // 3. Additive contact updates (secondary email/mobile)
  const contactData = this.mapper.mapLeadToContact(leadData);
  const additiveUpdate = await this.buildAdditiveUpdate({ id: contactId }, contactData);
  if (Object.keys(additiveUpdate).length > 0) {
    await this.client.updateContact(contactId, additiveUpdate);
  }

  // 4. Forward sync: Update status from master data
  const status = leadData.status;
  const statusId = this.mapper.mapStatusToContactStatus(status);
  if (statusId) {
    await this.client.updateContact(contactId, {
      contact_status_id: statusId
    }, true);  // ⚠️ Must include contact_status param
  }

  // 5. Forward sync: Update parent owner
  const parentOwner = leadData.assigned_owner;
  if (parentOwner && parentOwner !== 'Unassigned') {
    await this.client.updateContact(contactId, {
      custom_field: { cf_parent_owner: parentOwner }
    }, true);
  }

  // 6. Append source tag (don't replace existing tags)
  const fullContact = await this.client.getContact(contactId);
  const existingTags = fullContact.contact?.tags || [];
  const newTag = `gsp2026_${leadData.source_tag}_form`;
  if (!existingTags.includes(newTag)) {
    await this.client.updateContact(contactId, {
      tags: [...existingTags, newTag]
    });
  }
}
```

---

## Status and Owner Updates

### Two-Step Update Pattern (Critical)

```javascript
async createNewContact(contactData, leadData) {
  // Step 1: Create contact (status/owner ignored during POST)
  const response = await this.client.createContact({
    first_name: contactData.first_name,
    last_name: contactData.last_name,
    emails: contactData.emails,
    mobile_number: contactData.mobile_number,
    tags: contactData.tags
    // ⚠️ Do NOT include: contact_status_id, custom_field.cf_parent_owner
  });

  const contactId = response.contact.id;

  // Step 1.5: Update with status and owner (FreshSales API quirk workaround)
  const updateData = {};

  if (contactData.contact_status_id) {
    updateData.contact_status_id = contactData.contact_status_id;
  }

  if (contactData.cf_parent_owner) {
    updateData.custom_field = { cf_parent_owner: contactData.cf_parent_owner };
  }

  if (Object.keys(updateData).length > 0) {
    await this.client.updateContact(contactId, updateData, true);
  }

  return contactId;
}
```

### Status Verification Pattern

**Debug pattern to detect FreshSales automation interference:**
```javascript
// Read status BEFORE update
const preUpdateContact = await this.client.getContact(contactId);
const currentStatusId = preUpdateContact.contact?.contact_status_id;
console.log(`Status BEFORE update: ${currentStatusId}`);

// Perform update
await this.client.updateContact(contactId, {
  contact_status_id: statusId
}, true);

// Verify status AFTER update
const postUpdateContact = await this.client.getContact(contactId);
const newStatusId = postUpdateContact.contact?.contact_status_id;
console.log(`Status AFTER update: ${newStatusId}`);

if (newStatusId !== statusId) {
  console.warn(`⚠️ AUTOMATION DETECTED: Status changed from ${statusId} to ${newStatusId}`);
}
```

---

## Error Handling Patterns

### HTTP Status Code Meanings

```javascript
// 401 - Unauthorized (API key invalid or expired)
// 403 - Forbidden (API key lacks required permissions)
// 400 - Bad Request (invalid data format, missing required fields)
// 404 - Not Found (contact/deal doesn't exist)
// 429 - Rate Limited (too many requests)
```

### Permission-Aware Error Handling

```javascript
async createContact(contactData) {
  try {
    const response = await this.client.createContact(contactData);
    return response.contact.id;
  } catch (error) {
    if (error.message.includes('API_PERMISSION_DENIED')) {
      console.warn('Cannot create contact: API permissions insufficient');
      this.syncStats.skipped++;
      return null;
    }

    // Re-throw other errors
    throw error;
  }
}
```

### Field Validation Errors

```javascript
// Common 400 error causes:
// 1. Invalid status ID (use correct numeric IDs)
// 2. Missing required fields (first_name, last_name)
// 3. Invalid email format
// 4. Phone number format issues
// 5. Including 'description' field (causes silent failures)

// Best practice: Validate before sending
function validateContactData(data) {
  if (!data.first_name || !data.last_name) {
    throw new Error('first_name and last_name are required');
  }

  if (data.emails && data.emails.length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.emails[0].value)) {
      throw new Error('Invalid email format');
    }
  }

  // Remove problematic fields
  delete data.description;  // Causes issues

  return data;
}
```

---

## Testing Strategy

### Change Tracking for Production Testing

**Problem:** FreshSales has no sandbox environment

**Solution:** Comprehensive change tracking with rollback capability

```javascript
class CRMChangeTracker {
  constructor(config) {
    this.sessionId = config.testSessionId || `test_${Date.now()}`;
    this.changes = [];
  }

  // Record operation BEFORE executing
  async recordOperation(operation, endpoint, requestData, previousState) {
    const changeId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.changes.push({
      changeId,
      operation,
      endpoint,
      requestData,
      previousState,
      timestamp: new Date().toISOString()
    });
    return changeId;
  }

  // Record response AFTER executing
  async recordResponse(changeId, response) {
    const change = this.changes.find(c => c.changeId === changeId);
    if (change) {
      change.response = response;
      change.responseTime = new Date().toISOString();
    }
  }
}

// Usage:
const changeId = await tracker.recordOperation('create', '/contacts', contactData, null);
const response = await client.createContact(contactData);
await tracker.recordResponse(changeId, response);
```

### Test Data Tagging

```javascript
// Tag all test records for easy identification
addTestTags(contactData) {
  const testTags = [
    'TEST_RECORD',
    `TEST_${this.sessionId}`,
    new Date().toISOString().split('T')[0]  // Date tag
  ];

  contactData.tags = [...(contactData.tags || []), ...testTags];
  return contactData;
}
```

### Rollback Script

```javascript
// Rollback all changes from a test session
async rollbackSession(sessionId) {
  const sessionChanges = this.loadChanges(sessionId);

  for (const change of sessionChanges.reverse()) {
    if (change.operation === 'create') {
      // Delete created records
      if (change.endpoint.includes('/contacts')) {
        const contactId = change.response?.contact?.id;
        await this.deleteContact(contactId);
      } else if (change.endpoint.includes('/deals')) {
        const dealId = change.response?.deal?.id;
        await this.deleteDeal(dealId);
      }
    } else if (change.operation === 'update') {
      // Restore previous state
      const contactId = change.endpoint.match(/\/contacts\/(\d+)/)?.[1];
      await this.updateContact(contactId, change.previousState);
    }
  }
}
```

### Batch Size Forcing

```javascript
// Force batch size to 1 for controlled testing
constructor(config = {}) {
  // 🚨 SAFE TESTING: Force batch size to 1 for controlled testing
  this.batchSize = 1; // Override any config - SAFETY REQUIREMENT
}
```

---

## Performance Considerations

### Rate Limiting

```javascript
class RateLimitTracker {
  constructor() {
    this.requestCount = 0;
    this.windowStart = Date.now();
  }

  async throttle() {
    this.requestCount++;

    // FreshSales typical limits: 3000 requests/hour
    const maxRequestsPerSecond = 1;

    if (this.requestCount >= maxRequestsPerSecond) {
      const elapsed = Date.now() - this.windowStart;
      if (elapsed < 1000) {
        await this.sleep(1000 - elapsed);
      }
      this.requestCount = 0;
      this.windowStart = Date.now();
    }
  }
}
```

### Batch Processing

```javascript
async processBatches(leads, batchSize) {
  const batches = this.createBatches(leads, batchSize);

  for (let i = 0; i < batches.length; i++) {
    await this.processBatch(batches[i]);

    // Rate limiting delay between batches
    if (i < batches.length - 1) {
      await this.sleep(1000);
    }
  }
}
```

### Avoiding Re-Processing

```javascript
// Filter out already-synced records
async loadLeadsFromMasterDatabase(options = {}) {
  let leads = await this.loadAllLeads();

  if (options.syncEligibleOnly) {
    // Filter by status
    leads = leads.filter(lead => {
      const status = (lead.Status || lead.status || '').toLowerCase();
      return ['warm', 'hot', 'not interested'].includes(status);
    });

    // Filter out already-synced records
    leads = leads.filter(lead => {
      const lastSynced = lead.last_synced_at || '';
      return !lastSynced;  // Only process if never synced
    });
  }

  return leads;
}
```

---

## Common Pitfalls

### 1. Forgetting Two-Step Pattern

❌ **Wrong:**
```javascript
await client.createContact({
  first_name: "John",
  contact_status_id: 402000446647  // Ignored!
});
```

✅ **Correct:**
```javascript
const response = await client.createContact({ first_name: "John" });
await client.updateContact(response.contact.id, {
  contact_status_id: 402000446647
}, true);
```

### 2. Not Checking Array Response Format

❌ **Wrong:**
```javascript
const results = await searchContacts(email);
const contact = results.contacts[0];  // TypeError!
```

✅ **Correct:**
```javascript
const results = await searchContacts(email);
if (Array.isArray(results) && results.length > 0) {
  const contact = results[0];
}
```

### 3. Missing includeContactStatus Parameter

❌ **Wrong:**
```javascript
await client.updateContact(contactId, {
  contact_status_id: statusId  // Update silently fails!
});
```

✅ **Correct:**
```javascript
await client.updateContact(contactId, {
  contact_status_id: statusId
}, true);  // Must include parameter
```

### 4. Using /lookup Instead of /search

❌ **Limited:**
```javascript
// Only searches primary email
GET /contacts/lookup?f=email&q=john@example.com
```

✅ **Comprehensive:**
```javascript
// Searches all emails and phones
GET /search?q=john@example.com&include=contact
```

### 5. Including Description Field

❌ **Wrong:**
```javascript
await client.createContact({
  first_name: "John",
  description: "Notes",  // Causes other fields to be silently dropped!
  mobile_number: "+91123"  // May be ignored
});
```

✅ **Correct:**
```javascript
const response = await client.createContact({
  first_name: "John",
  mobile_number: "+91123"
});
await client.createNote(response.contact.id, "Notes");
```

### 6. Not Fetching Full Contact for Additive Updates

❌ **Wrong:**
```javascript
async buildAdditiveUpdate(searchResult, newData) {
  // searchResult is partial data - missing emails array!
  const existingEmails = searchResult.emails || [];  // Incomplete
}
```

✅ **Correct:**
```javascript
async buildAdditiveUpdate(searchResult, newData) {
  // Fetch FULL contact details
  const fullContact = await this.client.getContact(searchResult.id);
  const existingEmails = fullContact.contact?.emails || [];  // Complete
}
```

### 7. Not Handling Sibling Cases

❌ **Wrong:**
```javascript
if (existingContact) {
  console.log('Duplicate found, skipping');
  return;  // Missing sibling Deal creation!
}
```

✅ **Correct:**
```javascript
if (existingContact) {
  // CRITICAL: Create Deal even when parent exists (sibling support)
  const dealData = this.mapper.mapLeadToDeal(leadData, existingContact.id);
  await this.client.createDeal(dealData);
}
```

### 8. Time Zone Confusion in Sync Timestamps

❌ **Wrong:**
```javascript
// Storing UTC timestamp but user expects IST
targetRow.set('last_synced_at', new Date().toISOString());
```

✅ **Correct:**
```javascript
// Convert UTC to IST (UTC+5:30)
const now = new Date();
const istOffset = 5.5 * 60 * 60 * 1000;
const istTime = new Date(now.getTime() + istOffset).toISOString().replace('Z', '+05:30');
targetRow.set('last_synced_at', istTime);
```

---

## Quick Reference Checklist

**Before starting FreshSales integration:**

- [ ] Read this entire guide
- [ ] Test authentication with curl first
- [ ] Use axios, NOT native https module
- [ ] Implement change tracking for production testing
- [ ] Use two-step pattern for contact_status_id and custom fields
- [ ] Always use /search endpoint for duplicate detection
- [ ] Handle Array response format from search API
- [ ] Never include description field in contact creation
- [ ] Implement additive update pattern for secondary emails/phones
- [ ] Support sibling deals when parent already exists
- [ ] Add ?include=contact_status parameter for status updates
- [ ] Wrap custom fields: custom_field.cf_*
- [ ] Use tags for source tracking, not lead_source_id
- [ ] Attach notes to Contact, not Deal
- [ ] Validate data before sending to API
- [ ] Implement rate limiting (1 request/second safe)
- [ ] Add test data tagging for easy cleanup
- [ ] Create rollback script for test sessions
- [ ] Filter already-synced records to avoid re-processing
- [ ] Convert timestamps to user's timezone (if not UTC)

---

## Additional Resources

- **FreshSales API Docs:** https://developers.freshworks.com/crm/api/
- **Working Client Implementation:** `src/api/freshsalesClientAxios.js`
- **Field Mapper:** `src/api/freshsalesMapper.js`
- **Sync Orchestration:** `src/api/freshsalesSync.js`
- **Change Tracker:** `src/api/crmChangeTracker.js`

---

**Last Updated:** 2025-10-11
**Tested Against:** FreshSales CRM (genwisecrm.myfreshworks.com)
**Production Status:** ✅ Stable and operational
