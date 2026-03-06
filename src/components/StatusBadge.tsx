
import { Badge } from "@/components/ui/badge";
import { ApplicationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<ApplicationStatus, { classes: string; pulse?: boolean }> = {
  Draft: { classes: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  Submitted: { classes: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30" },
  UnderScrutiny: { classes: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30", pulse: true },
  EDS: { classes: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30", pulse: true },
  Referred: { classes: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30" },
  MoMGenerated: { classes: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30" },
  Finalized: { classes: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30" },
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = statusConfig[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold px-2.5 py-0.5 text-[11px] uppercase tracking-wide transition-colors",
        config.classes,
        config.pulse && "animate-pulse-soft"
      )}
    >
      {status}
    </Badge>
  );
}
