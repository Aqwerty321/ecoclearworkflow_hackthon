
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Eye, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { currentUser, applications, hydrated } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !currentUser) {
      router.push("/");
    }
  }, [currentUser, hydrated, router]);

  if (!hydrated || !currentUser) return null;

  // Filter apps based on role
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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {currentUser.name}. Here's an overview of your workspace.</p>
        </div>
        {(isProponent || isAdmin) && (
          <Button asChild className="font-bold">
            <Link href="/dashboard/proponent/new">
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Applications" value={stats.total} icon={FileText} />
        <StatCard title="Active Review" value={stats.pending} icon={Clock} color="text-amber-600" />
        <StatCard title="Referred to Meeting" value={stats.referred} icon={AlertCircle} color="text-indigo-600" />
        <StatCard title="Finalized EC" value={stats.finalized} icon={CheckCircle2} color="text-green-600" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Recent Applications</CardTitle>
              <CardDescription>Track the progress of environmental clearances</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={currentUser.role === 'Scrutiny Team' ? "/dashboard/scrutiny" : "/dashboard/my-applications"}>
                View All
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredApps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 opacity-20 mb-4" />
              <p>No applications found.</p>
              {isProponent && (
                <Button variant="link" asChild>
                  <Link href="/dashboard/proponent/new">Start your first application</Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApps.slice(0, 5).map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.projectName}</TableCell>
                    <TableCell>{app.category}</TableCell>
                    <TableCell>{app.industrySector}</TableCell>
                    <TableCell><StatusBadge status={app.status} /></TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full border",
                        app.paymentStatus === 'paid' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                      )}>
                        {app.paymentStatus.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
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
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = "text-primary" }: any) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className={cn("text-3xl font-bold", color)}>{value}</p>
          </div>
          <div className={cn("p-3 rounded-xl bg-slate-100", color)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
