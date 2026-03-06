
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Eye, Clock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { CountUp } from "@/components/ui/count-up";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { DashboardSkeleton } from "@/components/ui/page-skeleton";

export default function DashboardPage() {
  const { currentUser, applications, hydrated } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !currentUser) {
      router.push("/");
    }
  }, [currentUser, hydrated, router]);

  if (!hydrated || !currentUser) return <DashboardSkeleton />;

  const filteredApps = currentUser.role === 'Project Proponent' 
    ? applications.filter(a => a.applicantId === currentUser.id)
    : applications;

  const stats = {
    total: filteredApps.length,
    pending: filteredApps.filter(a => ['Submitted', 'UnderScrutiny', 'EDS'].includes(a.status)).length,
    finalized: filteredApps.filter(a => a.status === 'Finalized').length,
    referred: filteredApps.filter(a => a.status === 'Referred').length,
  };

  const isProponent = currentUser.role === 'Project Proponent';
  const isAdmin = currentUser.role === 'Admin';
  
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const statCards = [
    { title: "Total Applications", value: stats.total, icon: FileText, color: "text-primary", borderColor: "border-l-primary", bgColor: "bg-primary/5" },
    { title: "Active Review", value: stats.pending, icon: Clock, color: "text-amber-600 dark:text-amber-400", borderColor: "border-l-amber-500", bgColor: "bg-amber-500/5" },
    { title: "Referred to Meeting", value: stats.referred, icon: AlertCircle, color: "text-indigo-600 dark:text-indigo-400", borderColor: "border-l-indigo-500", bgColor: "bg-indigo-500/5" },
    { title: "Finalized EC", value: stats.finalized, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", borderColor: "border-l-emerald-500", bgColor: "bg-emerald-500/5" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <AnimatedContainer animation="slide-up">
        <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 border border-primary/10 p-5 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-headline font-bold text-foreground">
                {greeting}, <span className="text-gradient-primary">{currentUser.name.split(" ")[0]}</span>
              </h1>
              <p className="text-muted-foreground mt-1">Here&apos;s an overview of your workspace activity.</p>
            </div>
            {(isProponent || isAdmin) && (
              <Button asChild className="font-semibold shadow-md shadow-primary/10 shrink-0">
                <Link href="/dashboard/proponent/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Application
                </Link>
              </Button>
            )}
          </div>
        </div>
      </AnimatedContainer>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <AnimatedContainer key={stat.title} animation="slide-up" delay={i * 80}>
            <SpotlightCard className={cn("border-l-4", stat.borderColor)}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.title}</p>
                    <p className={cn("text-3xl font-bold tabular-nums", stat.color)}>
                      <CountUp end={stat.value} />
                    </p>
                  </div>
                  <div className={cn("p-3 rounded-xl", stat.bgColor, stat.color)}>
                    <stat.icon className="h-5 w-5 animate-float" />
                  </div>
                </div>
              </CardContent>
            </SpotlightCard>
          </AnimatedContainer>
        ))}
      </div>

      {/* Recent Applications Table */}
      <AnimatedContainer animation="slide-up" delay={350}>
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Recent Applications</CardTitle>
                <CardDescription>Track the progress of environmental clearances</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild className="gap-1">
                <Link href={currentUser.role === 'Scrutiny Team' ? "/dashboard/scrutiny" : "/dashboard/my-applications"}>
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredApps.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 opacity-30" />
                </div>
                <p className="font-medium">No applications found</p>
                {isProponent && (
                  <Button variant="link" asChild className="mt-2">
                    <Link href="/dashboard/proponent/new">Start your first application</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold">Project Name</TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Sector</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Payment</TableHead>
                      <TableHead className="text-right font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApps.slice(0, 5).map((app) => (
                      <TableRow key={app.id} className="group transition-colors duration-200 hover:bg-muted/50">
                        <TableCell className="font-medium">{app.projectName}</TableCell>
                        <TableCell className="text-muted-foreground">{app.category}</TableCell>
                        <TableCell className="text-muted-foreground">{app.industrySector}</TableCell>
                        <TableCell><StatusBadge status={app.status} /></TableCell>
                        <TableCell>
                          <span className={cn(
                            "text-xs font-semibold px-2.5 py-1 rounded-full border",
                            app.paymentStatus === 'paid' 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30" 
                              : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30"
                          )}>
                            {app.paymentStatus.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild className="opacity-70 group-hover:opacity-100 transition-opacity">
                            <Link href={`/dashboard/applications/${app.id}`}>
                              <Eye className="h-4 w-4 mr-1.5" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
