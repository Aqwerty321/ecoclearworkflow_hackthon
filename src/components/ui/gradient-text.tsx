"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  from?: string;
  via?: string;
  to?: string;
  animate?: boolean;
}

export function GradientText({
  children,
  className,
  from = "hsl(210 100% 35%)",
  via = "hsl(195 80% 50%)",
  to = "hsl(170 60% 45%)",
  animate = true,
}: GradientTextProps) {
  return (
    <span
      className={cn(
        "bg-clip-text text-transparent",
        animate && "animate-gradient",
        className
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, ${from}, ${via}, ${to}, ${from})`,
        backgroundSize: animate ? "200% 200%" : "100% 100%",
      }}
    >
      {children}
    </span>
  );
}
