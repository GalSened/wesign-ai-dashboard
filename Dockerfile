# Stage 1: Build MCP Server (Node.js)
FROM node:20-alpine AS mcp-build
WORKDIR /mcp
COPY wesignv3-wesign-mcp-server/package*.json ./
RUN npm ci
COPY wesignv3-wesign-mcp-server/ .
RUN npm run build

# Stage 2: Runtime (Python + Node.js)
FROM python:3.13-slim

# Install Node.js runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy MCP server build
COPY --from=mcp-build /mcp/dist /app/mcp-server/dist
COPY --from=mcp-build /mcp/node_modules /app/mcp-server/node_modules
COPY --from=mcp-build /mcp/package.json /app/mcp-server/

# Install Python dependencies
COPY orchestrator/requirements.txt /app/orchestrator/
RUN pip install --no-cache-dir -r /app/orchestrator/requirements.txt slowapi

# Copy orchestrator and frontend
COPY orchestrator/ /app/orchestrator/
COPY frontend/ /app/frontend/

# Startup script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
