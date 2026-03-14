"use client";

/**
 * CollaborativeEditor — Tiptap + Yjs CRDT-based rich text editor.
 *
 * Architecture (two-component split):
 *   CollaborativeEditor (exported wrapper)
 *     → resolves wsUrl via runtime discovery fetch
 *     → shows skeleton while loading
 *     → mounts CollaborativeEditorCore once wsUrl is known
 *
 *   CollaborativeEditorCore (internal)
 *     → receives stable, resolved wsUrl as prop
 *     → ydoc is always a real Y.Doc (never null) — no Tiptap crash
 *     → all Yjs / Tiptap hooks live here
 *
 * Split rationale:
 *   React hooks cannot be called after a conditional return. If URL
 *   resolution is async, the useMemo/useEditor would fire before the URL
 *   is known, passing null to Collaboration.configure() and crashing with
 *   "Cannot read properties of null (reading 'getXmlFragment')".
 *   Moving the skeleton return to the outer wrapper (which has no hooks
 *   after it) and mounting the inner component only when ready eliminates
 *   the null-ydoc window entirely.
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
import { useEffect, useMemo, useState } from "react";
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

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Random cursor colours ─────────────────────────────────────────────────────

const CURSOR_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

// ── Loading skeleton ──────────────────────────────────────────────────────────

function EditorSkeleton({ className }: { className?: string }) {
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

// ═════════════════════════════════════════════════════════════════════════════
// OUTER WRAPPER — handles async URL discovery, no Yjs/Tiptap hooks here
// ═════════════════════════════════════════════════════════════════════════════

export function CollaborativeEditor({
  hocuspocusUrl,
  hocuspocusToken,
  ...rest
}: CollaborativeEditorProps) {
  // Resolved WebSocket URL. Starts as "" (loading) and is set exactly once.
  const [wsUrl, setWsUrl] = useState<string>(() => hocuspocusUrl ?? "");
  const [wsUrlLoading, setWsUrlLoading] = useState<boolean>(!hocuspocusUrl);

  useEffect(() => {
    // Prop wins — no discovery needed
    if (hocuspocusUrl) {
      setWsUrl(hocuspocusUrl);
      setWsUrlLoading(false);
      return;
    }

    const discoveryBase =
      typeof window !== "undefined"
        ? (process.env.NEXT_PUBLIC_COLLAB_DISCOVERY_URL ?? "").trim()
        : "";

    const staticWsUrl =
      typeof window !== "undefined"
        ? (process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? "").trim()
        : "";

    // No discovery server configured — use static env var or fall back to WebRTC
    if (!discoveryBase) {
      setWsUrl(staticWsUrl);
      setWsUrlLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch(`${discoveryBase}/backend-url`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Discovery ${res.status}`);
        return res.json() as Promise<{ ws_url: string }>;
      })
      .then((data) => {
        if (!cancelled) setWsUrl(data.ws_url || staticWsUrl);
      })
      .catch(() => {
        if (!cancelled) setWsUrl(staticWsUrl);
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
  }, [hocuspocusUrl]);

  // ── Render skeleton while URL resolves ────────────────────────────────────
  // This return is SAFE here because there are no hooks below it in this
  // component. CollaborativeEditorCore is a separate component and won't
  // be affected by conditional returns in this wrapper.
  if (wsUrlLoading) {
    return <EditorSkeleton className={rest.className} />;
  }

  // wsUrl is now stable — mount the inner editor exactly once.
  // key={wsUrl} ensures a clean remount if the tunnel URL ever changes
  // (e.g., after a tunnel restart), avoiding stale provider references.
  return (
    <CollaborativeEditorCore
      key={wsUrl}
      wsUrl={wsUrl}
      hocuspocusToken={hocuspocusToken}
      {...rest}
    />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// INNER CORE — receives stable wsUrl, initialises Yjs + Tiptap synchronously
// ═════════════════════════════════════════════════════════════════════════════

interface CoreProps extends CollaborativeEditorProps {
  /** Already-resolved WebSocket URL (may be "" for WebRTC fallback) */
  wsUrl: string;
}

function CollaborativeEditorCore({
  documentId,
  userName,
  userRole,
  initialContent,
  onChange,
  readOnly = false,
  placeholder = "Start typing...",
  className,
  wsUrl,
  hocuspocusToken,
}: CoreProps) {
  const [connectedPeers, setConnectedPeers] = useState(0);
  const [synced, setSynced] = useState(false);
  const [serverMode] = useState<boolean>(!!wsUrl);

  // ── Yjs document + network providers ─────────────────────────────────────
  // wsUrl is stable (set once by the outer wrapper), so this memo runs
  // exactly once. ydoc is ALWAYS a real Y.Doc — never null.
  const { ydoc, provider, indexeddbProvider } = useMemo(() => {
    const doc = new Y.Doc();

    const syncProvider: WebrtcProvider | HocuspocusProvider = wsUrl
      ? new HocuspocusProvider({
          url: wsUrl,
          name: `ecoclear-mom-${documentId}`,
          document: doc,
          token: hocuspocusToken || "ecoclear-collab-dev-secret",
        })
      : new WebrtcProvider(`ecoclear-mom-${documentId}`, doc, {
          signaling: ["wss://signaling.yjs.dev"],
        });

    const idbProvider = new IndexeddbPersistence(`ecoclear-mom-${documentId}`, doc);

    return { ydoc: doc, provider: syncProvider, indexeddbProvider: idbProvider };
  // documentId and wsUrl are stable (component is re-keyed if they change)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Random cursor colour for this session ─────────────────────────────────
  const cursorColor = useMemo(
    () => CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)],
    []
  );

  // ── Peer awareness + cleanup ──────────────────────────────────────────────
  useEffect(() => {
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
  }, [provider, indexeddbProvider, ydoc]);

  // ── Tiptap editor ─────────────────────────────────────────────────────────
  // ydoc is always a real Y.Doc here — no null crash possible.
  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        // Disable built-in undo/redo — Yjs manages history via y-prosemirror
        undoRedo: false,
      }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: true }),
      // Explicitly register Underline (not included in StarterKit by default)
      Underline,
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: userName,
          color: cursorColor,
          role: userRole ?? "",
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

  // ── Populate initial content once synced ─────────────────────────────────
  useEffect(() => {
    if (editor && initialContent && synced) {
      const currentContent = editor.getText().trim();
      if (!currentContent) {
        editor.commands.setContent(initialContent);
      }
    }
  }, [editor, initialContent, synced]);

  if (!editor) return null;

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
            <div
              className="flex items-center gap-1 text-blue-500 dark:text-blue-400"
              title="Hocuspocus server sync"
            >
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

// ── Toolbar Button ─────────────────────────────────────────────────────────────

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "rounded p-1.5 transition-colors",
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
