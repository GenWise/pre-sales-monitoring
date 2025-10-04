#!/usr/bin/env node
const FreshSalesMapper = require('./src/api/freshsalesMapper');

// Simulate lead data from master sheet
const sampleLead = {
    'Child Name': 'Test Child',
    'Parent Name': 'John Smith',
    'Parent Email': 'john.smith@example.com',
    'Parent Mobile': '+1234567890',
    'Status': 'Warm',
    'Source Tag': 'website',
    'Assigned Owner': 'Kevin',
    'Notes': 'Test note content',
    'Timestamp': '2025-10-04 10:00:00'
};

const mapper = new FreshSalesMapper();

console.log('=== SAMPLE LEAD DATA ===');
console.log(JSON.stringify(sampleLead, null, 2));

console.log('\n=== MAPPED CONTACT DATA ===');
const contactData = mapper.mapLeadToContact(sampleLead);
console.log(JSON.stringify(contactData, null, 2));

console.log('\n=== MAPPED DEAL DATA (with fake contact ID) ===');
const dealData = mapper.mapLeadToDeal(sampleLead, '99999');
console.log(JSON.stringify(dealData, null, 2));
