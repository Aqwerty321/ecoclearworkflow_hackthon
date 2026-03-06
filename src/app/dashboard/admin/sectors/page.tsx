
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Layers, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { GradientText } from "@/components/ui/gradient-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";

export default function SectorManagementPage() {
  const { sectors, currentUser, addSector, updateSector, deleteSector } = useAppStore();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<{ id: string; name: string; description: string } | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (currentUser?.role !== 'Admin') return <div className="p-8 text-center text-muted-foreground">Unauthorized</div>;

  const openAdd = () => {
    setEditingSector(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
  };

  const openEdit = (sector: { id: string; name: string; description: string }) => {
    setEditingSector(sector);
    setName(sector.name);
    setDescription(sector.description);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Sector name is required." });
      return;
    }
    if (editingSector) {
      updateSector(editingSector.id, { name: name.trim(), description: description.trim() });
      toast({ title: "Sector Updated", description: `${name} has been updated.` });
    } else {
      addSector({ name: name.trim(), description: description.trim() });
      toast({ title: "Sector Created", description: `${name} has been added.` });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteSector(id);
    setDeleteConfirm(null);
    toast({ title: "Sector Deleted", description: "Sector has been removed." });
  };

  return (
    <div className="space-y-6">
      <AnimatedContainer animation="fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Layers className="h-8 w-8 text-primary" />
              <GradientText>Sector Management</GradientText>
            </h1>
            <p className="text-muted-foreground">Configure industry sectors and compliance parameters</p>
          </div>
          <ShimmerButton className="font-bold gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add New Sector
          </ShimmerButton>
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="slide-up" delay={100}>
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Industry Sectors</CardTitle>
            <CardDescription>Defined categories for environmental scrutiny categorization</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Sector Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectors.map((sector) => (
                  <TableRow key={sector.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold">{sector.name}</TableCell>
                    <TableCell className="text-muted-foreground">{sector.description}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(sector)} className="opacity-70 group-hover:opacity-100 transition-opacity">
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive opacity-70 group-hover:opacity-100 transition-opacity" onClick={() => setDeleteConfirm(sector.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {sectors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No sectors configured. Add one above.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </AnimatedContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSector ? "Edit Sector" : "Add New Sector"}</DialogTitle>
            <DialogDescription>
              {editingSector ? "Update the sector details below." : "Enter the name and description for the new industry sector."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sector Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mining & Minerals" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the sector scope..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingSector ? "Save Changes" : "Create Sector"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sector</DialogTitle>
            <DialogDescription>Are you sure you want to delete this sector? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
