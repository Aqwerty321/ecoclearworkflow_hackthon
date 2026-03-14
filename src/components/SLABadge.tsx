
"use client";

import { getSLAInfo } from "@/lib/types";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface SLABadgeProps {
  application: Application;
  className?: string;
  compact?: boolean;
}

export function SLABadge({ application, className, compact = false }: SLABadgeProps) {
  const sla = getSLAInfo(application);

  if (sla.status === "not-applicable") return null;

  const config = {
    "on-track": {
      label: compact ? `${sla.daysRemaining}d left` : `On Track — ${sla.daysRemaining}d left`,
      icon: CheckCircle2,
      classes: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    },
    "due-soon": {
      label: compact ? `${sla.daysRemaining}d left` : `Due Soon — ${sla.daysRemaining}d left`,
      icon: Clock,
      classes: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    },
    overdue: {
      label: compact
        ? `${Math.abs(sla.daysRemaining)}d late`
        : `Overdue by ${Math.abs(sla.daysRemaining)}d`,
      icon: AlertTriangle,
      classes: "bg-red-500/15 text-red-400 border border-red-500/30",
    },
  } as const;

  const { label, icon: Icon, classes } = config[sla.status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        classes,
        className
      )}
      title={`SLA: ${sla.daysElapsed}/${sla.daysAllowed} days elapsed`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}
