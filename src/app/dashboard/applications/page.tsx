
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Eye, Layers, Search, ShieldCheck, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { GradientText } from "@/components/ui/gradient-text";
import { TableSkeleton } from "@/components/ui/page-skeleton";
import { CountUp } from "@/components/ui/count-up";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { filterApplicationsByAccess } from "@/lib/types";
import type { ApplicationStatus } from "@/lib/types";

const ALL_STATUSES: { label: string; value: ApplicationStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "Draft" },
  { label: "Submitted", value: "Submitted" },
  { label: "Under Scrutiny", value: "UnderScrutiny" },
  { label: "EDS", value: "EDS" },
  { label: "Referred", value: "Referred" },
  { label: "MoM Generated", value: "MoMGenerated" },
  { label: "Finalized", value: "Finalized" },
];

export default function AllApplicationsPage() {
  const { applications, currentUser, hydrated } = useAppStore();
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortAsc, setSortAsc] = useState(false);

  if (!hydrated) return <TableSkeleton />;

  if (
    currentUser?.role !== "Admin" &&
    currentUser?.role !== "Scrutiny Team" &&
    currentUser?.role !== "MoM Team"
  ) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Unauthorized Access
      </div>
    );
  }

  // Apply ABAC filtering
  const accessibleApps = currentUser
    ? filterApplicationsByAccess(currentUser, applications)
    : applications;

  // Derive unique sectors from accessible apps
  const availableSectors = useMemo(
    () => Array.from(new Set(accessibleApps.map((a) => a.industrySector))).sort(),
    [accessibleApps]
  );

  // Filter + sort
  const filteredApps = useMemo(() => {
    const result = accessibleApps.filter((app) => {
      const matchesSearch =
        app.projectName.toLowerCase().includes(search.toLowerCase()) ||
        app.id.includes(search);
      const matchesSector =
        sectorFilter === "all" || app.industrySector === sectorFilter;
      const matchesStatus =
        statusFilter === "all" || app.status === statusFilter;
      return matchesSearch && matchesSector && matchesStatus;
    });
    result.sort((a, b) => {
      const diff =
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return sortAsc ? diff : -diff;
    });
    return result;
  }, [accessibleApps, search, sectorFilter, statusFilter, sortAsc]);

  // Summary counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const app of accessibleApps) {
      counts[app.status] = (counts[app.status] || 0) + 1;
    }
    return counts;
  }, [accessibleApps]);

  const hasAbacRestrictions =
    currentUser?.role !== "Admin" &&
    ((currentUser?.assignedSectors && currentUser.assignedSectors.length > 0) ||
      !!currentUser?.assignedDistrict);

  const summaryCards = [
    { label: "Total", count: accessibleApps.length, color: "border-l-primary" },
    { label: "Submitted", count: statusCounts["Submitted"] || 0, color: "border-l-blue-500" },
    { label: "Under Scrutiny", count: statusCounts["UnderScrutiny"] || 0, color: "border-l-amber-500" },
    { label: "Finalized", count: statusCounts["Finalized"] || 0, color: "border-l-green-500" },
  ];

  return (
    <div className="space-y-6">
      <AnimatedContainer animation="fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Layers className="h-8 w-8 text-primary" />
              <GradientText>All Applications</GradientText>
            </h1>
            <p className="text-muted-foreground">
              Browse and manage environmental clearance applications
            </p>
            {hasAbacRestrictions && (
              <div className="flex items-center gap-1.5 mt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-primary font-medium">
                  Filtered by:{" "}
                  {currentUser?.assignedSectors?.join(", ") || "All sectors"}
                  {currentUser?.assignedDistrict &&
                    ` · ${currentUser.assignedDistrict}`}
                </span>
              </div>
            )}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or ID..."
              className="pl-9 h-11 focus:ring-2 focus:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </AnimatedContainer>

      {/* Status tabs + sector chips */}
      <AnimatedContainer animation="slide-up" delay={80}>
        <div className="space-y-3">
          {/* Status tabs */}
          <div className="flex flex-wrap gap-1.5">
            {ALL_STATUSES.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                  statusFilter === tab.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                )}
              >
                {tab.label}
                {tab.value !== "all" && statusCounts[tab.value] != null && (
                  <span className="ml-1 opacity-70">
                    ({statusCounts[tab.value]})
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Sector chips */}
          {availableSectors.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSectorFilter("all")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                  sectorFilter === "all"
                    ? "bg-secondary text-secondary-foreground border-secondary"
                    : "bg-background border-border text-muted-foreground hover:border-secondary/60 hover:text-foreground"
                )}
              >
                All Sectors
              </button>
              {availableSectors.map((sector) => (
                <button
                  key={sector}
                  onClick={() => setSectorFilter(sector)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                    sectorFilter === sector
                      ? "bg-secondary text-secondary-foreground border-secondary"
                      : "bg-background border-border text-muted-foreground hover:border-secondary/60 hover:text-foreground"
                  )}
                >
                  {sector}
                </button>
              ))}
            </div>
          )}
        </div>
      </AnimatedContainer>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((item, i) => (
          <AnimatedContainer key={item.label} animation="slide-up" delay={i * 60}>
            <SpotlightCard className="border-l-4 p-4">
              <div className={`border-l-4 ${item.color} -ml-4 pl-4`}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {item.label}
                </p>
                <p className="text-2xl font-bold mt-1">
                  <CountUp end={item.count} />
                </p>
              </div>
            </SpotlightCard>
          </AnimatedContainer>
        ))}
      </div>

      <AnimatedContainer animation="slide-up" delay={300}>
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Applications</CardTitle>
                <CardDescription>
                  {filteredApps.length} application
                  {filteredApps.length !== 1 ? "s" : ""} found
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortAsc((v) => !v)}
                className="gap-1.5 text-xs"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortAsc ? "Oldest first" : "Newest first"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredApps.length === 0 ? (
              <div className="text-center py-20 bg-muted/30 rounded-lg border-2 border-dashed border-border/50">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Layers className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium">
                  No applications match the current filters.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Application ID</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApps.map((app) => (
                    <TableRow
                      key={app.id}
                      className="group hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-mono text-xs">
                        {app.id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {app.projectName}
                      </TableCell>
                      <TableCell className="text-sm">
                        {app.industrySector}
                      </TableCell>
                      <TableCell className="text-sm">
                        {app.category}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {app.paymentStatus}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(app.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="opacity-70 group-hover:opacity-100 transition-opacity"
                        >
                          <Link href={`/dashboard/applications/${app.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
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
