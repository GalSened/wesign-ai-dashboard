#!/bin/bash

# Start All WeSign AI Assistant Services

echo "🚀 WeSign AI Assistant - Starting All Services"
echo "=============================================="
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if MCP server is built
if [ ! -d ~/wesign-mcp-server/build ]; then
    echo "⚠️  WeSign MCP Server not built. Building..."
    cd ~/wesign-mcp-server && npm install && npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Failed to build MCP server"
        exit 1
    fi
fi

# Check if orchestrator .env exists
if [ ! -f ~/wesign-ai-dashboard/orchestrator/.env ]; then
    echo "❌ Orchestrator .env file not found!"
    echo ""
    echo "Please create orchestrator/.env from orchestrator/.env.example"
    echo "and configure your OPENAI_API_KEY"
    exit 1
fi

echo "✅ Prerequisites checked"
echo ""

# Function to run service in background
run_service() {
    local name=$1
    local script=$2
    local log_file="logs/${name}.log"

    mkdir -p logs
    echo "▶️  Starting $name..."
    bash "$script" > "$log_file" 2>&1 &
    local pid=$!
    echo "   PID: $pid"
    echo "$pid" > "logs/${name}.pid"
}

# Create logs directory
mkdir -p ~/wesign-ai-dashboard/logs

# Start services
echo "🎬 Starting services..."
echo ""

# 1. Start MCP Server
echo "1️⃣  WeSign MCP Server (http://localhost:3000)"
run_service "mcp-server" "./start-mcp-server.sh"
sleep 3

# 2. Start Orchestrator
echo "2️⃣  AutoGen Orchestrator (http://localhost:8000)"
run_service "orchestrator" "./start-orchestrator.sh"
sleep 3

# 3. Start Frontend
echo "3️⃣  Frontend Dashboard (http://localhost:8080)"
run_service "frontend" "./start-frontend.sh"
sleep 2

echo ""
echo "=============================================="
echo "✅ All services started!"
echo ""
echo "📝 Access the dashboard at: http://localhost:8080"
echo "📊 View logs in: ~/wesign-ai-dashboard/logs/"
echo ""
echo "To stop all services, run: ./stop-all.sh"
echo ""
echo "Service URLs:"
echo "  Frontend:      http://localhost:8080"
echo "  Orchestrator:  http://localhost:8000"
echo "  MCP Server:    http://localhost:3000"
echo ""
echo "Logs:"
echo "  tail -f logs/frontend.log"
echo "  tail -f logs/orchestrator.log"
echo "  tail -f logs/mcp-server.log"
echo ""
