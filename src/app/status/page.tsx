
"use client";

import { useAppStore } from "@/lib/store";
import { ApplicationTimeline } from "@/components/ApplicationTimeline";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Leaf, RotateCcw, Info, MapPin, CalendarDays, Tag, Building2 } from "lucide-react";
import { useState } from "react";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";

function StatusResult({ application }: { application: Application }) {
  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-xl font-bold leading-snug">{application.projectName}</CardTitle>
              <p className="text-xs text-muted-foreground font-mono mt-1">ID: {application.id}</p>
            </div>
            <StatusBadge status={application.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Public-safe fields only */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="font-medium text-foreground">{application.industrySector}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Tag className="h-4 w-4 shrink-0" />
              <span>Category <span className="font-semibold text-foreground">{application.category}</span></span>
            </div>
            {application.district && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="font-medium text-foreground">{application.district}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span>Filed {new Date(application.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          </div>

          {/* Description (safe to show) */}
          {application.description && (
            <p className="text-sm text-muted-foreground border-t border-border/50 pt-3 leading-relaxed line-clamp-3">
              {application.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="pt-4">
          <ApplicationTimeline currentStatus={application.status} />
        </CardContent>
      </Card>

      {/* Status explanation */}
      <StatusExplanation status={application.status} />
    </div>
  );
}

function StatusExplanation({ status }: { status: Application["status"] }) {
  const info: Record<string, { title: string; body: string }> = {
    Draft: {
      title: "Application Draft",
      body: "The proponent is currently preparing the application. It has not yet been submitted for review.",
    },
    Submitted: {
      title: "Submitted — Awaiting Scrutiny",
      body: "Your application has been received by CECB and is in the queue for technical scrutiny by an environmental officer.",
    },
    UnderScrutiny: {
      title: "Under Technical Scrutiny",
      body: "A CECB officer is reviewing the submitted documents for regulatory compliance and completeness.",
    },
    EDS: {
      title: "Environmental Data Supplement Requested",
      body: "The scrutiny officer has requested additional information or documents. The proponent must respond before the review can continue.",
    },
    Referred: {
      title: "Referred to Expert Committee",
      body: "The application has passed initial scrutiny and is scheduled for discussion at the CECB expert committee meeting.",
    },
    MoMGenerated: {
      title: "Minutes of Meeting Drafted",
      body: "The expert committee has deliberated on this application. A formal record of the meeting decision is being finalised.",
    },
    Finalized: {
      title: "Environmental Clearance Finalised",
      body: "The expert committee has issued its decision. Please contact CECB for the official Environmental Clearance certificate.",
    },
  };

  const item = info[status];
  if (!item) return null;

  return (
    <div className="flex gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-sm">
      <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-blue-300 mb-0.5">{item.title}</p>
        <p className="text-muted-foreground leading-relaxed">{item.body}</p>
      </div>
    </div>
  );
}

export default function PublicStatusPage() {
  const { applications } = useAppStore();
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<Application | null | "not-found">(null);

  const handleSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearched(true);
    const found = applications.find(
      (a) => a.id === trimmed || a.id.toLowerCase() === trimmed.toLowerCase()
    );
    setResult(found ?? "not-found");
  };

  const handleReset = () => {
    setQuery("");
    setSearched(false);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-emerald-900/60 via-primary/10 to-transparent border-b border-border/50 py-8 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="p-2 rounded-full bg-emerald-500/15">
              <Leaf className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Application Status Tracker
          </h1>
          <p className="text-muted-foreground text-sm">
            Chhattisgarh Environment Conservation Board &mdash; Environmental Clearance Portal
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Search box */}
        {!searched ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Enter your Application ID
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9 h-12 text-base font-mono tracking-wide"
                    placeholder="e.g. APP-2024-001"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <Button
                  size="lg"
                  className="h-12 px-6"
                  onClick={handleSearch}
                  disabled={!query.trim()}
                >
                  Track
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Your Application ID was provided when you submitted your application to CECB.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {result === "not-found" ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted/40 flex items-center justify-center">
                  <Search className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">No application found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No application matches ID &ldquo;{query}&rdquo;. Please check and try again.
                  </p>
                </div>
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Search again
                </Button>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <StatusResult application={result} />
                <div className="flex justify-center pt-2">
                  <Button variant="outline" onClick={handleReset} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Track a different application
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pt-4 border-t border-border/30">
          This is a public status lookup. No login required. &nbsp;&bull;&nbsp;
          For assistance contact CECB Raipur: <span className="font-mono">cecb-cg@gov.in</span>
        </p>
      </div>
    </div>
  );
}
