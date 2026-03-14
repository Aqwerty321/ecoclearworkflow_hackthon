
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserRole } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { GradientText } from "@/components/ui/gradient-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { TableSkeleton } from "@/components/ui/page-skeleton";
import Link from "next/link";

const roleColors: Record<string, string> = {
  Admin: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
  "Project Proponent": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
  "Scrutiny Team": "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
  "MoM Team": "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30",
};

export default function AdminUsersPage() {
  const { users, currentUser, updateUserRole, addUser, hydrated } = useAppStore();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("Project Proponent");

  if (!hydrated) return <TableSkeleton />;
  if (currentUser?.role !== 'Admin') return (
    <div className="p-8 text-center text-muted-foreground space-y-3">
      <p>You do not have permission to access this page.</p>
      <Button variant="outline" size="sm" asChild><Link href="/dashboard">Back to Dashboard</Link></Button>
    </div>
  );

  const handleRoleChange = (userId: string, role: UserRole) => {
    if (userId === currentUser?.id) {
      toast({ variant: "destructive", title: "Action Denied", description: "You cannot change your own role." });
      return;
    }
    updateUserRole(userId, role);
    toast({ title: "Role Updated", description: "User permissions updated successfully." });
  };

  const handleAddUser = () => {
    if (!newName.trim() || !newEmail.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Name and email are required." });
      return;
    }
    addUser({ name: newName.trim(), email: newEmail.trim(), role: newRole });
    toast({ title: "User Added", description: `${newName} has been added as ${newRole}.` });
    setDialogOpen(false);
    setNewName("");
    setNewEmail("");
    setNewRole("Project Proponent");
  };

  return (
    <div className="space-y-6">
      <AnimatedContainer animation="fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold"><GradientText>User Management</GradientText></h1>
            <p className="text-muted-foreground">Assign and manage system access roles</p>
          </div>
          <ShimmerButton className="font-bold gap-2" onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add User
          </ShimmerButton>
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="slide-up" delay={100}>
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Registered Users ({users.length})</CardTitle>
            <CardDescription>All users across all government and private agencies</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full border",
                        roleColors[user.role] || "bg-muted border-border"
                      )}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select defaultValue={user.role} onValueChange={(v) => handleRoleChange(user.id, v as UserRole)}>
                        <SelectTrigger className="w-[180px] h-9">
                          <SelectValue placeholder="Change Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Project Proponent">Project Proponent</SelectItem>
                          <SelectItem value="Scrutiny Team">Scrutiny Team</SelectItem>
                          <SelectItem value="MoM Team">MoM Team</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No users found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </AnimatedContainer>

      {/* Add User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account and assign a role.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Doe" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="john@example.com" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Project Proponent">Project Proponent</SelectItem>
                  <SelectItem value="Scrutiny Team">Scrutiny Team</SelectItem>
                  <SelectItem value="MoM Team">MoM Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUser}>Add User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
