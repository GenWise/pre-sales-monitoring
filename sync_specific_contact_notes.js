/**
 * One-time script to sync notes for specific contacts
 * Reads master sheet, finds rows with matching crm_contact_link, creates notes in FreshSales
 */

require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const FreshSalesClient = require('./src/api/freshsalesClientAxios');
const fs = require('fs').promises;

// Target contact IDs
const TARGET_CONTACT_IDS = [
    '402033247887',
    '402033243816',
    '402113856564',
    '402033246095',
    '402113860295',
    '402113858106',
    '402033245417',
    '402033252729',
    '402176421799',
    '402033246339',
    '402113855163',
    '402113855678'
];

async function syncSpecificContactNotes() {
    console.log('🎯 Starting one-time note sync for specific contacts');
    console.log(`📋 Target contacts: ${TARGET_CONTACT_IDS.length}`);
    console.log('');

    const results = {
        processed: 0,
        notesCreated: 0,
        skipped: 0,
        errors: 0,
        details: []
    };

    try {
        // Initialize FreshSales client
        const fsClient = new FreshSalesClient({
            apiKey: process.env.FRESHSALES_API_KEY,
            domain: 'genwisecrm.myfreshworks.com'
        });

        // Load master sheet
        console.log('📊 Loading master sheet...');
        const serviceAccountInfo = JSON.parse(
            await fs.readFile(process.env.GOOGLE_SERVICE_ACCOUNT_FILE, 'utf8')
        );
        const authClient = new JWT({
            email: serviceAccountInfo.client_email,
            key: serviceAccountInfo.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const doc = new GoogleSpreadsheet(process.env.PRESALES_MASTER_SHEET_ID, authClient);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();

        console.log(`✅ Loaded ${rows.length} rows from master sheet`);
        console.log('');

        // Process each row
        for (const row of rows) {
            const crmLink = row.get('crm_contact_link') || '';

            // Extract contact ID from link
            const contactIdMatch = crmLink.match(/contacts\/(\d+)/);
            if (!contactIdMatch) continue;

            const contactId = contactIdMatch[1];

            // Check if this is one of our target contacts
            if (!TARGET_CONTACT_IDS.includes(contactId)) continue;

            results.processed++;

            const childName = row.get('child_name') || 'N/A';
            const notes = row.get('notes') || '';
            const sourceTag = row.get('source_tag') || 'Unknown';
            const parentEmail = row.get('parent_email') || 'N/A';

            console.log(`\n[${results.processed}] Processing: ${childName}`);
            console.log(`    Contact ID: ${contactId}`);
            console.log(`    Email: ${parentEmail}`);
            console.log(`    Notes length: ${notes.length} chars`);

            // Skip if no notes
            if (!notes || !notes.trim()) {
                console.log(`    ⏭️  Skipping - no notes in Column L`);
                results.skipped++;
                results.details.push({
                    contactId,
                    childName,
                    status: 'skipped',
                    reason: 'No notes in Column L'
                });
                continue;
            }

            // Create note content
            const noteContent = `Follow-up from ${new Date().toLocaleDateString('en-IN')}
Child: ${childName}
Source: ${sourceTag}

${notes}

[Auto-synced from Master Sheet - Column L - One-time backfill]`;

            try {
                console.log(`    📝 Creating note (${noteContent.length} chars)...`);
                console.log(`    Preview: ${notes.substring(0, 100)}${notes.length > 100 ? '...' : ''}`);

                await fsClient.createNote(contactId, noteContent);

                console.log(`    ✅ Note created successfully`);
                results.notesCreated++;
                results.details.push({
                    contactId,
                    childName,
                    status: 'success',
                    noteLength: noteContent.length
                });

                // Rate limiting delay
                await sleep(500);

            } catch (error) {
                console.error(`    ❌ Failed to create note: ${error.message}`);
                results.errors++;
                results.details.push({
                    contactId,
                    childName,
                    status: 'error',
                    error: error.message
                });
            }
        }

        // Print summary
        console.log('\n');
        console.log('='.repeat(60));
        console.log('📊 NOTE SYNC SUMMARY');
        console.log('='.repeat(60));
        console.log(`Rows processed:     ${results.processed}`);
        console.log(`Notes created:      ${results.notesCreated}`);
        console.log(`Skipped (no notes): ${results.skipped}`);
        console.log(`Errors:             ${results.errors}`);
        console.log('='.repeat(60));
        console.log('');

        // Print details
        if (results.details.length > 0) {
            console.log('📋 Detailed Results:');
            results.details.forEach((detail, idx) => {
                const statusIcon = detail.status === 'success' ? '✅' :
                                   detail.status === 'error' ? '❌' : '⏭️';
                console.log(`${idx + 1}. ${statusIcon} Contact ${detail.contactId} - ${detail.childName}`);
                if (detail.status === 'success') {
                    console.log(`   Note: ${detail.noteLength} chars`);
                } else if (detail.status === 'error') {
                    console.log(`   Error: ${detail.error}`);
                } else {
                    console.log(`   Reason: ${detail.reason}`);
                }
            });
        }

        // Find contacts not found in master sheet
        const foundContactIds = results.details.map(d => d.contactId);
        const notFound = TARGET_CONTACT_IDS.filter(id => !foundContactIds.includes(id));
        if (notFound.length > 0) {
            console.log('');
            console.log(`⚠️  Contacts not found in master sheet (${notFound.length}):`);
            notFound.forEach(id => {
                console.log(`   - ${id} (https://genwisecrm.myfreshworks.com/crm/sales/contacts/${id})`);
            });
        }

        console.log('');
        console.log('✅ One-time note sync completed');

    } catch (error) {
        console.error('');
        console.error('❌ Script failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the script
syncSpecificContactNotes();
