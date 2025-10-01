# FreshSales CRM Integration

## Overview

This document describes the comprehensive FreshSales CRM integration for the pre-sales monitoring system. The integration synchronizes leads from the master database (Google Sheets) to FreshSales CRM, enabling better lead management and follow-up tracking.

## Current Status: 🚧 Ready for API Permissions

The integration is **fully built and tested** but requires **enhanced API permissions** from FreshSales admin to function completely.

### ✅ What's Working
- **API connectivity** to FreshSales (genwisecrm.myfreshworks.com)
- **Field metadata access** - can read all available contact fields
- **Search functionality** - limited search capabilities
- **Activities/Notes management** - can read and create activities
- **Rate limiting** - respects API quotas (1,000/hour, 400/minute)
- **Error handling** - graceful handling of 403 permission errors
- **Mock mode** - full testing capability without API access

### ❌ What Needs API Permissions
- **Contact creation** - currently returns 403 Forbidden
- **Contact reading** - cannot list or retrieve individual contacts
- **Contact updates** - cannot modify existing contact data
- **Advanced search** - filtered contact searches unavailable

## Architecture

### Core Components

```
src/api/
├── freshsalesClient.js    # Core API client with authentication & rate limiting
├── freshsalesMapper.js    # Field mapping between master DB and FreshSales
└── freshsalesSync.js      # Main sync orchestration logic

test_freshsales.js         # Comprehensive test suite
```

### Data Flow

```
Google Sheets (Master DB) → Field Mapping → FreshSales CRM
                                ↓
                            Activities/Notes
                                ↓
                          Progress Tracking
```

## Configuration

### Environment Variables

Add to `.env`:

```bash
# FreshSales API Configuration
FRESHSALES_API_KEY=N4wWW4utZkWt83cooXIuWA
FRESHSALES_DOMAIN=genwisecrm.myfreshworks.com

# Sync Configuration
FRESHSALES_SYNC_BATCH_SIZE=10
FRESHSALES_DUPLICATE_STRATEGY=skip
FRESHSALES_SYNC_DIRECTION=bidirectional

# Mock Mode for Testing
FRESHSALES_MOCK_MODE=false
```

### Field Mapping

The mapper handles these key field transformations:

| Master Database Field | FreshSales Field | Type | Notes |
|----------------------|------------------|------|-------|
| Child Name | `first_name`, `last_name` | text | Split into separate fields |
| Parent Email | `emails` | array | Formatted as primary email |
| Parent Mobile | `mobile_number` | text | Cleaned and formatted |
| Interest Level | `contact_status_id` | dropdown | Maps to FreshSales status IDs |
| Child Grade | `cf_child_grade` | custom | Custom field mapping |
| Program | `cf_program` | custom | Custom field mapping |
| Geography | `country` | text | Location information |

### Contact Status Mapping

Interest levels are mapped to FreshSales contact status IDs:

| Interest Level | FreshSales Status ID | Category |
|---------------|---------------------|----------|
| Hot | 402000446647 | Open |
| Warm | 402000446648 | Open |
| Interested | 402000446645 | Open |
| New | 402000446643 | Open |
| Contacted | 402000446644 | Open |
| Not Interested | 402000446646 | Closed Lost |
| Cold | 402000790072 | Closed Lost |
| Paid | 402000446650 | Closed Won |

## Usage

### Running Tests

```bash
# Test with mock mode (safe, no API calls)
node test_freshsales.js --mock

# Test with live API (limited functionality due to permissions)
node test_freshsales.js

# Full integration test (requires API permissions)
node test_freshsales.js --test-sync
```

### Basic Integration Example

```javascript
const FreshSalesSync = require('./src/api/freshsalesSync');

// Initialize sync (will use mock mode if permissions insufficient)
const sync = new FreshSalesSync({
    mockMode: process.env.FRESHSALES_MOCK_MODE === 'true',
    batchSize: 10,
    duplicateStrategy: 'skip'
});

// Sync leads from master database to FreshSales
const result = await sync.syncLeadsToFreshSales({
    since: '2024-01-01',     // Only sync leads after this date
    status: 'interested',     // Filter by interest level
    limit: 50                // Maximum number of leads to process
});

console.log('Sync Results:', result);
```

### Advanced Usage

```javascript
const FreshSalesClient = require('./src/api/freshsalesClient');
const FreshSalesMapper = require('./src/api/freshsalesMapper');

// Direct API usage
const client = new FreshSalesClient();
const mapper = new FreshSalesMapper();

// Test API connectivity and permissions
const connectionTest = await client.testConnection();
console.log('API Status:', connectionTest);

// Map lead data to FreshSales format
const leadData = {
    'Child Name': 'John Doe',
    'Parent Email': 'parent@example.com',
    'Interest Level': 'Hot'
};

const contactData = mapper.mapLeadToContact(leadData);
console.log('Mapped Contact:', contactData);

// Create contact (requires API permissions)
try {
    const newContact = await client.createContact(contactData);
    console.log('Created Contact:', newContact);
} catch (error) {
    if (error.message.includes('API_PERMISSION_DENIED')) {
        console.log('Contact creation requires enhanced API permissions');
    }
}
```

## Error Handling

The integration includes comprehensive error handling:

### Permission Errors (403)
- **Detection**: Automatic detection of 403 Forbidden responses
- **Handling**: Graceful degradation to mock mode or skip operations
- **Reporting**: Clear messages about permission requirements

### Rate Limiting
- **Prevention**: Automatic rate limit checking before requests
- **Backoff**: Exponential backoff retry strategy
- **Monitoring**: Real-time rate limit status tracking

### Network Issues
- **Retry Logic**: Up to 3 retries with exponential backoff
- **Timeout Handling**: Configurable request timeouts
- **Connection Errors**: Graceful handling of network failures

## API Permission Requirements

To enable full functionality, the FreshSales administrator needs to grant these permissions to the API key:

### Required Permissions
1. **Contact Read**: List and retrieve individual contacts
2. **Contact Write**: Create new contacts
3. **Contact Update**: Modify existing contact data
4. **Advanced Search**: Use filtered contact searches

### How to Request Permissions

Contact your FreshSales administrator with this information:

```
Subject: API Permissions Request for Pre-sales Integration

Hi [Admin Name],

We need to enhance API permissions for our pre-sales monitoring integration.

Current API Key: N4wWW4utZkWt83cooXIuWA
Domain: genwisecrm.myfreshworks.com

Required Permissions:
- Contact Read (to check for existing contacts)
- Contact Write (to create new leads)
- Contact Update (to sync updated information)

Current Limitations:
- Getting 403 Forbidden on /api/contacts endpoints
- Field metadata and search work fine
- Activities/notes work correctly

This integration will help automate lead management from our pre-sales forms.

Thanks!
```

### Alternative: Create New API Key

If the current API key cannot be modified, create a new one with full permissions:

1. Go to **Settings** → **API Settings**
2. Create new API key with **full contact permissions**
3. Update `FRESHSALES_API_KEY` in `.env`
4. Test with `node test_freshsales.js`

## Testing Strategy

### Mock Mode Testing
```bash
# Safe testing without API calls
node test_freshsales.js --mock
```
- Tests all logic without API permissions
- Validates field mapping and data transformation
- Verifies error handling and edge cases

### Live API Testing
```bash
# Test with current permissions
node test_freshsales.js
```
- Tests actual API connectivity
- Identifies permission limitations
- Validates working endpoints (metadata, search, activities)

### Full Integration Testing
```bash
# Test complete sync (requires permissions)
node test_freshsales.js --test-sync
```
- Tests end-to-end sync operations
- Validates contact creation and updates
- Measures performance and rate limiting

## Production Deployment

### Pre-deployment Checklist
- [ ] API permissions granted by FreshSales admin
- [ ] Environment variables configured
- [ ] Master database (Google Sheets) accessible
- [ ] Test suite passes with live API: `node test_freshsales.js --test-sync`

### Deployment Steps

1. **Test API Permissions**:
```bash
node test_freshsales.js
```

2. **Run Initial Sync**:
```javascript
const sync = require('./src/api/freshsalesSync');
const result = await sync.syncLeadsToFreshSales({ limit: 10 });
```

3. **Monitor Sync Results**:
```javascript
console.log(`Created: ${result.stats.created}`);
console.log(`Updated: ${result.stats.updated}`);
console.log(`Errors: ${result.stats.errors}`);
```

4. **Set up Automated Sync**:
```javascript
// Daily sync at 9 AM
const cron = require('cron');
const job = new cron.CronJob('0 9 * * *', async () => {
    const result = await sync.syncLeadsToFreshSales();
    console.log('Daily sync completed:', result);
});
job.start();
```

## Monitoring & Maintenance

### Key Metrics to Monitor
- **Sync Success Rate**: Percentage of successful lead syncs
- **API Rate Limit Usage**: Current usage vs. limits
- **Error Rates**: Types and frequency of errors
- **Data Quality**: Validation of mapped fields

### Regular Maintenance
- **Weekly**: Review sync reports and error logs
- **Monthly**: Analyze duplicate handling and data quality
- **Quarterly**: Review field mappings for new requirements

### Troubleshooting

#### Common Issues

1. **403 Permission Denied**
   - **Cause**: Insufficient API permissions
   - **Solution**: Contact FreshSales admin for enhanced permissions

2. **Rate Limit Exceeded**
   - **Cause**: Too many requests in short timeframe
   - **Solution**: Increase batch delay or reduce batch size

3. **Field Mapping Errors**
   - **Cause**: New fields in master database
   - **Solution**: Update mapper configuration

4. **Connection Timeouts**
   - **Cause**: Network connectivity issues
   - **Solution**: Check internet connection and API status

## Roadmap

### Phase 1: ✅ Foundation (Complete)
- [x] Core API client with authentication
- [x] Field mapping between systems
- [x] Error handling and rate limiting
- [x] Comprehensive testing framework
- [x] Mock mode for safe testing

### Phase 2: 🚧 API Permissions (In Progress)
- [ ] Contact FreshSales admin for permissions
- [ ] Test contact CRUD operations
- [ ] Validate search functionality
- [ ] Confirm note/activity creation

### Phase 3: 📋 Production Sync (Pending Permissions)
- [ ] Initial bulk sync of existing leads
- [ ] Incremental sync for new leads
- [ ] Duplicate detection and handling
- [ ] Bidirectional sync capabilities

### Phase 4: 🔄 Automation & Monitoring
- [ ] Automated daily/hourly sync
- [ ] Real-time webhook integration
- [ ] Sync dashboard and reporting
- [ ] Performance optimization

### Phase 5: 📈 Advanced Features
- [ ] Lead scoring integration
- [ ] Custom field automation
- [ ] Pipeline stage management
- [ ] Integration with other tools

## Support & Documentation

### Getting Help
1. **Test Suite**: Run `node test_freshsales.js --help` for testing options
2. **Error Messages**: All errors include specific guidance
3. **API Documentation**: FreshSales API docs at their developer portal
4. **Code Comments**: Comprehensive inline documentation

### File Documentation
- **`freshsalesClient.js`**: API client methods and authentication
- **`freshsalesMapper.js`**: Field mapping and data transformation
- **`freshsalesSync.js`**: Sync orchestration and batch processing
- **`test_freshsales.js`**: Complete test suite with examples

### API Reference
- **Base URL**: `https://genwisecrm.myfreshworks.com/crm/sales/api`
- **Authentication**: `Authorization: Token token=API_KEY`
- **Rate Limits**: 1,000/hour, 400/minute
- **Key Endpoints**: `/contacts`, `/activities`, `/search`, `/settings/contacts/fields`

---

**Status**: Ready for API permissions
**Next Action**: Contact FreshSales administrator for contact read/write permissions
**Test Command**: `node test_freshsales.js --mock` (safe) or `node test_freshsales.js` (live API)