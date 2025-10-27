#!/bin/bash

# Start WeSign MCP Server

echo "🚀 Starting WeSign MCP Server..."

cd ~/wesign-mcp-server || exit 1

# Check if built
if [ ! -d "build" ]; then
    echo "⚠️  Build directory not found. Building..."
    npm run build
fi

# Start the server
echo "✅ Starting MCP server on http://localhost:3000"
npm start
