#!/bin/bash

echo "🔧 Fixing Electron Tallie build issues..."
echo ""

# Kill all related processes
echo "1️⃣  Killing all Electron and Webpack processes..."
pkill -9 -f "electron" 2>/dev/null || true
pkill -9 -f "webpack" 2>/dev/null || true
pkill -9 -f "electronmon" 2>/dev/null || true
sleep 2

# Remove all build artifacts
echo "2️⃣  Removing all build artifacts..."
rm -rf .erb/dll
rm -rf dist
rm -rf release/app/dist
rm -rf release/build
rm -rf node_modules/.cache
rm -rf .webpack

# Clean webpack cache
echo "3️⃣  Cleaning webpack cache..."
rm -rf node_modules/.cache/webpack

# Rebuild DLL
echo "4️⃣  Rebuilding DLL (this may take a minute)..."
npm run build:dll

echo ""
echo "✅ Fix complete!"
echo ""
echo "🚀 Now starting the app..."
echo ""

# Start the app
npm start
