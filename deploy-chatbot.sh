#!/bin/bash

# Deployment script for the Concept Testing Chatbot
# Make executable with: chmod +x deploy-chatbot.sh

echo "🚀 Deploying Concept Testing Chatbot..."
echo "======================================"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory"
    echo "   Make sure you're in the root of your Supabase project"
    exit 1
fi

echo "✅ Supabase CLI found"
echo "✅ Project configuration found"

# Deploy the chatbot function
echo ""
echo "📦 Deploying chatbot function..."
supabase functions deploy chatbot

if [ $? -eq 0 ]; then
    echo "✅ Chatbot function deployed successfully!"
else
    echo "❌ Failed to deploy chatbot function"
    exit 1
fi

echo ""
echo "🔧 Next Steps:"
echo "=============="
echo "1. Set your ANTHROPIC_API_KEY in Supabase Dashboard:"
echo "   → Go to Project Settings → Edge Functions → Environment Variables"
echo "   → Add: ANTHROPIC_API_KEY = your_api_key_here"
echo ""
echo "2. Test the function:"
echo "   → Update test-chatbot.js with your project details"
echo "   → Run: node test-chatbot.js"
echo ""
echo "3. Integration:"
echo "   → Your chatbot is available at:"
echo "   → POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/chatbot"
echo ""
echo "📚 See README.md for complete documentation"
echo ""
echo "🎉 Deployment complete!"
