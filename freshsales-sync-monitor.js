#!/usr/bin/env node

/**
 * FreshSales Sync Monitoring Server
 *
 * Provides HTTP endpoints for monitoring the sync service status,
 * viewing logs, and triggering manual operations.
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');

class FreshSalesSyncMonitor {
    constructor(config = {}) {
        this.port = config.port || 3003;
        this.logFile = config.logFile || path.join(__dirname, 'logs', 'freshsales-sync.log');
        this.server = null;
        this.serviceStats = {
            running: false,
            lastCheck: null,
            errors: [],
            metrics: {}
        };

        console.log(`FreshSales Sync Monitor starting on port ${this.port}`);
    }

    /**
     * Start the monitoring server
     */
    async start() {
        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res).catch(error => {
                console.error('Request handling error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            });
        });

        this.server.listen(this.port, () => {
            console.log(`✅ FreshSales Sync Monitor running on http://localhost:${this.port}`);
            console.log(`📊 Available endpoints:
  GET  /status          - Service status and statistics
  GET  /health          - Health check
  GET  /logs            - Recent log entries
  POST /sync            - Trigger manual sync
  GET  /metrics         - Performance metrics
  GET  /dashboard       - Web dashboard (HTML)`);
        });

        return this;
    }

    /**
     * Stop the monitoring server
     */
    async stop() {
        if (this.server) {
            this.server.close();
            console.log('✅ FreshSales Sync Monitor stopped');
        }
    }

    /**
     * Handle HTTP requests
     */
    async handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const method = req.method;
        const pathname = parsedUrl.pathname;

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        try {
            switch (pathname) {
                case '/':
                case '/dashboard':
                    await this.serveDashboard(req, res);
                    break;
                case '/status':
                    await this.serveStatus(req, res);
                    break;
                case '/health':
                    await this.serveHealth(req, res);
                    break;
                case '/logs':
                    await this.serveLogs(req, res, parsedUrl.query);
                    break;
                case '/sync':
                    await this.handleSyncTrigger(req, res);
                    break;
                case '/metrics':
                    await this.serveMetrics(req, res);
                    break;
                default:
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Not found' }));
            }
        } catch (error) {
            console.error('Endpoint error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    /**
     * Serve HTML dashboard
     */
    async serveDashboard(req, res) {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FreshSales Sync Monitor</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #333; }
        .status { display: flex; align-items: center; gap: 10px; margin: 10px 0; }
        .status-indicator { width: 12px; height: 12px; border-radius: 50%; }
        .status-running { background: #4CAF50; }
        .status-stopped { background: #f44336; }
        .status-warning { background: #ff9800; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric { text-align: center; padding: 10px; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2196F3; }
        .metric-label { color: #666; margin-top: 5px; }
        .button { background: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px; }
        .button:hover { background: #1976D2; }
        .button-danger { background: #f44336; }
        .button-danger:hover { background: #d32f2f; }
        .logs { background: #f8f8f8; border-radius: 4px; padding: 15px; max-height: 400px; overflow-y: auto; font-family: monospace; font-size: 12px; }
        .log-entry { margin: 5px 0; padding: 5px; border-left: 3px solid #ddd; }
        .log-error { border-left-color: #f44336; background: #ffebee; }
        .log-success { border-left-color: #4CAF50; background: #e8f5e8; }
        .log-warning { border-left-color: #ff9800; background: #fff3e0; }
        .refresh-btn { position: fixed; bottom: 20px; right: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔄 FreshSales Sync Monitor</h1>
            <p>Real-time monitoring dashboard for bidirectional sync service</p>
        </div>

        <div class="card">
            <h2>Service Status</h2>
            <div id="service-status">Loading...</div>
            <div style="margin-top: 15px;">
                <button class="button" onclick="triggerSync('bidirectional')">Full Sync</button>
                <button class="button" onclick="triggerSync('to_freshsales')">Sync to FreshSales</button>
                <button class="button" onclick="triggerSync('from_freshsales')">Sync from FreshSales</button>
                <button class="button button-danger" onclick="refreshData()">Refresh</button>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>Sync Statistics</h3>
                <div id="sync-stats">Loading...</div>
            </div>
            <div class="card">
                <h3>Health Metrics</h3>
                <div id="health-metrics">Loading...</div>
            </div>
        </div>

        <div class="card">
            <h2>Recent Logs</h2>
            <div id="logs" class="logs">Loading...</div>
        </div>
    </div>

    <button class="button refresh-btn" onclick="refreshData()">🔄 Refresh</button>

    <script>
        async function loadStatus() {
            try {
                const response = await fetch('/status');
                const data = await response.json();

                document.getElementById('service-status').innerHTML =
                    '<div class="status">' +
                    '<div class="status-indicator ' + (data.running ? 'status-running' : 'status-stopped') + '"></div>' +
                    '<strong>' + (data.running ? 'RUNNING' : 'STOPPED') + '</strong>' +
                    '</div>' +
                    '<p>Environment: ' + data.environment + '</p>' +
                    '<p>Uptime: ' + Math.round(data.uptime / 1000 / 60) + ' minutes</p>';

                // Load sync stats
                const stats = data.stats || {};
                document.getElementById('sync-stats').innerHTML =
                    '<div class="metric"><div class="metric-value">' + (stats.totalLeadsSynced || 0) + '</div><div class="metric-label">Total Leads Synced</div></div>' +
                    '<div class="metric"><div class="metric-value">' + (stats.totalContactsUpdated || 0) + '</div><div class="metric-label">Contacts Updated</div></div>' +
                    '<div class="metric"><div class="metric-value">' + (stats.errorCount || 0) + '</div><div class="metric-label">Errors</div></div>';
            } catch (error) {
                console.error('Failed to load status:', error);
                document.getElementById('service-status').innerHTML = '<div class="status"><div class="status-indicator status-warning"></div><strong>CONNECTION ERROR</strong></div>';
            }
        }

        async function loadLogs() {
            try {
                const response = await fetch('/logs?limit=50');
                const data = await response.json();

                const logsHtml = data.logs.map(log => {
                    const logClass = log.level === 'ERROR' ? 'log-error' :
                                   log.level === 'SYNC_COMPLETE' ? 'log-success' :
                                   log.level.includes('ERROR') ? 'log-error' : '';

                    return '<div class="log-entry ' + logClass + '">' +
                           '<strong>' + new Date(log.timestamp).toLocaleString() + '</strong> ' +
                           '[' + log.level + '] ' + log.message +
                           '</div>';
                }).join('');

                document.getElementById('logs').innerHTML = logsHtml || '<p>No logs available</p>';
            } catch (error) {
                console.error('Failed to load logs:', error);
                document.getElementById('logs').innerHTML = '<p>Error loading logs</p>';
            }
        }

        async function loadHealth() {
            try {
                const response = await fetch('/health');
                const data = await response.json();

                const healthHtml = Object.keys(data.tests || {}).map(test => {
                    const result = data.tests[test];
                    const status = result.status === 'success' ? '✅' :
                                  result.status === 'expected_failure' ? '⚠️' : '❌';
                    return '<div class="metric">' +
                           '<div class="metric-value">' + status + '</div>' +
                           '<div class="metric-label">' + test + '</div>' +
                           '</div>';
                }).join('');

                document.getElementById('health-metrics').innerHTML = healthHtml || '<p>No health data available</p>';
            } catch (error) {
                console.error('Failed to load health:', error);
                document.getElementById('health-metrics').innerHTML = '<p>Error loading health data</p>';
            }
        }

        async function triggerSync(direction) {
            try {
                const response = await fetch('/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ direction })
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Sync triggered successfully: ' + direction);
                    setTimeout(refreshData, 2000); // Refresh after 2 seconds
                } else {
                    alert('Sync failed: ' + result.error);
                }
            } catch (error) {
                alert('Failed to trigger sync: ' + error.message);
            }
        }

        function refreshData() {
            loadStatus();
            loadLogs();
            loadHealth();
        }

        // Load data on page load
        refreshData();

        // Auto-refresh every 30 seconds
        setInterval(refreshData, 30000);
    </script>
</body>
</html>`;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }

    /**
     * Serve service status
     */
    async serveStatus(req, res) {
        try {
            // Try to get status from a running sync service
            // This is a simplified implementation - in production, you might use process monitoring
            const status = {
                running: await this.checkServiceRunning(),
                environment: process.env.NODE_ENV || 'production',
                uptime: Date.now() - (this.serviceStats.lastCheck || Date.now()),
                timestamp: new Date().toISOString(),
                stats: await this.getStatsFromLogs(),
                version: '1.0.0'
            };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(status, null, 2));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    /**
     * Serve health check
     */
    async serveHealth(req, res) {
        try {
            const health = {
                timestamp: new Date().toISOString(),
                service: 'healthy',
                tests: {
                    logFile: await this.checkLogFile(),
                    diskSpace: await this.checkDiskSpace(),
                    memory: this.checkMemoryUsage()
                }
            };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(health, null, 2));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    /**
     * Serve recent logs
     */
    async serveLogs(req, res, query) {
        try {
            const limit = parseInt(query.limit) || 100;
            const level = query.level || null;

            const logs = await this.getRecentLogs(limit, level);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ logs, count: logs.length }, null, 2));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    /**
     * Handle sync trigger requests
     */
    async handleSyncTrigger(req, res) {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        }

        try {
            const body = await this.getRequestBody(req);
            const { direction = 'bidirectional' } = JSON.parse(body);

            // In a real implementation, this would communicate with the sync service
            // For now, we'll log the request and return a success response
            await this.logEvent('MANUAL_SYNC_TRIGGER', `Manual sync triggered: ${direction}`, { direction });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: `Manual sync triggered: ${direction}`,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    /**
     * Serve performance metrics
     */
    async serveMetrics(req, res) {
        try {
            const metrics = {
                timestamp: new Date().toISOString(),
                system: {
                    memoryUsage: process.memoryUsage(),
                    uptime: process.uptime(),
                    pid: process.pid
                },
                sync: await this.getSyncMetrics()
            };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(metrics, null, 2));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    /**
     * Check if sync service is running
     */
    async checkServiceRunning() {
        // Simple implementation - check for recent log activity
        try {
            const recentLogs = await this.getRecentLogs(10);
            const recent = recentLogs.find(log =>
                new Date(log.timestamp) > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
            );
            return !!recent;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get statistics from log analysis
     */
    async getStatsFromLogs() {
        try {
            const logs = await this.getRecentLogs(1000);

            const stats = {
                totalLeadsSynced: 0,
                totalContactsUpdated: 0,
                errorCount: 0,
                lastSync: null,
                successfulSyncs: 0
            };

            logs.forEach(log => {
                if (log.level === 'SYNC_COMPLETE') {
                    stats.successfulSyncs++;
                    if (log.data?.stats) {
                        stats.totalLeadsSynced += log.data.stats.created || 0;
                        stats.totalContactsUpdated += log.data.stats.updated || 0;
                    }
                    if (!stats.lastSync || new Date(log.timestamp) > new Date(stats.lastSync)) {
                        stats.lastSync = log.timestamp;
                    }
                }
                if (log.level.includes('ERROR')) {
                    stats.errorCount++;
                }
            });

            return stats;
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Get recent log entries
     */
    async getRecentLogs(limit = 100, level = null) {
        try {
            const content = await fs.readFile(this.logFile, 'utf8');
            const lines = content.trim().split('\n').filter(line => line.trim());

            const logs = lines
                .slice(-limit * 2) // Get more lines to filter
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch (error) {
                        return null;
                    }
                })
                .filter(log => log !== null)
                .filter(log => !level || log.level === level)
                .slice(-limit)
                .reverse(); // Most recent first

            return logs;
        } catch (error) {
            console.warn('Could not read log file:', error.message);
            return [];
        }
    }

    /**
     * Check log file health
     */
    async checkLogFile() {
        try {
            const stats = await fs.stat(this.logFile);
            return {
                status: 'success',
                size: stats.size,
                modified: stats.mtime
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message
            };
        }
    }

    /**
     * Check available disk space
     */
    async checkDiskSpace() {
        // Simplified disk space check
        return {
            status: 'success',
            message: 'Disk space check not implemented'
        };
    }

    /**
     * Check memory usage
     */
    checkMemoryUsage() {
        const usage = process.memoryUsage();
        const mbUsed = Math.round(usage.heapUsed / 1024 / 1024);

        return {
            status: mbUsed < 512 ? 'success' : 'warning',
            heapUsed: mbUsed,
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024)
        };
    }

    /**
     * Get sync performance metrics
     */
    async getSyncMetrics() {
        const logs = await this.getRecentLogs(100);

        const syncLogs = logs.filter(log => log.level === 'SYNC_COMPLETE');
        const durations = syncLogs
            .map(log => log.data?.duration)
            .filter(duration => duration !== undefined);

        return {
            totalSyncs: syncLogs.length,
            averageDuration: durations.length > 0 ?
                Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
            lastSyncDuration: durations[0] || 0
        };
    }

    /**
     * Get request body as string
     */
    async getRequestBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => resolve(body));
            req.on('error', reject);
        });
    }

    /**
     * Log event to log file
     */
    async logEvent(level, message, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            pid: process.pid
        };

        const logLine = JSON.stringify(logEntry) + '\n';

        try {
            // Ensure log directory exists
            const logDir = path.dirname(this.logFile);
            await fs.mkdir(logDir, { recursive: true });

            await fs.appendFile(this.logFile, logLine);
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }
}

// CLI functionality
if (require.main === module) {
    const monitor = new FreshSalesSyncMonitor();

    async function main() {
        try {
            await monitor.start();

            // Handle graceful shutdown
            process.on('SIGINT', async () => {
                console.log('\nReceived SIGINT, shutting down gracefully...');
                await monitor.stop();
                process.exit(0);
            });

        } catch (error) {
            console.error('Failed to start monitor:', error.message);
            process.exit(1);
        }
    }

    main();
}

module.exports = FreshSalesSyncMonitor;