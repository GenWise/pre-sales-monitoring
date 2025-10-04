#!/usr/bin/env node
/**
 * CRM Rollback Script - Emergency Cleanup for FreshSales Testing
 *
 * Usage:
 *   node rollbackScript.js [sessionId]
 *   node rollbackScript.js --all
 *   node rollbackScript.js --list
 */

const FreshSalesClient = require('./freshsalesClient');
const CRMChangeTracker = require('./crmChangeTracker');
const fs = require('fs').promises;
const path = require('path');

class RollbackScript {
    constructor() {
        this.client = new FreshSalesClient();
        this.logsDir = path.join(__dirname, '../../logs');
    }

    async run() {
        const args = process.argv.slice(2);

        if (args.includes('--help') || args.includes('-h')) {
            this.showHelp();
            return;
        }

        if (args.includes('--list')) {
            await this.listSessions();
            return;
        }

        if (args.includes('--all')) {
            await this.rollbackAll();
            return;
        }

        const sessionId = args[0];
        if (sessionId) {
            await this.rollbackSession(sessionId);
        } else {
            console.log('❌ Please specify a session ID or use --list to see available sessions');
            this.showHelp();
        }
    }

    showHelp() {
        console.log(`
🔄 CRM Rollback Script - Emergency Cleanup Tool

Usage:
  node rollbackScript.js <sessionId>    Rollback specific session
  node rollbackScript.js --all          Rollback ALL sessions (DANGER!)
  node rollbackScript.js --list         List all tracked sessions
  node rollbackScript.js --help         Show this help

Examples:
  node rollbackScript.js sync_1696123456789
  node rollbackScript.js --list

⚠️  WARNING: This will permanently delete/modify CRM data!
`);
    }

    async listSessions() {
        try {
            const trackingFile = path.join(this.logsDir, 'crm_changes.json');
            const data = JSON.parse(await fs.readFile(trackingFile, 'utf8'));

            console.log('\n📋 Available Test Sessions:\n');

            for (const [sessionId, session] of Object.entries(data.sessions || {})) {
                const summary = this.analyzeSessions(session.changes);
                console.log(`🔸 Session: ${sessionId}`);
                console.log(`   Created: ${session.createdAt}`);
                console.log(`   Changes: ${summary.creates} creates, ${summary.updates} updates`);
                console.log(`   Status: ${summary.needsRollback > 0 ? '🚨 NEEDS ROLLBACK' : '✅ Clean'}`);
                console.log('');
            }

        } catch (error) {
            console.log('❌ No tracking data found or error reading file:', error.message);
        }
    }

    analyzeSessions(changes) {
        const creates = changes.filter(c => c.operation === 'create' && c.success && !c.rollbackExecuted).length;
        const updates = changes.filter(c => c.operation === 'update' && c.success && !c.rollbackExecuted).length;
        const errors = changes.filter(c => !c.success).length;
        const rolledBack = changes.filter(c => c.rollbackExecuted).length;

        return {
            creates,
            updates,
            errors,
            rolledBack,
            needsRollback: creates + updates
        };
    }

    async rollbackSession(sessionId) {
        try {
            console.log(`\n🔄 Rolling back session: ${sessionId}\n`);

            // Load session data
            const trackingFile = path.join(this.logsDir, 'crm_changes.json');
            const data = JSON.parse(await fs.readFile(trackingFile, 'utf8'));

            const session = data.sessions[sessionId];
            if (!session) {
                console.log(`❌ Session ${sessionId} not found`);
                return;
            }

            // Create tracker for this session
            const tracker = new CRMChangeTracker({ testSessionId: sessionId });
            tracker.changes = session.changes;

            // Generate and execute rollback
            const rollbackScript = await tracker.generateRollbackScript();

            if (rollbackScript.operations.length === 0) {
                console.log('✅ No operations to rollback - session is clean');
                return;
            }

            console.log(`⚠️  About to rollback ${rollbackScript.operations.length} operations:`);
            for (const op of rollbackScript.operations) {
                console.log(`   ${op.type.toUpperCase()}: Contact ${op.contactId}`);
            }

            // Ask for confirmation
            console.log('\n🚨 Are you sure? This will permanently modify CRM data!');
            console.log('Type "YES" to confirm:');

            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise(resolve => {
                readline.question('> ', resolve);
            });
            readline.close();

            if (answer !== 'YES') {
                console.log('❌ Rollback cancelled');
                return;
            }

            // Execute rollback
            const result = await tracker.executeRollback(this.client, rollbackScript);

            console.log(`\n✅ Rollback completed:`);
            console.log(`   Successful: ${result.successful}`);
            console.log(`   Failed: ${result.failed}`);
            console.log(`   Total: ${result.total}`);

        } catch (error) {
            console.error('❌ Rollback failed:', error.message);
        }
    }

    async rollbackAll() {
        try {
            const trackingFile = path.join(this.logsDir, 'crm_changes.json');
            const data = JSON.parse(await fs.readFile(trackingFile, 'utf8'));

            const sessions = Object.keys(data.sessions || {});
            if (sessions.length === 0) {
                console.log('✅ No sessions found to rollback');
                return;
            }

            console.log(`\n🚨 DANGER: About to rollback ALL ${sessions.length} sessions!`);
            console.log('Sessions:');
            sessions.forEach(s => console.log(`   - ${s}`));

            console.log('\n⚠️  This will DELETE/MODIFY significant CRM data!');
            console.log('Type "DELETE ALL CRM TEST DATA" to confirm:');

            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise(resolve => {
                readline.question('> ', resolve);
            });
            readline.close();

            if (answer !== 'DELETE ALL CRM TEST DATA') {
                console.log('❌ Rollback cancelled');
                return;
            }

            // Rollback each session
            for (const sessionId of sessions) {
                console.log(`\n🔄 Rolling back session: ${sessionId}`);
                await this.rollbackSession(sessionId);
            }

        } catch (error) {
            console.error('❌ Mass rollback failed:', error.message);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const script = new RollbackScript();
    script.run().catch(console.error);
}

module.exports = RollbackScript;