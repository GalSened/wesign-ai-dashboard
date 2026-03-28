#!/bin/bash

# Start WeSign MCP Server

echo "Starting WeSign MCP Server..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MCP_DIR="$HOME/repos/wesignv3-wesign-mcp-server"

cd "$MCP_DIR" || { echo "MCP server not found at $MCP_DIR"; exit 1; }

# Install and build if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

if [ ! -d "dist" ]; then
    echo "Building TypeScript..."
    npm run build
fi

echo "Starting MCP server on http://localhost:3000"
npm run start:server
