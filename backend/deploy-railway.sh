#!/bin/bash

# Quick deploy script for Railway

echo "🚀 Deploying CodonCareAI Backend to Railway"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "📝 Logging in to Railway..."
railway login

# Initialize project
echo "🔧 Initializing Railway project..."
railway init

# Deploy
echo "📦 Deploying..."
railway up

# Get domain
echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Getting your backend URL..."
railway domain

echo ""
echo "📋 Next steps:"
echo "1. Copy the URL above"
echo "2. Go to Vercel dashboard"
echo "3. Add environment variable: VITE_BACKEND_URL=<your-railway-url>"
echo "4. Redeploy frontend"
