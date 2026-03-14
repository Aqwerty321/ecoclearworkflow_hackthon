"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";

interface ShimmerButtonProps extends ButtonProps {
  children: ReactNode;
  shimmerColor?: string;
}

export function ShimmerButton({
  children,
  className,
  shimmerColor = "rgba(255,255,255,0.2)",
  ...props
}: ShimmerButtonProps) {
  // Never forward asChild — the shimmer <span> overlay would break Radix Slot
  // (Slot requires exactly one child). If the caller wants a link-style button,
  // use a plain <Button asChild> directly instead of ShimmerButton.
  const { asChild: _asChild, ...safeProps } = props as typeof props & { asChild?: boolean };
  return (
    <Button
      className={cn(
        "relative overflow-hidden",
        className
      )}
      {...safeProps}
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
      <span
        className="absolute inset-0 z-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${shimmerColor}, transparent)`,
          animation: "shimmer 2s linear infinite",
          backgroundSize: "200% 100%",
        }}
      />
    </Button>
  );
}
