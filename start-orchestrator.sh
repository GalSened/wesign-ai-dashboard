#!/bin/bash

# Start Python AutoGen Orchestrator

echo "Starting AutoGen Orchestrator..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/orchestrator" || exit 1

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ".env file not found! Copy .env.example to .env and configure it."
    exit 1
fi

# Start the orchestrator
echo "Starting orchestrator on http://localhost:8000"
python main.py
