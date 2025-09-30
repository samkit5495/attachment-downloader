#!/bin/bash

# Gmail Attachment Downloader Startup Script

echo "🚀 Starting Gmail Attachment Downloader..."
echo ""

# Check if credentials.json exists
if [ ! -f "credentials.json" ]; then
    echo "❌ Error: credentials.json not found!"
    echo "Please follow the setup instructions in README.md to get your credentials.json file."
    echo "Visit: https://developers.google.com/gmail/api/quickstart/nodejs"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

echo "✅ All checks passed!"
echo ""
echo "Choose your preferred interface:"
echo "1. Desktop Application (Recommended)"
echo "2. Command Line Interface"
echo ""
read -p "Enter your choice (1-2): " choice

case $choice in
    1)
        echo "🖥  Starting Desktop Application..."
        npm run electron
        ;;
    2)
        echo "💻 Starting Command Line Interface..."
        node index.js
        ;;
    *)
        echo "❌ Invalid choice. Starting Desktop Application by default..."
        npm run electron
        ;;
esac