#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start_all.sh — Start all EcoClear collaboration services together
#
# Starts in order:
#   1. Hocuspocus WebSocket server  (port 8003)
#   2. Discovery HTTP server        (port 4000)
#   3. Cloudflare tunnels           (start_tunnel.sh)
#
# All processes run in the foreground with their PIDs tracked.
# Ctrl+C (or SIGTERM) kills all of them cleanly.
#
# Usage:
#   cd services/collaboration-service
#   chmod +x start_all.sh
#   ./start_all.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Colour helpers ────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RESET='\033[0m'
log_info()  { echo -e "${GREEN}[start_all]${RESET} $*"; }
log_warn()  { echo -e "${YELLOW}[start_all]${RESET} $*"; }
log_stage() { echo -e "${CYAN}[start_all]${RESET} $*"; }

# ── PID tracking ─────────────────────────────────────────────────────────────
HOCUS_PID=""
DISC_PID=""
TUNNEL_PID=""

cleanup() {
  echo ""
  log_warn "Shutting down all services..."
  [ -n "$HOCUS_PID"  ] && kill "$HOCUS_PID"  2>/dev/null && log_info "Hocuspocus stopped."  || true
  [ -n "$DISC_PID"   ] && kill "$DISC_PID"   2>/dev/null && log_info "Discovery stopped."   || true
  [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null && log_info "Tunnels stopped."     || true
  log_warn "All done."
}
trap cleanup EXIT INT TERM

# ── Install Node deps if node_modules is missing ─────────────────────────────
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  log_stage "node_modules not found — running npm install..."
  npm install --prefix "$SCRIPT_DIR"
fi

# ── Load .env if present ──────────────────────────────────────────────────────
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.env"
  set +a
  log_info ".env loaded"
fi

# ── 1. Start Hocuspocus ───────────────────────────────────────────────────────
log_stage "Starting Hocuspocus WebSocket server (port ${PORT:-8003})..."
node "$SCRIPT_DIR/src/server.js" &
HOCUS_PID=$!
log_info "Hocuspocus PID: $HOCUS_PID"

# Give it a moment to bind the port before the tunnel tries to connect
sleep 2

# ── 2. Start Discovery server ─────────────────────────────────────────────────
log_stage "Starting Discovery HTTP server (port 4000)..."
node "$SCRIPT_DIR/discovery_server.cjs" &
DISC_PID=$!
log_info "Discovery PID: $DISC_PID"

sleep 1

# ── 3. Start tunnels ─────────────────────────────────────────────────────────
if command -v cloudflared &>/dev/null; then
  log_stage "Starting Cloudflare tunnels..."
  bash "$SCRIPT_DIR/start_tunnel.sh" &
  TUNNEL_PID=$!
  log_info "Tunnel script PID: $TUNNEL_PID"
else
  log_warn "cloudflared not found — skipping tunnels."
  log_warn "Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  log_warn "For local testing, NEXT_PUBLIC_COLLAB_WS_URL=ws://localhost:8003 in .env.local is sufficient."
fi

echo ""
log_info "All services started. Press Ctrl+C to stop all."
echo ""

# Wait for any child to exit (in case of crash)
wait -n 2>/dev/null || wait
