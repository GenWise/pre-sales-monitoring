/**
 * Verify what's in master sheet and why sync finds 0 leads
 */

require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs').promises;

async function verifyMasterData() {
    console.log('\n=== Verifying Master Sheet Data ===\n');

    const masterSheetId = process.env.PRESALES_MASTER_SHEET_ID;
    const serviceAccountFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;

    const serviceAccountInfo = JSON.parse(await fs.readFile(serviceAccountFile, 'utf8'));
    const authClient = new JWT({
        email: serviceAccountInfo.client_email,
        key: serviceAccountInfo.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const doc = new GoogleSpreadsheet(masterSheetId, authClient);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    console.log(`Total rows: ${rows.length}`);
    console.log(`Headers: ${sheet.headerValues.join(', ')}\n`);

    // Convert to lead objects like sync does
    const leads = rows.map(row => {
        const leadData = {};
        sheet.headerValues.forEach((headerValue, index) => {
            if (headerValue && row._rawData && row._rawData[index] !== undefined) {
                leadData[headerValue] = row._rawData[index];
            }
        });
        return leadData;
    });

    console.log('=== All Leads ===');
    leads.forEach((lead, idx) => {
        console.log(`${idx + 1}. Status: ${lead.status}, CRM Link: ${lead.crm_contact_link || 'NONE'}, Mobile: ${lead.parent_mobile}, Email: ${lead.parent_email}`);
    });

    console.log('\n=== Filter Test: syncEligibleOnly (like production sync) ===');
    const syncEligibleStatuses = ['warm', 'hot', 'not interested'];
    const syncEligible = leads.filter(lead => {
        const status = (lead.Status || lead.status || lead['Interest Level'] || '').toLowerCase();
        const crmLink = lead.crm_contact_link || lead['CRM Contact Link'] || lead.crmContactLink;
        const notAlreadySynced = !crmLink || crmLink === '';
        const statusMatch = syncEligibleStatuses.includes(status);

        console.log(`  Row: status="${status}", has_crm_link=${!!crmLink}, status_match=${statusMatch}, not_synced=${notAlreadySynced}, ELIGIBLE=${statusMatch && notAlreadySynced}`);

        return statusMatch && notAlreadySynced;
    });

    console.log(`\nResult: ${syncEligible.length} sync-eligible leads`);
    console.log('\n✓ This explains why sync reports "Loaded 0 sync-eligible leads"');
    console.log('✗ Problem: Filter excludes rows with crm_contact_link, preventing duplicate detection for siblings');
}

verifyMasterData()
    .then(() => console.log('\nDone'))
    .catch(error => console.error('Error:', error));
