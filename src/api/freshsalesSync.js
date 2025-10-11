/**
 * FreshSales CRM Sync Module
 *
 * Main orchestration module for synchronizing leads between the pre-sales monitoring
 * master database (Google Sheets) and FreshSales CRM.
 *
 * Features:
 * - Bidirectional sync between master database and FreshSales
 * - Duplicate detection and handling
 * - Error handling and retry logic
 * - Progress tracking and reporting
 * - Mock mode for testing when API permissions are limited
 */

const FreshSalesClient = require('./freshsalesClientAxios');
const FreshSalesMapper = require('./freshsalesMapper');
const CRMChangeTracker = require('./crmChangeTracker');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs').promises;
const path = require('path');

class FreshSalesSync {
    constructor(config = {}) {
        this.client = new FreshSalesClient(config);
        this.mapper = new FreshSalesMapper();

        // 🛡️ SAFETY FIRST: Initialize change tracker for CRM safety
        this.changeTracker = new CRMChangeTracker({
            testSessionId: config.testSessionId || `sync_${Date.now()}`
        });

        // Configuration
        this.masterSheetId = config.masterSheetId || process.env.PRESALES_MASTER_SHEET_ID;
        this.serviceAccountFile = config.serviceAccountFile || process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
        this.mockMode = config.mockMode || false;

        // 🚨 SAFE TESTING: Force batch size to 1 for controlled testing
        this.batchSize = 1; // Override any config - SAFETY REQUIREMENT
        this.duplicateStrategy = config.duplicateStrategy || 'skip'; // 'skip', 'update', 'create_new'
        this.syncDirection = config.syncDirection || 'bidirectional'; // 'to_crm', 'from_crm', 'bidirectional'

        // Progress tracking
        this.syncStats = {
            processed: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: 0,
            duplicates: 0
        };

        // Detailed tracking for reporting
        this.createdContacts = [];
        this.duplicateContacts = [];

        console.log(`FreshSales Sync initialized (Mock mode: ${this.mockMode})`);
        console.log(`Sync direction: ${this.syncDirection}, Batch size: ${this.batchSize}`);
    }

    /**
     * Main sync operation - synchronize leads from master database to FreshSales
     * @param {Object} options - Sync options
     * @returns {Promise<Object>} Sync results
     */
    async syncLeadsToFreshSales(options = {}) {
        console.log('Starting sync: Master Database → FreshSales CRM');
        this.resetSyncStats();

        try {
            // Apply TIP requirement: only sync status-eligible records by default
            const syncOptions = {
                syncEligibleOnly: true,
                ...options
            };

            // Load leads from master database
            const leads = await this.loadLeadsFromMasterDatabase(syncOptions);
            console.log(`Loaded ${leads.length} sync-eligible leads from master database (status: Warm|Hot|Not Interested)`);

            if (leads.length === 0) {
                return this.generateSyncReport('No leads found to sync');
            }

            // Process leads in batches
            const batches = this.createBatches(leads, this.batchSize);
            console.log(`Processing ${batches.length} batches of ${this.batchSize} leads each`);

            for (let i = 0; i < batches.length; i++) {
                console.log(`Processing batch ${i + 1}/${batches.length}`);
                await this.processBatch(batches[i], 'to_crm');

                // Rate limiting delay between batches
                if (i < batches.length - 1) {
                    await this.sleep(1000);
                }
            }

            return this.generateSyncReport('Sync completed successfully');

        } catch (error) {
            console.error('Sync failed:', error.message);
            return this.generateSyncReport(`Sync failed: ${error.message}`, false);
        }
    }

    /**
     * Sync contacts from FreshSales back to master database
     * @param {Object} options - Sync options
     * @returns {Promise<Object>} Sync results
     */
    async syncContactsFromFreshSales(options = {}) {
        console.log('Starting sync: FreshSales CRM → Master Database');
        this.resetSyncStats();

        try {
            // This will likely fail due to API permissions, but we'll try
            const contacts = await this.loadContactsFromFreshSales(options);
            console.log(`Loaded ${contacts.length} contacts from FreshSales`);

            if (contacts.length === 0) {
                return this.generateSyncReport('No contacts found to sync');
            }

            // Update master database with contact data
            await this.updateMasterDatabase(contacts);

            return this.generateSyncReport('Reverse sync completed successfully');

        } catch (error) {
            if (error.message.includes('API_PERMISSION_DENIED')) {
                console.warn('Reverse sync requires contact read permissions in FreshSales');
                return this.generateSyncReport('Reverse sync requires contact read permissions', false);
            }

            console.error('Reverse sync failed:', error.message);
            return this.generateSyncReport(`Reverse sync failed: ${error.message}`, false);
        }
    }

    /**
     * Full bidirectional sync operation
     * @param {Object} options - Sync options
     * @returns {Promise<Object>} Combined sync results
     */
    async performBidirectionalSync(options = {}) {
        console.log('Starting bidirectional sync');

        const results = {
            toFreshSales: null,
            fromFreshSales: null,
            timestamp: new Date().toISOString()
        };

        // Sync to FreshSales first
        results.toFreshSales = await this.syncLeadsToFreshSales(options);

        // Then sync from FreshSales (if permissions allow)
        results.fromFreshSales = await this.syncContactsFromFreshSales(options);

        return results;
    }

    /**
     * Process a batch of leads/contacts
     * @param {Array} batch - Batch of leads or contacts
     * @param {string} direction - Sync direction ('to_crm' or 'from_crm')
     */
    async processBatch(batch, direction) {
        for (const item of batch) {
            try {
                this.syncStats.processed++;

                if (direction === 'to_crm') {
                    await this.processLeadToFreshSales(item);
                } else {
                    await this.processContactFromFreshSales(item);
                }

            } catch (error) {
                console.error(`Error processing item:`, error.message);
                this.syncStats.errors++;
            }
        }
    }

    /**
     * Process individual lead to FreshSales
     * @param {Object} leadData - Lead data from master database
     */
    async processLeadToFreshSales(leadData) {
        try {
            // Check if crm_contact_link already exists (parent already in CRM)
            const crmLink = leadData.crm_contact_link || leadData['CRM Contact Link'] || leadData.crmContactLink;

            if (crmLink) {
                // Extract contact ID from link (format: https://genwisecrm.myfreshworks.com/crm/sales/contacts/12345)
                const contactIdMatch = crmLink.match(/contacts\/(\d+)/);
                if (contactIdMatch) {
                    const contactId = contactIdMatch[1];
                    console.log(`Parent exists in CRM: ${contactId} - checking for child Deal and additive updates`);

                    await this.handleExistingParent(contactId, leadData);
                    return;
                }
            }

            // Normal flow: Check for existing contact by email/mobile
            const contactData = this.mapper.mapLeadToContact(leadData);
            const existingContact = await this.findExistingContact(leadData);

            let contactId = null;
            if (existingContact) {
                await this.handleExistingContact(existingContact, contactData, leadData);
                contactId = existingContact.id;
            } else {
                contactId = await this.createNewContact(contactData, leadData);
            }

            // Update Master Sheet with CRM contact link if contact was created/found
            if (contactId) {
                await this.updateMasterSheetWithCrmLink(leadData, contactId);
            }

        } catch (error) {
            console.error(`Failed to process lead ${leadData.childName || 'Unknown'}:`, error.message);
            throw error;
        }
    }

    /**
     * Update Master Sheet row with CRM contact link
     * @param {Object} leadData - Lead data (must have parent_email or parentEmail)
     * @param {string} contactId - FreshSales contact ID
     */
    async updateMasterSheetWithCrmLink(leadData, contactId) {
        try {
            const crmContactUrl = `https://genwisecrm.myfreshworks.com/crm/sales/contacts/${contactId}`;

            // Load Master Sheet
            let authClient = null;
            if (this.serviceAccountFile) {
                const serviceAccountInfo = JSON.parse(await fs.readFile(this.serviceAccountFile, 'utf8'));
                authClient = new JWT({
                    email: serviceAccountInfo.client_email,
                    key: serviceAccountInfo.private_key,
                    scopes: ['https://www.googleapis.com/auth/spreadsheets']
                });
            }

            const doc = new GoogleSpreadsheet(this.masterSheetId, authClient);
            await doc.loadInfo();
            const sheet = doc.sheetsByIndex[0];
            const rows = await sheet.getRows();

            // Find row by email
            const parentEmail = leadData.parentEmail || leadData['Parent Email'] || leadData.parent_email;
            const targetRow = rows.find(row => {
                const rowEmail = row.get('parent_email') || row.get('Parent Email');
                return rowEmail && parentEmail && rowEmail.toLowerCase() === parentEmail.toLowerCase();
            });

            if (targetRow) {
                targetRow.set('crm_contact_link', crmContactUrl);
                // Convert UTC to IST (UTC+5:30)
                const now = new Date();
                const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
                const istTime = new Date(now.getTime() + istOffset).toISOString().replace('Z', '+05:30');
                targetRow.set('last_synced_at', istTime);
                targetRow.set('new_existing', 'Existing Parent');

                // Set light red background color (RGB: 244, 204, 204)
                await sheet.loadCells();
                const rowIndex = targetRow.rowNumber - 1; // 0-indexed
                const numCols = sheet.columnCount;

                for (let col = 0; col < numCols; col++) {
                    const cell = sheet.getCell(rowIndex, col);
                    cell.backgroundColor = { red: 244/255, green: 204/255, blue: 204/255 };
                }

                await sheet.saveUpdatedCells();
                await targetRow.save();
                console.log(`✅ Updated Master Sheet with CRM link: ${crmContactUrl}`);
            } else {
                console.warn(`⚠️  Could not find Master Sheet row for email: ${parentEmail}`);
            }
        } catch (error) {
            console.warn(`⚠️  Failed to update Master Sheet with CRM link:`, error.message);
            // Non-blocking - Master Sheet update failure doesn't stop sync
        }
    }

    /**
     * Update Master Sheet row with last_synced_at timestamp and row color
     * IMPORTANT: This function is ONLY called for records that passed sync eligibility filter
     * (Status = Warm|Hot|Not Interested). Records with "First Call Pending" never reach this code.
     * @param {Object} leadData - Lead data (must have parent_email or parentEmail)
     */
    async updateMasterSheetSyncTimestamp(leadData) {
        try {
            // Load Master Sheet
            let authClient = null;
            if (this.serviceAccountFile) {
                const serviceAccountInfo = JSON.parse(await fs.readFile(this.serviceAccountFile, 'utf8'));
                authClient = new JWT({
                    email: serviceAccountInfo.client_email,
                    key: serviceAccountInfo.private_key,
                    scopes: ['https://www.googleapis.com/auth/spreadsheets']
                });
            }

            const doc = new GoogleSpreadsheet(this.masterSheetId, authClient);
            await doc.loadInfo();
            const sheet = doc.sheetsByIndex[0];
            const rows = await sheet.getRows();

            // Find row by email
            const parentEmail = leadData.parentEmail || leadData['Parent Email'] || leadData.parent_email;
            const targetRow = rows.find(row => {
                const rowEmail = row.get('parent_email') || row.get('Parent Email');
                return rowEmail && parentEmail && rowEmail.toLowerCase() === parentEmail.toLowerCase();
            });

            if (targetRow) {
                // Convert UTC to IST (UTC+5:30)
                const now = new Date();
                const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
                const istTime = new Date(now.getTime() + istOffset).toISOString().replace('Z', '+05:30');
                targetRow.set('last_synced_at', istTime);

                // Set light red background color for ALL sync-eligible records
                // No defensive check needed - this function only called for Warm|Hot|Not Interested
                console.log(`🎨 Applying background color to synced row`);
                await sheet.loadCells();
                const rowIndex = targetRow.rowNumber - 1; // 0-indexed
                const numCols = sheet.columnCount;

                for (let col = 0; col < numCols; col++) {
                    const cell = sheet.getCell(rowIndex, col);
                    cell.backgroundColor = { red: 244/255, green: 204/255, blue: 204/255 };
                }

                await sheet.saveUpdatedCells();
                await targetRow.save();
                console.log(`✅ Updated Master Sheet last_synced_at timestamp for: ${parentEmail}`);
            } else {
                console.warn(`⚠️  Could not find Master Sheet row for email: ${parentEmail}`);
            }
        } catch (error) {
            console.warn(`⚠️  Failed to update Master Sheet timestamp:`, error.message);
            // Non-blocking - Master Sheet update failure doesn't stop sync
        }
    }

    /**
     * Process individual contact from FreshSales
     * @param {Object} contactData - Contact data from FreshSales
     */
    async processContactFromFreshSales(contactData) {
        try {
            // Map contact data back to master database format
            const leadData = this.mapper.mapContactToLead(contactData);

            // Update master database
            await this.updateLeadInMasterDatabase(leadData);
            this.syncStats.updated++;

        } catch (error) {
            console.error(`Failed to process contact ${contactData.id}:`, error.message);
            throw error;
        }
    }

    /**
     * Find existing contact in FreshSales
     * @param {Object} leadData - Lead data
     * @returns {Promise<Object|null>} Existing contact or null
     */
    async findExistingContact(leadData) {
        try {
            const searchCriteria = this.mapper.createSearchCriteria(leadData);

            // Search by email first (most reliable)
            // Note: searchContacts returns array directly, not {contacts: [...]}
            if (searchCriteria.email) {
                const searchResults = await this.client.searchContacts(searchCriteria.email);
                if (Array.isArray(searchResults) && searchResults.length > 0) {
                    return searchResults[0];
                }
            }

            // Search by mobile number if email search fails
            if (searchCriteria.mobile) {
                const searchResults = await this.client.searchContacts(searchCriteria.mobile);
                if (Array.isArray(searchResults) && searchResults.length > 0) {
                    return searchResults[0];
                }
            }

            return null;

        } catch (error) {
            if (error.message.includes('API_PERMISSION_DENIED')) {
                console.warn('Contact search requires API permissions. Cannot check for duplicates.');
                return null;
            }
            throw error;
        }
    }

    /**
     * Handle existing contact based on duplicate strategy
     * CRITICAL: Always creates child deal for existing parents (sibling support)
     * @param {Object} existingContact - Existing FreshSales contact
     * @param {Object} newContactData - New contact data
     * @param {Object} leadData - Original lead data
     */
    async handleExistingContact(existingContact, newContactData, leadData) {
        this.syncStats.duplicates++;
        const contactId = existingContact.id;

        switch (this.duplicateStrategy) {
            case 'skip':
                console.log(`Parent already exists: ${contactId} - Checking for additive updates`);

                // ADDITIVE UPDATE: Add missing fields without overwriting existing ones
                try {
                    const additiveUpdate = await this.buildAdditiveUpdate(existingContact, newContactData);

                    if (Object.keys(additiveUpdate).length > 0) {
                        const updateChangeId = await this.changeTracker.recordOperation(
                            'update',
                            `/contacts/${contactId}`,
                            { contact: additiveUpdate },
                            existingContact
                        );

                        console.log(`🔄 ADDITIVE UPDATE for ${contactId}:`, JSON.stringify(additiveUpdate, null, 2));
                        const updateResponse = await this.client.updateContact(contactId, additiveUpdate);
                        await this.changeTracker.recordResponse(updateChangeId, updateResponse);

                        console.log(`✅ Added missing fields to contact ${contactId}`);
                        this.syncStats.updated++;
                    } else {
                        console.log(`No new fields to add for contact ${contactId}`);
                        this.syncStats.skipped++;
                    }
                } catch (error) {
                    if (error.message.includes('API_PERMISSION_DENIED')) {
                        console.warn(`Cannot update contact ${contactId}: API permissions insufficient`);
                        this.syncStats.skipped++;
                    } else {
                        throw error;
                    }
                }
                break;

            case 'update':
                try {
                    await this.client.updateContact(contactId, newContactData);
                    console.log(`Updated existing contact: ${contactId}`);
                    this.syncStats.updated++;

                    // Add note about the update
                    await this.addContactNote(contactId, {
                        title: 'Contact Updated from Pre-sales System',
                        content: `Contact updated with new information from pre-sales lead: ${leadData.childName || 'Unknown'}`
                    });

                } catch (error) {
                    if (error.message.includes('API_PERMISSION_DENIED')) {
                        console.warn(`Cannot update contact ${contactId}: API permissions insufficient`);
                        this.syncStats.skipped++;
                    } else {
                        throw error;
                    }
                }
                break;

            case 'create_new':
                await this.createNewContact(newContactData, leadData);
                return; // createNewContact handles deal creation
                break;

            default:
                this.syncStats.skipped++;
        }

        // CRITICAL: Create child deal even when parent exists (sibling support)
        if (contactId) {
            const dealData = this.mapper.mapLeadToDeal(leadData, contactId);
            const dealChangeId = await this.changeTracker.recordOperation(
                'create',
                '/deals',
                { deal: dealData },
                null
            );

            console.log(`🚨 CREATING DEAL (Sibling/Additional Child) with tracking: ${dealChangeId}`);
            const dealResponse = await this.client.createDeal(dealData);
            await this.changeTracker.recordResponse(dealChangeId, dealResponse);

            const dealId = dealResponse.deal?.id;
            console.log(`✅ Created Child Deal: ${dealId} (${dealData.name}) for existing parent ${contactId}`);
            console.log(`🛡️ Deal change tracked as: ${dealChangeId}`);
        }
    }

    /**
     * Handle existing parent (crm_contact_link already populated)
     * - Check if child Deal exists
     * - If not, create Deal (sibling)
     * - Always do additive contact updates (secondary email/mobile)
     * @param {string} contactId - FreshSales contact ID
     * @param {Object} leadData - Lead data from master sheet
     */
    async handleExistingParent(contactId, leadData) {
        try {
            const childName = leadData.childName || leadData.child_name || leadData['Child Name'];

            // STEP 1: Check if Deal for this child already exists
            const existingDeals = await this.client.getContactDeals(contactId);
            const childDealExists = existingDeals.some(deal =>
                deal.name === childName || deal.name?.toLowerCase() === childName?.toLowerCase()
            );

            if (childDealExists) {
                console.log(`Child Deal "${childName}" already exists for contact ${contactId} - skipping Deal creation`);
                this.syncStats.skipped++;
            } else {
                // STEP 2: Create new Deal (sibling)
                const dealData = this.mapper.mapLeadToDeal(leadData, contactId);
                const dealChangeId = await this.changeTracker.recordOperation(
                    'create',
                    '/deals',
                    { deal: dealData },
                    null
                );

                console.log(`🚨 CREATING SIBLING DEAL with tracking: ${dealChangeId}`);
                const dealResponse = await this.client.createDeal(dealData);
                await this.changeTracker.recordResponse(dealChangeId, dealResponse);

                const dealId = dealResponse.deal?.id;
                console.log(`✅ Created Sibling Deal: ${dealId} (${childName}) for existing parent ${contactId}`);
                this.syncStats.created++;
            }

            // STEP 3: Always do additive contact updates (secondary email/mobile)
            const contactData = this.mapper.mapLeadToContact(leadData);
            const additiveUpdate = await this.buildAdditiveUpdate({ id: contactId }, contactData);

            if (Object.keys(additiveUpdate).length > 0) {
                const updateChangeId = await this.changeTracker.recordOperation(
                    'update',
                    `/contacts/${contactId}`,
                    { contact: additiveUpdate },
                    { id: contactId }
                );

                console.log(`🔄 ADDITIVE UPDATE for ${contactId}:`, JSON.stringify(additiveUpdate, null, 2));
                const updateResponse = await this.client.updateContact(contactId, additiveUpdate);
                await this.changeTracker.recordResponse(updateChangeId, updateResponse);

                console.log(`✅ Added missing fields to contact ${contactId}`);
                this.syncStats.updated++;
            } else {
                console.log(`No new contact fields to add for ${contactId}`);
            }

            // STEP 4: Update contact status (forward sync from Master Sheet)
            const status = leadData.status || leadData.Status;
            const statusId = this.mapper.mapStatusToContactStatus(status);

            if (statusId) {
                try {
                    // DEBUG: Read current status BEFORE update to detect FreshSales automation changes
                    const preUpdateContact = await this.client.getContact(contactId);
                    const currentStatusId = preUpdateContact.contact?.contact_status_id;
                    console.log(`📊 [DEBUG] Contact ${contactId} status BEFORE update: ${currentStatusId}`);
                    console.log(`📊 Updating contact status to: ${status} (${statusId})`);

                    await this.client.updateContact(contactId, {
                        contact_status_id: statusId
                    }, true); // true = include contact_status param

                    // DEBUG: Verify status immediately after update
                    const postUpdateContact = await this.client.getContact(contactId);
                    const newStatusId = postUpdateContact.contact?.contact_status_id;
                    console.log(`📊 [DEBUG] Contact ${contactId} status AFTER update: ${newStatusId}`);

                    if (newStatusId === statusId) {
                        console.log(`✅ Contact status updated and verified: ${status} (${statusId})`);
                    } else {
                        console.warn(`⚠️  [AUTOMATION DETECTED] Status changed from ${statusId} to ${newStatusId} immediately after update!`);
                    }
                } catch (error) {
                    console.warn(`⚠️  Failed to update contact status: ${error.message}`);
                }
            }

            // STEP 5: Update parent owner (forward sync from Master Sheet)
            const parentOwner = leadData.assigned_owner || leadData['assigned_owner'] || leadData.assignedOwner;
            if (parentOwner && parentOwner !== 'Unassigned') {
                try {
                    console.log(`👤 Updating parent owner to: ${parentOwner}`);
                    await this.client.updateContact(contactId, {
                        custom_field: { cf_parent_owner: parentOwner }
                    }, true);
                    console.log(`✅ Parent owner updated successfully`);
                } catch (error) {
                    console.warn(`⚠️  Failed to update parent owner: ${error.message}`);
                }
            }

            // STEP 6: Add source tag (append, don't replace)
            const sourceTag = leadData.source_tag || leadData['source_tag'] || leadData.sourceTag;
            if (sourceTag) {
                try {
                    const fullContact = await this.client.getContact(contactId);
                    const existingTags = fullContact.contact?.tags || [];
                    const newTag = `gsp2026_${sourceTag}_form`;

                    if (!existingTags.includes(newTag)) {
                        console.log(`🏷️  Adding source tag: ${newTag}`);
                        await this.client.updateContact(contactId, {
                            tags: [...existingTags, newTag]
                        });
                        console.log(`✅ Source tag added successfully`);
                    } else {
                        console.log(`Tag "${newTag}" already exists - skipping`);
                    }
                } catch (error) {
                    console.warn(`⚠️  Failed to add source tag: ${error.message}`);
                }
            }

            // STEP 7: Set last_synced_at in Master Sheet (prevents re-processing)
            try {
                await this.updateMasterSheetSyncTimestamp(leadData);
                console.log(`✅ Master Sheet last_synced_at timestamp updated`);
            } catch (error) {
                console.warn(`⚠️  Failed to update Master Sheet timestamp: ${error.message}`);
            }

        } catch (error) {
            console.error(`Failed to handle existing parent ${contactId}:`, error.message);
            throw error;
        }
    }

    /**
     * Build additive update - only add missing fields, never overwrite existing
     * Handles both scenarios:
     * 1. Duplicate found by mobile → add email as secondary
     * 2. Duplicate found by email → add mobile as secondary (work_number)
     * @param {Object} existingContact - Existing contact from search (may be partial)
     * @param {Object} newContactData - New contact data to merge
     * @returns {Promise<Object>} Update object with only new fields
     */
    async buildAdditiveUpdate(existingContact, newContactData) {
        const update = {};

        try {
            // Fetch FULL contact details including emails array
            const fullContact = await this.client.getContact(existingContact.id);

            // SCENARIO 1: Check if new email should be added (duplicate found by mobile)
            const newEmail = newContactData.emails?.[0]?.value;
            if (newEmail) {
                const existingEmails = fullContact.contact?.emails || [];
                const emailExists = existingEmails.some(e => e.value?.toLowerCase() === newEmail.toLowerCase());

                if (!emailExists) {
                    // Add new email as secondary (non-primary)
                    const updatedEmails = [
                        ...existingEmails,
                        {
                            value: newEmail,
                            is_primary: false,
                            label: 'work'
                        }
                    ];
                    update.emails = updatedEmails;
                    console.log(`  📧 Adding secondary email: ${newEmail}`);
                }
            }

            // SCENARIO 2: Check if new mobile should be added (duplicate found by email)
            const newMobile = newContactData.mobile_number;
            if (newMobile) {
                const existingMobile = fullContact.contact?.mobile_number;
                const existingWork = fullContact.contact?.work_number;

                if (!existingMobile && !existingWork) {
                    // No phone numbers at all - add as mobile
                    update.mobile_number = newMobile;
                    console.log(`  📱 Adding mobile: ${newMobile}`);
                } else if (existingMobile !== newMobile && existingWork !== newMobile) {
                    // Different number exists - add as work_number if work is empty
                    if (!existingWork) {
                        update.work_number = newMobile;
                        console.log(`  📞 Adding work number: ${newMobile}`);
                    }
                }
            }

        } catch (error) {
            console.warn(`Could not fetch full contact details for additive update: ${error.message}`);
            // Return empty update if we can't fetch details
        }

        return update;
    }

    /**
     * Create new contact in FreshSales (PARENT) and associated deal (CHILD)
     * @param {Object} contactData - Contact data
     * @param {Object} leadData - Original lead data
     * @returns {Promise<string|null>} Contact ID if created successfully
     */
    async createNewContact(contactData, leadData) {
        try {
            // STEP 1: Create Contact (Parent)
            const safeContactData = this.changeTracker.addTestTags({...contactData});
            const contactChangeId = await this.changeTracker.recordOperation(
                'create',
                '/contacts',
                { contact: safeContactData },
                null
            );

            console.log(`🚨 CREATING CONTACT (Parent) with tracking: ${contactChangeId}`);
            const contactResponse = await this.client.createContact(safeContactData);
            await this.changeTracker.recordResponse(contactChangeId, contactResponse);

            const contactId = contactResponse.contact?.id;
            console.log(`✅ Created Parent Contact: ${contactId}`);
            console.log(`🛡️ Contact change tracked as: ${contactChangeId}`);
            this.syncStats.created++;

            // STEP 1.5: Update contact with status and owner (FreshSales API ignores these during POST)
            if (contactId && (safeContactData.contact_status_id || safeContactData.cf_parent_owner)) {
                const updateData = {};
                if (safeContactData.contact_status_id) {
                    updateData.contact_status_id = safeContactData.contact_status_id;
                }
                if (safeContactData.cf_parent_owner) {
                    // Custom fields must be wrapped in custom_field object
                    updateData.custom_field = { cf_parent_owner: safeContactData.cf_parent_owner };
                }

                console.log(`🔄 UPDATING CONTACT with status/owner (FreshSales API quirk workaround)`);
                console.log(`🔍 DEBUG: Update request payload:`, JSON.stringify(updateData, null, 2));

                const updateChangeId = await this.changeTracker.recordOperation(
                    'update',
                    `/contacts/${contactId}`,
                    { contact: updateData },
                    contactResponse.contact
                );

                const updateResponse = await this.client.updateContact(contactId, updateData);
                await this.changeTracker.recordResponse(updateChangeId, updateResponse);

                console.log(`📥 DEBUG: Update response:`, JSON.stringify({
                    contact_status_id: updateResponse.contact?.contact_status_id || 'NOT IN RESPONSE',
                    cf_parent_owner: updateResponse.contact?.custom_field?.cf_parent_owner || updateResponse.contact?.cf_parent_owner || 'NOT IN RESPONSE'
                }, null, 2));
                console.log(`✅ Updated contact ${contactId} with status/owner`);

                // Track created contact details for reporting
                this.createdContacts.push({
                    childName: leadData.child_name || leadData.childName || leadData['Child Name'] || 'Unknown',
                    contactId: contactId,
                    contactUrl: `https://genwisecrm.myfreshworks.com/crm/sales/contacts/${contactId}`,
                    status: this.getStatusName(safeContactData.contact_status_id),
                    owner: safeContactData.cf_parent_owner || 'Unassigned'
                });
            }

            // STEP 2: Create Deal (Child) under this Contact
            if (contactId) {
                const dealData = this.mapper.mapLeadToDeal(leadData, contactId);
                // Note: Do NOT call addTestTags on deals - it's for contacts only
                const dealChangeId = await this.changeTracker.recordOperation(
                    'create',
                    '/deals',
                    { deal: dealData },
                    null
                );

                console.log(`🚨 CREATING DEAL (Child) with tracking: ${dealChangeId}`);
                const dealResponse = await this.client.createDeal(dealData);
                await this.changeTracker.recordResponse(dealChangeId, dealResponse);

                const dealId = dealResponse.deal?.id;
                console.log(`✅ Created Child Deal: ${dealId} (${dealData.name})`);
                console.log(`🛡️ Deal change tracked as: ${dealChangeId}`);

                // STEP 3: Add Note to Contact
                const notes = leadData.notes || leadData.Notes || '';
                const noteContent = `New lead from pre-sales system
Child Name: ${leadData.child_name || leadData.childName || leadData['Child Name'] || 'Unknown'}
Source: ${leadData.source_tag || leadData.sourceTag || leadData['Source Tag'] || 'Unknown'}
Timestamp: ${leadData.timestamp || leadData.Timestamp || new Date().toISOString()}
${notes ? `\nNotes: ${notes}` : ''}

TRACKING: Contact ${contactChangeId} | Deal ${dealChangeId}`;

                await this.addContactNote(contactId, noteContent);
            }

            return contactId;

        } catch (error) {
            // 🛡️ SAFETY: Record failed operation
            if (typeof changeId !== 'undefined') {
                await this.changeTracker.recordError(changeId, error);
            }

            if (error.message.includes('API_PERMISSION_DENIED')) {
                console.warn(`Cannot create contact: API permissions insufficient`);
                this.syncStats.skipped++;
                return null;
            } else {
                console.error(`Failed to create contact:`, error.message);
                this.syncStats.errors++;
                throw error;
            }
        }
    }

    /**
     * Add note to contact using Notes API
     * @param {string} contactId - FreshSales contact ID
     * @param {string|Object} noteData - Note content or data object
     */
    async addContactNote(contactId, noteData) {
        try {
            const noteContent = typeof noteData === 'string' ? noteData : noteData.content || noteData.description || '';

            if (!noteContent) {
                console.warn('No note content provided, skipping');
                return;
            }

            await this.client.createNote(contactId, noteContent);
            console.log(`✅ Added note to contact ${contactId}`);
        } catch (error) {
            console.warn(`⚠️  Failed to add note to contact ${contactId}:`, error.message);
            // Non-blocking - note failure doesn't stop sync
        }
    }

    /**
     * Load leads from master database (Google Sheets)
     * @param {Object} options - Load options
     * @returns {Promise<Array>} Array of lead data
     */
    async loadLeadsFromMasterDatabase(options = {}) {
        try {
            if (!this.masterSheetId) {
                throw new Error('Master sheet ID not configured');
            }

            // Load service account credentials with v5 authentication pattern
            let authClient = null;
            if (this.serviceAccountFile) {
                const serviceAccountInfo = JSON.parse(await fs.readFile(this.serviceAccountFile, 'utf8'));
                authClient = new JWT({
                    email: serviceAccountInfo.client_email,
                    key: serviceAccountInfo.private_key,
                    scopes: ['https://www.googleapis.com/auth/spreadsheets']
                });
            }

            const doc = new GoogleSpreadsheet(this.masterSheetId, authClient);

            await doc.loadInfo();
            const sheet = doc.sheetsByIndex[0]; // Assume first sheet
            const rows = await sheet.getRows();

            // Convert rows to lead data
            const leads = rows.map(row => {
                const leadData = {};
                // Use _rawData array with header mapping since row[headerName] is not working
                sheet.headerValues.forEach((headerValue, index) => {
                    if (headerValue && row._rawData && row._rawData[index] !== undefined) {
                        leadData[headerValue] = row._rawData[index];
                    }
                });
                return leadData;
            });

            // Apply filters if specified
            let filteredLeads = leads;

            if (options.since) {
                const sinceDate = new Date(options.since);
                filteredLeads = filteredLeads.filter(lead => {
                    const timestamp = new Date(lead.Timestamp || lead.timestamp);
                    return timestamp >= sinceDate;
                });
            }

            if (options.status) {
                filteredLeads = filteredLeads.filter(lead => {
                    const status = lead['Interest Level'] || lead.interestLevel;
                    return status?.toLowerCase().includes(options.status.toLowerCase());
                });
            }

            // TIP Requirement: Only sync records with status "Warm|Hot|Not Interested"
            if (options.syncEligibleOnly) {
                const syncEligibleStatuses = ['warm', 'hot', 'not interested'];
                filteredLeads = filteredLeads.filter(lead => {
                    const status = (lead.Status || lead.status || lead['Interest Level'] || '').toLowerCase();
                    return syncEligibleStatuses.includes(status);
                });

                // Filter out already-synced records (per SYNC_LOGIC.md spec)
                // Records with last_synced_at timestamp are excluded to prevent re-processing
                filteredLeads = filteredLeads.filter(lead => {
                    const lastSynced = lead.last_synced_at || lead['last_synced_at'] || lead.lastSyncedAt;
                    return !lastSynced || lastSynced === '';
                });
            }

            if (options.limit) {
                filteredLeads = filteredLeads.slice(0, options.limit);
            }

            return filteredLeads;

        } catch (error) {
            console.error('Failed to load leads from master database:', error.message);
            if (this.mockMode) {
                return this.generateMockLeads(options.limit || 5);
            }
            throw error;
        }
    }

    /**
     * Load contacts from FreshSales using verified working endpoint
     * @param {Object} options - Load options
     * @returns {Promise<Array>} Array of contact data
     */
    async loadContactsFromFreshSales(options = {}) {
        try {
            // Use verified working endpoint: /contacts/view/{viewId}
            const viewId = options.viewId || '402002860065'; // All Contacts view
            const response = await this.client.getContactsFromView(viewId);
            return response.contacts || [];

        } catch (error) {
            if (error.statusCode === 403) {
                throw new Error('API_PERMISSION_DENIED: Contact read permissions required');
            }
            throw error;
        }
    }

    /**
     * Update master database with contact information
     * @param {Array} contacts - Array of contact data
     */
    async updateMasterDatabase(contacts) {
        try {
            if (!this.masterSheetId) {
                throw new Error('Master sheet ID not configured');
            }

            // Load service account credentials with v5 authentication pattern
            let authClient = null;
            if (this.serviceAccountFile) {
                const serviceAccountInfo = JSON.parse(await fs.readFile(this.serviceAccountFile, 'utf8'));
                authClient = new JWT({
                    email: serviceAccountInfo.client_email,
                    key: serviceAccountInfo.private_key,
                    scopes: ['https://www.googleapis.com/auth/spreadsheets']
                });
            }

            const doc = new GoogleSpreadsheet(this.masterSheetId, authClient);

            await doc.loadInfo();
            const sheet = doc.sheetsByIndex[0]; // Assume first sheet
            const rows = await sheet.getRows();

            console.log(`Updating master database with ${contacts.length} contacts`);

            // Update existing rows based on email/FreshSales ID matching
            let updatedCount = 0;
            for (const contact of contacts) {
                const leadData = this.mapper.mapContactToLead(contact);
                const updated = await this.updateLeadInMasterDatabase(leadData, sheet, rows);
                if (updated) updatedCount++;
            }

            console.log(`Successfully updated ${updatedCount} rows in master database`);
            return updatedCount;

        } catch (error) {
            console.error('Failed to update master database:', error.message);
            throw error;
        }
    }

    /**
     * Update individual lead in master database
     * @param {Object} leadData - Lead data
     * @param {Object} sheet - Google Sheets sheet object
     * @param {Array} rows - Existing rows
     * @returns {Promise<boolean>} True if updated, false if not found
     */
    async updateLeadInMasterDatabase(leadData, sheet = null, rows = null) {
        try {
            // Load sheet if not provided
            if (!sheet || !rows) {
                let authClient = null;
                if (this.serviceAccountFile) {
                    const serviceAccountInfo = JSON.parse(await fs.readFile(this.serviceAccountFile, 'utf8'));
                    authClient = new JWT({
                        email: serviceAccountInfo.client_email,
                        key: serviceAccountInfo.private_key,
                        scopes: ['https://www.googleapis.com/auth/spreadsheets']
                    });
                }
                const doc = new GoogleSpreadsheet(this.masterSheetId, authClient);
                await doc.loadInfo();
                sheet = doc.sheetsByIndex[0];
                rows = await sheet.getRows();
            }

            // Find matching row by email or FreshSales ID
            const targetRow = rows.find(row => {
                const rowEmail = row['Parent Email'] || row.parentEmail;
                const rowFreshSalesId = row['FreshSales ID'] || row.freshsalesId;

                return (
                    (leadData.parentEmail && rowEmail && rowEmail.toLowerCase() === leadData.parentEmail.toLowerCase()) ||
                    (leadData.freshsalesId && rowFreshSalesId && rowFreshSalesId === leadData.freshsalesId.toString())
                );
            });

            if (!targetRow) {
                console.log(`No matching row found for contact: ${leadData.parentEmail || leadData.freshsalesId}`);
                return false;
            }

            // Update fields that have changed
            let hasChanges = false;

            // Map status from FreshSales back to master sheet format
            if (leadData.interestLevel && targetRow['Interest Level'] !== leadData.interestLevel) {
                targetRow['Interest Level'] = leadData.interestLevel;
                hasChanges = true;
            }

            // Update FreshSales ID if not present
            if (leadData.freshsalesId && !targetRow['FreshSales ID']) {
                targetRow['FreshSales ID'] = leadData.freshsalesId;
                hasChanges = true;
            }

            // Update last sync timestamp
            if (leadData.lastUpdated) {
                targetRow['Last FreshSales Update'] = leadData.lastUpdated;
                hasChanges = true;
            }

            // Update other fields if they exist and have changed
            const fieldsToUpdate = [
                { source: 'childName', target: 'Child Name' },
                { source: 'parentName', target: 'Parent Name' },
                { source: 'parentMobile', target: 'Parent Mobile' },
                { source: 'childGrade', target: 'Child Grade' },
                { source: 'program', target: 'Program' },
                { source: 'geography', target: 'Geography' }
            ];

            for (const field of fieldsToUpdate) {
                if (leadData[field.source] && targetRow[field.target] !== leadData[field.source]) {
                    // Only update if the new value is more complete or recent
                    if (!targetRow[field.target] || leadData.lastUpdated) {
                        targetRow[field.target] = leadData[field.source];
                        hasChanges = true;
                    }
                }
            }

            if (hasChanges) {
                await targetRow.save();
                console.log(`Updated row for contact: ${leadData.parentEmail || leadData.freshsalesId}`);
                return true;
            } else {
                console.log(`No changes needed for contact: ${leadData.parentEmail || leadData.freshsalesId}`);
                return false;
            }

        } catch (error) {
            console.error(`Failed to update lead in master database: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create batches from array
     * @param {Array} items - Items to batch
     * @param {number} batchSize - Size of each batch
     * @returns {Array} Array of batches
     */
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Generate mock lead data for testing
     * @param {number} count - Number of mock leads
     * @returns {Array} Array of mock lead data
     */
    generateMockLeads(count = 5) {
        const mockLeads = [];
        const programs = ['GSP', 'Coding Bootcamp', 'Math Olympiad', 'Science Fair'];
        const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
        const interests = ['Hot', 'Warm', 'Interested', 'New'];

        for (let i = 1; i <= count; i++) {
            mockLeads.push({
                'Timestamp': new Date().toISOString(),
                'Child Name': `Mock Child ${i}`,
                'Parent Name': `Mock Parent ${i}`,
                'Parent Email': `parent${i}@mockmail.com`,
                'Parent Mobile': `+91${Math.random().toString().slice(2, 12)}`,
                'Child Grade': grades[Math.floor(Math.random() * grades.length)],
                'Program': programs[Math.floor(Math.random() * programs.length)],
                'Interest Level': interests[Math.floor(Math.random() * interests.length)],
                'Geography': 'Mock City'
            });
        }

        console.log(`Generated ${count} mock leads for testing`);
        return mockLeads;
    }

    /**
     * Reset sync statistics
     */
    resetSyncStats() {
        this.syncStats = {
            processed: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: 0,
            duplicates: 0
        };
        this.createdContacts = [];
        this.duplicateContacts = [];
    }

    /**
     * Get status name from status ID
     */
    getStatusName(statusId) {
        const statusMap = {
            '402000446647': 'Hot',
            '402000446648': 'Warm',
            '402000446646': 'Not Interested',
            '402000769051': 'Tepid'
        };
        return statusMap[String(statusId)] || 'Unknown';
    }

    /**
     * Generate sync report
     * @param {string} message - Summary message
     * @param {boolean} success - Success status
     * @returns {Object} Sync report
     */
    generateSyncReport(message, success = true) {
        const report = {
            success,
            message,
            timestamp: new Date().toISOString(),
            stats: { ...this.syncStats },
            createdContacts: [...this.createdContacts],
            duplicateContacts: [...this.duplicateContacts],
            rateLimits: this.client.getRateLimitStatus(),
            mockMode: this.mockMode
        };

        console.log('\n=== SYNC REPORT ===');
        console.log(`Status: ${success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`Message: ${message}`);
        console.log(`Processed: ${this.syncStats.processed}`);
        console.log(`Created: ${this.syncStats.created}`);
        console.log(`Updated: ${this.syncStats.updated}`);
        console.log(`Skipped: ${this.syncStats.skipped}`);
        console.log(`Duplicates: ${this.syncStats.duplicates}`);
        console.log(`Errors: ${this.syncStats.errors}`);
        console.log('==================\n');

        return report;
    }

    /**
     * Test sync functionality
     * @returns {Promise<Object>} Test results
     */
    async testSync() {
        console.log('Testing FreshSales sync functionality...');

        const results = {
            timestamp: new Date().toISOString(),
            tests: {}
        };

        // Test 1: API connectivity
        try {
            const connectionTest = await this.client.testConnection();
            results.tests.connectivity = {
                status: 'success',
                data: connectionTest
            };
        } catch (error) {
            results.tests.connectivity = {
                status: 'error',
                message: error.message
            };
        }

        // Test 2: Field mapping
        try {
            const mockLead = this.generateMockLeads(1)[0];
            const mappedContact = this.mapper.mapLeadToContact(mockLead);
            const reverseMapped = this.mapper.mapContactToLead({
                id: 'mock_123',
                first_name: mappedContact.first_name,
                last_name: mappedContact.last_name,
                emails: mappedContact.emails,
                mobile_number: mappedContact.mobile_number,
                contact_status_id: mappedContact.contact_status_id
            });

            results.tests.fieldMapping = {
                status: 'success',
                originalLead: mockLead,
                mappedContact: mappedContact,
                reverseMapped: reverseMapped
            };
        } catch (error) {
            results.tests.fieldMapping = {
                status: 'error',
                message: error.message
            };
        }

        // Test 3: Mock sync operation
        try {
            const originalMockMode = this.mockMode;
            this.mockMode = true;

            const syncResult = await this.syncLeadsToFreshSales({ limit: 2 });
            results.tests.mockSync = {
                status: 'success',
                data: syncResult
            };

            this.mockMode = originalMockMode;
        } catch (error) {
            results.tests.mockSync = {
                status: 'error',
                message: error.message
            };
        }

        return results;
    }

    /**
     * Utility method to sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = FreshSalesSync;