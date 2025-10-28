#!/bin/bash

# Start FileSystem MCP Server
# User-configurable directories for file access

echo "🗂️  Starting FileSystem MCP Server..."

# Load environment variables if .env exists
if [ -f "orchestrator/.env" ]; then
    export $(grep -v '^#' orchestrator/.env | xargs)
fi

# User-configurable directories (can be overridden in .env)
if [ -z "$FILESYSTEM_ALLOWED_DIRS" ]; then
    ALLOWED_DIRS=(
        "$HOME/Documents"
        "$HOME/Downloads"
        "/tmp/wesign-assistant"
    )
else
    IFS=',' read -ra ALLOWED_DIRS <<< "$FILESYSTEM_ALLOWED_DIRS"
fi

echo "📁 Allowed directories:"
for dir in "${ALLOWED_DIRS[@]}"; do
    echo "   - $dir"
    # Create directory if it doesn't exist
    mkdir -p "$dir" 2>/dev/null || true
done

# Start FileSystem MCP Server
echo "🚀 Starting server..."
npx -y @modelcontextprotocol/server-filesystem "${ALLOWED_DIRS[@]}"
