
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Eye, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { GradientText } from "@/components/ui/gradient-text";
import { TableSkeleton } from "@/components/ui/page-skeleton";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useState, useMemo } from "react";
import type { ApplicationStatus } from "@/lib/types";

type DateRange = 'all' | 'this_week' | 'this_month';
type SortOrder = 'newest' | 'oldest';

const STATUS_FILTERS: { label: string; value: ApplicationStatus | 'all' }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "Draft" },
  { label: "Submitted", value: "Submitted" },
  { label: "Under Scrutiny", value: "UnderScrutiny" },
  { label: "EDS", value: "EDS" },
  { label: "Referred", value: "Referred" },
  { label: "MoM Generated", value: "MoMGenerated" },
  { label: "Finalized", value: "Finalized" },
];

export default function MyApplicationsPage() {
  const { currentUser, applications, hydrated } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // Compute myApps with safe default when not hydrated (avoids conditional hook call)
  const myApps = useMemo(
    () => (hydrated && currentUser) ? applications.filter(a => a.applicantId === currentUser.id) : [],
    [hydrated, currentUser, applications]
  );

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return myApps
      .filter(a => statusFilter === 'all' || a.status === statusFilter)
      .filter(a => {
        if (dateRange === 'all') return true;
        const created = new Date(a.createdAt);
        if (dateRange === 'this_week') return created >= startOfWeek;
        if (dateRange === 'this_month') return created >= startOfMonth;
        return true;
      })
      .sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortOrder === 'newest' ? -diff : diff;
      });
  }, [myApps, statusFilter, dateRange, sortOrder]);

  // Early return AFTER all hooks (React Rules of Hooks)
  if (!hydrated || !currentUser) return <TableSkeleton />;

  return (
    <div className="space-y-6">
      <AnimatedContainer animation="fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              <GradientText>My Applications</GradientText>
            </h1>
            <p className="text-muted-foreground">Manage your environmental clearance submissions</p>
          </div>
          <ShimmerButton className="font-bold gap-2" onClick={() => { window.location.href = "/dashboard/proponent/new"; }}>
            <Plus className="h-4 w-4" />
            New Application
          </ShimmerButton>
        </div>
      </AnimatedContainer>

      {/* Filters row */}
      <AnimatedContainer animation="slide-up" delay={60}>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Status chips */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Date range select */}
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value as DateRange)}
              className="h-8 rounded-md border border-border bg-background text-xs px-2 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="all">All time</option>
              <option value="this_week">This week</option>
              <option value="this_month">This month</option>
            </select>

            {/* Sort toggle */}
            <button
              onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-background text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
            </button>
          </div>
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="slide-up" delay={100}>
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Application History</CardTitle>
            <CardDescription>
              {filtered.length} of {myApps.length} applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-20 bg-muted/30 rounded-lg border-2 border-dashed border-border/50">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground/40" />
                </div>
                {myApps.length === 0 ? (
                  <>
                    <p className="text-muted-foreground font-medium">You haven&apos;t started any applications yet.</p>
                    <Button variant="link" asChild className="mt-2">
                      <Link href="/dashboard/proponent/new">Start your first application</Link>
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground font-medium">No applications match the current filters.</p>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Project Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((app) => (
                    <TableRow key={app.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{app.projectName}</TableCell>
                      <TableCell>{app.category}</TableCell>
                      <TableCell>{app.industrySector}</TableCell>
                      <TableCell><StatusBadge status={app.status} /></TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-full border",
                          app.paymentStatus === 'paid'
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
                            : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30"
                        )}>
                          {(app.paymentStatus ?? 'pending').toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild className="opacity-70 group-hover:opacity-100 transition-opacity">
                          <Link href={`/dashboard/applications/${app.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
