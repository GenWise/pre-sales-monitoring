/**
 * Test duplicate detection flow during sync
 *
 * Simulates exactly what happens during forward sync:
 * 1. Read lead from master sheet (simulated)
 * 2. Create search criteria
 * 3. Search for existing contact
 * 4. Report if duplicate found
 */

require('dotenv').config();
const FreshSalesSync = require('./src/api/freshsalesSync');

async function testDuplicateFlow() {
    console.log('\n=== Testing Duplicate Detection Flow ===\n');

    const sync = new FreshSalesSync({
        masterSheetId: process.env.PRESALES_MASTER_SHEET_ID,
        serviceAccountFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
        mockMode: false
    });

    // Test case 1: Lead with mobile "1212121212" (should find duplicate)
    const lead1 = {
        parent_email: 'test@parent.inc',
        parent_mobile: '1212121212',
        child_name: 'test_child_returning',
        source_tag: 'returning_students',
        status: 'Warm'
    };

    console.log('Test 1: Lead with mobile "1212121212"');
    console.log('Lead data:', lead1);

    // Step 1: Create search criteria
    const criteria1 = sync.mapper.createSearchCriteria(lead1);
    console.log('\nSearch criteria:', criteria1);

    // Step 2: Search for existing contact
    console.log('\nSearching for existing contact...');
    const existing1 = await sync.findExistingContact(lead1);

    if (existing1) {
        console.log('✓ DUPLICATE FOUND:', existing1.id, existing1.name);
    } else {
        console.log('✗ NO DUPLICATE FOUND (this is the bug!)');
    }

    console.log('\n---\n');

    // Test case 2: Lead with mobile "7367482345" (testate)
    const lead2 = {
        parent_email: 'testate@genwise.in',
        parent_mobile: '7367482345',
        child_name: 'testate',
        source_tag: 'website',
        status: 'Hot'
    };

    console.log('Test 2: Lead with mobile "7367482345" (testate)');
    console.log('Lead data:', lead2);

    const criteria2 = sync.mapper.createSearchCriteria(lead2);
    console.log('\nSearch criteria:', criteria2);

    console.log('\nSearching for existing contact...');
    const existing2 = await sync.findExistingContact(lead2);

    if (existing2) {
        console.log('✓ DUPLICATE FOUND:', existing2.id, existing2.name);
    } else {
        console.log('✗ NO DUPLICATE FOUND');
    }

    console.log('\n---\n');

    // Test case 3: New lead (should not find duplicate)
    const lead3 = {
        parent_email: 'new_parent@test.com',
        parent_mobile: '9999999999',
        child_name: 'new_child',
        source_tag: 'website',
        status: 'Warm'
    };

    console.log('Test 3: New lead (control - should not find duplicate)');
    console.log('Lead data:', lead3);

    const criteria3 = sync.mapper.createSearchCriteria(lead3);
    console.log('\nSearch criteria:', criteria3);

    console.log('\nSearching for existing contact...');
    const existing3 = await sync.findExistingContact(lead3);

    if (existing3) {
        console.log('✗ UNEXPECTED DUPLICATE FOUND:', existing3.id, existing3.name);
    } else {
        console.log('✓ NO DUPLICATE (expected)');
    }

    console.log('\n=== Summary ===');
    console.log('Test 1 (1212121212):', existing1 ? 'PASS - Found duplicate' : 'FAIL - Should have found duplicate');
    console.log('Test 2 (7367482345):', existing2 ? 'PASS - Found duplicate' : 'FAIL - Should have found duplicate');
    console.log('Test 3 (new lead):', !existing3 ? 'PASS - No duplicate' : 'FAIL - Should not have found duplicate');
    console.log('\n');
}

testDuplicateFlow()
    .then(() => console.log('Test complete'))
    .catch(error => console.error('Test failed:', error));
