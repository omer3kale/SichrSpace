#!/bin/bash
# SichrPlace Server Startup Script for Supabase
cd "$(dirname "$0")"
echo "Starting SichrPlace server with Supabase integration..."
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "Server file exists: $(ls -la server.js)"
echo ""
echo "🚀 Starting server..."
node server.js
