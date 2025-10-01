/**
 * Test script for the MasterDatabase module
 * This script demonstrates how to use the master database functionality
 */

const MasterDatabase = require('./src/sheets/masterDatabase');

async function testMasterDatabase() {
    console.log('🧪 Testing Master Database functionality...\n');

    try {
        // Initialize the database
        const db = new MasterDatabase();

        // Test connection
        console.log('1. Testing connection...');
        await db.connect();
        console.log('✅ Connected successfully!\n');

        // Test getting current stats
        console.log('2. Getting current database stats...');
        const stats = await db.getStats();
        console.log('📊 Database Stats:', JSON.stringify(stats, null, 2));
        console.log('');

        // Test adding a sample lead
        console.log('3. Testing add lead functionality...');
        const sampleLead = {
            childName: 'Test Child',
            parentName: 'Test Parent',
            parentEmail: 'test.parent@example.com',
            parentMobile: '+91-9876543210',
            interestLevel: 'High',
            sourceTag: 'returning_students',
            status: 'New Parent',
            notes: 'Test lead added via API'
        };

        const addResult = await db.addLead(sampleLead);
        console.log('✅ Add result:', addResult);
        console.log('');

        // Test duplicate detection
        console.log('4. Testing duplicate detection...');
        const isDuplicate = await db.checkForDuplicate(sampleLead.parentEmail, sampleLead.parentMobile);
        console.log('🔍 Duplicate check result:', isDuplicate ? 'Found duplicate' : 'No duplicate');
        console.log('');

        // Test updating a lead
        console.log('5. Testing update lead functionality...');
        const updateResult = await db.updateLead(sampleLead.parentEmail, {
            status: 'First Call Pending',
            assignedOwner: 'John Doe',
            notes: 'Updated via API - First call scheduled'
        });
        console.log('✅ Update result:', updateResult);
        console.log('');

        // Test getting leads with filters
        console.log('6. Testing filtered lead retrieval...');
        const filteredLeads = await db.getLeads({ status: 'First Call Pending' });
        console.log(`📋 Found ${filteredLeads.length} leads with status 'First Call Pending'`);
        if (filteredLeads.length > 0) {
            console.log('Sample lead:', JSON.stringify(filteredLeads[0], null, 2));
        }
        console.log('');

        // Test bulk import
        console.log('7. Testing bulk import functionality...');
        const bulkLeads = [
            {
                childName: 'Bulk Child 1',
                parentName: 'Bulk Parent 1',
                parentEmail: 'bulk1@example.com',
                sourceTag: 'ats_qualifiers',
                interestLevel: 'Medium'
            },
            {
                childName: 'Bulk Child 2',
                parentName: 'Bulk Parent 2',
                parentEmail: 'bulk2@example.com',
                sourceTag: 'website',
                interestLevel: 'Low'
            }
        ];

        const bulkResult = await db.bulkImportLeads(bulkLeads);
        console.log('📦 Bulk import result:', bulkResult);
        console.log('');

        // Final stats
        console.log('8. Final database stats...');
        const finalStats = await db.getStats();
        console.log('📊 Updated Database Stats:', JSON.stringify(finalStats, null, 2));

        console.log('\n🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);

        if (error.message.includes('PRESALES_MASTER_SHEET_ID')) {
            console.log('\n📝 To fix this error:');
            console.log('1. Follow the instructions in manual_sheet_setup.md');
            console.log('2. Update the PRESALES_MASTER_SHEET_ID in your .env file');
            console.log('3. Run this test script again');
        }

        process.exit(1);
    }
}

// Example usage functions
function showUsageExamples() {
    console.log(`
📚 Usage Examples:

const MasterDatabase = require('./src/sheets/masterDatabase');

// 1. Initialize and connect
const db = new MasterDatabase();
await db.connect();

// 2. Add a new lead
const newLead = {
    childName: 'Emma Smith',
    parentName: 'Sarah Smith',
    parentEmail: 'sarah@example.com',
    parentMobile: '+91-9876543210',
    interestLevel: 'High',
    sourceTag: 'returning_students',
    status: 'New Parent',
    notes: 'Interested in advanced math program'
};
await db.addLead(newLead);

// 3. Check for duplicates
const isDupe = await db.checkForDuplicate('sarah@example.com');

// 4. Update a lead
await db.updateLead('sarah@example.com', {
    status: 'Warm',
    assignedOwner: 'John Doe'
});

// 5. Get leads with filters
const hotLeads = await db.getLeads({
    interestLevel: 'High',
    status: 'New Parent'
});

// 6. Get database statistics
const stats = await db.getStats();

// 7. Bulk import
const leads = [/* array of lead objects */];
await db.bulkImportLeads(leads);
`);
}

// Run tests or show examples based on command line argument
if (process.argv.includes('--examples')) {
    showUsageExamples();
} else {
    testMasterDatabase();
}