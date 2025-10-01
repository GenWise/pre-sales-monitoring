#!/usr/bin/env node

/**
 * FreshSales Bidirectional Sync Service - Production Ready
 *
 * Complete bidirectional synchronization between Google Sheets and FreshSales CRM.
 * Features:
 * - Real-time sync from Google Sheets to FreshSales (new leads)
 * - Regular sync from FreshSales to Google Sheets (status updates)
 * - Comprehensive error handling and monitoring
 * - Slack notifications for sync status
 * - Production logging and monitoring
 * - Configurable sync schedules
 * - Duplicate prevention and handling
 */

const FreshSalesSync = require('./src/api/freshsalesSync');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');

class FreshSalesSyncService {
    constructor() {
        this.config = {
            // Master sheet configuration
            masterSheetId: '1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ',
            serviceAccountFile: path.join(__dirname, 'credentials', 'service-account-key.json'),

            // FreshSales configuration
            freshsalesApiKey: process.env.FRESHSALES_API_KEY || '[SET_FRESHSALES_API_KEY]',
            freshsalesDomain: 'genwisecrm.myfreshworks.com',

            // Slack notifications
            slackWebhook: process.env.SLACK_WEBHOOK || '[SET_SLACK_WEBHOOK_URL]',

            // Email notifications
            notifications: {
                development: ['rajesh@genwise.in'],
                production: ['gifted@genwise.in', 'eklavya@genwise.in', 'ashish@genwise.in']
            },

            // Sync settings
            environment: process.env.NODE_ENV || 'production',
            batchSize: 10,
            syncInterval: {
                toFreshSales: '*/5 * * * *', // Every 5 minutes - new leads from sheets
                fromFreshSales: '0 */2 * * *', // Every 2 hours - status updates from CRM
                healthCheck: '0 */6 * * *'    // Every 6 hours - system health
            },

            // Error handling
            maxRetries: 3,
            retryDelay: 5000,
            errorThreshold: 5 // Max errors before alerting
        };

        this.syncEngine = new FreshSalesSync({
            apiKey: this.config.freshsalesApiKey,
            domain: this.config.freshsalesDomain,
            masterSheetId: this.config.masterSheetId,
            serviceAccountFile: this.config.serviceAccountFile,
            batchSize: this.config.batchSize,
            duplicateStrategy: 'skip', // 'skip', 'update', or 'create_new'
            syncDirection: 'bidirectional'
        });

        this.isRunning = false;
        this.syncStats = {
            lastToFreshSalesSync: null,
            lastFromFreshSalesSync: null,
            totalLeadsSynced: 0,
            totalContactsUpdated: 0,
            errorCount: 0,
            lastError: null,
            serviceStartTime: new Date()
        };

        this.logFile = path.join(__dirname, 'logs', 'freshsales-sync.log');
        this.ensureLogDirectory();

        console.log(`FreshSales Sync Service initialized in ${this.config.environment} mode`);
        this.log('SERVICE_INIT', 'FreshSales Sync Service initialized', { environment: this.config.environment });
    }

    /**
     * Start the sync service with scheduled tasks
     */
    async start() {
        if (this.isRunning) {
            console.log('Sync service is already running');
            return;
        }

        this.isRunning = true;
        console.log('Starting FreshSales Sync Service...');

        try {
            // Test connections before starting
            await this.performHealthCheck();

            // Schedule sync tasks
            this.scheduleToFreshSalesSync();
            this.scheduleFromFreshSalesSync();
            this.scheduleHealthCheck();

            // Send startup notification
            await this.sendSlackNotification(
                '🚀 FreshSales Sync Service Started',
                `Service started successfully in ${this.config.environment} mode\n` +
                `• Sync to FreshSales: ${this.config.syncInterval.toFreshSales}\n` +
                `• Sync from FreshSales: ${this.config.syncInterval.fromFreshSales}\n` +
                `• Health checks: ${this.config.syncInterval.healthCheck}`,
                'good'
            );

            this.log('SERVICE_START', 'Sync service started successfully');
            console.log('✅ FreshSales Sync Service is now running');
            console.log(`📊 Monitor at: ${this.getMonitoringUrl()}`);

        } catch (error) {
            this.isRunning = false;
            this.log('SERVICE_ERROR', 'Failed to start sync service', { error: error.message });
            await this.sendErrorNotification('Service startup failed', error);
            throw error;
        }
    }

    /**
     * Stop the sync service
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        console.log('Stopping FreshSales Sync Service...');

        // Stop all cron jobs
        cron.getTasks().forEach(task => task.destroy());

        await this.sendSlackNotification(
            '⏹️ FreshSales Sync Service Stopped',
            'Sync service has been stopped gracefully',
            'warning'
        );

        this.log('SERVICE_STOP', 'Sync service stopped');
        console.log('✅ FreshSales Sync Service stopped');
    }

    /**
     * Schedule sync from Google Sheets to FreshSales (new leads)
     */
    scheduleToFreshSalesSync() {
        console.log(`📅 Scheduling sync to FreshSales: ${this.config.syncInterval.toFreshSales}`);

        cron.schedule(this.config.syncInterval.toFreshSales, async () => {
            if (!this.isRunning) return;

            console.log('🔄 Starting scheduled sync: Google Sheets → FreshSales');
            await this.performToFreshSalesSync();
        });
    }

    /**
     * Schedule sync from FreshSales to Google Sheets (status updates)
     */
    scheduleFromFreshSalesSync() {
        console.log(`📅 Scheduling sync from FreshSales: ${this.config.syncInterval.fromFreshSales}`);

        cron.schedule(this.config.syncInterval.fromFreshSales, async () => {
            if (!this.isRunning) return;

            console.log('🔄 Starting scheduled sync: FreshSales → Google Sheets');
            await this.performFromFreshSalesSync();
        });
    }

    /**
     * Schedule health checks
     */
    scheduleHealthCheck() {
        console.log(`📅 Scheduling health checks: ${this.config.syncInterval.healthCheck}`);

        cron.schedule(this.config.syncInterval.healthCheck, async () => {
            if (!this.isRunning) return;

            console.log('🏥 Performing scheduled health check');
            await this.performHealthCheck();
        });
    }

    /**
     * Perform sync from Google Sheets to FreshSales
     */
    async performToFreshSalesSync() {
        const startTime = new Date();

        try {
            this.log('SYNC_START', 'Starting sync to FreshSales');

            // Get only new leads since last sync
            const options = {
                since: this.syncStats.lastToFreshSalesSync || this.getDefaultSinceDate()
            };

            const result = await this.syncEngine.syncLeadsToFreshSales(options);

            this.syncStats.lastToFreshSalesSync = startTime;
            this.syncStats.totalLeadsSynced += result.stats.created + result.stats.updated;

            this.log('SYNC_COMPLETE', 'Sync to FreshSales completed', {
                duration: Date.now() - startTime.getTime(),
                stats: result.stats
            });

            // Send notification for significant sync results
            if (result.stats.created > 0 || result.stats.errors > 0) {
                await this.sendSyncNotification('to_freshsales', result, Date.now() - startTime.getTime());
            }

            return result;

        } catch (error) {
            this.syncStats.errorCount++;
            this.syncStats.lastError = { timestamp: new Date(), message: error.message, type: 'to_freshsales' };

            this.log('SYNC_ERROR', 'Sync to FreshSales failed', { error: error.message });
            await this.sendErrorNotification('Sync to FreshSales failed', error);

            throw error;
        }
    }

    /**
     * Perform sync from FreshSales to Google Sheets
     */
    async performFromFreshSalesSync() {
        const startTime = new Date();

        try {
            this.log('SYNC_START', 'Starting sync from FreshSales');

            const options = {
                since: this.syncStats.lastFromFreshSalesSync || this.getDefaultSinceDate()
            };

            const result = await this.syncEngine.syncContactsFromFreshSales(options);

            this.syncStats.lastFromFreshSalesSync = startTime;
            this.syncStats.totalContactsUpdated += result.stats.updated;

            this.log('SYNC_COMPLETE', 'Sync from FreshSales completed', {
                duration: Date.now() - startTime.getTime(),
                stats: result.stats
            });

            // Send notification for sync results
            if (result.stats.updated > 0 || result.stats.errors > 0) {
                await this.sendSyncNotification('from_freshsales', result, Date.now() - startTime.getTime());
            }

            return result;

        } catch (error) {
            this.syncStats.errorCount++;
            this.syncStats.lastError = { timestamp: new Date(), message: error.message, type: 'from_freshsales' };

            this.log('SYNC_ERROR', 'Sync from FreshSales failed', { error: error.message });

            // Don't alert for permission errors (expected limitation)
            if (!error.message.includes('API_PERMISSION_DENIED')) {
                await this.sendErrorNotification('Sync from FreshSales failed', error);
            }

            throw error;
        }
    }

    /**
     * Perform full bidirectional sync
     */
    async performFullSync() {
        console.log('🔄 Starting full bidirectional sync...');

        const startTime = new Date();
        const results = {
            toFreshSales: null,
            fromFreshSales: null,
            duration: 0,
            success: false
        };

        try {
            // Sync to FreshSales first
            results.toFreshSales = await this.performToFreshSalesSync();

            // Then sync from FreshSales
            results.fromFreshSales = await this.performFromFreshSalesSync();

            results.duration = Date.now() - startTime.getTime();
            results.success = true;

            await this.sendSlackNotification(
                '✅ Full Bidirectional Sync Complete',
                this.formatSyncResults(results),
                'good'
            );

            return results;

        } catch (error) {
            results.duration = Date.now() - startTime.getTime();
            results.success = false;

            this.log('FULL_SYNC_ERROR', 'Full sync failed', { error: error.message });
            await this.sendErrorNotification('Full bidirectional sync failed', error);

            throw error;
        }
    }

    /**
     * Perform health check
     */
    async performHealthCheck() {
        console.log('🏥 Performing health check...');

        try {
            const healthData = {
                timestamp: new Date(),
                service: {
                    running: this.isRunning,
                    uptime: Date.now() - this.syncStats.serviceStartTime.getTime(),
                    environment: this.config.environment
                },
                stats: { ...this.syncStats },
                freshsales: null,
                googleSheets: null
            };

            // Test FreshSales connection
            try {
                healthData.freshsales = await this.syncEngine.client.testConnection();
                console.log('✅ FreshSales connection healthy');
            } catch (error) {
                healthData.freshsales = { status: 'error', message: error.message };
                console.warn('⚠️ FreshSales connection issues:', error.message);
            }

            // Test Google Sheets connection
            try {
                await this.testGoogleSheetsConnection();
                healthData.googleSheets = { status: 'success', message: 'Google Sheets accessible' };
                console.log('✅ Google Sheets connection healthy');
            } catch (error) {
                healthData.googleSheets = { status: 'error', message: error.message };
                console.warn('⚠️ Google Sheets connection issues:', error.message);
            }

            this.log('HEALTH_CHECK', 'Health check completed', healthData);

            // Send health report if there are issues
            if (healthData.freshsales?.status === 'error' || healthData.googleSheets?.status === 'error') {
                await this.sendHealthAlert(healthData);
            }

            return healthData;

        } catch (error) {
            this.log('HEALTH_CHECK_ERROR', 'Health check failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Test Google Sheets connection
     */
    async testGoogleSheetsConnection() {
        // Load a small sample from the master sheet to test connectivity
        const leads = await this.syncEngine.loadLeadsFromMasterDatabase({ limit: 1 });
        if (!Array.isArray(leads)) {
            throw new Error('Invalid response from Google Sheets');
        }
        return true;
    }

    /**
     * Manual sync trigger - for immediate sync needs
     */
    async triggerManualSync(direction = 'bidirectional') {
        console.log(`🚀 Manual sync triggered: ${direction}`);

        try {
            let result;

            switch (direction) {
                case 'to_freshsales':
                    result = await this.performToFreshSalesSync();
                    break;
                case 'from_freshsales':
                    result = await this.performFromFreshSalesSync();
                    break;
                case 'bidirectional':
                default:
                    result = await this.performFullSync();
                    break;
            }

            await this.sendSlackNotification(
                '⚡ Manual Sync Complete',
                `Manual sync (${direction}) completed successfully`,
                'good'
            );

            return result;

        } catch (error) {
            await this.sendErrorNotification(`Manual sync (${direction}) failed`, error);
            throw error;
        }
    }

    /**
     * Get service status and statistics
     */
    getStatus() {
        return {
            running: this.isRunning,
            uptime: this.isRunning ? Date.now() - this.syncStats.serviceStartTime.getTime() : 0,
            environment: this.config.environment,
            stats: { ...this.syncStats },
            config: {
                syncIntervals: this.config.syncInterval,
                batchSize: this.config.batchSize,
                duplicateStrategy: this.syncEngine.duplicateStrategy
            },
            nextSyncTimes: this.getNextSyncTimes()
        };
    }

    /**
     * Get next scheduled sync times
     */
    getNextSyncTimes() {
        const tasks = cron.getTasks();
        return {
            toFreshSales: 'Active cron job',
            fromFreshSales: 'Active cron job',
            healthCheck: 'Active cron job'
        };
    }

    /**
     * Send Slack notification
     */
    async sendSlackNotification(title, message, color = 'good') {
        if (!this.config.slackWebhook) {
            console.warn('Slack webhook not configured');
            return;
        }

        const payload = {
            text: title,
            attachments: [{
                color: color,
                text: message,
                footer: `FreshSales Sync Service (${this.config.environment})`,
                ts: Math.floor(Date.now() / 1000)
            }]
        };

        try {
            await this.makeHttpRequest(this.config.slackWebhook, 'POST', payload);
            console.log('📱 Slack notification sent');
        } catch (error) {
            console.error('Failed to send Slack notification:', error.message);
        }
    }

    /**
     * Send sync completion notification
     */
    async sendSyncNotification(direction, result, duration) {
        const emoji = direction === 'to_freshsales' ? '📤' : '📥';
        const directionText = direction === 'to_freshsales' ? 'Google Sheets → FreshSales' : 'FreshSales → Google Sheets';

        const message =
            `Direction: ${directionText}\n` +
            `Duration: ${Math.round(duration / 1000)}s\n` +
            `✅ Created: ${result.stats.created || 0}\n` +
            `🔄 Updated: ${result.stats.updated || 0}\n` +
            `⏭️ Skipped: ${result.stats.skipped || 0}\n` +
            `❌ Errors: ${result.stats.errors || 0}`;

        const color = result.stats.errors > 0 ? 'warning' : 'good';

        await this.sendSlackNotification(`${emoji} Sync Complete`, message, color);
    }

    /**
     * Send error notification
     */
    async sendErrorNotification(title, error) {
        const message =
            `❌ ${title}\n` +
            `Error: ${error.message}\n` +
            `Time: ${new Date().toISOString()}\n` +
            `Environment: ${this.config.environment}`;

        await this.sendSlackNotification('🚨 Sync Error', message, 'danger');

        // Also log to file
        this.log('ERROR_NOTIFICATION', title, { error: error.message, stack: error.stack });
    }

    /**
     * Send health alert
     */
    async sendHealthAlert(healthData) {
        const issues = [];

        if (healthData.freshsales?.status === 'error') {
            issues.push(`FreshSales: ${healthData.freshsales.message}`);
        }

        if (healthData.googleSheets?.status === 'error') {
            issues.push(`Google Sheets: ${healthData.googleSheets.message}`);
        }

        const message =
            `🏥 Health Check Alert\n` +
            `Issues detected:\n` +
            issues.map(issue => `• ${issue}`).join('\n') +
            `\nUptime: ${Math.round(healthData.service.uptime / 1000 / 60)} minutes`;

        await this.sendSlackNotification('⚠️ Health Alert', message, 'warning');
    }

    /**
     * Format sync results for display
     */
    formatSyncResults(results) {
        const toStats = results.toFreshSales?.stats || {};
        const fromStats = results.fromFreshSales?.stats || {};

        return (
            `📤 To FreshSales: ${toStats.created || 0} created, ${toStats.updated || 0} updated, ${toStats.errors || 0} errors\n` +
            `📥 From FreshSales: ${fromStats.updated || 0} updated, ${fromStats.errors || 0} errors\n` +
            `Duration: ${Math.round(results.duration / 1000)}s`
        );
    }

    /**
     * Get default since date (24 hours ago)
     */
    getDefaultSinceDate() {
        return new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    /**
     * Get monitoring URL
     */
    getMonitoringUrl() {
        return `http://localhost:3003/status`; // Will be served by monitoring endpoint
    }

    /**
     * Ensure log directory exists
     */
    async ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        try {
            await fs.mkdir(logDir, { recursive: true });
        } catch (error) {
            console.warn('Could not create log directory:', error.message);
        }
    }

    /**
     * Log to file
     */
    async log(level, message, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            pid: process.pid
        };

        const logLine = JSON.stringify(logEntry) + '\n';

        try {
            await fs.appendFile(this.logFile, logLine);
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }

        // Also log to console
        console.log(`[${level}] ${message}`, Object.keys(data).length > 0 ? data : '');
    }

    /**
     * Make HTTP request
     */
    async makeHttpRequest(url, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (data) {
                const jsonData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(jsonData);
            }

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ statusCode: res.statusCode, body });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                    }
                });
            });

            req.on('error', reject);

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }
}

// CLI functionality
if (require.main === module) {
    const service = new FreshSalesSyncService();

    const command = process.argv[2];
    const args = process.argv.slice(3);

    async function main() {
        try {
            switch (command) {
                case 'start':
                    await service.start();
                    // Keep the process running
                    process.on('SIGINT', async () => {
                        console.log('\nReceived SIGINT, shutting down gracefully...');
                        await service.stop();
                        process.exit(0);
                    });
                    break;

                case 'stop':
                    await service.stop();
                    process.exit(0);
                    break;

                case 'sync':
                    const direction = args[0] || 'bidirectional';
                    const result = await service.triggerManualSync(direction);
                    console.log('Sync result:', JSON.stringify(result, null, 2));
                    process.exit(0);
                    break;

                case 'status':
                    const status = service.getStatus();
                    console.log('Service status:', JSON.stringify(status, null, 2));
                    process.exit(0);
                    break;

                case 'health':
                    const health = await service.performHealthCheck();
                    console.log('Health check:', JSON.stringify(health, null, 2));
                    process.exit(0);
                    break;

                case 'test':
                    console.log('Running sync engine tests...');
                    const testResult = await service.syncEngine.testSync();
                    console.log('Test result:', JSON.stringify(testResult, null, 2));
                    process.exit(0);
                    break;

                default:
                    console.log(`
FreshSales Sync Service - Production Ready

Usage:
  node freshsales-sync-service.js <command> [options]

Commands:
  start                     Start the sync service with scheduled tasks
  stop                      Stop the sync service
  sync [direction]          Trigger manual sync (bidirectional|to_freshsales|from_freshsales)
  status                    Show service status and statistics
  health                    Perform health check
  test                      Run sync engine tests

Examples:
  node freshsales-sync-service.js start
  node freshsales-sync-service.js sync to_freshsales
  node freshsales-sync-service.js status
                    `);
                    process.exit(1);
            }
        } catch (error) {
            console.error('Command failed:', error.message);
            process.exit(1);
        }
    }

    main();
}

module.exports = FreshSalesSyncService;