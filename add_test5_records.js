#!/usr/bin/env node
/**
 * Add Test 5 records to Master Sheet for invalid data handling test
 */
require('dotenv').config();
const MasterDatabase = require('./src/sheets/masterDatabase');

async function addTest5Records() {
    console.log('Adding Test 5 records for invalid data handling...\n');

    const db = new MasterDatabase();
    await db.connect();

    // Generate 500 character string for long notes test
    const longNotes = 'A'.repeat(500);

    const testRecords = [
        {
            child_name: 'TEST_Invalid_Email_Child',
            parent_name: 'TEST_Invalid_Email',
            parent_email: 'not-an-email',  // Invalid email format
            parent_mobile: '9876543210',
            source_tag: 'website',
            status: 'Warm',
            interest_level: 'Medium',
            notes: 'Test record with invalid email format'
        },
        {
            child_name: 'TEST_Missing_Name_Child',
            parent_name: '',  // Empty name
            parent_email: 'test_missing@example.com',
            parent_mobile: '9876543211',
            source_tag: 'website',
            status: 'Hot',
            interest_level: 'High',
            notes: 'Test record with missing parent name'
        },
        {
            child_name: 'TEST_Special_Chars_Child',
            parent_name: "O'Brien-José",  // Special characters: apostrophe, hyphen, accent
            parent_email: 'test_special@example.com',
            parent_mobile: '9876543212',
            source_tag: 'website',
            status: 'Warm',
            interest_level: 'Medium',
            notes: 'Test record with special characters in name'
        },
        {
            child_name: 'TEST_Long_Notes_Child',
            parent_name: 'TEST_Long_Notes',
            parent_email: 'test_long@example.com',
            parent_mobile: '9876543213',
            source_tag: 'website',
            status: 'Hot',
            interest_level: 'High',
            notes: longNotes  // 500 character string
        }
    ];

    console.log('Adding records to Master Sheet...\n');

    for (const record of testRecords) {
        try {
            const result = await db.addLead(record);
            console.log(`✅ Added: ${record.parent_name || '(empty name)'} - Row ${result.rowNumber}`);
        } catch (error) {
            console.log(`❌ Failed to add ${record.parent_name || '(empty name)'}: ${error.message}`);
        }
    }

    console.log('\n✅ Test 5 records added to Master Sheet');
    console.log('\nNext: Run "node test_safe_sync.js" to test invalid data handling');
}

if (require.main === module) {
    addTest5Records().catch(console.error);
}
