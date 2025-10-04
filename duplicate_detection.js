#!/usr/bin/env node
/**
 * Duplicate Detection Script (Step 1 of Sync)
 *
 * Searches CRM for existing contacts matching Master Sheet records
 * Updates new_existing and assigned_owner fields based on CRM data
 */

require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const FreshSalesClient = require('./src/api/freshsalesClientAxios');
const fs = require('fs').promises;

class DuplicateDetector {
    constructor(config = {}) {
        this.client = new FreshSalesClient(config);
        this.masterSheetId = config.masterSheetId || '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
        this.serviceAccountFile = config.serviceAccountFile || './service-account-key.json';

        this.stats = {
            processed: 0,
            duplicatesFound: 0,
            updated: 0,
            errors: 0
        };
    }

    async run() {
        console.log('🔍 STEP 1: Duplicate Detection & Reverse Sync\n');

        try {
            // Load Master Sheet
            const { doc, sheet, rows } = await this.loadMasterSheet();
            console.log(`📊 Loaded ${rows.length} total records from Master Sheet`);

            // Filter for "New Parent" records only
            const newParentRows = rows.filter(row => {
                const newExisting = this.getFieldValue(row, 'new_existing');
                return newExisting === 'New Parent';
            });

            console.log(`🔎 Found ${newParentRows.length} "New Parent" records to check\n`);

            if (newParentRows.length === 0) {
                console.log('✅ No records to process - all parents already checked!');
                return this.generateReport();
            }

            // Process each record
            for (const row of newParentRows) {
                await this.processRecord(row, sheet);

                // Rate limiting delay
                await this.sleep(500);
            }

            return this.generateReport();

        } catch (error) {
            console.error('❌ Duplicate detection failed:', error.message);
            throw error;
        }
    }

    async processRecord(row, sheet) {
        this.stats.processed++;

        try {
            const parentEmail = this.getFieldValue(row, 'parent_email');
            const parentMobile = this.getFieldValue(row, 'parent_mobile');
            const childName = this.getFieldValue(row, 'child_name');

            console.log(`\n[${this.stats.processed}] Checking: ${childName}`);
            console.log(`   Email: ${parentEmail}`);
            console.log(`   Mobile: ${parentMobile}`);

            // Search CRM by email first using general search (searches ALL emails, not just primary)
            // CRITICAL: /lookup only searches primary email, /search searches all emails in array
            let existingContact = null;

            if (parentEmail) {
                console.log('   🔍 Searching CRM by email (all addresses)...');
                const emailResults = await this.client.searchContacts(parentEmail);
                // Search returns array of contacts with type='contact'
                const contacts = Array.isArray(emailResults) ? emailResults.filter(r => r.type === 'contact') : [];
                if (contacts.length > 0) {
                    existingContact = { id: contacts[0].id };
                    console.log(`   ✅ Found contact by email: ${existingContact.id}`);
                }
            }

            // If not found by email, try phone number using general search
            // CRITICAL: Search checks mobile_number, work_number, and phone_numbers array
            if (!existingContact && parentMobile) {
                console.log('   🔍 Searching CRM by phone (all fields)...');
                const phoneResults = await this.client.searchContacts(parentMobile);
                const contacts = Array.isArray(phoneResults) ? phoneResults.filter(r => r.type === 'contact') : [];
                if (contacts.length > 0) {
                    existingContact = { id: contacts[0].id };
                    console.log(`   ✅ Found contact by phone: ${existingContact.id}`);
                }
            }

            if (existingContact) {
                this.stats.duplicatesFound++;

                // Get full contact details to retrieve cf_parent_owner
                const fullContact = await this.client.getContact(existingContact.id);
                const parentOwner = fullContact.contact?.custom_field?.cf_parent_owner || '';

                const crmContactUrl = `https://genwisecrm.myfreshworks.com/crm/sales/contacts/${existingContact.id}`;

                console.log(`   📝 Updating Master Sheet:`);
                console.log(`      new_existing: "New Parent" → "Existing Parent"`);
                console.log(`      assigned_owner: → "${parentOwner}"`);
                console.log(`      crm_contact_link: → "${crmContactUrl}"`);

                // Update Master Sheet
                this.setFieldValue(row, 'new_existing', 'Existing Parent');
                if (parentOwner) {
                    this.setFieldValue(row, 'assigned_owner', parentOwner);
                }
                // CRITICAL: Store CRM link for direct access + prevents duplicate sync
                this.setFieldValue(row, 'crm_contact_link', crmContactUrl);

                await row.save();
                this.stats.updated++;

                console.log(`   ✅ Updated successfully`);

            } else {
                console.log(`   ℹ️  Not found in CRM - remains "New Parent"`);
            }

        } catch (error) {
            console.error(`   ❌ Error processing record:`, error.message);
            this.stats.errors++;
        }
    }

    async loadMasterSheet() {
        const serviceAccountInfo = JSON.parse(await fs.readFile(this.serviceAccountFile, 'utf8'));
        const authClient = new JWT({
            email: serviceAccountInfo.client_email,
            key: serviceAccountInfo.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const doc = new GoogleSpreadsheet(this.masterSheetId, authClient);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();

        return { doc, sheet, rows };
    }

    getFieldValue(row, fieldName) {
        // Try multiple field name variations
        const variations = [
            fieldName,
            fieldName.replace(/_/g, ' '),
            fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' '),
            fieldName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        ];

        for (const variation of variations) {
            if (row.get(variation) !== undefined && row.get(variation) !== null) {
                return row.get(variation);
            }
        }

        return '';
    }

    setFieldValue(row, fieldName, value) {
        // Try multiple field name variations
        const variations = [
            fieldName,
            fieldName.replace(/_/g, ' '),
            fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' '),
            fieldName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        ];

        for (const variation of variations) {
            // Check if field exists (could be undefined or empty string)
            try {
                const currentValue = row.get(variation);
                // If we can read it without error, the field exists
                row.set(variation, value);
                return true;
            } catch (e) {
                // Field doesn't exist, try next variation
                continue;
            }
        }

        console.warn(`   ⚠️  Field "${fieldName}" not found in sheet`);
        return false;
    }

    generateReport() {
        console.log('\n' + '='.repeat(50));
        console.log('DUPLICATE DETECTION REPORT');
        console.log('='.repeat(50));
        console.log(`Records processed:    ${this.stats.processed}`);
        console.log(`Duplicates found:     ${this.stats.duplicatesFound}`);
        console.log(`Master Sheet updated: ${this.stats.updated}`);
        console.log(`Errors:               ${this.stats.errors}`);
        console.log('='.repeat(50) + '\n');

        return {
            success: this.stats.errors === 0,
            stats: { ...this.stats },
            timestamp: new Date().toISOString()
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

async function main() {
    const detector = new DuplicateDetector();
    const result = await detector.run();

    if (result.success) {
        console.log('✅ Duplicate detection completed successfully!');
    } else {
        console.log('⚠️  Duplicate detection completed with errors');
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { DuplicateDetector };
