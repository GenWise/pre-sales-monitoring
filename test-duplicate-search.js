/**
 * Test FreshSales duplicate detection by mobile number
 *
 * GOAL: Find out why duplicate detection is failing
 * Tests:
 * 1. Search for mobile "1212121212" (known duplicate)
 * 2. Search for mobile "7367482345" (testate parent)
 * 3. Log full response format
 * 4. Compare with what findExistingContact() expects
 */

require('dotenv').config();
const FreshSalesClient = require('./src/api/freshsalesClientAxios');

async function testDuplicateSearch() {
    const client = new FreshSalesClient();

    console.log('\n=== Testing FreshSales Duplicate Detection ===\n');

    // Test 1: Search for mobile "1212121212"
    console.log('Test 1: Searching for mobile "1212121212"');
    try {
        const results1 = await client.searchContacts('1212121212');
        console.log('✓ Search successful');
        console.log('  Type:', Array.isArray(results1) ? 'Array' : typeof results1);
        console.log('  Length:', Array.isArray(results1) ? results1.length : 'N/A');
        if (Array.isArray(results1) && results1.length > 0) {
            console.log('  First result:', JSON.stringify(results1[0], null, 2));
        } else {
            console.log('  Results:', JSON.stringify(results1, null, 2));
        }
    } catch (error) {
        console.error('✗ Search failed:', error.message);
    }

    console.log('\n---\n');

    // Test 2: Search for mobile "7367482345"
    console.log('Test 2: Searching for mobile "7367482345"');
    try {
        const results2 = await client.searchContacts('7367482345');
        console.log('✓ Search successful');
        console.log('  Type:', Array.isArray(results2) ? 'Array' : typeof results2);
        console.log('  Length:', Array.isArray(results2) ? results2.length : 'N/A');
        if (Array.isArray(results2) && results2.length > 0) {
            console.log('  First result:', JSON.stringify(results2[0], null, 2));
        } else {
            console.log('  Results:', JSON.stringify(results2, null, 2));
        }
    } catch (error) {
        console.error('✗ Search failed:', error.message);
    }

    console.log('\n---\n');

    // Test 3: Search for email to verify search is working
    console.log('Test 3: Searching for email "testate@genwise.in" (control test)');
    try {
        const results3 = await client.searchContacts('testate@genwise.in');
        console.log('✓ Search successful');
        console.log('  Type:', Array.isArray(results3) ? 'Array' : typeof results3);
        console.log('  Length:', Array.isArray(results3) ? results3.length : 'N/A');
        if (Array.isArray(results3) && results3.length > 0) {
            console.log('  First result:', JSON.stringify(results3[0], null, 2));
        } else {
            console.log('  Results:', JSON.stringify(results3, null, 2));
        }
    } catch (error) {
        console.error('✗ Search failed:', error.message);
    }

    console.log('\n=== Analysis ===\n');
    console.log('Expected behavior in findExistingContact():');
    console.log('- Calls searchContacts(mobile)');
    console.log('- Expects Array.isArray(results) && results.length > 0');
    console.log('- Returns results[0] if found');
    console.log('\n');
}

testDuplicateSearch()
    .then(() => console.log('Test complete'))
    .catch(error => console.error('Test failed:', error));
