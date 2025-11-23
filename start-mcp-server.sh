#!/bin/bash

# Start WeSign MCP Server

echo "🚀 Starting WeSign MCP Server..."

cd ~/Desktop/wesign-mcp-server || exit 1

# Check if built
if [ ! -d "dist" ]; then
    echo "⚠️  Dist directory not found. Building..."
    npm run build
fi

# Start the server in HTTP mode (for orchestrator)
echo "✅ Starting MCP server on http://localhost:3000"
npm run start:server
