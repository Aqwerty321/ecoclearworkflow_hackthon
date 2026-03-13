
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, Settings, Database, FileText, CheckCircle2, Clock,
  ArrowRight, LayoutDashboard, Activity, ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { GradientText } from "@/components/ui/gradient-text";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/utils";
import { DashboardSkeleton } from "@/components/ui/page-skeleton";

export default function AdminDashboardPage() {
  const { applications, users, sectors, templates, currentUser, hydrated } = useAppStore();

  if (!hydrated) return <DashboardSkeleton />;
  if (currentUser?.role !== 'Admin') {
    return <div className="p-8 text-center text-muted-foreground">Unauthorized</div>;
  }

  const totalApps = applications.length;
  const activeApps = applications.filter(a => !['Finalized'].includes(a.status)).length;
  const finalizedApps = applications.filter(a => a.status === 'Finalized').length;
  const pendingPayments = applications.filter(a => a.paymentStatus === 'pending').length;
  const totalUsers = users.length;
  const totalSectors = sectors.length;
  const totalTemplates = templates.length;

  const stats = [
    {
      title: "Total Applications",
      value: totalApps,
      icon: FileText,
      color: "text-primary",
      borderColor: "border-l-primary",
      bgColor: "bg-primary/5",
    },
    {
      title: "Active in Pipeline",
      value: activeApps,
      icon: Activity,
      color: "text-amber-600 dark:text-amber-400",
      borderColor: "border-l-amber-500",
      bgColor: "bg-amber-500/5",
    },
    {
      title: "Finalized EC",
      value: finalizedApps,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-l-emerald-500",
      bgColor: "bg-emerald-500/5",
    },
    {
      title: "Pending Payments",
      value: pendingPayments,
      icon: Clock,
      color: "text-rose-600 dark:text-rose-400",
      borderColor: "border-l-rose-500",
      bgColor: "bg-rose-500/5",
    },
  ];

  const quickLinks = [
    {
      title: "User Management",
      description: `${totalUsers} registered users — assign roles and ABAC attributes`,
      href: "/dashboard/admin/users",
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      title: "Industry Sectors",
      description: `${totalSectors} sectors configured — manage clearance categories`,
      href: "/dashboard/admin/sectors",
      icon: Database,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-500/10",
    },
    {
      title: "System Templates",
      description: `${totalTemplates} templates — EDS letters, EC certificates, AI prompts`,
      href: "/dashboard/admin/templates",
      icon: Settings,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
    },
  ];

  // Status distribution for a simple breakdown
  const statusBreakdown: { label: string; count: number; color: string }[] = [
    { label: "Draft", count: applications.filter(a => a.status === 'Draft').length, color: "bg-slate-400" },
    { label: "Submitted", count: applications.filter(a => a.status === 'Submitted').length, color: "bg-blue-400" },
    { label: "Under Scrutiny", count: applications.filter(a => a.status === 'UnderScrutiny').length, color: "bg-amber-400" },
    { label: "EDS", count: applications.filter(a => a.status === 'EDS').length, color: "bg-purple-400" },
    { label: "Referred", count: applications.filter(a => a.status === 'Referred').length, color: "bg-indigo-400" },
    { label: "MoM Generated", count: applications.filter(a => a.status === 'MoMGenerated').length, color: "bg-teal-400" },
    { label: "Finalized", count: applications.filter(a => a.status === 'Finalized').length, color: "bg-emerald-400" },
  ].filter(s => s.count > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <AnimatedContainer animation="fade-in">
        <div className="rounded-xl bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent dark:from-amber-500/20 border border-amber-500/10 p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10">
              <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-headline font-bold">
                <GradientText>Admin Control Panel</GradientText>
              </h1>
              <p className="text-muted-foreground mt-0.5">
                Platform overview for CECB EcoClear Workflow
              </p>
            </div>
          </div>
        </div>
      </AnimatedContainer>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Links */}
        <AnimatedContainer animation="slide-up" delay={350}>
          <Card className="shadow-sm border-border/50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription>Jump to key admin areas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href} className="block group">
                  <div className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all">
                    <div className={cn("p-2.5 rounded-lg flex-shrink-0", link.bg)}>
                      <link.icon className={cn("h-5 w-5", link.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{link.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </AnimatedContainer>

        {/* Pipeline Status Breakdown */}
        <AnimatedContainer animation="slide-up" delay={450}>
          <Card className="shadow-sm border-border/50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Pipeline Status
              </CardTitle>
              <CardDescription>Current distribution of all applications</CardDescription>
            </CardHeader>
            <CardContent>
              {statusBreakdown.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No applications yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {statusBreakdown.map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-28 flex-shrink-0">{item.label}</span>
                      <div className="flex-1 bg-muted/40 rounded-full h-2">
                        <div
                          className={cn("h-2 rounded-full transition-all", item.color)}
                          style={{ width: `${totalApps > 0 ? (item.count / totalApps) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold tabular-nums w-6 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-border/50">
                <Button variant="outline" size="sm" asChild className="w-full gap-2">
                  <Link href="/dashboard/my-applications">
                    View All Applications <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>
      </div>
    </div>
  );
}
