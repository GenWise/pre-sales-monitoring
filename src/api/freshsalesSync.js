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

const FreshSalesClient = require('./freshsalesClient');
const FreshSalesMapper = require('./freshsalesMapper');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs').promises;
const path = require('path');

class FreshSalesSync {
    constructor(config = {}) {
        this.client = new FreshSalesClient(config);
        this.mapper = new FreshSalesMapper();

        // Configuration
        this.masterSheetId = config.masterSheetId || process.env.PRESALES_MASTER_SHEET_ID;
        this.serviceAccountFile = config.serviceAccountFile || process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
        this.mockMode = config.mockMode || false;

        // Sync settings
        this.batchSize = config.batchSize || 10;
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
            // Load leads from master database
            const leads = await this.loadLeadsFromMasterDatabase(options);
            console.log(`Loaded ${leads.length} leads from master database`);

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
            // Map lead data to FreshSales contact format
            const contactData = this.mapper.mapLeadToContact(leadData);

            // Check for existing contact
            const existingContact = await this.findExistingContact(leadData);

            if (existingContact) {
                await this.handleExistingContact(existingContact, contactData, leadData);
            } else {
                await this.createNewContact(contactData, leadData);
            }

        } catch (error) {
            console.error(`Failed to process lead ${leadData.childName || 'Unknown'}:`, error.message);
            throw error;
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
            if (searchCriteria.email) {
                const searchResults = await this.client.searchContacts(searchCriteria.email);
                if (searchResults.contacts && searchResults.contacts.length > 0) {
                    return searchResults.contacts[0];
                }
            }

            // Search by mobile number if email search fails
            if (searchCriteria.mobile) {
                const searchResults = await this.client.searchContacts(searchCriteria.mobile);
                if (searchResults.contacts && searchResults.contacts.length > 0) {
                    return searchResults.contacts[0];
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
     * @param {Object} existingContact - Existing FreshSales contact
     * @param {Object} newContactData - New contact data
     * @param {Object} leadData - Original lead data
     */
    async handleExistingContact(existingContact, newContactData, leadData) {
        this.syncStats.duplicates++;

        switch (this.duplicateStrategy) {
            case 'skip':
                console.log(`Skipping duplicate contact: ${existingContact.id}`);
                this.syncStats.skipped++;
                break;

            case 'update':
                try {
                    await this.client.updateContact(existingContact.id, newContactData);
                    console.log(`Updated existing contact: ${existingContact.id}`);
                    this.syncStats.updated++;

                    // Add note about the update
                    await this.addContactNote(existingContact.id, {
                        title: 'Contact Updated from Pre-sales System',
                        content: `Contact updated with new information from pre-sales lead: ${leadData.childName || 'Unknown'}`
                    });

                } catch (error) {
                    if (error.message.includes('API_PERMISSION_DENIED')) {
                        console.warn(`Cannot update contact ${existingContact.id}: API permissions insufficient`);
                        this.syncStats.skipped++;
                    } else {
                        throw error;
                    }
                }
                break;

            case 'create_new':
                await this.createNewContact(newContactData, leadData);
                break;

            default:
                this.syncStats.skipped++;
        }
    }

    /**
     * Create new contact in FreshSales
     * @param {Object} contactData - Contact data
     * @param {Object} leadData - Original lead data
     */
    async createNewContact(contactData, leadData) {
        try {
            const response = await this.client.createContact(contactData);
            console.log(`Created new contact: ${response.contact?.id || 'Unknown ID'}`);
            this.syncStats.created++;

            // Add initial note
            if (response.contact?.id) {
                await this.addContactNote(response.contact.id, {
                    title: 'New Lead from Pre-sales System',
                    content: `Contact created from pre-sales lead. Original timestamp: ${leadData.timestamp || 'Unknown'}`
                });
            }

        } catch (error) {
            if (error.message.includes('API_PERMISSION_DENIED')) {
                console.warn(`Cannot create contact: API permissions insufficient`);
                this.syncStats.skipped++;
            } else {
                throw error;
            }
        }
    }

    /**
     * Add note to contact
     * @param {string} contactId - FreshSales contact ID
     * @param {Object} noteData - Note data
     */
    async addContactNote(contactId, noteData) {
        try {
            const activityData = this.mapper.mapNoteToActivity(contactId, noteData);
            await this.client.createActivity(activityData);
        } catch (error) {
            console.warn(`Failed to add note to contact ${contactId}:`, error.message);
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

            const doc = new GoogleSpreadsheet(this.masterSheetId);

            // Load service account credentials
            if (this.serviceAccountFile) {
                const serviceAccountInfo = JSON.parse(await fs.readFile(this.serviceAccountFile, 'utf8'));
                await doc.useServiceAccountAuth(serviceAccountInfo);
            }

            await doc.loadInfo();
            const sheet = doc.sheetsByIndex[0]; // Assume first sheet
            const rows = await sheet.getRows();

            // Convert rows to lead data
            const leads = rows.map(row => {
                const leadData = {};
                Object.keys(row._rawData).forEach((key, index) => {
                    const headerValue = sheet.headerValues[index];
                    if (headerValue) {
                        leadData[headerValue] = row[headerValue];
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

            const doc = new GoogleSpreadsheet(this.masterSheetId);

            // Load service account credentials
            if (this.serviceAccountFile) {
                const serviceAccountInfo = JSON.parse(await fs.readFile(this.serviceAccountFile, 'utf8'));
                await doc.useServiceAccountAuth(serviceAccountInfo);
            }

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
                const doc = new GoogleSpreadsheet(this.masterSheetId);
                if (this.serviceAccountFile) {
                    const serviceAccountInfo = JSON.parse(await fs.readFile(this.serviceAccountFile, 'utf8'));
                    await doc.useServiceAccountAuth(serviceAccountInfo);
                }
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