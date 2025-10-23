#!/bin/bash

echo "🧹 Clearing Electron Tallie cache..."

# Stop any running processes
echo "Stopping any running processes..."
pkill -f "electron" || true
pkill -f "webpack" || true

# Clear webpack cache
echo "Clearing webpack cache..."
rm -rf .erb/dll
rm -rf dist
rm -rf release/app/dist
rm -rf release/build

# Clear node cache
echo "Clearing node cache..."
rm -rf node_modules/.cache

# Clear webpack dev server cache
echo "Clearing webpack-dev-server cache..."
rm -rf .webpack

echo "✅ Cache cleared!"
echo ""
echo "Now run: npm run build:dll && npm start"
