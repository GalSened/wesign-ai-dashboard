#!/bin/bash

# Stop All WeSign AI Assistant Services

echo "🛑 Stopping WeSign AI Assistant Services..."
echo ""

# Function to stop service
stop_service() {
    local name=$1
    local pid_file="logs/${name}.pid"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "⏹️  Stopping $name (PID: $pid)..."
            kill $pid 2>/dev/null
            sleep 1
            # Force kill if still running
            if ps -p $pid > /dev/null 2>&1; then
                echo "   Force stopping..."
                kill -9 $pid 2>/dev/null
            fi
        else
            echo "ℹ️  $name not running"
        fi
        rm -f "$pid_file"
    else
        echo "ℹ️  No PID file for $name"
    fi
}

# Stop services in reverse order
stop_service "frontend"
stop_service "orchestrator"
stop_service "mcp-server"

# Also kill any remaining processes on these ports
echo ""
echo "🧹 Cleaning up ports..."
lsof -ti:8080 | xargs kill -9 2>/dev/null && echo "   Freed port 8080" || true
lsof -ti:8000 | xargs kill -9 2>/dev/null && echo "   Freed port 8000" || true
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "   Freed port 3000" || true

echo ""
echo "✅ All services stopped"
