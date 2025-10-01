#!/bin/bash
set -e

echo "🚀 Starting Production Deployment..."

# Configuration
SSH_HOST="145.79.209.65"
SSH_PORT="65002"
SSH_USER="u191176295"
SSH_PASSWORD="ssh_H0stinger_giftedworld"
SERVER="$SSH_USER@$SSH_HOST"
REMOTE_BASE="/home/u191176295/domains/giftedworld.org/public_html"
REMOTE_API_DIR="$REMOTE_BASE/api-proxy"
REMOTE_DASHBOARD_DIR="$REMOTE_BASE/dashboard"

# SSH options
SSH_OPTS="-p $SSH_PORT -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

echo "🔌 Testing SSH connection..."
sshpass -p "$SSH_PASSWORD" ssh $SSH_OPTS $SERVER "echo 'SSH connection successful'"

echo "📡 Creating remote directories..."
sshpass -p "$SSH_PASSWORD" ssh $SSH_OPTS $SERVER "mkdir -p $REMOTE_API_DIR/logs"
sshpass -p "$SSH_PASSWORD" ssh $SSH_OPTS $SERVER "mkdir -p $REMOTE_DASHBOARD_DIR/js"

echo "📦 Uploading Proxy API files..."
sshpass -p "$SSH_PASSWORD" rsync -avz -e "ssh $SSH_OPTS" ./proxy-api/ $SERVER:$REMOTE_API_DIR/

echo "📱 Uploading Dashboard files..."
sshpass -p "$SSH_PASSWORD" rsync -avz -e "ssh $SSH_OPTS" ./dashboard/ $SERVER:$REMOTE_DASHBOARD_DIR/

echo "📋 Installing dependencies..."
sshpass -p "$SSH_PASSWORD" ssh $SSH_OPTS $SERVER "cd $REMOTE_API_DIR && npm install --production"

echo "🔧 Starting Node.js application..."
sshpass -p "$SSH_PASSWORD" ssh $SSH_OPTS $SERVER "cd $REMOTE_API_DIR && nohup node dashboard_api_proxy.js > logs/api-proxy.log 2>&1 &"

echo "🏥 Health check..."
sleep 10
curl -f https://dashboard.giftedworld.org/api-proxy/health || echo "⚠️  Health check failed - checking logs..."

echo "✅ Deployment completed!"
echo "🌐 Dashboard URL: https://dashboard.giftedworld.org"
echo "🔗 API Proxy: https://dashboard.giftedworld.org/api-proxy/health"
echo "📊 Check logs: sshpass -p '$SSH_PASSWORD' ssh $SSH_OPTS $SERVER 'cat $REMOTE_API_DIR/logs/api-proxy.log'"
