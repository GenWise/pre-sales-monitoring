#!/usr/bin/env node
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');

async function checkAllSyncEligibleRecords() {
    const serviceAccountInfo = JSON.parse(fs.readFileSync('./service-account-key.json', 'utf8'));
    const authClient = new JWT({
        email: serviceAccountInfo.client_email,
        key: serviceAccountInfo.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const doc = new GoogleSpreadsheet('1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ', authClient);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    const headers = sheet.headerValues;
    const syncEligibleRecords = [];

    for (const row of rows) {
        const leadData = {};
        headers.forEach((header, index) => {
            if (row._rawData && row._rawData[index] !== undefined) {
                leadData[header] = row._rawData[index];
            }
        });

        const status = (leadData.status || leadData.Status || '').toLowerCase();
        if (['warm', 'hot', 'not interested'].includes(status)) {
            syncEligibleRecords.push(leadData);
        }
    }

    console.log('TOTAL SYNC-ELIGIBLE RECORDS:', syncEligibleRecords.length);
    console.log('(Status: Warm|Hot|Not Interested)\n');

    syncEligibleRecords.forEach((record, index) => {
        console.log(`Record ${index + 1}:`);
        console.log(`  child_name: ${record.child_name}`);
        console.log(`  parent_email: ${record.parent_email}`);
        console.log(`  status: ${record.status}`);
        console.log(`  assigned_owner: ${record.assigned_owner}`);
        console.log(`  source_tag: ${record.source_tag}`);
        console.log('');
    });
}

checkAllSyncEligibleRecords().catch(console.error);
