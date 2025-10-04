const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();
const fs = require('fs');

/**
 * Master Database Google Sheets Integration
 * Handles all operations with the Pre-sales Monitoring Master Database
 */
class MasterDatabase {
    constructor() {
        this.sheetId = process.env.PRESALES_MASTER_SHEET_ID;
        this.credentialsFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
        this.doc = null;
        this.sheet = null;

        if (!this.sheetId || this.sheetId === 'REPLACE_WITH_ACTUAL_SHEET_ID') {
            throw new Error('Please set PRESALES_MASTER_SHEET_ID in your .env file. See manual_sheet_setup.md for instructions.');
        }

        if (!this.credentialsFile || !fs.existsSync(this.credentialsFile)) {
            throw new Error(`Google Service Account credentials file not found: ${this.credentialsFile}`);
        }
    }

    /**
     * Initialize connection to Google Sheets
     */
    async connect() {
        try {
            // Set up authentication
            const serviceAccountAuth = new JWT({
                keyFile: this.credentialsFile,
                scopes: [
                    'https://www.googleapis.com/auth/spreadsheets',
                    'https://www.googleapis.com/auth/drive',
                ],
            });

            // Connect to the document
            this.doc = new GoogleSpreadsheet(this.sheetId, serviceAccountAuth);
            await this.doc.loadInfo();

            // Get the first sheet (master database)
            this.sheet = this.doc.sheetsByIndex[0];
            await this.sheet.loadHeaderRow();

            console.log(`Connected to: ${this.doc.title}`);
            return true;
        } catch (error) {
            console.error('Failed to connect to Google Sheets:', error.message);
            throw error;
        }
    }

    /**
     * Add a new lead to the master database
     * @param {Object} lead - Lead data object
     */
    async addLead(lead) {
        if (!this.sheet) {
            await this.connect();
        }

        try {
            // Validate required fields
            const requiredFields = ['child_name', 'parent_name', 'parent_email', 'source_tag'];
            for (const field of requiredFields) {
                if (!lead[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            // Check for duplicates before adding
            const isDuplicate = await this.checkForDuplicate(lead.parent_email, lead.parent_mobile);

            // Prepare row data matching the exact column headers
            const rowData = {
                'Child Name': lead.child_name || '',
                'Parent Name': lead.parent_name || '',
                'Parent Email': lead.parent_email || '',
                'Parent Mobile': lead.parent_mobile || '',
                'Interest Level': lead.interest_level || 'Medium',
                'Source Tag': lead.source_tag || '',
                'Timestamp': lead.timestamp || new Date().toISOString(),
                'Duplicate Flag': isDuplicate ? 'Yes' : 'No',
                'Status': lead.status || 'First Call Pending',
                'Assigned Owner': lead.assigned_owner || '',
                'Notes': lead.notes || ''
            };

            // Add the row
            const addedRow = await this.sheet.addRow(rowData);

            console.log(`Added new lead: ${lead.parent_name} (${lead.parent_email})`);
            return {
                success: true,
                rowNumber: addedRow.rowNumber,
                isDuplicate: isDuplicate,
                data: rowData
            };

        } catch (error) {
            console.error('Error adding lead:', error.message);
            throw error;
        }
    }

    /**
     * Check for duplicate leads by email or phone
     * @param {string} email - Parent email
     * @param {string} mobile - Parent mobile (optional)
     */
    async checkForDuplicate(email, mobile = null) {
        if (!this.sheet) {
            await this.connect();
        }

        try {
            // Get all rows to check for duplicates
            const rows = await this.sheet.getRows();

            for (const row of rows) {
                // Check for email match
                if (row.get('Parent Email') && row.get('Parent Email').toLowerCase() === email.toLowerCase()) {
                    return true;
                }

                // Check for mobile match if provided
                if (mobile && row.get('Parent Mobile') && row.get('Parent Mobile') === mobile) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('Error checking for duplicates:', error.message);
            throw error;
        }
    }

    /**
     * Update an existing lead record
     * @param {string} email - Parent email to identify the record
     * @param {Object} updates - Fields to update
     */
    async updateLead(email, updates) {
        if (!this.sheet) {
            await this.connect();
        }

        try {
            const rows = await this.sheet.getRows();

            for (const row of rows) {
                if (row.get('Parent Email') && row.get('Parent Email').toLowerCase() === email.toLowerCase()) {
                    // Update the row with new data
                    Object.keys(updates).forEach(key => {
                        // Map field names to column headers
                        const columnMapping = {
                            childName: 'Child Name',
                            parentName: 'Parent Name',
                            parentEmail: 'Parent Email',
                            parentMobile: 'Parent Mobile',
                            interestLevel: 'Interest Level',
                            sourceTag: 'Source Tag',
                            timestamp: 'Timestamp',
                            duplicateFlag: 'Duplicate Flag',
                            status: 'Status',
                            assignedOwner: 'Assigned Owner',
                            notes: 'Notes'
                        };

                        const columnName = columnMapping[key] || key;
                        if (updates[key] !== undefined) {
                            row.set(columnName, updates[key]);
                        }
                    });

                    await row.save();
                    console.log(`Updated lead: ${email}`);
                    return { success: true, rowNumber: row.rowNumber };
                }
            }

            throw new Error(`Lead with email ${email} not found`);
        } catch (error) {
            console.error('Error updating lead:', error.message);
            throw error;
        }
    }

    /**
     * Get all leads from the database
     * @param {Object} filters - Optional filters (status, sourceTag, etc.)
     */
    async getLeads(filters = {}) {
        if (!this.sheet) {
            await this.connect();
        }

        try {
            const rows = await this.sheet.getRows();
            let leads = rows.map(row => ({
                childName: row.get('Child Name'),
                parentName: row.get('Parent Name'),
                parentEmail: row.get('Parent Email'),
                parentMobile: row.get('Parent Mobile'),
                interestLevel: row.get('Interest Level'),
                sourceTag: row.get('Source Tag'),
                timestamp: row.get('Timestamp'),
                duplicateFlag: row.get('Duplicate Flag'),
                status: row.get('Status'),
                assignedOwner: row.get('Assigned Owner'),
                notes: row.get('Notes'),
                rowNumber: row.rowNumber
            }));

            // Apply filters if provided
            if (Object.keys(filters).length > 0) {
                leads = leads.filter(lead => {
                    return Object.keys(filters).every(key => {
                        const columnMapping = {
                            childName: 'childName',
                            parentName: 'parentName',
                            parentEmail: 'parentEmail',
                            parentMobile: 'parentMobile',
                            interestLevel: 'interestLevel',
                            sourceTag: 'sourceTag',
                            status: 'status',
                            assignedOwner: 'assignedOwner'
                        };

                        const fieldName = columnMapping[key] || key;
                        return lead[fieldName] === filters[key];
                    });
                });
            }

            return leads;
        } catch (error) {
            console.error('Error getting leads:', error.message);
            throw error;
        }
    }

    /**
     * Get lead statistics
     */
    async getStats() {
        if (!this.sheet) {
            await this.connect();
        }

        try {
            const rows = await this.sheet.getRows();

            const stats = {
                totalLeads: rows.length,
                duplicates: rows.filter(row => row.get('Duplicate Flag') === 'Yes').length,
                byStatus: {},
                bySource: {},
                byInterestLevel: {}
            };

            // Count by status
            rows.forEach(row => {
                const status = row.get('Status') || 'Unknown';
                stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
            });

            // Count by source tag
            rows.forEach(row => {
                const source = row.get('Source Tag') || 'Unknown';
                stats.bySource[source] = (stats.bySource[source] || 0) + 1;
            });

            // Count by interest level
            rows.forEach(row => {
                const interest = row.get('Interest Level') || 'Unknown';
                stats.byInterestLevel[interest] = (stats.byInterestLevel[interest] || 0) + 1;
            });

            return stats;
        } catch (error) {
            console.error('Error getting stats:', error.message);
            throw error;
        }
    }

    /**
     * Bulk import leads from an array
     * @param {Array} leads - Array of lead objects
     */
    async bulkImportLeads(leads) {
        if (!this.sheet) {
            await this.connect();
        }

        const results = {
            added: 0,
            duplicates: 0,
            errors: []
        };

        for (const lead of leads) {
            try {
                const result = await this.addLead(lead);
                if (result.isDuplicate) {
                    results.duplicates++;
                } else {
                    results.added++;
                }
            } catch (error) {
                results.errors.push({
                    lead: lead,
                    error: error.message
                });
            }
        }

        console.log(`Bulk import completed: ${results.added} added, ${results.duplicates} duplicates, ${results.errors.length} errors`);
        return results;
    }
}

module.exports = MasterDatabase;