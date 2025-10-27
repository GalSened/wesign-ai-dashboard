#!/bin/bash

# Start Python AutoGen Orchestrator

echo "🤖 Starting AutoGen Orchestrator..."

cd ~/wesign-ai-dashboard/orchestrator || exit 1

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Please copy .env.example to .env and configure it:"
    echo "  cp .env.example .env"
    echo ""
    echo "Required environment variables:"
    echo "  - OPENAI_API_KEY: Your OpenAI API key"
    echo "  - WESIGN_MCP_URL: WeSign MCP server URL (default: http://localhost:3000)"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt > /dev/null 2>&1

# Start the orchestrator
echo "✅ Starting orchestrator on http://localhost:8000"
python main.py
