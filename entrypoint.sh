#!/bin/bash
set -e

# Start HTTP/API server in background and redirect logs to file
# This is CRITICAL because MCP server needs exclusive access to stdout/stdin
echo "Starting HTTP Server on port 3000 (logs -> /var/log/http-server.log)..."
npm run start:http --prefix /app/servers > /var/log/http-server.log 2>&1 &

# Wait a moment for HTTP server to init
sleep 2

# Start MCP Server in foreground (stdio mode)
# This will be the main process receiving stdin from docker run -i
echo "Starting MCP Server (stdio mode)..." >&2
exec npm run start:mcp --prefix /app/servers
