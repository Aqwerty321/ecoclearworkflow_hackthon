
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Eye, ClipboardCheck, Search } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function ScrutinyPoolPage() {
  const { applications, currentUser } = useAppStore();
  const [search, setSearch] = useState("");

  if (currentUser?.role !== 'Scrutiny Team' && currentUser?.role !== 'Admin') {
    return <div className="p-8 text-center">Unauthorized Access</div>;
  }

  const poolApps = applications.filter(app => 
    ['Submitted', 'UnderScrutiny', 'EDS'].includes(app.status) &&
    (app.projectName.toLowerCase().includes(search.toLowerCase()) || app.id.includes(search))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8" />
            Scrutiny Pool
          </h1>
          <p className="text-muted-foreground">Technical review and document verification workspace</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search applications..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Reviews</CardTitle>
          <CardDescription>Applications currently requiring technical scrutiny or response to EDS</CardDescription>
        </CardHeader>
        <CardContent>
          {poolApps.length === 0 ? (
            <div className="text-center py-20">
              <ClipboardCheck className="mx-auto h-12 w-12 opacity-10 mb-4" />
              <p className="text-muted-foreground font-medium">No applications found in the scrutiny pool.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
                  <TableRow key={app.id}>
                    <TableCell className="font-mono text-xs">{app.id}</TableCell>
                    <TableCell className="font-medium">{app.projectName}</TableCell>
                    <TableCell>{app.industrySector}</TableCell>
                    <TableCell><StatusBadge status={app.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(app.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
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
    </div>
  );
}
