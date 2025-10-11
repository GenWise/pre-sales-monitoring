#!/usr/bin/env node

/**
 * Contact Status Verification Service
 *
 * Runs 3 minutes after forward sync to re-verify and re-apply contact_status_id
 * Guards against FreshSales automations that reset status to "New"
 *
 * Schedule: Runs at :08 past every hour (3 min after :05 forward sync)
 */

require('dotenv').config();
const FreshSalesClient = require('./src/api/freshsalesClientAxios');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs').promises;
const path = require('path');

class StatusVerificationService {
    constructor() {
        this.client = new FreshSalesClient({
            apiKey: process.env.FRESHSALES_API_KEY || 'awiMf4YWS-S4wE_10pUmHQ',
            domain: 'genwisecrm.myfreshworks.com'
        });

        this.masterSheetId = '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ';
        this.serviceAccountFile = path.join(__dirname, 'credentials', 'service-account-key.json');

        this.statusMapping = {
            'Warm': 402000446648,
            'Hot': 402000446647,
            'Not Interested': 402000446646
        };

        console.log('Status Verification Service initialized');
    }

    async run() {
        console.log('\n🔍 Starting Contact Status Verification...');
        console.log(`Time: ${new Date().toISOString()}`);
        console.log(`[TESTING] Checking if status verification is still needed after disabling FreshSales automation`);

        try {
            // Get contacts created in last 10 minutes with crm_contact_link
            const recentContacts = await this.getRecentlyCreatedContacts();
            console.log(`Found ${recentContacts.length} recently created contacts to verify`);

            if (recentContacts.length === 0) {
                console.log('✅ No contacts to verify - this is EXPECTED if sync frequency is now hourly');
                console.log('[TESTING] If this script consistently finds 0 contacts or 0 fixes, it can be disabled');
                return { success: true, verified: 0, fixed: 0 };
            }

            let verified = 0;
            let fixed = 0;
            let alreadyCorrect = 0;

            for (const row of recentContacts) {
                const result = await this.verifyAndFixStatus(row);
                verified++;
                if (result.fixed) {
                    fixed++;
                } else if (result.alreadyCorrect) {
                    alreadyCorrect++;
                }

                // Rate limiting
                await this.sleep(500);
            }

            console.log(`\n✅ Verification complete: ${verified} checked, ${alreadyCorrect} already correct, ${fixed} fixed`);
            console.log(`[TESTING] If fixed=0 consistently, this script is no longer needed\n`);
            return { success: true, verified, fixed, alreadyCorrect };

        } catch (error) {
            console.error('❌ Status verification failed:', error.message);
            throw error;
        }
    }

    async getRecentlyCreatedContacts() {
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

        // Filter for contacts synced in last :05 run (0-8 minutes ago)
        const now = Date.now();
        const minAge = 0;               // Just synced
        const maxAge = 8 * 60 * 1000;   // At most 8 minutes old

        return rows.filter(row => {
            const crmLink = row.get('crm_contact_link');
            const status = row.get('status');
            const lastSynced = row.get('last_synced_at');

            // Must have CRM link, status, and last_synced_at timestamp
            if (!crmLink || !status || !lastSynced) return false;

            const syncEligibleStatuses = ['warm', 'hot', 'not interested'];
            if (!syncEligibleStatuses.includes(status.toLowerCase())) return false;

            // Check if synced within 3-8 minutes ago (targets :05 run from :08)
            try {
                const syncAge = now - new Date(lastSynced).getTime();
                return syncAge >= minAge && syncAge <= maxAge;
            } catch (e) {
                console.warn(`Invalid last_synced_at timestamp: ${lastSynced}`);
                return false;
            }
        });
    }

    async verifyAndFixStatus(row) {
        try {
            const crmLink = row.get('crm_contact_link');
            const expectedStatus = row.get('status');
            const childName = row.get('child_name');

            // Extract contact ID from link
            const contactIdMatch = crmLink.match(/contacts\/(\d+)/);
            if (!contactIdMatch) {
                console.log(`⚠️  Invalid CRM link for ${childName}: ${crmLink}`);
                return { fixed: false };
            }

            const contactId = contactIdMatch[1];
            const expectedStatusId = this.statusMapping[expectedStatus];

            if (!expectedStatusId) {
                console.log(`⚠️  Unknown status "${expectedStatus}" for ${childName}`);
                return { fixed: false };
            }

            // Get current status from CRM
            const contact = await this.client.getContact(contactId);
            const currentStatusId = contact.contact?.contact_status_id;

            console.log(`\n📋 ${childName} (${contactId}):`);
            console.log(`   Expected: ${expectedStatus} (${expectedStatusId})`);
            console.log(`   Current:  ${currentStatusId}`);

            if (currentStatusId === expectedStatusId) {
                console.log(`   ✅ Status correct - no action needed [GOOD - automation not interfering]`);
                return { fixed: false, alreadyCorrect: true };
            }

            // Status mismatch - re-apply
            console.log(`   🔧 [WARNING] Status mismatch detected - FreshSales automation may still be active!`);
            console.log(`   Re-applying correct status...`);

            await this.client.updateContact(contactId, {
                contact_status_id: expectedStatusId
            });

            console.log(`   ✅ Status fixed: ${expectedStatus}`);
            return { fixed: true, alreadyCorrect: false };

        } catch (error) {
            console.error(`   ❌ Error verifying contact:`, error.message);
            return { fixed: false, error: error.message };
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

async function main() {
    const service = new StatusVerificationService();
    const result = await service.run();

    if (result.success) {
        console.log('✅ Status verification completed successfully');
        process.exit(0);
    } else {
        console.log('⚠️  Status verification completed with errors');
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { StatusVerificationService };
