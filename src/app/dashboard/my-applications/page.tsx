
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Eye } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { GradientText } from "@/components/ui/gradient-text";
import { TableSkeleton } from "@/components/ui/page-skeleton";
import { ShimmerButton } from "@/components/ui/shimmer-button";

export default function MyApplicationsPage() {
  const { currentUser, applications, hydrated } = useAppStore();

  if (!hydrated || !currentUser) return <TableSkeleton />;

  const myApps = applications.filter(a => a.applicantId === currentUser.id);

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
          <ShimmerButton asChild className="font-bold gap-2">
            <Link href="/dashboard/proponent/new">
              <Plus className="h-4 w-4" />
              New Application
            </Link>
          </ShimmerButton>
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="slide-up" delay={100}>
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Application History</CardTitle>
            <CardDescription>All your submitted and draft environmental clearance requests</CardDescription>
          </CardHeader>
          <CardContent>
            {myApps.length === 0 ? (
              <div className="text-center py-20 bg-muted/30 rounded-lg border-2 border-dashed border-border/50">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium">You haven&apos;t started any applications yet.</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/dashboard/proponent/new">Start your first application</Link>
                </Button>
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
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myApps.map((app) => (
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
                          {app.paymentStatus.toUpperCase()}
                        </span>
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
