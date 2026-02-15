#!/bin/bash
echo "🏠 Starting SichrPlace Application..."
echo ""
cd "$(dirname "$0")/backend"
echo "📂 Starting from: $(pwd)"
echo ""
node server.js
