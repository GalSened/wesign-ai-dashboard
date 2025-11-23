#!/bin/bash

# Start Frontend Dashboard

echo "🌐 Starting WeSign AI Dashboard Frontend..."

cd ~/source/repos/wesign-ai-dashboard/frontend || exit 1

# Check if Python HTTP server is available
if command -v python &> /dev/null; then
    echo "✅ Starting frontend on http://localhost:8080"
    echo ""
    echo "📝 Open http://localhost:8080 in your browser"
    echo "🔴 Press Ctrl+C to stop"
    echo ""
    python -m http.server 8080
else
    echo "❌ Python not found. Please install Python to run the frontend."
    exit 1
fi
