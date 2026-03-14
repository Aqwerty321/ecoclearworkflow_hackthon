"use client";

/**
 * MarkdownContent — renders AI-generated markdown text with GFM support.
 *
 * Usage:
 *   <MarkdownContent>{someAiString}</MarkdownContent>
 *   <MarkdownContent className="text-xs">{someAiString}</MarkdownContent>
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  children: string | null | undefined;
  /** Extra Tailwind classes applied to the wrapper div */
  className?: string;
}

export function MarkdownContent({ children, className }: MarkdownContentProps) {
  if (!children) return null;

  return (
    <div
      className={cn(
        // Base prose-like styles without the full @tailwindcss/typography dep
        "text-foreground/80 leading-relaxed space-y-2",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_em]:italic",
        "[&_p]:mb-2 [&_p:last-child]:mb-0",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1",
        "[&_li]:text-foreground/80",
        "[&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mt-3",
        "[&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-3",
        "[&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-2",
        "[&_code]:font-mono [&_code]:text-[0.85em] [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded",
        "[&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic",
        "[&_hr]:border-border [&_hr]:my-3",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
        "[&_table]:w-full [&_table]:text-sm [&_th]:font-semibold [&_th]:text-left [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1",
        "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
