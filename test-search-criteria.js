/**
 * Test createSearchCriteria to see what it's producing
 *
 * Goal: Understand why duplicate detection isn't triggering during sync
 */

require('dotenv').config();
const FreshSalesMapper = require('./src/api/freshsalesMapper');

const mapper = new FreshSalesMapper();

// Test case 1: Data from master sheet with mobile "1212121212"
const testData1 = {
    parent_email: 'test@parent.inc',
    parent_mobile: '1212121212',
    child_name: 'test_child_returning'
};

// Test case 2: Data from master sheet with mobile "7367482345"
const testData2 = {
    parent_email: 'testate@genwise.in',
    parent_mobile: '7367482345',
    child_name: 'testate'
};

// Test case 3: No email, only mobile
const testData3 = {
    parent_mobile: '1212121212',
    child_name: 'test_child_no_email'
};

console.log('=== Testing createSearchCriteria ===\n');

console.log('Test 1 - Complete data (email + mobile "1212121212"):');
console.log('Input:', testData1);
const criteria1 = mapper.createSearchCriteria(testData1);
console.log('Search criteria:', criteria1);
console.log('\n---\n');

console.log('Test 2 - testate parent (email + mobile "7367482345"):');
console.log('Input:', testData2);
const criteria2 = mapper.createSearchCriteria(testData2);
console.log('Search criteria:', criteria2);
console.log('\n---\n');

console.log('Test 3 - No email, only mobile:');
console.log('Input:', testData3);
const criteria3 = mapper.createSearchCriteria(testData3);
console.log('Search criteria:', criteria3);
console.log('\n---\n');

console.log('=== Analysis ===');
console.log('Expected: { email: "...", mobile: "..." }');
console.log('Actual output above should match this format');
