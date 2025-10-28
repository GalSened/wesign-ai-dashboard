#!/bin/bash

# WeSign AI Assistant - Complete Startup Script
# Starts all services: Orchestrator with native MCP integration

set -e

echo "======================================"
echo "🚀 WeSign AI Assistant Startup"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ORCHESTRATOR_DIR="$PROJECT_ROOT/orchestrator"

echo -e "${BLUE}📁 Project root: $PROJECT_ROOT${NC}"
echo ""

# Check if .env exists
if [ ! -f "$ORCHESTRATOR_DIR/.env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    cp "$ORCHESTRATOR_DIR/.env.example" "$ORCHESTRATOR_DIR/.env"
    echo -e "${YELLOW}⚠️  Please edit orchestrator/.env and add your OpenAI API key${NC}"
    echo ""
fi

# Load environment variables
if [ -f "$ORCHESTRATOR_DIR/.env" ]; then
    export $(grep -v '^#' "$ORCHESTRATOR_DIR/.env" | xargs)
fi

# Check OpenAI API key
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your-openai-api-key-here" ]; then
    echo -e "${YELLOW}⚠️  OpenAI API key not configured!${NC}"
    echo "Please set OPENAI_API_KEY in orchestrator/.env"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ OpenAI API key configured${NC}"
echo ""

# Create required directories for FileSystem MCP
echo -e "${BLUE}📁 Creating FileSystem MCP directories...${NC}"
mkdir -p "$HOME/Documents" 2>/dev/null || true
mkdir -p "$HOME/Downloads" 2>/dev/null || true
mkdir -p "/tmp/wesign-assistant" 2>/dev/null || true
echo -e "${GREEN}✅ Directories ready${NC}"
echo ""

# Check if virtual environment exists
if [ ! -d "$ORCHESTRATOR_DIR/venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating...${NC}"
    cd "$ORCHESTRATOR_DIR"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    echo -e "${GREEN}✅ Virtual environment created${NC}"
else
    echo -e "${GREEN}✅ Virtual environment found${NC}"
fi
echo ""

# Start Orchestrator with native MCP
echo -e "${BLUE}🤖 Starting WeSign AI Orchestrator...${NC}"
echo "   - Native AutoGen MCP integration"
echo "   - FileSystem Agent (14 tools)"
echo "   - Port: ${PORT:-8000}"
echo ""

cd "$ORCHESTRATOR_DIR"
source venv/bin/activate

# Start orchestrator
echo -e "${GREEN}🚀 Starting orchestrator server...${NC}"
python main.py

echo ""
echo -e "${GREEN}✅ WeSign AI Assistant is running!${NC}"
echo ""
echo "======================================"
echo "📡 API Endpoints:"
echo "   - http://localhost:${PORT:-8000}/"
echo "   - http://localhost:${PORT:-8000}/health"
echo "   - http://localhost:${PORT:-8000}/api/tools"
echo "   - http://localhost:${PORT:-8000}/api/chat"
echo ""
echo "🌐 ChatKit UI:"
echo "   - http://localhost:${PORT:-8000}/chatkit-index.html"
echo ""
echo "Press Ctrl+C to stop all services"
echo "======================================"
