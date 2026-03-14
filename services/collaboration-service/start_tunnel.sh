#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start_tunnel.sh — Start two Cloudflare Quick Tunnels:
#   1. Hocuspocus WebSocket server  (port 8003) → tunnel.json
#   2. Discovery HTTP server        (port 4000) → discovery_tunnel.json
#
# Usage:
#   chmod +x start_tunnel.sh
#   ./start_tunnel.sh
#
# Requires: cloudflared installed and on PATH
#   Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
#   macOS:   brew install cloudflared
#   Linux:   see URL above for .deb / .rpm / static binary
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TUNNEL_JSON="$SCRIPT_DIR/tunnel.json"
DISCOVERY_TUNNEL_JSON="$SCRIPT_DIR/discovery_tunnel.json"

# ── Helper: wait for a trycloudflare.com URL in a cloudflared log ────────────
# Args: $1=log-file $2=output-json-file $3=human-label
wait_for_url() {
  local logfile="$1"
  local outfile="$2"
  local label="$3"
  local url=""
  local attempts=0
  local max_attempts=60   # 60 × 1s = 60 seconds timeout

  echo "[tunnel] Waiting for $label URL..."
  while [ -z "$url" ] && [ $attempts -lt $max_attempts ]; do
    sleep 1
    attempts=$((attempts + 1))
    # cloudflared prints the URL on a line like:
    #   https://random-name.trycloudflare.com
    url=$(grep -oP 'https://[a-z0-9\-]+\.trycloudflare\.com' "$logfile" 2>/dev/null | head -1 || true)
  done

  if [ -z "$url" ]; then
    echo "[tunnel] ERROR: timed out waiting for $label URL after ${max_attempts}s" >&2
    return 1
  fi

  echo "[tunnel] $label → $url"
  printf '{"url":"%s"}\n' "$url" > "$outfile"
  echo "[tunnel] Written to $outfile"
}

# ── Cleanup on exit ──────────────────────────────────────────────────────────
HOCUS_PID=""
DISC_PID=""

cleanup() {
  echo ""
  echo "[tunnel] Shutting down tunnels..."
  [ -n "$HOCUS_PID" ] && kill "$HOCUS_PID" 2>/dev/null || true
  [ -n "$DISC_PID"  ] && kill "$DISC_PID"  2>/dev/null || true
  echo "[tunnel] Tunnels stopped."
}
trap cleanup EXIT INT TERM

# ── Log files (in /tmp to avoid dirtying the repo) ───────────────────────────
HOCUS_LOG=$(mktemp /tmp/cloudflared-hocus-XXXXXX.log)
DISC_LOG=$(mktemp /tmp/cloudflared-disc-XXXXXX.log)

# ── Start tunnel for Hocuspocus (port 8003) ──────────────────────────────────
echo "[tunnel] Starting Hocuspocus tunnel (port 8003)..."
cloudflared tunnel --url http://localhost:8003 \
  --no-autoupdate \
  --protocol http2 \
  2>&1 | tee "$HOCUS_LOG" &
HOCUS_PID=$!

# ── Start tunnel for Discovery server (port 4000) ────────────────────────────
echo "[tunnel] Starting Discovery tunnel (port 4000)..."
cloudflared tunnel --url http://localhost:4000 \
  --no-autoupdate \
  --protocol http2 \
  2>&1 | tee "$DISC_LOG" &
DISC_PID=$!

# ── Wait for both URLs ───────────────────────────────────────────────────────
wait_for_url "$HOCUS_LOG"  "$TUNNEL_JSON"            "Hocuspocus"
wait_for_url "$DISC_LOG"   "$DISCOVERY_TUNNEL_JSON"  "Discovery"

# Read back and display the final URLs
HOCUS_URL=$(grep -oP 'https://[a-z0-9\-]+\.trycloudflare\.com' "$TUNNEL_JSON" | head -1)
DISC_URL=$(grep -oP 'https://[a-z0-9\-]+\.trycloudflare\.com' "$DISCOVERY_TUNNEL_JSON" | head -1)

echo ""
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│  EcoClear Tunnel URLs                                       │"
echo "├─────────────────────────────────────────────────────────────┤"
printf  "│  Hocuspocus WS  : wss://%-35s │\n" "${HOCUS_URL#https://}"
printf  "│  Discovery HTTP : %-40s │\n" "$DISC_URL"
echo "├─────────────────────────────────────────────────────────────┤"
echo "│  Set in .env.local / Vercel dashboard:                      │"
printf  "│    NEXT_PUBLIC_COLLAB_DISCOVERY_URL=%-24s │\n" "$DISC_URL"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""
echo "[tunnel] Both tunnels active. Press Ctrl+C to stop."

# Keep running until killed
wait
