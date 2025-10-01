const MasterDatabase = require('./src/sheets/masterDatabase');

async function checkRecentEntries() {
    console.log('🔍 Checking recent entries in master sheet...\n');

    try {
        const db = new MasterDatabase();
        await db.connect();

        // Get all leads
        const allLeads = await db.getLeads();

        console.log(`Total leads in master sheet: ${allLeads.length}`);

        // Sort by timestamp descending to get most recent
        const sortedLeads = allLeads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        console.log('\n📅 Last 5 entries:');
        console.log('='.repeat(80));

        sortedLeads.slice(0, 5).forEach((lead, index) => {
            const date = new Date(lead.timestamp);
            const dateStr = date.toISOString().split('T')[0];
            const timeStr = date.toTimeString().split(' ')[0];

            console.log(`${index + 1}. ${lead.parentName} (${lead.parentEmail})`);
            console.log(`   Source: ${lead.sourceTag} | Status: ${lead.status}`);
            console.log(`   Date: ${dateStr} ${timeStr}`);
            console.log(`   Row: ${lead.rowNumber}`);
            console.log('');
        });

        // Check for entries from today (2025-10-01)
        const today = '2025-10-01';
        const todayEntries = allLeads.filter(lead => {
            const entryDate = new Date(lead.timestamp).toISOString().split('T')[0];
            return entryDate === today;
        });

        console.log(`\n📊 Entries from today (${today}): ${todayEntries.length}`);
        if (todayEntries.length > 0) {
            console.log('Today\'s entries:');
            todayEntries.forEach(lead => {
                console.log(`- ${lead.parentName} (${lead.sourceTag}) at ${new Date(lead.timestamp).toTimeString()}`);
            });
        } else {
            console.log('❌ NO ENTRIES FROM TODAY FOUND');
        }

        // Check source tag distribution
        console.log('\n📈 Source tag distribution:');
        const sourceStats = allLeads.reduce((acc, lead) => {
            acc[lead.sourceTag] = (acc[lead.sourceTag] || 0) + 1;
            return acc;
        }, {});

        Object.entries(sourceStats).forEach(([source, count]) => {
            console.log(`   ${source}: ${count}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkRecentEntries();