
"use client";

import { useAppStore } from "@/lib/store";
import { regulationAssistant } from "@/ai/flows/regulation-assistant";
import { MarkdownContent } from "@/components/MarkdownContent";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Send, User, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { GradientText } from "@/components/ui/gradient-text";
import { AnimatedContainer } from "@/components/ui/animated-container";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const PRESET_PROMPTS = [
  "What documents are required for Category A Mining clearance?",
  "How long does Environmental Clearance typically take?",
  "What triggers a Public Hearing under EIA Notification 2006?",
  "What are common standard conditions imposed in EC orders?",
];

export default function AssistantPage() {
  const { currentUser } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const reply = await regulationAssistant({
        messages: newMessages,
        context: {
          userRole: currentUser?.role,
        },
      });
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "I'm sorry, I encountered an error processing your request. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => sendMessage(input);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem-2rem)] max-h-[860px]">
      {/* Header */}
      <AnimatedContainer animation="fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                <GradientText>RegBot</GradientText>
              </h1>
              <p className="text-xs text-muted-foreground">AI Regulation Assistant &mdash; CECB EcoClear</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessages([])}
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear chat
            </Button>
          )}
        </div>
      </AnimatedContainer>

      {/* Chat area */}
      <Card className="flex-1 overflow-hidden border-border/50 shadow-sm flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-6 py-8">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-semibold text-lg">Ask me anything about EC regulations</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  I can help with documents, timelines, public hearings, compliance requirements, and more.
                </p>
              </div>

              {/* Preset chips */}
              <div className="flex flex-col gap-2 w-full max-w-md">
                {PRESET_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className={cn(
                      "text-left px-4 py-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/30",
                      "text-sm transition-all text-foreground/80 hover:text-foreground"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3 items-start",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      msg.role === "user"
                        ? "bg-primary/20 text-primary"
                        : "bg-emerald-500/15 text-emerald-400"
                    )}
                  >
                    {msg.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted/50 border border-border/40 rounded-tl-sm"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <MarkdownContent>{msg.content}</MarkdownContent>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-3 items-start">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted/50 border border-border/40 rounded-2xl rounded-tl-sm px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </CardContent>

        {/* Input bar */}
        <div className="border-t border-border/50 p-3 flex gap-2 items-end bg-background/50 backdrop-blur-sm">
          <Textarea
            className="flex-1 resize-none min-h-[44px] max-h-32 text-sm rounded-xl"
            placeholder="Ask about EC regulations, required documents, timelines…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <Button
            size="icon"
            className="h-11 w-11 rounded-xl shrink-0"
            onClick={handleSubmit}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
