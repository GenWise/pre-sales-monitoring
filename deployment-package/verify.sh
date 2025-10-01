#!/bin/bash
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
