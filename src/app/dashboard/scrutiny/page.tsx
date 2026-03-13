
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Eye, ClipboardCheck, Search, ShieldCheck } from "lucide-react";
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

export default function ScrutinyPoolPage() {
  const { applications, currentUser, hydrated } = useAppStore();
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [statusTab, setStatusTab] = useState<string>("all");

  if (!hydrated) return <TableSkeleton />;

  if (currentUser?.role !== 'Scrutiny Team' && currentUser?.role !== 'Admin') {
    return <div className="p-8 text-center text-muted-foreground">Unauthorized Access</div>;
  }

  // Apply ABAC filtering — users only see applications matching their sector/district assignments
  const accessibleApps = currentUser ? filterApplicationsByAccess(currentUser, applications) : applications;

  // Derive unique sectors from accessible apps
  const availableSectors = useMemo(
    () => Array.from(new Set(accessibleApps.map(a => a.industrySector))).sort(),
    [accessibleApps]
  );

  const poolApps = accessibleApps.filter(app => {
    const inPool = ['Submitted', 'UnderScrutiny', 'EDS'].includes(app.status);
    const matchesSearch = app.projectName.toLowerCase().includes(search.toLowerCase()) || app.id.includes(search);
    const matchesSector = sectorFilter === 'all' || app.industrySector === sectorFilter;
    const matchesStatus = statusTab === 'all' || app.status === statusTab;
    return inPool && matchesSearch && matchesSector && matchesStatus;
  });

  const submittedCount = accessibleApps.filter(a => a.status === 'Submitted').length;
  const underScrutinyCount = accessibleApps.filter(a => a.status === 'UnderScrutiny').length;
  const edsCount = accessibleApps.filter(a => a.status === 'EDS').length;

  // Show ABAC indicator if user has restricted access
  const hasAbacRestrictions = currentUser?.role !== 'Admin' && (
    (currentUser?.assignedSectors && currentUser.assignedSectors.length > 0) ||
    !!currentUser?.assignedDistrict
  );

  return (
    <div className="space-y-6">
      <AnimatedContainer animation="fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ClipboardCheck className="h-8 w-8 text-primary" />
              <GradientText>Scrutiny Pool</GradientText>
            </h1>
            <p className="text-muted-foreground">Technical review and document verification workspace</p>
            {hasAbacRestrictions && (
              <div className="flex items-center gap-1.5 mt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-primary font-medium">
                  Filtered by: {currentUser?.assignedSectors?.join(', ') || 'All sectors'}
                  {currentUser?.assignedDistrict && ` · ${currentUser.assignedDistrict}`}
                </span>
              </div>
            )}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search applications..." 
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
            {[
              { label: "All", value: "all" },
              { label: "Submitted", value: "Submitted" },
              { label: "Under Scrutiny", value: "UnderScrutiny" },
              { label: "EDS", value: "EDS" },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusTab(tab.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                  statusTab === tab.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Sector chips */}
          {availableSectors.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSectorFilter('all')}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                  sectorFilter === 'all'
                    ? "bg-secondary text-secondary-foreground border-secondary"
                    : "bg-background border-border text-muted-foreground hover:border-secondary/60 hover:text-foreground"
                )}
              >
                All Sectors
              </button>
              {availableSectors.map(sector => (
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

      {/* Status summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Submitted", count: submittedCount, color: "border-l-blue-500" },
          { label: "Under Scrutiny", count: underScrutinyCount, color: "border-l-amber-500" },
          { label: "EDS Issued", count: edsCount, color: "border-l-purple-500" },
        ].map((item, i) => (
          <AnimatedContainer key={item.label} animation="slide-up" delay={i * 80}>
            <SpotlightCard className="border-l-4 p-4">
              <div className={`border-l-4 ${item.color} -ml-4 pl-4`}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{item.label}</p>
                <p className="text-2xl font-bold mt-1"><CountUp end={item.count} /></p>
              </div>
            </SpotlightCard>
          </AnimatedContainer>
        ))}
      </div>

      <AnimatedContainer animation="slide-up" delay={300}>
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Active Reviews</CardTitle>
            <CardDescription>Applications currently requiring technical scrutiny or response to EDS</CardDescription>
          </CardHeader>
          <CardContent>
            {poolApps.length === 0 ? (
              <div className="text-center py-20 bg-muted/30 rounded-lg border-2 border-dashed border-border/50">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <ClipboardCheck className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium">No applications found in the scrutiny pool.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Application ID</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poolApps.map((app) => (
                    <TableRow key={app.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs">{app.id}</TableCell>
                      <TableCell className="font-medium">{app.projectName}</TableCell>
                      <TableCell>{app.industrySector}</TableCell>
                      <TableCell><StatusBadge status={app.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(app.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild className="opacity-70 group-hover:opacity-100 transition-opacity">
                          <Link href={`/dashboard/applications/${app.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Review
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
