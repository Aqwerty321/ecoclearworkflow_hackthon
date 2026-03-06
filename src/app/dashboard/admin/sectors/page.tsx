
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SectorManagementPage() {
  const { sectors, currentUser } = useAppStore();

  if (currentUser?.role !== 'Admin') return <div className="p-8 text-center">Unauthorized</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Layers className="h-8 w-8" />
            Sector Management
          </h1>
          <p className="text-muted-foreground">Configure industry sectors and compliance parameters</p>
        </div>
        <Button className="font-bold">
          <Plus className="mr-2 h-4 w-4" /> Add New Sector
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Industry Sectors</CardTitle>
          <CardDescription>Defined categories for environmental scrutiny categorization</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sector Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectors.map((sector) => (
                <TableRow key={sector.id}>
                  <TableCell className="font-bold">{sector.name}</TableCell>
                  <TableCell className="text-muted-foreground">{sector.description}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
