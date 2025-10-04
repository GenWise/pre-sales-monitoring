require('dotenv').config();
const MasterDatabase = require('./src/sheets/masterDatabase');

async function showData() {
    const db = new MasterDatabase();
    await db.connect();

    const allLeads = await db.getLeads();
    console.log('Total leads:', allLeads.length);
    console.log('');

    allLeads.slice(0, 3).forEach((lead, idx) => {
        console.log('Record', idx + 1, ':');
        console.log('  Parent Email:', lead.parentEmail);
        console.log('  Parent Name:', lead.parentName);
        console.log('  Child Name:', lead.childName);
        console.log('  Status:', lead.status);
        console.log('  Interest Level:', lead.interestLevel);
        console.log('  Source Tag:', lead.sourceTag);
        console.log('');
    });
}

showData().catch(console.error);
