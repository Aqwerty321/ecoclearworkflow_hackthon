
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { GradientText } from "@/components/ui/gradient-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { TableSkeleton } from "@/components/ui/page-skeleton";
import Link from "next/link";

const TEMPLATE_TYPES: Array<'document' | 'gist'> = ["document", "gist"];
const TEMPLATE_TYPE_LABELS: Record<'document' | 'gist', string> = {
  document: "Document Template",
  gist: "AI Gist Prompt",
};

export default function SystemTemplatesPage() {
  const { templates, currentUser, addTemplate, updateTemplate, deleteTemplate, hydrated } = useAppStore();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [type, setType] = useState<'document' | 'gist'>(TEMPLATE_TYPES[0]);
  const [content, setContent] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (!hydrated) return <TableSkeleton />;
  if (currentUser?.role !== 'Admin') return (
    <div className="p-8 text-center text-muted-foreground space-y-3">
      <p>You do not have permission to access this page.</p>
      <Button variant="outline" size="sm" asChild><Link href="/dashboard">Back to Dashboard</Link></Button>
    </div>
  );

  const openAdd = () => {
    setEditingId(null);
    setTemplateName("");
    setType(TEMPLATE_TYPES[0]);
    setContent("");
    setDialogOpen(true);
  };

  const openEdit = (tpl: { id: string; templateName: string; type: 'document' | 'gist'; content: string }) => {
    setEditingId(tpl.id);
    setTemplateName(tpl.templateName);
    setType(tpl.type);
    setContent(tpl.content);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!templateName.trim() || !content.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Name and content are required." });
      return;
    }
    if (editingId) {
      updateTemplate(editingId, { templateName: templateName.trim(), type, content: content.trim() });
      toast({ title: "Template Updated", description: `${templateName} has been updated.` });
    } else {
      addTemplate({ templateName: templateName.trim(), type, content: content.trim() });
      toast({ title: "Template Created", description: `${templateName} has been added.` });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteTemplate(id);
    setDeleteConfirm(null);
    toast({ title: "Template Deleted", description: "Template has been removed." });
  };

  return (
    <div className="space-y-6">
      <AnimatedContainer animation="fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8 text-primary" />
              <GradientText>System Templates</GradientText>
            </h1>
            <p className="text-muted-foreground">Manage document templates and AI prompt configurations</p>
          </div>
          <ShimmerButton className="font-bold gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Create Template
          </ShimmerButton>
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="slide-up" delay={100}>
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Document Templates</CardTitle>
            <CardDescription>Reusable templates for EDS letters, EC certificates, and compliance reports</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Template Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl) => (
                  <TableRow key={tpl.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold">{tpl.templateName}</TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted/50 border border-border/50 font-medium">
                        {TEMPLATE_TYPE_LABELS[tpl.type]}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{tpl.content.slice(0, 80)}...</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(tpl)} className="opacity-70 group-hover:opacity-100 transition-opacity">
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive opacity-70 group-hover:opacity-100 transition-opacity" onClick={() => setDeleteConfirm(tpl.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {templates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No templates yet. Create one above.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </AnimatedContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update the template content below." : "Define a reusable document template."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Standard EDS Letter" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Template Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'document' | 'gist')}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{TEMPLATE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Template Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Dear {{proponent_name}},&#10;&#10;With reference to your application {{app_id}}..."
                className="min-h-[200px] font-mono text-sm focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? "Save Changes" : "Create Template"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>Are you sure? This template will be permanently removed.</DialogDescription>
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
