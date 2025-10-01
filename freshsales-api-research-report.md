# FreshSales API Research Report

## API Connection & Authentication Status
✅ **Successfully Connected to FreshSales API**

- **Domain**: genwisecrm.myfreshworks.com/crm/sales
- **API Key**: N4wWW4utZkWt83cooXIuWA (Working)
- **Authentication Method**: Token-based authentication with header format: `Authorization: Token token=API_KEY`
- **Base URL**: `https://genwisecrm.myfreshworks.com/crm/sales/api/`

## API Rate Limits & Restrictions

Based on the response headers observed:

### Rate Limits
- **Hourly Limit**: 1,000 requests per hour (`x-ratelimit-limit: 1000`)
- **Per-Minute Limit**: 400 requests per minute (`per-min-x-ratelimit-limit: 400`)
- **Current Usage**: 991 remaining in hourly limit, 396 remaining in per-minute limit
- **Reset Times**: Hourly limit resets at timestamp 290925122510, per-minute resets at 290925113436

### Access Permissions
- ✅ **Read Access**: Contact field metadata via `/api/settings/contacts/fields`
- ✅ **Search Access**: Basic search functionality via `/api/search`
- ✅ **Activities Access**: Sales activities via `/api/activities`
- ❌ **Limited Contact Data Access**: 403 Forbidden on `/api/contacts` (read contact records)
- ❌ **No Direct Notes Endpoint**: `/api/notes` returns 404

## Available Contact Fields & Data Structure

The API provides comprehensive contact field metadata with 69+ available fields:

### Core Contact Fields for Your Use Case

| Field Purpose | API Field Name | Field Type | Field Label | Notes |
|---------------|----------------|------------|-------------|-------|
| **Child Name** | `first_name`, `last_name` | text | "First name", "Last name" | Standard text fields |
| **Parent Name** | `first_name`, `last_name` | text | "First name", "Last name" | Same fields used for parent info |
| **Parent Email** | `emails` | group_field | "Emails" | Group field with Work/Personal/Other choices |
| **Parent Mobile** | `mobile_number` | text | "Mobile" | Direct mobile number field |
| **Interest Level** | `contact_status_id` | dropdown | "Status" | 13 status values including Hot/Warm/Interested |

### Detailed Status Options for Interest Level
The `contact_status_id` field offers comprehensive interest tracking:

1. **New** (402000446643) - Open
2. **Contacted** (402000446644) - Open
3. **Interested** (402000446645) - Open
4. **Not Interested/Qualified** (402000446646) - Closed Lost
5. **Tepid** (402000769051) - Open
6. **Warm** (402000446648) - Open
7. **Hot** (402000446647) - Open
8. **Returning Parent** (402001579233) - Open
9. **Cold** (402000790072) - Closed Lost
10. **Payment Link Raised** (402000905665) - Open
11. **Full Scholarship GSP'25** (402001624730) - Open
12. **Paid** (402000446650) - Closed Won
13. **Lost** (402000446651) - Closed Lost

### Additional Useful Fields
- **Child Grade**: `cf_child_grade` (custom text field)
- **Program**: `cf_program` (custom text field)
- **Geography**: `country` (text field)
- **Tags**: `tags` (auto_complete, multiple values)
- **Lead Source**: `lead_source_id` (dropdown with Web, Email, Phone, etc.)
- **Lifecycle Stage**: `lifecycle_stage_id` (Lead, Sales Qualified Lead, Customer)

## API Capabilities Assessment

### ✅ Supported Operations
1. **Field Metadata Retrieval**: Complete access to all field definitions, types, and choices
2. **Basic Search**: Global search across entities (though limited results in test)
3. **Activities Management**: Read access to sales activities/notes via activities endpoint
4. **Rate Limit Monitoring**: Clear visibility into usage limits via response headers

### ❌ Current Limitations
1. **Contact Record Access**: 403 Forbidden on direct contact listing/reading
2. **Advanced Search**: Filtered search endpoints return 404
3. **Direct Notes Access**: No dedicated notes endpoint available
4. **Contact Creation/Update**: Cannot test due to read permission limitations

### Probable Reasons for Limited Access
The API key appears to have restricted permissions, likely configured for:
- Field metadata access only
- Search functionality
- Activities/notes reading through the activities endpoint
- No direct contact data manipulation

## Recommendations for Implementation

### 1. Permission Escalation
Contact the FreshSales administrator to:
- Grant full contact read/write permissions to the API key
- Enable advanced search capabilities
- Confirm note creation/update permissions

### 2. Field Mapping Strategy
For your contact management needs:

```json
{
  "child_name": "first_name + last_name",
  "parent_name": "first_name + last_name",
  "parent_email": "emails[0].value",
  "parent_mobile": "mobile_number",
  "interest_level": "contact_status_id",
  "additional_info": {
    "child_grade": "cf_child_grade",
    "program": "cf_program",
    "geography": "country",
    "tags": "tags"
  }
}
```

### 3. Search Implementation
Once permissions are resolved:
- Use `/api/contacts` for bulk contact retrieval
- Implement email search via contact filtering
- Use mobile number search for parent lookup
- Leverage the comprehensive status system for interest tracking

### 4. Notes/Activities Management
- Use `/api/activities` endpoint for note creation/reading
- Activities support multiple types: Email, Phone, Meeting, Task, etc.
- Consider activities as the primary method for adding contact notes

## API Tier Assessment
Based on the rate limits and feature access:
- **Tier**: Professional/Premium (1000/hour, 400/minute limits suggest paid tier)
- **Feature Set**: Field metadata access indicates developer/integration tier access
- **Limitation**: Permissions appear restricted, not a tier limitation

## Next Steps
1. **Request Enhanced Permissions**: Contact FreshSales admin for full contact access
2. **Test Contact CRUD Operations**: Once permissions are granted
3. **Implement Search Functionality**: Test email/phone search capabilities
4. **Validate Notes Creation**: Confirm activity creation for note management
5. **Build Integration**: Develop the contact management system with proper field mappings

---
*Report generated on 2025-09-29 using FreshSales API credentials for genwisecrm.myfreshworks.com*