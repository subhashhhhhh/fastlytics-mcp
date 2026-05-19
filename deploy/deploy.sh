#!/usr/bin/env bash
set -euo pipefail

# Deploy Fastlytics MCP server to the production VPS.
# Assumes SSH key access and /opt/fastlytics-mcp/ exists on the remote.
#
# Usage: ./deploy/deploy.sh [user@host]

REMOTE="${1:-root@fastlytics}"

echo "=== Building ==="
npm run build

echo "=== Syncing dist/ to $REMOTE:/opt/fastlytics-mcp/dist/ ==="
rsync -avz --delete dist/ "$REMOTE:/opt/fastlytics-mcp/dist/"
rsync -avz package.json package-lock.json "$REMOTE:/opt/fastlytics-mcp/"

echo "=== Installing deps on remote ==="
ssh "$REMOTE" 'cd /opt/fastlytics-mcp && npm ci --omit=dev'

echo "=== Reloading systemd ==="
ssh "$REMOTE" 'systemctl daemon-reload && systemctl restart fastlytics-mcp'

echo "=== Done ==="
echo "Server running at https://mcp.fastlytics.app/mcp"
echo "Check logs: ssh $REMOTE journalctl -u fastlytics-mcp -f"
