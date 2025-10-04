#!/usr/bin/env node

/**
 * Production Deployment Script for Pre-Sales Monitoring System
 * Automates the upload of proxy API and dashboard files to dashboard.giftedworld.org
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PRODUCTION_CONFIG = {
    server: {
        host: 'dashboard.giftedworld.org',
        username: 'u191176295', // Your hosting username
        baseDir: '/home/u191176295/domains/giftedworld.org/public_html/',
        dashboardDir: '/home/u191176295/domains/giftedworld.org/public_html/dashboard'
    },
    proxy: {
        port: 3002,
        processName: 'dashboard-api-proxy'
    }
};

// Files to deploy
const DEPLOYMENT_FILES = {
    proxyAPI: {
        'dashboard_api_proxy.js': '',
        'package.json': '',
        '.env.production': '.env',
        'service-account-key.json': '/Users/rajeshpanchanathan/Documents/genwise/projects/rzrpy/sheets-and-python-340711-e964234d8202.json'
    },
    dashboard: {
        'src/dashboard/js/api-proxy.js': 'dashboard/js/api-proxy.js'
    }
};

class ProductionDeployer {
    constructor() {
        this.deploymentDir = './deployment-package';
        this.backupDir = './deployment-backup';
        this.logFile = `deployment-${Date.now()}.log`;
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}`;
        console.log(logEntry);
        fs.appendFileSync(this.logFile, logEntry + '\n');
    }

    async prepareDeploymentPackage() {
        this.log('🚀 Starting Production Deployment Preparation');

        // Clean and create deployment directory
        if (fs.existsSync(this.deploymentDir)) {
            fs.rmSync(this.deploymentDir, { recursive: true });
        }
        fs.mkdirSync(this.deploymentDir, { recursive: true });

        // Create subdirectories
        fs.mkdirSync(`${this.deploymentDir}/proxy-api`, { recursive: true });
        fs.mkdirSync(`${this.deploymentDir}/dashboard/js`, { recursive: true });

        this.log('✅ Deployment directories created');
    }

    async prepareProxyAPIFiles() {
        this.log('📦 Preparing Proxy API files');

        // Copy dashboard_api_proxy.js
        const proxyContent = fs.readFileSync('dashboard_api_proxy.js', 'utf8');
        fs.writeFileSync(`${this.deploymentDir}/proxy-api/dashboard_api_proxy.js`, proxyContent);

        // Create production package.json (minimal dependencies)
        const packageJson = {
            "name": "dashboard-api-proxy",
            "version": "1.0.0",
            "description": "Production proxy API for pre-sales monitoring dashboard",
            "main": "dashboard_api_proxy.js",
            "scripts": {
                "start": "node dashboard_api_proxy.js",
                "restart": "pm2 restart dashboard-api-proxy",
                "stop": "pm2 stop dashboard-api-proxy",
                "logs": "pm2 logs dashboard-api-proxy"
            },
            "dependencies": {
                "express": "^4.18.2",
                "cors": "^2.8.5",
                "googleapis": "^126.0.1",
                "dotenv": "^16.6.1"
            }
        };
        fs.writeFileSync(`${this.deploymentDir}/proxy-api/package.json`, JSON.stringify(packageJson, null, 2));

        // Create production .env file
        const prodEnv = `# Production Environment Configuration
# Google Sheets Configuration
PRESALES_MASTER_SHEET_ID=1Ux8iEW8dabbEMUq1mEhrpY6a0WAUTCTR_8kvZ-hLHaQ
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json

# Dashboard API Configuration
DASHBOARD_API_PORT=3002
NODE_ENV=production

# CORS Origins (production domains)
CORS_ORIGINS=https://dashboard.giftedworld.org,http://dashboard.giftedworld.org
`;
        fs.writeFileSync(`${this.deploymentDir}/proxy-api/.env`, prodEnv);

        // Copy service account credentials
        const serviceAccountPath = '/Users/rajeshpanchanathan/Documents/genwise/projects/rzrpy/sheets-and-python-340711-e964234d8202.json';
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
            fs.writeFileSync(`${this.deploymentDir}/proxy-api/service-account-key.json`, serviceAccountContent);
            this.log('✅ Service account credentials copied');
        } else {
            throw new Error(`Service account file not found: ${serviceAccountPath}`);
        }

        // Create PM2 ecosystem file
        const pm2Config = {
            apps: [{
                name: 'dashboard-api-proxy',
                script: './dashboard_api_proxy.js',
                cwd: '/home/u191176295/domains/giftedworld.org/public_html/api-proxy',
                instances: 1,
                exec_mode: 'fork',
                watch: false,
                env: {
                    NODE_ENV: 'production',
                    PORT: 3002
                },
                error_file: './logs/api-proxy-error.log',
                out_file: './logs/api-proxy-out.log',
                log_file: './logs/api-proxy-combined.log',
                time: true,
                restart_delay: 4000,
                max_restarts: 10
            }]
        };
        fs.writeFileSync(`${this.deploymentDir}/proxy-api/ecosystem.config.js`,
            `module.exports = ${JSON.stringify(pm2Config, null, 2)};`);

        this.log('✅ Proxy API files prepared');
    }

    async prepareDashboardFiles() {
        this.log('📱 Preparing Dashboard files');

        // Copy updated api-proxy.js (with meaningful names)
        const apiProxyContent = fs.readFileSync('src/dashboard/js/api-proxy.js', 'utf8');
        fs.writeFileSync(`${this.deploymentDir}/dashboard/js/api-proxy.js`, apiProxyContent);

        this.log('✅ Dashboard files prepared');
    }

    async createDeploymentScripts() {
        this.log('📝 Creating deployment scripts');

        // Upload script
        const uploadScript = `#!/bin/bash
set -e

echo "🚀 Starting Production Deployment..."

# Configuration
SERVER="u191176295@dashboard.giftedworld.org"
REMOTE_BASE="/home/u191176295/domains/giftedworld.org/public_html"
REMOTE_API_DIR="$REMOTE_BASE/api-proxy"
REMOTE_DASHBOARD_DIR="$REMOTE_BASE/dashboard"

echo "📡 Creating remote directories..."
ssh $SERVER "mkdir -p $REMOTE_API_DIR/logs"
ssh $SERVER "mkdir -p $REMOTE_DASHBOARD_DIR/js"

echo "📦 Uploading Proxy API files..."
rsync -avz ./proxy-api/ $SERVER:$REMOTE_API_DIR/

echo "📱 Uploading Dashboard files..."
rsync -avz ./dashboard/ $SERVER:$REMOTE_DASHBOARD_DIR/

echo "📋 Installing dependencies..."
ssh $SERVER "cd $REMOTE_API_DIR && npm install --production"

echo "🔧 Setting up PM2 process manager..."
ssh $SERVER "cd $REMOTE_API_DIR && pm2 delete dashboard-api-proxy 2>/dev/null || true"
ssh $SERVER "cd $REMOTE_API_DIR && pm2 start ecosystem.config.js"
ssh $SERVER "pm2 save"

echo "🏥 Health check..."
sleep 5
ssh $SERVER "curl -f http://localhost:3002/health" || echo "⚠️  Health check failed - check logs"

echo "✅ Deployment completed!"
echo "🌐 Dashboard URL: https://dashboard.giftedworld.org"
echo "🔗 API Proxy: https://dashboard.giftedworld.org/api-proxy/health"
echo "📊 Logs: ssh $SERVER 'pm2 logs dashboard-api-proxy'"
`;

        fs.writeFileSync(`${this.deploymentDir}/deploy.sh`, uploadScript);
        execSync(`chmod +x ${this.deploymentDir}/deploy.sh`);

        // Manual verification script
        const verifyScript = `#!/bin/bash
echo "🔍 Production Verification Script"
echo "================================="

SERVER="u191176295@dashboard.giftedworld.org"

echo "1. 🏥 Testing API Proxy health..."
curl -s https://dashboard.giftedworld.org/api-proxy/health | jq '.' || echo "❌ Health check failed"

echo "2. 📊 Testing leads endpoint..."
curl -s https://dashboard.giftedworld.org/api-proxy/api/leads | jq '.success' || echo "❌ Leads endpoint failed"

echo "3. 📱 Testing dashboard access..."
curl -s -I https://dashboard.giftedworld.org | head -1 || echo "❌ Dashboard access failed"

echo "4. 🔧 Checking PM2 status..."
ssh $SERVER "pm2 status dashboard-api-proxy"

echo "5. 📋 Recent logs..."
ssh $SERVER "pm2 logs dashboard-api-proxy --lines 10"

echo "✅ Verification completed"
`;

        fs.writeFileSync(`${this.deploymentDir}/verify.sh`, verifyScript);
        execSync(`chmod +x ${this.deploymentDir}/verify.sh`);

        this.log('✅ Deployment scripts created');
    }

    async generateInstructions() {
        const instructions = `# Production Deployment Instructions

## 🚀 Automated Deployment

### Quick Deploy
\`\`\`bash
cd deployment-package
./deploy.sh
\`\`\`

### Verify Deployment
\`\`\`bash
./verify.sh
\`\`\`

## 📋 Manual Steps (if needed)

### 1. Upload Files
\`\`\`bash
# Proxy API
rsync -avz ./proxy-api/ u191176295@dashboard.giftedworld.org:/home/u191176295/domains/giftedworld.org/public_html/api-proxy/

# Dashboard
rsync -avz ./dashboard/ u191176295@dashboard.giftedworld.org:/home/u191176295/domains/giftedworld.org/public_html/dashboard/
\`\`\`

### 2. Install Dependencies
\`\`\`bash
ssh u191176295@dashboard.giftedworld.org
cd /home/u191176295/domains/giftedworld.org/public_html/api-proxy
npm install --production
\`\`\`

### 3. Start Proxy API with PM2
\`\`\`bash
pm2 start ecosystem.config.js
pm2 save
\`\`\`

### 4. Test Endpoints
- Health: https://dashboard.giftedworld.org/api-proxy/health
- Leads: https://dashboard.giftedworld.org/api-proxy/api/leads
- Dashboard: https://dashboard.giftedworld.org

## 🔧 Production URLs

- **Dashboard**: https://dashboard.giftedworld.org
- **API Proxy Health**: https://dashboard.giftedworld.org/api-proxy/health
- **API Leads**: https://dashboard.giftedworld.org/api-proxy/api/leads

## 📊 Monitoring

\`\`\`bash
# Check PM2 status
ssh u191176295@dashboard.giftedworld.org "pm2 status"

# View logs
ssh u191176295@dashboard.giftedworld.org "pm2 logs dashboard-api-proxy"

# Restart if needed
ssh u191176295@dashboard.giftedworld.org "pm2 restart dashboard-api-proxy"
\`\`\`

## 🎯 Components Deployed

### Proxy API Files
- dashboard_api_proxy.js (Express server with Google Sheets integration)
- package.json (production dependencies)
- .env (production configuration)
- service-account-key.json (Google Sheets authentication)
- ecosystem.config.js (PM2 configuration)

### Dashboard Files
- js/api-proxy.js (Updated with meaningful form names)

## ✅ Success Criteria

1. ✅ API Proxy responds to /health endpoint
2. ✅ API Proxy fetches data from Google Sheets
3. ✅ Dashboard loads without 403 errors
4. ✅ End-to-end form submission works
5. ✅ PM2 process manager running stably

## 🆘 Troubleshooting

### 403 Errors
- Check service account permissions
- Verify CORS origins in production .env
- Test API proxy health endpoint

### Dashboard Not Loading
- Check browser console for errors
- Verify API proxy is running (PM2 status)
- Test API endpoints directly

### Form Submissions Not Working
- Check webhook server is running (separate from dashboard)
- Verify Google Apps Scripts are deployed
- Test form field mapping
`;

        fs.writeFileSync(`${this.deploymentDir}/DEPLOYMENT_INSTRUCTIONS.md`, instructions);
        this.log('✅ Deployment instructions generated');
    }

    async createDeploymentSummary() {
        const summary = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: 'production',
            components: {
                proxyAPI: {
                    file: 'dashboard_api_proxy.js',
                    port: 3002,
                    processManager: 'PM2',
                    healthEndpoint: 'https://dashboard.giftedworld.org/api-proxy/health'
                },
                dashboard: {
                    files: ['js/api-proxy.js'],
                    url: 'https://dashboard.giftedworld.org',
                    features: 'meaningful_form_names'
                },
                authentication: {
                    method: 'service_account',
                    file: 'service-account-key.json',
                    permissions: 'sheets_readonly'
                }
            },
            deployment: {
                method: 'automated_script',
                verification: 'health_checks_included',
                rollback: 'pm2_restart_available'
            },
            testing: {
                endpoints: [
                    'https://dashboard.giftedworld.org/api-proxy/health',
                    'https://dashboard.giftedworld.org/api-proxy/api/leads',
                    'https://dashboard.giftedworld.org'
                ],
                verification_script: 'verify.sh'
            }
        };

        fs.writeFileSync(`${this.deploymentDir}/deployment-summary.json`, JSON.stringify(summary, null, 2));
        this.log('✅ Deployment summary created');
    }

    async execute() {
        try {
            await this.prepareDeploymentPackage();
            await this.prepareProxyAPIFiles();
            await this.prepareDashboardFiles();
            await this.createDeploymentScripts();
            await this.generateInstructions();
            await this.createDeploymentSummary();

            this.log('🎉 Production deployment package ready!');
            this.log('📁 Package location: ./deployment-package/');
            this.log('📋 Instructions: ./deployment-package/DEPLOYMENT_INSTRUCTIONS.md');
            this.log('🚀 Quick deploy: cd deployment-package && ./deploy.sh');
            this.log('🔍 Verify: ./verify.sh');

            console.log('\n🎯 Next Steps:');
            console.log('1. cd deployment-package');
            console.log('2. ./deploy.sh  # Automated deployment');
            console.log('3. ./verify.sh  # Verify everything works');
            console.log('4. Test: https://dashboard.giftedworld.org');

            return true;

        } catch (error) {
            this.log(`❌ Deployment preparation failed: ${error.message}`);
            console.error('Error:', error);
            return false;
        }
    }
}

// Execute deployment preparation
if (require.main === module) {
    const deployer = new ProductionDeployer();
    deployer.execute().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = ProductionDeployer;