
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, Settings, Database, FileText, CheckCircle2, Clock,
  ArrowRight, LayoutDashboard, Activity, ShieldCheck, TrendingUp, PieChart as PieIcon
} from "lucide-react";
import Link from "next/link";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { GradientText } from "@/components/ui/gradient-text";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/utils";
import { DashboardSkeleton } from "@/components/ui/page-skeleton";
import { getSLAInfo, SLA_DAYS } from "@/lib/types";
import type { ApplicationStatus } from "@/lib/types";
import { subMonths, format, isAfter, isBefore, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  LineChart, Line, CartesianGrid,
} from "recharts";

// Tailwind → hex for recharts (can't use CSS variables inside SVG)
const STATUS_COLORS: Record<string, string> = {
  Draft:        "#94a3b8",
  Submitted:    "#60a5fa",
  UnderScrutiny:"#fbbf24",
  EDS:          "#c084fc",
  Referred:     "#818cf8",
  MoMGenerated: "#2dd4bf",
  Finalized:    "#34d399",
};

const SECTOR_COLORS = [
  "#60a5fa", "#f59e0b", "#34d399", "#c084fc", "#fb7185",
  "#2dd4bf", "#818cf8", "#fbbf24", "#a3e635", "#f97316",
];

const PIPELINE_ORDER: ApplicationStatus[] = ["Draft","Submitted","UnderScrutiny","EDS","Referred","MoMGenerated","Finalized"];

const LABEL_MAP: Record<string, string> = {
  Draft: "Draft",
  Submitted: "Submitted",
  UnderScrutiny: "Scrutiny",
  EDS: "EDS",
  Referred: "Referred",
  MoMGenerated: "MoM",
  Finalized: "Finalized",
};

export default function AdminDashboardPage() {
  const { applications, users, sectors, templates, currentUser, hydrated } = useAppStore();

  if (!hydrated) return <DashboardSkeleton />;
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="p-8 text-center text-muted-foreground space-y-3">
        <p>You do not have permission to access the Admin panel.</p>
        <Button variant="outline" size="sm" asChild><Link href="/dashboard">Back to Dashboard</Link></Button>
      </div>
    );
  }

  const totalApps = applications.length;
  const activeApps = applications.filter(a => !['Finalized','Draft'].includes(a.status)).length;
  const finalizedApps = applications.filter(a => a.status === 'Finalized').length;
  const pendingPayments = applications.filter(a => a.paymentStatus === 'pending').length;
  const totalUsers = users.length;
  const totalSectors = sectors.length;
  const totalTemplates = templates.length;

  // ---- SLA Compliance Rate ----
  const pipelineApps = applications.filter(a => SLA_DAYS[a.status]);
  const slaOnTrackCount = pipelineApps.filter(a => getSLAInfo(a).status === 'on-track').length;
  const slaComplianceRate = pipelineApps.length > 0
    ? Math.round((slaOnTrackCount / pipelineApps.length) * 100)
    : 100;

  // ---- Pipeline bar chart ----
  const chartData = PIPELINE_ORDER.map(status => ({
    name: LABEL_MAP[status],
    status,
    count: applications.filter(a => a.status === status).length,
  }));

  // ---- Sector Distribution Pie ----
  const sectorMap: Record<string, number> = {};
  applications.forEach(a => {
    sectorMap[a.industrySector] = (sectorMap[a.industrySector] || 0) + 1;
  });
  const sectorPieData = Object.entries(sectorMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ---- Monthly Trend Line (last 6 months) ----
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const monthDate = subMonths(now, 5 - i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const submitted = applications.filter(a => {
      const d = new Date(a.createdAt);
      return isAfter(d, start) && isBefore(d, end);
    }).length;
    const finalized = applications.filter(a => {
      if (a.status !== 'Finalized') return false;
      const d = new Date(a.updatedAt);
      return isAfter(d, start) && isBefore(d, end);
    }).length;
    return { month: format(monthDate, 'MMM'), submitted, finalized };
  });

  // ---- Time in Current Stage BarChart (avg days) ----
  const IN_PIPELINE: ApplicationStatus[] = ["Submitted","UnderScrutiny","EDS","Referred","MoMGenerated"];
  const stageTimeData = IN_PIPELINE.map(status => {
    const appsInStage = applications.filter(a => a.status === status);
    if (appsInStage.length === 0) return { stage: LABEL_MAP[status], avgDays: 0 };
    const totalDays = appsInStage.reduce((sum, a) => {
      return sum + Math.floor((now.getTime() - new Date(a.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
    return { stage: LABEL_MAP[status], avgDays: Math.round(totalDays / appsInStage.length) };
  });

  const stats = [
    {
      title: "Total Applications",
      value: totalApps,
      icon: FileText,
      color: "text-primary",
      borderColor: "border-l-primary",
      bgColor: "bg-primary/5",
      suffix: "",
    },
    {
      title: "Active in Pipeline",
      value: activeApps,
      icon: Activity,
      color: "text-amber-600 dark:text-amber-400",
      borderColor: "border-l-amber-500",
      bgColor: "bg-amber-500/5",
      suffix: "",
    },
    {
      title: "Finalized EC",
      value: finalizedApps,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-l-emerald-500",
      bgColor: "bg-emerald-500/5",
      suffix: "",
    },
    {
      title: "SLA Compliance",
      value: slaComplianceRate,
      icon: Clock,
      color: slaComplianceRate >= 75
        ? "text-emerald-600 dark:text-emerald-400"
        : slaComplianceRate >= 50
        ? "text-amber-600 dark:text-amber-400"
        : "text-rose-600 dark:text-rose-400",
      borderColor: slaComplianceRate >= 75 ? "border-l-emerald-500" : slaComplianceRate >= 50 ? "border-l-amber-500" : "border-l-rose-500",
      bgColor: slaComplianceRate >= 75 ? "bg-emerald-500/5" : slaComplianceRate >= 50 ? "bg-amber-500/5" : "bg-rose-500/5",
      suffix: "%",
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
                      <CountUp end={stat.value} />{stat.suffix}
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

      {/* Row 1: Quick Actions + Pipeline bar chart */}
      <div className="grid md:grid-cols-2 gap-6">
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

        <AnimatedContainer animation="slide-up" delay={450}>
          <Card className="shadow-sm border-border/50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Pipeline Analytics
              </CardTitle>
              <CardDescription>Applications by stage — total {totalApps}</CardDescription>
            </CardHeader>
            <CardContent>
              {totalApps === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No applications yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.04)" }}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number) => [value, "Applications"]}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {chartData.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="mt-4 pt-4 border-t border-border/50">
                <Button variant="outline" size="sm" asChild className="w-full gap-2">
                  <Link href="/dashboard/applications">
                    View All Applications <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Row 2: Sector Pie + Monthly Trend */}
      <div className="grid md:grid-cols-2 gap-6">
        <AnimatedContainer animation="slide-up" delay={500}>
          <Card className="shadow-sm border-border/50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieIcon className="h-5 w-5 text-primary" />
                Sector Distribution
              </CardTitle>
              <CardDescription>Applications by industry sector</CardDescription>
            </CardHeader>
            <CardContent>
              {sectorPieData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <PieIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No data yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={sectorPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name.length > 10 ? name.slice(0, 10) + '…' : name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {sectorPieData.map((_, idx) => (
                        <Cell key={idx} fill={SECTOR_COLORS[idx % SECTOR_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number, name: string) => [value, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer animation="slide-up" delay={550}>
          <Card className="shadow-sm border-border/50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Monthly Trend
              </CardTitle>
              <CardDescription>Submitted vs Finalized — last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="submitted" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} name="Submitted" />
                  <Line type="monotone" dataKey="finalized" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} name="Finalized" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Row 3: Stage Bottleneck BarChart */}
      <AnimatedContainer animation="slide-up" delay={600}>
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Stage Bottleneck Analysis
            </CardTitle>
            <CardDescription>Average days applications have been in each active stage (identifies delays)</CardDescription>
          </CardHeader>
          <CardContent>
            {activeApps === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No active applications in pipeline</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stageTimeData} layout="vertical" margin={{ top: 4, right: 24, left: 10, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} unit="d" />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number) => [`${v} days`, "Avg time"]}
                  />
                  <Bar dataKey="avgDays" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {stageTimeData.map((entry, idx) => {
                      const slaLimit = SLA_DAYS[Object.keys(LABEL_MAP).find(k => LABEL_MAP[k] === entry.stage) as ApplicationStatus ?? ""] ?? Infinity;
                      const color = entry.avgDays > slaLimit ? "#fb7185" : entry.avgDays > slaLimit * 0.75 ? "#fbbf24" : "#34d399";
                      return <Cell key={idx} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Green = within SLA &nbsp;·&nbsp; Amber = nearing limit &nbsp;·&nbsp; Red = SLA breached
            </p>
          </CardContent>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
