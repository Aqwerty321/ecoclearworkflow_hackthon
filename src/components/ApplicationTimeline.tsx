
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
    <div className="w-full max-w-3xl mx-auto py-6">
      {/* Desktop horizontal */}
      <div className="hidden sm:flex items-center justify-between">
        {steps.map((step, index) => {
          const state = getStepState(step.status);
          return (
            <div key={step.status} className="flex flex-col items-center relative flex-1">
              {index !== 0 && (
                <div className="absolute h-0.5 w-full -left-1/2 top-5 -z-10 overflow-hidden">
                  <div className={cn(
                    "h-full",
                    state === "completed" || state === "active"
                      ? "bg-primary animate-draw-line"
                      : "bg-border dark:bg-border"
                  )} style={state === "pending" ? { borderTop: "2px dashed hsl(var(--border))" } : undefined} />
                </div>
              )}
              
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-background",
                state === "completed" && "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20",
                state === "active" && "border-primary text-primary ring-4 ring-primary/10",
                state === "pending" && "border-border text-muted-foreground/40"
              )}>
                {state === "completed" ? <CheckCircle2 className="h-5 w-5" /> : 
                 state === "active" ? <Clock className="h-5 w-5 animate-pulse-soft" /> : 
                 <Circle className="h-5 w-5" />}
              </div>
              <span className={cn(
                "mt-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors",
                state === "active" ? "text-primary" : 
                state === "completed" ? "text-foreground" : 
                "text-muted-foreground/50"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile vertical */}
      <div className="flex sm:hidden flex-col gap-0">
        {steps.map((step, index) => {
          const state = getStepState(step.status);
          return (
            <div key={step.status} className="flex items-start gap-3 relative">
              {index !== steps.length - 1 && (
                <div className={cn(
                  "absolute left-[19px] top-10 w-0.5 h-8",
                  state === "completed" ? "bg-primary" : "bg-border"
                )} />
              )}
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0 bg-background",
                state === "completed" && "border-primary bg-primary text-primary-foreground",
                state === "active" && "border-primary text-primary ring-4 ring-primary/10",
                state === "pending" && "border-border text-muted-foreground/40"
              )}>
                {state === "completed" ? <CheckCircle2 className="h-5 w-5" /> : 
                 state === "active" ? <Clock className="h-5 w-5 animate-pulse-soft" /> : 
                 <Circle className="h-5 w-5" />}
              </div>
              <div className="pt-2 pb-8">
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  state === "active" ? "text-primary" : 
                  state === "completed" ? "text-foreground" : 
                  "text-muted-foreground/50"
                )}>
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
