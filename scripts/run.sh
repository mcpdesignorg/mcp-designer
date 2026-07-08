#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

WORKSPACE_DIR="${1:-spec}"
PORT="${MCP_DESIGNER_PORT:-3131}"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found in PATH." >&2
  exit 1
fi

# If server is already running on the port, just open the browser and exit.
if lsof -iTCP:"${PORT}" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "MCP Designer is already running at http://127.0.0.1:${PORT}"
  if [ "${MCP_DESIGNER_NO_OPEN:-0}" != "1" ]; then
    open "http://127.0.0.1:${PORT}" 2>/dev/null || xdg-open "http://127.0.0.1:${PORT}" 2>/dev/null || true
  fi
  exit 0
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm ci
fi

echo "Building MCP Designer..."
npm run build

echo "Starting MCP Designer for workspace: ${WORKSPACE_DIR}"
echo "Set MCP_DESIGNER_PORT to choose a port (default: ${PORT}), or MCP_DESIGNER_NO_OPEN=1 to skip opening the browser."
exec env MCP_DESIGNER_PORT="${PORT}" node packages/server/dist/index.js "${WORKSPACE_DIR}"
