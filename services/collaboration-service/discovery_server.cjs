/**
 * discovery_server.cjs — EcoClear Collaboration Discovery Server
 *
 * Runs on port 4000. Reads tunnel.json (written by start_tunnel.sh) and
 * exposes it over HTTP so the Vercel-deployed frontend can discover the
 * current Cloudflare tunnel URL at runtime without a Vercel redeploy.
 *
 * Endpoints:
 *   GET /backend-url  → { ws_url: "wss://xxx.trycloudflare.com" }
 *   GET /health       → { ok: true, timestamp: "...", tunnel_url: "..." }
 *
 * Must be .cjs (CommonJS) because the package.json sets "type": "module".
 *
 * Usage:
 *   node discovery_server.cjs
 */

"use strict";

const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT        = parseInt(process.env.DISCOVERY_PORT || "4000", 10);
const TUNNEL_JSON = path.join(__dirname, "tunnel.json");

// ── CORS headers ─────────────────────────────────────────────────────────────
// The frontend is served from *.vercel.app (and localhost in dev).
// We allow all origins because the discovery URL is not sensitive — it's just
// a pointer to the Cloudflare tunnel URL, which is already public.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type":                 "application/json",
};

// ── Read tunnel.json safely ───────────────────────────────────────────────────
function readTunnelUrl() {
  try {
    const raw  = fs.readFileSync(TUNNEL_JSON, "utf8");
    const data = JSON.parse(raw);
    const httpUrl = (data.url || "").trim();
    if (!httpUrl) return null;
    // Convert https:// → wss:// for the WebSocket client
    return httpUrl.replace(/^https:\/\//, "wss://");
  } catch {
    return null;
  }
}

// ── Request handler ───────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // Handle CORS pre-flight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const url = req.url ? req.url.split("?")[0] : "/";

  if (url === "/backend-url") {
    const wsUrl = readTunnelUrl();
    if (!wsUrl) {
      res.writeHead(503, CORS_HEADERS);
      res.end(
        JSON.stringify({
          error:   "tunnel_not_ready",
          message: "tunnel.json not found or empty — run start_tunnel.sh first",
        })
      );
      return;
    }
    res.writeHead(200, CORS_HEADERS);
    res.end(JSON.stringify({ ws_url: wsUrl }));
    return;
  }

  if (url === "/health") {
    const wsUrl = readTunnelUrl();
    res.writeHead(200, CORS_HEADERS);
    res.end(
      JSON.stringify({
        ok:          true,
        timestamp:   new Date().toISOString(),
        tunnel_url:  wsUrl || null,
        tunnel_ready: wsUrl !== null,
      })
    );
    return;
  }

  // 404 for everything else
  res.writeHead(404, CORS_HEADERS);
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[discovery] Server listening on http://0.0.0.0:${PORT}`);
  console.log(`[discovery] GET /backend-url — returns current Hocuspocus WebSocket URL`);
  console.log(`[discovery] GET /health      — uptime check`);

  const wsUrl = readTunnelUrl();
  if (wsUrl) {
    console.log(`[discovery] Tunnel URL loaded: ${wsUrl}`);
  } else {
    console.warn(`[discovery] WARNING: tunnel.json not found yet — run start_tunnel.sh`);
  }
});

server.on("error", (err) => {
  console.error(`[discovery] Server error: ${err.message}`);
  process.exit(1);
});
