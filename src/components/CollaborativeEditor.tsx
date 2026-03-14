"use client";

/**
 * CollaborativeEditor — Tiptap + Yjs CRDT-based rich text editor.
 * 
 * Implements the "Conflict-Free Replicated Data Types for Real-Time Editing"
 * from the upgrade plan. Uses:
 * - Tiptap (ProseMirror-based) for rich text editing
 * - Yjs for CRDT-based conflict-free collaboration
 * - y-webrtc for peer-to-peer real-time sync
 * - y-indexeddb for offline persistence (IndexedDB)
 * 
 * Mathematical guarantee: concurrent edits from multiple officials will
 * automatically converge to the same state without central sequencing.
 */

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { IndexeddbPersistence } from "y-indexeddb";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Undo2,
  Redo2,
  Users,
  Wifi,
  WifiOff,
  Server,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Random colors for collaboration cursors
const CURSOR_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

interface CollaborativeEditorProps {
  /** Unique document ID for CRDT room (e.g., applicationId) */
  documentId: string;
  /** Display name for the current user's cursor */
  userName: string;
  /** User's role for cursor label */
  userRole?: string;
  /** Initial content to populate if CRDT document is empty */
  initialContent?: string;
  /** Called when content changes */
  onChange?: (html: string, text: string) => void;
  /** Whether editing is disabled */
  readOnly?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** CSS class for the editor container */
  className?: string;
  /** Hocuspocus WebSocket URL (if available, uses server sync; else falls back to WebRTC) */
  hocuspocusUrl?: string;
  /** Auth token for Hocuspocus server */
  hocuspocusToken?: string;
}

export function CollaborativeEditor({
  documentId,
  userName,
  userRole,
  initialContent,
  onChange,
  readOnly = false,
  placeholder = "Start typing...",
  className,
  hocuspocusUrl,
  hocuspocusToken,
}: CollaborativeEditorProps) {
  const [connectedPeers, setConnectedPeers] = useState(0);
  const [synced, setSynced] = useState(false);
  const [serverMode, setServerMode] = useState(false);

  // ── Runtime discovery of the Hocuspocus WebSocket URL ──────────────────
  // We cannot use a build-time env var because the Cloudflare tunnel URL
  // changes every time the tunnel restarts. Instead:
  //   1. At mount, fetch NEXT_PUBLIC_COLLAB_DISCOVERY_URL/backend-url
  //   2. Fall back to NEXT_PUBLIC_COLLAB_WS_URL (static, useful in dev)
  //   3. Fall back to "" → WebRTC P2P
  // We delay provider creation (wsUrlLoading=true) until the URL is known,
  // so the useMemo below fires exactly once with the correct value.
  const [wsUrl, setWsUrl] = useState<string>(() => {
    // Prop always wins (passed explicitly by a caller that already knows the URL)
    if (hocuspocusUrl) return hocuspocusUrl;
    return ""; // will be resolved in the useEffect below
  });
  const [wsUrlLoading, setWsUrlLoading] = useState<boolean>(!hocuspocusUrl);

  useEffect(() => {
    // If the caller passed hocuspocusUrl directly, no discovery needed
    if (hocuspocusUrl) {
      setWsUrl(hocuspocusUrl);
      setWsUrlLoading(false);
      return;
    }

    const discoveryBase =
      typeof window !== "undefined"
        ? (process.env.NEXT_PUBLIC_COLLAB_DISCOVERY_URL || "").trim()
        : "";

    const staticWsUrl =
      typeof window !== "undefined"
        ? (process.env.NEXT_PUBLIC_COLLAB_WS_URL || "").trim()
        : "";

    if (!discoveryBase) {
      // No discovery server configured — use static env var or WebRTC
      setWsUrl(staticWsUrl);
      setWsUrlLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    fetch(`${discoveryBase}/backend-url`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Discovery server returned ${res.status}`);
        return res.json() as Promise<{ ws_url: string }>;
      })
      .then((data) => {
        if (cancelled) return;
        if (data.ws_url) {
          setWsUrl(data.ws_url);
        } else {
          // Unexpected response shape — fall back
          setWsUrl(staticWsUrl);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Discovery failed (network error, timeout, server not running) — fall back
        setWsUrl(staticWsUrl);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (!cancelled) setWsUrlLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
    // hocuspocusUrl is in deps so if parent passes it later it gets picked up
  }, [hocuspocusUrl]);

  // Create Yjs document and providers — deferred until wsUrl is resolved
  const { ydoc, provider, indexeddbProvider } = useMemo(() => {
    // wsUrlLoading guard: return dummy objects while URL is being fetched.
    // This memo re-runs once wsUrlLoading flips to false (wsUrl is final).
    if (wsUrlLoading) {
      // Return placeholders — the component renders a skeleton instead
      return { ydoc: null as unknown as Y.Doc, provider: null as unknown as WebrtcProvider, indexeddbProvider: null as unknown as IndexeddbPersistence };
    }

    const doc = new Y.Doc();

    let syncProvider: WebrtcProvider | HocuspocusProvider;

    if (wsUrl) {
      // Tier 3: Hocuspocus server-authoritative sync
      syncProvider = new HocuspocusProvider({
        url: wsUrl,
        name: `ecoclear-mom-${documentId}`,
        document: doc,
        token: hocuspocusToken || "ecoclear-collab-dev-secret",
      });
    } else {
      // Tier 1 fallback: WebRTC peer-to-peer sync
      syncProvider = new WebrtcProvider(`ecoclear-mom-${documentId}`, doc, {
        signaling: ["wss://signaling.yjs.dev"],
      });
    }

    // IndexedDB persistence for offline-first editing
    const idbProvider = new IndexeddbPersistence(`ecoclear-mom-${documentId}`, doc);

    return { ydoc: doc, provider: syncProvider, indexeddbProvider: idbProvider };
  }, [documentId, wsUrl, wsUrlLoading, hocuspocusToken]);

  // Update server mode state when wsUrl changes (must be in useEffect, not useMemo)
  useEffect(() => {
    if (!wsUrlLoading) setServerMode(!!wsUrl);
  }, [wsUrl, wsUrlLoading]);

  // Track peer connections
  useEffect(() => {
    if (wsUrlLoading || !provider) return;
    const awareness = provider.awareness;
    if (!awareness) {
      setSynced(true);
      return () => {
        provider.destroy();
        indexeddbProvider.destroy();
        ydoc.destroy();
      };
    }

    const handlePeers = () => {
      setConnectedPeers(awareness.getStates().size - 1);
    };
    awareness.on("change", handlePeers);
    handlePeers();

    indexeddbProvider.on("synced", () => setSynced(true));

    return () => {
      awareness.off("change", handlePeers);
      provider.destroy();
      indexeddbProvider.destroy();
      ydoc.destroy();
    };
  }, [provider, indexeddbProvider, ydoc, wsUrlLoading]);

  // Pick a random color for this user's cursor
  const cursorColor = useMemo(
    () => CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)],
    []
  );

  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        // Disable built-in undo/redo when using Yjs collaboration (handled by y-tiptap)
        undoRedo: false,
      }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: true }),
      Underline,
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: userName,
          color: cursorColor,
          role: userRole || "",
        },
      }),
    ],
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML(), ed.getText());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none",
          "min-h-[300px] p-4 focus:outline-none",
          "border rounded-b-lg bg-background",
          readOnly && "opacity-75 cursor-not-allowed"
        ),
      },
    },
  });

  // Populate initial content if the CRDT doc is empty
  useEffect(() => {
    if (editor && initialContent && synced) {
      const currentContent = editor.getText().trim();
      if (!currentContent) {
        editor.commands.setContent(initialContent);
      }
    }
  }, [editor, initialContent, synced]);

  if (!editor) return null;

  // Show a minimal skeleton while the discovery fetch is in-flight (~100ms).
  // This prevents the useMemo from firing prematurely with an empty wsUrl.
  if (wsUrlLoading) {
    return (
      <div className={cn("border rounded-lg overflow-hidden animate-pulse", className)}>
        <div className="h-10 bg-muted/30 border-b" />
        <div className="min-h-[300px] p-4 bg-background">
          <div className="h-4 bg-muted rounded w-3/4 mb-3" />
          <div className="h-4 bg-muted rounded w-1/2 mb-3" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          disabled={readOnly}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          disabled={readOnly}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          disabled={readOnly}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          disabled={readOnly}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive("highlight")}
          disabled={readOnly}
          title="Highlight"
        >
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          disabled={readOnly}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          disabled={readOnly}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          disabled={readOnly}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          disabled={readOnly}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          disabled={readOnly}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={readOnly || !editor.can().undo()}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={readOnly || !editor.can().redo()}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        {/* Collaboration status */}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {serverMode && (
            <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400" title="Hocuspocus server sync">
              <Server className="h-3 w-3" />
            </div>
          )}
          {connectedPeers > 0 ? (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Wifi className="h-3 w-3" />
              <Users className="h-3 w-3" />
              <span>{connectedPeers} online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {synced ? (
                <Wifi className="h-3 w-3 text-green-600" />
              ) : (
                <WifiOff className="h-3 w-3 text-amber-600" />
              )}
              <span>{synced ? "Saved locally" : "Syncing..."}</span>
            </div>
          )}
        </div>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
}

// ---- Toolbar Button ----

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
  size = "default",
}: {
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
  size?: "default" | "sm";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "rounded transition-colors",
        size === "sm" ? "p-1" : "p-1.5",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}
