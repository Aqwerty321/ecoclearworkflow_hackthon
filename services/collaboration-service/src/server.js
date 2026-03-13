/**
 * EcoClear Collaboration Service — Hocuspocus WebSocket Server
 *
 * Production-grade CRDT collaboration backend for MoM documents.
 * Replaces the Tier 1 y-webrtc peer-to-peer approach with a
 * centralized WebSocket server that provides:
 *
 * - Server-authoritative Yjs document sync
 * - SQLite persistence via onStoreDocument lifecycle hook
 * - Connection authentication (token-based)
 * - Throttling to prevent abuse
 * - Structured logging
 * - Awareness (live cursors, presence indicators)
 *
 * Architecture (from upgrade plan):
 *   Tiptap Editor → HocuspocusProvider (WebSocket) → This Server → SQLite
 *   + y-indexeddb for offline-first client persistence
 *
 * Port: 8003
 */

import "dotenv/config";
import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { Logger } from "@hocuspocus/extension-logger";
import { Throttle } from "@hocuspocus/extension-throttle";
import BetterSqlite3 from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = parseInt(process.env.PORT || "8003", 10);
const AUTH_SECRET = process.env.AUTH_SECRET || "ecoclear-collab-dev-secret";
const DB_PATH = process.env.SQLITE_DB_PATH || "./data/documents.db";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:9002").split(",");

// ─────────────────────── SQLite Setup ─────────────────────────────────

// Ensure data directory exists
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const db = new BetterSqlite3(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

// Create documents table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    name TEXT PRIMARY KEY,
    data BLOB NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Create document history table for audit trail
db.exec(`
  CREATE TABLE IF NOT EXISTS document_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_name TEXT NOT NULL,
    data BLOB NOT NULL,
    user_name TEXT,
    saved_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (document_name) REFERENCES documents(name)
  )
`);

// Prepared statements for performance
const stmtFetch = db.prepare("SELECT data FROM documents WHERE name = ?");
const stmtUpsert = db.prepare(`
  INSERT INTO documents (name, data, updated_at)
  VALUES (?, ?, datetime('now'))
  ON CONFLICT(name) DO UPDATE SET data = excluded.data, updated_at = datetime('now')
`);
const stmtHistory = db.prepare(`
  INSERT INTO document_history (document_name, data, user_name)
  VALUES (?, ?, ?)
`);

console.log(`[Collaboration] SQLite database initialized at ${DB_PATH}`);

// ─────────────────────── Hocuspocus Server ────────────────────────────

const server = Server.configure({
  name: "ecoclear-collaboration",
  port: PORT,
  address: HOST,

  // Quiet mode — Logger extension handles logging
  quiet: true,

  extensions: [
    // Structured logging
    new Logger({
      onLoadDocument: true,
      onChange: false, // Too noisy for production
      onStoreDocument: true,
      onConnect: true,
      onDisconnect: true,
    }),

    // Throttle connections to prevent abuse
    new Throttle({
      throttle: parseInt(process.env.THROTTLE_LIMIT || "15", 10),
      banTime: 5, // seconds
    }),

    // SQLite database persistence
    new Database({
      /**
       * Fetch document state from SQLite when a document is first loaded.
       * This is the `onLoadDocument` lifecycle equivalent.
       */
      fetch: async ({ documentName }) => {
        const row = stmtFetch.get(documentName);
        if (row) {
          console.log(`[Collaboration] Loaded document from DB: ${documentName}`);
          return row.data;
        }
        console.log(`[Collaboration] New document (no DB state): ${documentName}`);
        return null;
      },

      /**
       * Store document state to SQLite periodically and when all
       * connections to a document close. This is the `onStoreDocument`
       * lifecycle hook specified in the upgrade plan.
       */
      store: async ({ documentName, state, context }) => {
        stmtUpsert.run(documentName, state);

        // Save to history for audit trail (limit frequency)
        const userName = context?.user?.name || "system";
        stmtHistory.run(documentName, state, userName);

        console.log(`[Collaboration] Stored document: ${documentName} (by ${userName})`);
      },
    }),
  ],

  /**
   * Authentication hook — validates connection tokens.
   * In production, this would verify JWT tokens issued by the auth service.
   * For the hackathon, we accept tokens matching the shared secret or
   * allow unauthenticated connections in dev mode.
   */
  async onAuthenticate({ token, documentName, connection }) {
    // In development mode, allow all connections
    if (process.env.NODE_ENV !== "production") {
      return {
        user: {
          name: "dev-user",
          role: "admin",
        },
      };
    }

    // Production: validate token
    if (!token || token !== AUTH_SECRET) {
      throw new Error("Authentication failed: invalid token");
    }

    return {
      user: {
        name: "authenticated-user",
        role: "member",
      },
    };
  },

  /**
   * Connection hook — log and validate WebSocket origins.
   */
  async onConnect({ documentName, request }) {
    const origin = request?.headers?.origin;
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      console.warn(`[Collaboration] Rejected connection from disallowed origin: ${origin}`);
      // In dev mode, still allow; in production, throw
      if (process.env.NODE_ENV === "production") {
        throw new Error(`Origin not allowed: ${origin}`);
      }
    }

    console.log(`[Collaboration] Client connected to document: ${documentName} (origin: ${origin || "unknown"})`);
  },

  /**
   * Disconnect hook — cleanup and logging.
   */
  async onDisconnect({ documentName }) {
    console.log(`[Collaboration] Client disconnected from document: ${documentName}`);
  },
});

// ─────────────────────── Start Server ─────────────────────────────────

server.listen().then(() => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  EcoClear Collaboration Service (Hocuspocus)                ║
║  WebSocket: ws://${HOST}:${PORT}                            ║
║  Database: ${DB_PATH.padEnd(40)}         ║
║  Auth: ${process.env.NODE_ENV === "production" ? "Token-based" : "Dev mode (open)"}                                    ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[Collaboration] Shutting down gracefully...");
  server.destroy();
  db.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[Collaboration] SIGTERM received, shutting down...");
  server.destroy();
  db.close();
  process.exit(0);
});
