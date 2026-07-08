#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

WORKSPACE_DIR="${1:-spec}"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found in PATH." >&2
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm ci
fi

# Initial core build so server and web can start
echo "Building core..."
npm run build -w @mcp-designer/core

cleanup() {
  echo ""
  echo "Stopping dev processes..."
  kill "$CORE_PID" "$SERVER_PID" "$WEB_PID" 2>/dev/null || true
  wait "$CORE_PID" "$SERVER_PID" "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Watch core (recompiles on change, Vite picks up dist changes)
npx tsc -p packages/core/tsconfig.json --watch --preserveWatchOutput &
CORE_PID=$!

# Server on fixed port 6274 (matches Vite proxy in vite.config.ts)
MCP_DESIGNER_PORT=6274 npx tsx packages/server/src/index.ts "$WORKSPACE_DIR" &
SERVER_PID=$!

# Vite dev server with HMR (proxies /api/ to :6274)
npm run dev -w @mcp-designer/web &
WEB_PID=$!

echo ""
echo "Dev servers running:"
echo "  Web (Vite HMR): http://localhost:5173"
echo "  API server:     http://127.0.0.1:6274"
echo "  Workspace:      $WORKSPACE_DIR"
echo ""
echo "Press Ctrl+C to stop."

wait "$CORE_PID" "$SERVER_PID" "$WEB_PID"
