
import { Badge } from "@/components/ui/badge";
import { ApplicationStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const styles: Record<ApplicationStatus, string> = {
    Draft: "bg-slate-100 text-slate-700 border-slate-200",
    Submitted: "bg-blue-100 text-blue-700 border-blue-200",
    UnderScrutiny: "bg-amber-100 text-amber-700 border-amber-200",
    EDS: "bg-rose-100 text-rose-700 border-rose-200",
    Referred: "bg-indigo-100 text-indigo-700 border-indigo-200",
    MoMGenerated: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Finalized: "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <Badge variant="outline" className={`${styles[status]} font-medium px-2 py-0.5`}>
      {status}
    </Badge>
  );
}
