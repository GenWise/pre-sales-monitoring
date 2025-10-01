# FreshSales API Permissions Guide

## Current Situation Analysis

**Domain**: genwisecrm.myfreshworks.com/crm/sales
**Current API Key**: N4wWW4utZkWt83cooXIuWA
**Issue**: 403 Forbidden errors on contact endpoints
**Root Cause**: API key lacks sufficient permissions for contact operations

## Problem Analysis

### Current API Tier Assessment
Your current API key provides only **metadata access**, which explains the 403 Forbidden errors when attempting to access contact endpoints. The FreshSales API enforces role-based access control where:

- **User-level API keys**: Can only access data the user has permission to view
- **Admin-level API keys**: Required for full CRUD operations on contacts, deals, and other sensitive data
- **403 Errors**: Indicate insufficient permissions, typically requiring admin-level credentials

### Specific Contact Endpoints Requiring Admin Access
Based on the research, these contact endpoints likely require admin permissions:
- `GET /api/contacts` - List all contacts
- `POST /api/contacts` - Create new contacts
- `PUT /api/contacts/{id}` - Update contact details
- `DELETE /api/contacts/{id}` - Delete contacts
- `POST /api/contacts/bulk_*` - Bulk operations
- `POST /api/filtered_search/contact` - Advanced contact search

## 1. Email Template for FreshSales Admin

### Subject: Request for Admin API Access - Business Integration Requirements

---

**To**: [FreshSales Admin/IT Administrator]
**From**: [Your Name]
**Subject**: Request for Admin API Access - Business Integration Requirements

Dear [Admin Name],

I am writing to request elevated API permissions for our FreshSales CRM integration project. We are currently experiencing access limitations that prevent our business automation systems from functioning properly.

**Current Situation:**
- API Key: N4wWW4utZkWt83cooXIuWA
- Domain: genwisecrm.myfreshworks.com/crm/sales
- Issue: 403 Forbidden errors on contact endpoints

**Business Justification:**
Our integration requires programmatic access to contact data for:
1. **Lead Management Automation**: Automatically sync new leads from our website and marketing channels
2. **Data Synchronization**: Keep contact information consistent across multiple business systems
3. **Reporting and Analytics**: Generate custom reports for business intelligence
4. **Customer Service Integration**: Enable support teams to access real-time contact information

**Specific Permissions Needed:**
- **Contact Management**: Full CRUD access (Create, Read, Update, Delete) for contacts
- **Filtered Search**: Advanced search capabilities for contact lookup by email, phone, etc.
- **Bulk Operations**: Ability to perform bulk updates and imports
- **Account Association**: Link contacts to accounts and deals

**Technical Requirements:**
- Admin-level API key or elevation of current key permissions
- Access to the following endpoints:
  - `/api/contacts` (all HTTP methods)
  - `/api/filtered_search/contact`
  - `/api/contacts/bulk_*` operations

**Security Considerations:**
- API access will be restricted to authorized personnel only
- All API calls will be logged and monitored
- Data will be handled in compliance with privacy policies
- Integration will follow FreshSales rate limiting guidelines (400 requests/minute)

**Impact of Current Limitation:**
Without proper API access, we cannot:
- Automatically sync leads, resulting in manual data entry overhead
- Maintain data consistency across systems
- Provide real-time customer information to our teams
- Generate automated reports for business decisions

**Requested Action:**
Please either:
1. Upgrade the permissions for API key N4wWW4utZkWt83cooXIuWA to admin level, OR
2. Provide a new admin-level API key for our integration use

I am available to discuss this request further and provide any additional information needed. Thank you for your consideration.

Best regards,
[Your Name]
[Your Title]
[Contact Information]

---

## 2. Permission Requirements Explanation

### What Permissions Are Needed
1. **Admin-Level API Access**: Required for full contact management capabilities
2. **Contact Module Permissions**: Read, write, update, delete access to contact records
3. **Search Permissions**: Access to filtered search endpoints for contact lookup
4. **Bulk Operation Rights**: Ability to perform mass updates and imports

### Why These Permissions Are Necessary
- **Role-Based Access Control**: FreshSales enforces strict permission boundaries
- **Data Security**: Contact information is considered sensitive and requires elevated access
- **API Architecture**: Core CRUD operations are restricted to prevent unauthorized data access
- **Business Operations**: Modern integrations require bidirectional data flow

## 3. Current API Tier Analysis

### Metadata-Only Access (Current State)
- **Available**: System information, field definitions, user lists
- **Restricted**: Actual contact data, deal information, account details
- **Limitation**: Cannot perform business-critical operations

### Admin-Level Access (Required)
- **Available**: Full CRUD operations on all modules
- **Capabilities**: Contact management, data import/export, advanced search
- **Rate Limits**: 400 requests/minute (upgraded from 1000/hour)

## 4. Specific Endpoints Requiring Access

### Contact Management Endpoints
```
POST /api/contacts                    - Create contacts
GET /api/contacts                     - List contacts
GET /api/contacts/{id}                - Get specific contact
PUT /api/contacts/{id}                - Update contact
DELETE /api/contacts/{id}             - Delete contact
```

### Search and Filter Endpoints
```
POST /api/filtered_search/contact     - Advanced contact search
GET /api/contacts/lists/{id}          - Get contacts from lists
```

### Bulk Operations
```
POST /api/contacts/bulk_upsert        - Bulk create/update
POST /api/contacts/bulk_destroy       - Bulk delete
POST /api/contacts/bulk_assign_owner  - Bulk ownership changes
```

## 5. Business Justification

### Operational Efficiency
- **Automated Lead Processing**: Reduce manual data entry by 80%
- **Real-Time Synchronization**: Ensure data consistency across platforms
- **Streamlined Workflows**: Enable automated follow-up and nurturing

### Data Management
- **Single Source of Truth**: Centralize contact information
- **Data Quality**: Automated validation and deduplication
- **Compliance**: Consistent data handling across systems

### Business Intelligence
- **Custom Reporting**: Generate insights not available in standard reports
- **Performance Metrics**: Track lead conversion and engagement
- **Predictive Analytics**: Use historical data for forecasting

### Cost Savings
- **Reduced Manual Labor**: Eliminate repetitive data entry tasks
- **Improved Accuracy**: Reduce errors from manual processes
- **Faster Response Times**: Automated customer service workflows

## 6. Alternative Approaches

### If Admin Permissions Cannot Be Granted

#### Option 1: Limited User Permissions
- Request specific contact read/write permissions for your user account
- May still result in limited functionality but could resolve basic access issues

#### Option 2: Shared Admin Account
- Create a dedicated service account with admin privileges
- Use this account specifically for API integrations
- Maintain audit trail through separate credentials

#### Option 3: Webhook Integration
- Configure FreshSales webhooks to push data to your systems
- Reduces need for polling via API
- May require custom development to handle incoming data

#### Option 4: CSV Import/Export Workflow
- Use manual or scheduled CSV exports from FreshSales
- Process data externally and import back via CSV
- Less automated but may be acceptable for some use cases

#### Option 5: Third-Party Integration Platforms
- Use tools like Zapier, Make.com, or similar platforms
- May have pre-negotiated API access
- Additional cost but potentially faster implementation

### If Rate Limits Become an Issue
- Implement request queuing and retry logic
- Cache frequently accessed data locally
- Use bulk operations where possible
- Consider premium API tier if available

## 7. Testing Guide for Permission Verification

### Once Permissions Are Obtained

#### Step 1: Basic Authentication Test
```bash
curl -H "Authorization: Token token=YOUR_NEW_API_KEY" \
     -H "Content-Type: application/json" \
     https://genwisecrm.myfreshworks.com/crm/sales/api/contacts
```
**Expected Result**: Should return contact list instead of 403 error

#### Step 2: Contact Creation Test
```bash
curl -X POST \
     -H "Authorization: Token token=YOUR_NEW_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"contact": {"first_name": "Test", "last_name": "Contact", "email": "test@example.com"}}' \
     https://genwisecrm.myfreshworks.com/crm/sales/api/contacts
```
**Expected Result**: Should create contact and return contact details

#### Step 3: Filtered Search Test
```bash
curl -X POST \
     -H "Authorization: Token token=YOUR_NEW_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"filter_rule": [{"attribute": "email", "operator": "is_in", "value": ["test@example.com"]}]}' \
     https://genwisecrm.myfreshworks.com/crm/sales/api/filtered_search/contact
```
**Expected Result**: Should return matching contacts

#### Step 4: Bulk Operation Test
```bash
curl -X POST \
     -H "Authorization: Token token=YOUR_NEW_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"contacts": [{"first_name": "Bulk1", "email": "bulk1@example.com"}, {"first_name": "Bulk2", "email": "bulk2@example.com"}]}' \
     https://genwisecrm.myfreshworks.com/crm/sales/api/contacts/bulk_upsert
```
**Expected Result**: Should create multiple contacts

#### Step 5: Rate Limit Verification
- Make rapid sequential requests to test rate limiting
- Verify you receive 429 errors at the expected threshold (400 requests/minute)
- Test retry logic and backoff strategies

### Verification Checklist
- [ ] Basic contact listing works (no 403 errors)
- [ ] Can create new contacts
- [ ] Can update existing contacts
- [ ] Can delete test contacts
- [ ] Filtered search functions properly
- [ ] Bulk operations complete successfully
- [ ] Rate limiting behaves as expected
- [ ] All required endpoints accessible

### Monitoring and Maintenance
1. **Log All API Responses**: Track success/failure rates
2. **Monitor Rate Limits**: Ensure you stay within quota
3. **Regular Permission Checks**: Verify access hasn't been revoked
4. **Error Handling**: Implement proper retry logic for temporary failures

## Summary

Your current 403 Forbidden errors are due to insufficient API permissions. The solution requires admin-level API access to perform contact operations. Use the provided email template to request proper permissions from your FreshSales administrator, emphasizing the business value and security considerations. If admin access cannot be granted, consider the alternative approaches outlined above.

The testing guide will help verify that permissions are working correctly once obtained, ensuring your integration can function as intended.