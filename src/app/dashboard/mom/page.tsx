
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Calendar, FileEdit, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function MeetingDeskPage() {
  const { applications, currentUser } = useAppStore();

  if (currentUser?.role !== 'MoM Team' && currentUser?.role !== 'Admin') {
    return <div className="p-8 text-center">Unauthorized Access</div>;
  }

  const meetingApps = applications.filter(app => 
    ['Referred', 'MoMGenerated', 'Finalized'].includes(app.status)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Calendar className="h-8 w-8" />
          Meeting Desk
        </h1>
        <p className="text-muted-foreground">Manage committee meeting gists and draft Minutes of Meeting (MoM)</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-indigo-50 border-indigo-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">Referred to Meeting</p>
                <p className="text-2xl font-bold text-indigo-900">
                  {applications.filter(a => a.status === 'Referred').length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-indigo-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Drafts Generated</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {applications.filter(a => a.status === 'MoMGenerated').length}
                </p>
              </div>
              <FileEdit className="h-8 w-8 text-emerald-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Recently Finalized</p>
                <p className="text-2xl font-bold text-slate-900">
                  {applications.filter(a => a.status === 'Finalized').length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-slate-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Committee Queue</CardTitle>
          <CardDescription>Applications discussed or scheduled for upcoming environmental committee meetings</CardDescription>
        </CardHeader>
        <CardContent>
          {meetingApps.length === 0 ? (
            <div className="text-center py-20">
              <Calendar className="mx-auto h-12 w-12 opacity-10 mb-4" />
              <p className="text-muted-foreground font-medium">No applications are currently in the meeting queue.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meetingApps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.projectName}</TableCell>
                    <TableCell>{app.category}</TableCell>
                    <TableCell><StatusBadge status={app.status} /></TableCell>
                    <TableCell className="text-right">
                      {app.status === 'Referred' || app.status === 'MoMGenerated' ? (
                        <Button variant="default" size="sm" asChild>
                          <Link href={`/dashboard/mom/editor/${app.id}`}>
                            <FileEdit className="h-4 w-4 mr-2" />
                            Process MoM
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/applications/${app.id}`}>
                            View Record
                          </Link>
                        </Button>
                      )}
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
