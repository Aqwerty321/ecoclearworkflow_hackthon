
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Eye } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function MyApplicationsPage() {
  const { currentUser, applications, hydrated } = useAppStore();

  if (!hydrated || !currentUser) return null;

  const myApps = applications.filter(a => a.applicantId === currentUser.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <FileText className="h-8 w-8" />
            My Applications
          </h1>
          <p className="text-muted-foreground">Manage your environmental clearance submissions</p>
        </div>
        <Button asChild className="font-bold">
          <Link href="/dashboard/proponent/new">
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application History</CardTitle>
          <CardDescription>All your submitted and draft environmental clearance requests</CardDescription>
        </CardHeader>
        <CardContent>
          {myApps.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-lg border-2 border-dashed">
              <FileText className="mx-auto h-12 w-12 opacity-10 mb-4" />
              <p className="text-muted-foreground font-medium">You haven't started any applications yet.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/dashboard/proponent/new">Start your first application</Link>
              </Button>
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
                {myApps.map((app) => (
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
    </div>
  );
}
