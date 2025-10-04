#!/usr/bin/env node
/**
 * Add "Last Synced" Column to Master Sheet
 *
 * Creates the column and sets protection (owner-only edit)
 */

require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs').promises;

async function addLastSyncedColumn() {
    console.log('📋 Adding "Last Synced" column to Master Sheet...\n');

    try {
        // Load service account credentials
        const serviceAccountInfo = JSON.parse(
            await fs.readFile('./service-account-key.json', 'utf8')
        );

        const authClient = new JWT({
            email: serviceAccountInfo.client_email,
            key: serviceAccountInfo.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const doc = new GoogleSpreadsheet('1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ', authClient);
        await doc.loadInfo();

        const sheet = doc.sheetsByIndex[0];
        await sheet.loadHeaderRow();

        console.log('Current columns:');
        console.log(sheet.headerValues.join(' | '));

        // Check if "Last Synced" column already exists
        if (sheet.headerValues.includes('Last Synced')) {
            console.log('\n✅ "Last Synced" column already exists!');
            console.log('Column index:', sheet.headerValues.indexOf('Last Synced'));
            return;
        }

        // Add the column
        console.log('\n➕ Adding "Last Synced" column...');
        await sheet.setHeaderRow([...sheet.headerValues, 'Last Synced']);
        await sheet.loadHeaderRow();

        console.log('\n✅ Column added successfully!');
        console.log('Updated columns:');
        console.log(sheet.headerValues.join(' | '));

        // Note: Column protection must be set manually in Google Sheets UI
        console.log('\n⚠️  MANUAL STEP REQUIRED:');
        console.log('   1. Open Master Sheet: https://docs.google.com/spreadsheets/d/1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ');
        console.log('   2. Right-click "Last Synced" column → Protect range');
        console.log('   3. Set permissions: "Only you can edit"');
        console.log('   4. Click "Done"');

    } catch (error) {
        console.error('❌ Failed to add column:', error.message);
        throw error;
    }
}

if (require.main === module) {
    addLastSyncedColumn().catch(console.error);
}

module.exports = { addLastSyncedColumn };
