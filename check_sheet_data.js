require('dotenv').config();
const MasterDatabase = require('./src/sheets/masterDatabase');

async function checkData() {
    const db = new MasterDatabase();
    await db.connect();
    
    // Get all leads
    const allLeads = await db.getLeads();
    console.log(`Total leads in sheet: ${allLeads.length}`);
    
    // Show all statuses
    const statuses = {};
    allLeads.forEach(lead => {
        const status = lead.status || 'EMPTY';
        statuses[status] = (statuses[status] || 0) + 1;
    });
    
    console.log('\nStatus breakdown:');
    Object.entries(statuses).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
    });
    
    // Look for TEST records
    const testRecords = allLeads.filter(l => 
        l.parentEmail?.includes('test_mixed') || 
        l.parentName?.includes('TEST_Mixed')
    );
    
    console.log(`\nTest records found: ${testRecords.length}`);
    testRecords.forEach(r => {
        console.log(`  - ${r.parentEmail} | Status: ${r.status}`);
    });
}

checkData().catch(console.error);
