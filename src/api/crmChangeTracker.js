/**
 * CRM Change Tracker - Track and Rollback FreshSales Changes
 *
 * CRITICAL SAFETY MODULE: Records every CRM modification for rollback capability
 * Essential for safe testing without permanent CRM contamination
 */

const fs = require('fs').promises;
const path = require('path');

class CRMChangeTracker {
    constructor(config = {}) {
        this.trackingFile = config.trackingFile || path.join(__dirname, '../../logs/crm_changes.json');
        this.testSessionId = config.testSessionId || `test_${Date.now()}`;
        this.changes = [];

        console.log(`🛡️  CRM Change Tracker initialized - Session: ${this.testSessionId}`);
    }

    /**
     * Record a CRM operation before executing it
     * @param {string} operation - 'create', 'update', 'delete'
     * @param {string} endpoint - FreshSales API endpoint
     * @param {Object} payload - Request payload
     * @param {Object} originalData - Original contact data (for updates)
     */
    async recordOperation(operation, endpoint, payload, originalData = null) {
        const changeRecord = {
            id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId: this.testSessionId,
            timestamp: new Date().toISOString(),
            operation,
            endpoint,
            payload: JSON.parse(JSON.stringify(payload)), // Deep clone
            originalData: originalData ? JSON.parse(JSON.stringify(originalData)) : null,
            rollbackExecuted: false,
            notes: `Test operation: ${operation} on ${endpoint}`
        };

        this.changes.push(changeRecord);
        await this.saveChangesToFile();

        console.log(`📝 Recorded ${operation} operation: ${changeRecord.id}`);
        return changeRecord.id;
    }

    /**
     * Record successful CRM response to complete the tracking
     * @param {string} changeId - ID from recordOperation
     * @param {Object} response - FreshSales API response
     */
    async recordResponse(changeId, response) {
        const change = this.changes.find(c => c.id === changeId);
        if (change) {
            change.response = JSON.parse(JSON.stringify(response));
            change.contactId = this.extractContactId(response);
            change.success = true;
            await this.saveChangesToFile();

            console.log(`✅ Recorded successful response for: ${changeId}`);
            console.log(`   Contact ID: ${change.contactId}`);
        }
    }

    /**
     * Record failed operation
     * @param {string} changeId - ID from recordOperation
     * @param {Error} error - Error that occurred
     */
    async recordError(changeId, error) {
        const change = this.changes.find(c => c.id === changeId);
        if (change) {
            change.error = error.message;
            change.success = false;
            await this.saveChangesToFile();

            console.log(`❌ Recorded error for: ${changeId} - ${error.message}`);
        }
    }

    /**
     * Extract contact ID from FreshSales response
     */
    extractContactId(response) {
        if (response?.data?.contact?.id) return response.data.contact.id;
        if (response?.data?.id) return response.data.id;
        if (response?.contact?.id) return response.contact.id;
        if (response?.id) return response.id;
        return null;
    }

    /**
     * Generate rollback script for current session
     */
    async generateRollbackScript() {
        const successfulChanges = this.changes.filter(c => c.success && !c.rollbackExecuted);

        const rollbackScript = {
            sessionId: this.testSessionId,
            generatedAt: new Date().toISOString(),
            totalChanges: successfulChanges.length,
            operations: []
        };

        for (const change of successfulChanges) {
            if (change.operation === 'create' && change.contactId) {
                // Rollback: Delete created contact
                rollbackScript.operations.push({
                    type: 'delete',
                    contactId: change.contactId,
                    endpoint: `/contacts/${change.contactId}`,
                    reason: `Delete contact created by ${change.id}`,
                    originalChangeId: change.id
                });
            } else if (change.operation === 'update' && change.contactId && change.originalData) {
                // Rollback: Restore original data
                rollbackScript.operations.push({
                    type: 'update',
                    contactId: change.contactId,
                    endpoint: `/contacts/${change.contactId}`,
                    restoreData: change.originalData,
                    reason: `Restore original data modified by ${change.id}`,
                    originalChangeId: change.id
                });
            }
        }

        // Save rollback script
        const rollbackFile = path.join(__dirname, `../../logs/rollback_${this.testSessionId}.json`);
        await fs.writeFile(rollbackFile, JSON.stringify(rollbackScript, null, 2));

        console.log(`🔄 Generated rollback script: ${rollbackFile}`);
        console.log(`   Operations to rollback: ${rollbackScript.operations.length}`);

        return rollbackScript;
    }

    /**
     * Execute rollback operations
     * @param {Object} freshSalesClient - FreshSales client instance
     */
    async executeRollback(freshSalesClient, rollbackScript = null) {
        if (!rollbackScript) {
            rollbackScript = await this.generateRollbackScript();
        }

        console.log(`🚨 EXECUTING ROLLBACK for session: ${this.testSessionId}`);
        console.log(`   Operations to execute: ${rollbackScript.operations.length}`);

        let successful = 0;
        let failed = 0;

        for (const operation of rollbackScript.operations) {
            try {
                console.log(`   Executing: ${operation.type} on contact ${operation.contactId}`);

                if (operation.type === 'delete') {
                    await freshSalesClient.makeRequest(operation.endpoint, 'DELETE');
                    console.log(`   ✅ Deleted contact: ${operation.contactId}`);
                } else if (operation.type === 'update') {
                    await freshSalesClient.makeRequest(operation.endpoint, 'PUT', {
                        contact: operation.restoreData
                    });
                    console.log(`   ✅ Restored contact: ${operation.contactId}`);
                }

                // Mark original change as rolled back
                const originalChange = this.changes.find(c => c.id === operation.originalChangeId);
                if (originalChange) {
                    originalChange.rollbackExecuted = true;
                    originalChange.rollbackTimestamp = new Date().toISOString();
                }

                successful++;

                // Rate limiting delay
                await this.sleep(1000);

            } catch (error) {
                console.log(`   ❌ Failed to rollback ${operation.contactId}: ${error.message}`);
                failed++;
            }
        }

        await this.saveChangesToFile();

        console.log(`🔄 Rollback completed: ${successful} successful, ${failed} failed`);
        return { successful, failed, total: rollbackScript.operations.length };
    }

    /**
     * Get summary of current session changes
     */
    getSessionSummary() {
        const creates = this.changes.filter(c => c.operation === 'create' && c.success).length;
        const updates = this.changes.filter(c => c.operation === 'update' && c.success).length;
        const deletes = this.changes.filter(c => c.operation === 'delete' && c.success).length;
        const errors = this.changes.filter(c => !c.success).length;
        const rolledBack = this.changes.filter(c => c.rollbackExecuted).length;

        return {
            sessionId: this.testSessionId,
            totalOperations: this.changes.length,
            successful: creates + updates + deletes,
            creates,
            updates,
            deletes,
            errors,
            rolledBack,
            needsRollback: creates + updates - rolledBack
        };
    }

    /**
     * Tag test contacts for easy identification
     * NOTE: Only adds tracking to description, NOT to tags (tags are business-only)
     */
    addTestTags(contactData) {
        // DO NOT add test tags - keep only business tags (gsp2026_*)
        // Tags are reserved for: gsp2026_website_form, gsp2026_returning_students_form, etc.

        // Add test identifier to description only
        const testNote = `\n\n[TEST CONTACT - Session: ${this.testSessionId} - Created: ${new Date().toISOString()}]`;
        if (contactData.description) {
            contactData.description += testNote;
        } else {
            contactData.description = `Test contact for sync development${testNote}`;
        }

        return contactData;
    }

    /**
     * Save changes to persistent file
     */
    async saveChangesToFile() {
        try {
            // Ensure logs directory exists
            const logsDir = path.dirname(this.trackingFile);
            await fs.mkdir(logsDir, { recursive: true });

            // Load existing data
            let allData = { sessions: {} };
            try {
                const existing = await fs.readFile(this.trackingFile, 'utf8');
                allData = JSON.parse(existing);
            } catch (e) {
                // File doesn't exist yet, that's fine
            }

            // Update with current session
            allData.sessions[this.testSessionId] = {
                sessionId: this.testSessionId,
                createdAt: this.changes[0]?.timestamp || new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                changes: this.changes
            };

            await fs.writeFile(this.trackingFile, JSON.stringify(allData, null, 2));
        } catch (error) {
            console.error('Failed to save change tracking:', error.message);
        }
    }

    /**
     * Helper: Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = CRMChangeTracker;