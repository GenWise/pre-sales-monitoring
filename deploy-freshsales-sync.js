#!/usr/bin/env node

/**
 * FreshSales Sync Deployment Script
 *
 * Automated deployment script for production FreshSales bidirectional sync system.
 * Handles service installation, configuration, and startup.
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class FreshSalesSyncDeployment {
    constructor() {
        this.config = {
            serviceName: 'freshsales-sync',
            serviceUser: process.env.USER || 'node',
            workingDirectory: __dirname,
            logDirectory: path.join(__dirname, 'logs'),
            pidFile: path.join(__dirname, 'freshsales-sync.pid'),
            environment: process.env.NODE_ENV || 'production'
        };

        console.log('🚀 FreshSales Sync Deployment Tool');
        console.log(`Environment: ${this.config.environment}`);
        console.log(`Working Directory: ${this.config.workingDirectory}`);
    }

    /**
     * Main deployment function
     */
    async deploy() {
        try {
            console.log('\n📦 Starting FreshSales Sync Deployment...\n');

            // Step 1: Verify prerequisites
            await this.checkPrerequisites();

            // Step 2: Install dependencies
            await this.installDependencies();

            // Step 3: Create necessary directories
            await this.createDirectories();

            // Step 4: Create systemd service (Linux) or launch agent (macOS)
            await this.createService();

            // Step 5: Create monitoring scripts
            await this.createMonitoringScripts();

            // Step 6: Create backup and restore scripts
            await this.createBackupScripts();

            // Step 7: Start services
            await this.startServices();

            console.log('\n✅ FreshSales Sync Deployment Complete!\n');
            this.printPostDeploymentInfo();

        } catch (error) {
            console.error('\n❌ Deployment failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Check system prerequisites
     */
    async checkPrerequisites() {
        console.log('🔍 Checking prerequisites...');

        // Check Node.js version
        try {
            const { stdout } = await execAsync('node --version');
            const version = stdout.trim();
            console.log(`  ✅ Node.js: ${version}`);

            const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
            if (majorVersion < 16) {
                throw new Error('Node.js 16 or higher is required');
            }
        } catch (error) {
            throw new Error('Node.js is not installed or not accessible');
        }

        // Check npm
        try {
            const { stdout } = await execAsync('npm --version');
            console.log(`  ✅ npm: ${stdout.trim()}`);
        } catch (error) {
            throw new Error('npm is not installed or not accessible');
        }

        // Check service account file
        const serviceAccountFile = path.join(__dirname, 'credentials', 'service-account-key.json');
        try {
            await fs.access(serviceAccountFile);
            console.log('  ✅ Service account credentials found');
        } catch (error) {
            throw new Error('Service account credentials not found at credentials/service-account-key.json');
        }

        // Check package.json
        try {
            await fs.access(path.join(__dirname, 'package.json'));
            console.log('  ✅ package.json found');
        } catch (error) {
            throw new Error('package.json not found');
        }

        console.log('✅ Prerequisites check passed\n');
    }

    /**
     * Install Node.js dependencies
     */
    async installDependencies() {
        console.log('📦 Installing dependencies...');

        // Check if node_modules exists
        try {
            await fs.access(path.join(__dirname, 'node_modules'));
            console.log('  ✅ node_modules found, checking package-lock.json');
        } catch (error) {
            console.log('  📦 node_modules not found, installing...');
        }

        // Add required dependencies if not present
        const requiredDeps = {
            'node-cron': '^3.0.3',
            'google-spreadsheet': '^4.1.2'
        };

        const packageJsonPath = path.join(__dirname, 'package.json');
        let packageJson;
        try {
            const content = await fs.readFile(packageJsonPath, 'utf8');
            packageJson = JSON.parse(content);
        } catch (error) {
            // Create basic package.json if it doesn't exist
            packageJson = {
                name: 'freshsales-sync-service',
                version: '1.0.0',
                description: 'Bidirectional sync between Google Sheets and FreshSales CRM',
                main: 'freshsales-sync-service.js',
                scripts: {
                    start: 'node freshsales-sync-service.js start',
                    stop: 'node freshsales-sync-service.js stop',
                    status: 'node freshsales-sync-service.js status',
                    monitor: 'node freshsales-sync-monitor.js'
                },
                dependencies: {},
                engines: {
                    node: '>=16.0.0'
                }
            };
        }

        // Add missing dependencies
        let hasNewDeps = false;
        for (const [dep, version] of Object.entries(requiredDeps)) {
            if (!packageJson.dependencies[dep]) {
                packageJson.dependencies[dep] = version;
                hasNewDeps = true;
            }
        }

        if (hasNewDeps) {
            await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log('  📝 Updated package.json with required dependencies');
        }

        // Install dependencies
        try {
            await execAsync('npm install --production', { cwd: __dirname });
            console.log('  ✅ Dependencies installed');
        } catch (error) {
            console.warn('  ⚠️  npm install failed, continuing with existing dependencies');
        }

        console.log('✅ Dependencies ready\n');
    }

    /**
     * Create necessary directories
     */
    async createDirectories() {
        console.log('📁 Creating directories...');

        const directories = [
            this.config.logDirectory,
            path.join(__dirname, 'backup'),
            path.join(__dirname, 'scripts')
        ];

        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
                console.log(`  ✅ Created: ${dir}`);
            } catch (error) {
                console.log(`  ✅ Exists: ${dir}`);
            }
        }

        console.log('✅ Directories ready\n');
    }

    /**
     * Create system service
     */
    async createService() {
        console.log('⚙️  Creating system service...');

        const platform = process.platform;

        if (platform === 'linux') {
            await this.createSystemdService();
        } else if (platform === 'darwin') {
            await this.createLaunchAgent();
        } else {
            console.log('  ⚠️  Automatic service creation not supported on this platform');
            await this.createManualStartScripts();
        }

        console.log('✅ System service configured\n');
    }

    /**
     * Create systemd service (Linux)
     */
    async createSystemdService() {
        const serviceContent = `[Unit]
Description=FreshSales Bidirectional Sync Service
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=1
User=${this.config.serviceUser}
WorkingDirectory=${this.config.workingDirectory}
ExecStart=/usr/bin/node ${path.join(this.config.workingDirectory, 'freshsales-sync-service.js')} start
Environment=NODE_ENV=${this.config.environment}
StandardOutput=append:${path.join(this.config.logDirectory, 'service.log')}
StandardError=append:${path.join(this.config.logDirectory, 'service-error.log')}
SyslogIdentifier=freshsales-sync

[Install]
WantedBy=multi-user.target
`;

        const servicePath = `/etc/systemd/system/${this.config.serviceName}.service`;

        try {
            // Try to write service file (requires sudo)
            await fs.writeFile(servicePath, serviceContent);
            console.log(`  ✅ Created systemd service: ${servicePath}`);

            // Reload systemd and enable service
            await execAsync('sudo systemctl daemon-reload');
            await execAsync(`sudo systemctl enable ${this.config.serviceName}`);
            console.log('  ✅ Service enabled');

        } catch (error) {
            console.log('  ⚠️  Could not create systemd service (requires sudo)');
            console.log('  📝 Manual service file created at:', path.join(__dirname, 'scripts', 'freshsales-sync.service'));

            // Create service file in scripts directory for manual installation
            await fs.writeFile(
                path.join(__dirname, 'scripts', 'freshsales-sync.service'),
                serviceContent
            );

            await this.createManualStartScripts();
        }
    }

    /**
     * Create launch agent (macOS)
     */
    async createLaunchAgent() {
        const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.genwise.freshsales-sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>${path.join(this.config.workingDirectory, 'freshsales-sync-service.js')}</string>
        <string>start</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${this.config.workingDirectory}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>${this.config.environment}</string>
    </dict>
    <key>StandardOutPath</key>
    <string>${path.join(this.config.logDirectory, 'service.log')}</string>
    <key>StandardErrorPath</key>
    <string>${path.join(this.config.logDirectory, 'service-error.log')}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
`;

        const plistPath = path.join(process.env.HOME, 'Library', 'LaunchAgents', 'com.genwise.freshsales-sync.plist');

        try {
            await fs.writeFile(plistPath, plistContent);
            console.log(`  ✅ Created launch agent: ${plistPath}`);

            // Load the launch agent
            await execAsync(`launchctl load ${plistPath}`);
            console.log('  ✅ Launch agent loaded');

        } catch (error) {
            console.log('  ⚠️  Could not create launch agent');
            await this.createManualStartScripts();
        }
    }

    /**
     * Create manual start scripts
     */
    async createManualStartScripts() {
        console.log('  📝 Creating manual start scripts...');

        // Start script
        const startScript = `#!/bin/bash
cd "${this.config.workingDirectory}"
export NODE_ENV=${this.config.environment}
nohup node freshsales-sync-service.js start > logs/service.log 2>&1 &
echo $! > ${this.config.pidFile}
echo "FreshSales Sync Service started (PID: $(cat ${this.config.pidFile}))"
`;

        // Stop script
        const stopScript = `#!/bin/bash
if [ -f "${this.config.pidFile}" ]; then
    PID=$(cat ${this.config.pidFile})
    kill $PID
    rm ${this.config.pidFile}
    echo "FreshSales Sync Service stopped (PID: $PID)"
else
    echo "PID file not found. Service may not be running."
fi
`;

        // Status script
        const statusScript = `#!/bin/bash
if [ -f "${this.config.pidFile}" ]; then
    PID=$(cat ${this.config.pidFile})
    if ps -p $PID > /dev/null; then
        echo "FreshSales Sync Service is running (PID: $PID)"
        node freshsales-sync-service.js status
    else
        echo "PID file exists but process is not running"
        rm ${this.config.pidFile}
    fi
else
    echo "FreshSales Sync Service is not running"
fi
`;

        const scriptsDir = path.join(__dirname, 'scripts');
        await fs.writeFile(path.join(scriptsDir, 'start.sh'), startScript);
        await fs.writeFile(path.join(scriptsDir, 'stop.sh'), stopScript);
        await fs.writeFile(path.join(scriptsDir, 'status.sh'), statusScript);

        // Make scripts executable
        try {
            await execAsync(`chmod +x ${scriptsDir}/*.sh`);
            console.log('  ✅ Manual control scripts created');
        } catch (error) {
            console.log('  ⚠️  Could not make scripts executable');
        }
    }

    /**
     * Create monitoring scripts
     */
    async createMonitoringScripts() {
        console.log('📊 Creating monitoring scripts...');

        // Health check script
        const healthCheckScript = `#!/bin/bash
# FreshSales Sync Health Check
echo "=== FreshSales Sync Health Check ==="
echo "Timestamp: $(date)"
echo ""

# Check if service is running
if [ -f "${this.config.pidFile}" ]; then
    PID=$(cat ${this.config.pidFile})
    if ps -p $PID > /dev/null; then
        echo "✅ Service is running (PID: $PID)"
    else
        echo "❌ Service is not running (stale PID file)"
        exit 1
    fi
else
    echo "❌ Service is not running (no PID file)"
    exit 1
fi

# Check log file
if [ -f "${path.join(this.config.logDirectory, 'freshsales-sync.log')}" ]; then
    echo "✅ Log file exists"
    echo "Last 3 entries:"
    tail -3 "${path.join(this.config.logDirectory, 'freshsales-sync.log')}"
else
    echo "⚠️  Log file not found"
fi

echo ""
echo "=== End Health Check ==="
`;

        await fs.writeFile(path.join(__dirname, 'scripts', 'health-check.sh'), healthCheckScript);

        // Log rotation script
        const logRotateScript = `#!/bin/bash
# FreshSales Sync Log Rotation
LOG_DIR="${this.config.logDirectory}"
BACKUP_DIR="${path.join(__dirname, 'backup')}"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Rotating FreshSales Sync logs..."

for LOG_FILE in "$LOG_DIR"/*.log; do
    if [ -f "$LOG_FILE" ]; then
        BASENAME=$(basename "$LOG_FILE" .log)
        mv "$LOG_FILE" "$BACKUP_DIR/$\{BASENAME}_$DATE.log"
        touch "$LOG_FILE"
        echo "Rotated: $LOG_FILE"
    fi
done

# Compress old logs
find "$BACKUP_DIR" -name "*.log" -mtime +7 -exec gzip {} \\;

# Remove very old logs
find "$BACKUP_DIR" -name "*.log.gz" -mtime +30 -delete

echo "Log rotation complete"
`;

        await fs.writeFile(path.join(__dirname, 'scripts', 'rotate-logs.sh'), logRotateScript);

        try {
            await execAsync(`chmod +x ${path.join(__dirname, 'scripts')}/*.sh`);
            console.log('  ✅ Monitoring scripts created');
        } catch (error) {
            console.log('  ⚠️  Could not make monitoring scripts executable');
        }

        console.log('✅ Monitoring configured\n');
    }

    /**
     * Create backup scripts
     */
    async createBackupScripts() {
        console.log('💾 Creating backup scripts...');

        // Backup script
        const backupScript = `#!/bin/bash
# FreshSales Sync Backup
BACKUP_DIR="${path.join(__dirname, 'backup')}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/freshsales-sync-backup_$DATE.tar.gz"

echo "Creating backup: $BACKUP_FILE"

tar -czf "$BACKUP_FILE" \\
    --exclude=node_modules \\
    --exclude=backup \\
    --exclude=logs \\
    .

echo "Backup created: $BACKUP_FILE"

# Keep only last 10 backups
ls -t "$BACKUP_DIR"/freshsales-sync-backup_*.tar.gz | tail -n +11 | xargs -r rm

echo "Backup complete"
`;

        await fs.writeFile(path.join(__dirname, 'scripts', 'backup.sh'), backupScript);

        try {
            await execAsync(`chmod +x ${path.join(__dirname, 'scripts', 'backup.sh')}`);
            console.log('  ✅ Backup scripts created');
        } catch (error) {
            console.log('  ⚠️  Could not make backup script executable');
        }

        console.log('✅ Backup configured\n');
    }

    /**
     * Start services
     */
    async startServices() {
        console.log('🚀 Starting services...');

        try {
            // Start monitoring server first
            console.log('  🖥️  Starting monitoring server...');
            const monitorProcess = spawn('node', ['freshsales-sync-monitor.js'], {
                cwd: __dirname,
                detached: true,
                stdio: 'ignore'
            });
            monitorProcess.unref();

            // Wait a moment for monitor to start
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Start sync service
            console.log('  🔄 Starting sync service...');
            const syncProcess = spawn('node', ['freshsales-sync-service.js', 'start'], {
                cwd: __dirname,
                detached: true,
                stdio: 'ignore'
            });
            syncProcess.unref();

            console.log('  ✅ Services started');

        } catch (error) {
            console.log('  ⚠️  Could not start services automatically');
            console.log('  📝 Use manual scripts in the scripts/ directory');
        }

        console.log('✅ Services ready\n');
    }

    /**
     * Print post-deployment information
     */
    printPostDeploymentInfo() {
        console.log('📋 Post-Deployment Information:');
        console.log('');
        console.log('🔗 Monitoring Dashboard:');
        console.log('  http://localhost:3003/dashboard');
        console.log('');
        console.log('🔧 Manual Control:');
        console.log(`  Start:  ./scripts/start.sh`);
        console.log(`  Stop:   ./scripts/stop.sh`);
        console.log(`  Status: ./scripts/status.sh`);
        console.log('');
        console.log('📊 Monitoring:');
        console.log(`  Health: ./scripts/health-check.sh`);
        console.log(`  Logs:   tail -f ${path.join(this.config.logDirectory, 'freshsales-sync.log')}`);
        console.log('');
        console.log('💾 Maintenance:');
        console.log(`  Backup: ./scripts/backup.sh`);
        console.log(`  Rotate: ./scripts/rotate-logs.sh`);
        console.log('');
        console.log('🔄 Sync Operations:');
        console.log('  node freshsales-sync-service.js sync bidirectional');
        console.log('  node freshsales-sync-service.js sync to_freshsales');
        console.log('  node freshsales-sync-service.js sync from_freshsales');
        console.log('');
        console.log('📁 Important Directories:');
        console.log(`  Logs:    ${this.config.logDirectory}`);
        console.log(`  Backup:  ${path.join(__dirname, 'backup')}`);
        console.log(`  Scripts: ${path.join(__dirname, 'scripts')}`);
        console.log('');
        console.log('⚠️  Important Notes:');
        console.log('  • Monitor the logs for any sync errors');
        console.log('  • Run health checks regularly');
        console.log('  • Set up log rotation as a cron job');
        console.log('  • Test sync operations in development first');
        console.log('');
        console.log('✅ FreshSales Sync is now ready for production use!');
    }
}

// CLI functionality
if (require.main === module) {
    const deployment = new FreshSalesSyncDeployment();

    const command = process.argv[2];

    async function main() {
        try {
            switch (command) {
                case 'install':
                case 'deploy':
                default:
                    await deployment.deploy();
                    break;
            }
        } catch (error) {
            console.error('Deployment failed:', error.message);
            process.exit(1);
        }
    }

    main();
}

module.exports = FreshSalesSyncDeployment;