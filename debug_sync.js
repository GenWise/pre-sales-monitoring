#!/usr/bin/env node
/**
 * Debug version of the sync to see exactly what data is being processed
 */

require('dotenv').config();

const FreshSalesSync = require('./src/api/freshsalesSync');

async function debugSync() {
    console.log('🐛 DEBUG SYNC - Let\'s see what data is being processed\n');

    const sync = new FreshSalesSync({
        testSessionId: `debug_test_${Date.now()}`,
        mockMode: false,
        batchSize: 1,
        masterSheetId: '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ',
        serviceAccountFile: './service-account-key.json'
    });

    try {
        console.log('📋 Step 1: Loading data from master sheet...');

        // Load leads from master database directly to see the data
        const leads = await sync.loadLeadsFromMasterDatabase({
            syncEligibleOnly: true,
            limit: 1
        });

        console.log(`📊 Found ${leads.length} leads`);

        if (leads.length > 0) {
            console.log('\n📋 First lead data:');
            console.log(JSON.stringify(leads[0], null, 2));

            console.log('\n🔄 Mapping to FreshSales format...');
            const mappedData = sync.mapper.mapLeadToContact(leads[0]);
            console.log('📋 Mapped contact data:');
            console.log(JSON.stringify(mappedData, null, 2));

            console.log('\n📤 Testing contact creation...');
            try {
                const result = await sync.client.createContact(mappedData);
                console.log('✅ Contact created successfully!');
                console.log('Contact ID:', result.contact?.id);
            } catch (error) {
                console.error('❌ Contact creation failed:');
                console.error('Error:', error.message);
                if (error.response) {
                    console.error('Status:', error.response.statusCode);
                    console.error('Response:', JSON.stringify(error.response.data, null, 2));
                }
            }
        } else {
            console.log('❌ No sync-eligible leads found');

            // Let's try loading ALL leads to see what's in the sheet
            console.log('\n🔍 Loading ALL leads to debug...');
            const allLeads = await sync.loadLeadsFromMasterDatabase({
                syncEligibleOnly: false,
                limit: 5
            });
            console.log(`📊 Found ${allLeads.length} total leads`);

            if (allLeads.length > 0) {
                console.log('\n📋 First few leads (status fields):');
                allLeads.slice(0, 3).forEach((lead, i) => {
                    console.log(`Lead ${i + 1}:`);
                    console.log(`  Status: "${lead.Status || 'undefined'}"`);
                    console.log(`  Interest Level: "${lead['Interest Level'] || 'undefined'}"`);
                    console.log(`  status: "${lead.status || 'undefined'}"`);
                    console.log('  All fields:', Object.keys(lead));
                    console.log('');
                });
            }
        }

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error(error.stack);
    }
}

if (require.main === module) {
    debugSync().catch(console.error);
}

module.exports = { debugSync };