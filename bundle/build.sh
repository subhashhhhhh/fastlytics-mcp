#!/usr/bin/env bash
# Build fastlytics-<version>.mcpb — the Claude Desktop extension bundle.
#
# Claude Desktop runs local MCP servers from a .mcpb (a zip) containing a
# manifest.json plus the server and its bundled node_modules. Users install it
# by double-clicking, so it must be fully self-contained: no npm install, no
# Node.js on the user's machine (Claude Desktop ships its own runtime), and no
# network fetch at install time.
#
# The manifest deliberately does NOT set FASTLYTICS_API_URL. The server falls
# back to the workers.dev endpoint, which is the only host that currently
# resolves. Setting an override here was the original bug: a stale host in a
# client config silently produced "Network error: fetch failed" on every call.
#
# Usage: ./bundle/build.sh   (run from mcp-server/)

set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="$(node -p "require('./package.json').version")"
OUT="fastlytics-${VERSION}.mcpb"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

echo "=== Building server ==="
npm run build

echo "=== Staging bundle ==="
mkdir -p "$STAGE/server"
cp bundle/manifest.json "$STAGE/manifest.json"
cp -r dist "$STAGE/server/dist"
cp -r bundle/assets "$STAGE/assets"

# Bundle only the runtime dependencies the stdio transport actually needs.
# express is a transitive dep of @modelcontextprotocol/sdk, so it comes along
# regardless (~29M unpacked, ~3.7MB zipped).
cat > "$STAGE/server/package.json" <<EOF
{
  "name": "fastlytics-mcp-bundle",
  "version": "${VERSION}",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.31.0",
    "zod": "^4.6.5"
  }
}
EOF

(cd "$STAGE/server" && npm install --omit=dev --no-audit --no-fund)

echo "=== Packing $OUT ==="
rm -f "$OUT"
npx --yes @anthropic-ai/mcpb@latest pack "$STAGE" "$OUT"

echo "=== Sanity check ==="
# Match a real key (40 hex chars after the prefix), not the example placeholder
# "fl_mcp_..." that appears in help text and schema descriptions.
if grep -rEq "fl_mcp_[0-9a-f]{32,}" "$STAGE"; then
  echo "ERROR: bundle contains a live API key" >&2
  exit 1
fi
echo "No API keys in bundle."
echo "Built: $(pwd)/$OUT"
