
"use client";

import { ApplicationStatus } from "@/lib/types";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineProps {
  currentStatus: ApplicationStatus;
}

export function ApplicationTimeline({ currentStatus }: TimelineProps) {
  const steps: { label: string; status: ApplicationStatus }[] = [
    { label: "Submission", status: "Submitted" },
    { label: "Scrutiny", status: "UnderScrutiny" },
    { label: "Meeting Refer", status: "Referred" },
    { label: "MoM Draft", status: "MoMGenerated" },
    { label: "Finalized", status: "Finalized" },
  ];

  const getStepState = (status: ApplicationStatus) => {
    const order: ApplicationStatus[] = ["Draft", "Submitted", "UnderScrutiny", "EDS", "Referred", "MoMGenerated", "Finalized"];
    const currentIndex = order.indexOf(currentStatus);
    const stepIndex = order.indexOf(status);

    if (currentStatus === "EDS" && status === "UnderScrutiny") return "active";
    if (currentIndex > stepIndex) return "completed";
    if (currentIndex === stepIndex) return "active";
    return "pending";
  };

  return (
    <div className="flex items-center justify-between w-full max-w-3xl mx-auto py-8">
      {steps.map((step, index) => {
        const state = getStepState(step.status);
        return (
          <div key={step.status} className="flex flex-col items-center relative flex-1">
            {/* Line connector */}
            {index !== 0 && (
              <div className={cn(
                "absolute h-0.5 w-full -left-1/2 top-4 -z-10",
                state === "completed" || state === "active" ? "bg-primary" : "bg-slate-200"
              )} />
            )}
            
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white",
              state === "completed" && "border-primary bg-primary text-white",
              state === "active" && "border-primary text-primary",
              state === "pending" && "border-slate-200 text-slate-300"
            )}>
              {state === "completed" ? <CheckCircle2 className="h-5 w-5" /> : 
               state === "active" ? <Clock className="h-5 w-5 animate-pulse" /> : 
               <Circle className="h-5 w-5" />}
            </div>
            <span className={cn(
              "mt-2 text-xs font-semibold uppercase tracking-wider",
              state === "active" ? "text-primary" : "text-muted-foreground"
            )}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
