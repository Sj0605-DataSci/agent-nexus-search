#!/bin/bash

# Test Protocol Handler Script
# This script helps test the tallie:// protocol handler

echo "🧪 Testing Tallie Protocol Handler"
echo "===================================="
echo ""

# Check if app is running
echo "1. Checking if Tallie is running..."
if pgrep -f "Electron.*Tallie" > /dev/null; then
    echo "   ✅ Tallie is running"
else
    echo "   ❌ Tallie is not running"
    echo "   Please start the app first: npm start"
    exit 1
fi

echo ""
echo "2. Testing protocol handler..."
echo "   Opening: tallie://oauth/callback#access_token=test123&refresh_token=test456"
echo ""

# Open the protocol URL
open "tallie://oauth/callback#access_token=test123&refresh_token=test456"

echo ""
echo "3. Check the Electron console for:"
echo "   [App] open-url event received: tallie://oauth/callback..."
echo "   [DeepLink] Processing OAuth callback"
echo "   [OAuthManager] No state parameter, using most recent pending flow"
echo ""
echo "✅ If you see those logs, the protocol handler is working!"
echo "❌ If a new Electron window opens, there's still an issue"
echo ""
echo "💡 Tip: For best results, use the production build:"
echo "   npm run package"
echo "   open release/build/mac/Tallie.app"
