#!/bin/bash
set -e

echo "=== WeSign AI Dashboard - Starting ==="

# Start MCP Server in background
echo "Starting MCP Server on port 3000..."
cd /app/mcp-server
WESIGN_API_URL="${WESIGN_API_URL:-http://192.168.21.5:30080}" \
WESIGN_EMAIL="${WESIGN_EMAIL}" \
WESIGN_PASSWORD="${WESIGN_PASSWORD}" \
PORT=3000 \
node dist/server.js &
MCP_PID=$!

# Wait for MCP to be ready
echo "Waiting for MCP Server..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
        echo "MCP Server ready!"
        break
    fi
    sleep 1
done

# Start Orchestrator (serves frontend too)
echo "Starting Orchestrator on port ${PORT:-9000}..."
cd /app/orchestrator
export WESIGN_MCP_URL=http://localhost:3000
export PORT=${PORT:-9000}
exec python main.py
