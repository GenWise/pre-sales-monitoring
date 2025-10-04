#!/bin/bash
set -e

echo "🚀 Deploying FreshSales Sync Service to DigitalOcean..."

DROPLET_IP="165.232.134.106"
DROPLET_USER="root"
REMOTE_PATH="/root/pre-sales-monitoring"
SSH_KEY="$HOME/.ssh/macmini_do_droplet"

echo "📦 Syncing files to droplet..."
rsync -avz -e "ssh -i ${SSH_KEY}" --exclude 'node_modules' --exclude '.git' --exclude 'test-screenshots' --exclude 'archive' \
  ./ ${DROPLET_USER}@${DROPLET_IP}:${REMOTE_PATH}/

echo "🔧 Installing dependencies and starting service..."
ssh -i ${SSH_KEY} ${DROPLET_USER}@${DROPLET_IP} << 'EOF'
cd /root/pre-sales-monitoring

# Install dependencies
npm install --production --legacy-peer-deps

# Stop existing service if running
pm2 stop freshsales-sync 2>/dev/null || true
pm2 delete freshsales-sync 2>/dev/null || true

# Start service
pm2 start freshsales-sync-service.js --name freshsales-sync --time -- start
pm2 save

# Show status
pm2 list
pm2 logs freshsales-sync --lines 20

echo "✅ Deployment complete!"
echo "📊 Monitor: pm2 monit"
echo "📋 Logs: pm2 logs freshsales-sync"
echo "🔄 Manual sync: cd /root/pre-sales-monitoring && node freshsales-sync-service.js sync"
EOF

echo "✅ FreshSales Sync Service deployed successfully!"
