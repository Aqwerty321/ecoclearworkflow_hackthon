
"use client";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserRole } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function AdminUsersPage() {
  const { users, currentUser, updateUserRole } = useAppStore();
  const { toast } = useToast();

  if (currentUser?.role !== 'Admin') return <div>Unauthorized</div>;

  const handleRoleChange = (userId: string, role: UserRole) => {
    updateUserRole(userId, role);
    toast({ title: "Role Updated", description: "User permissions updated successfully." });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">User Management</h1>
        <p className="text-muted-foreground">Assign and manage system access roles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
          <CardDescription>All users across all government and private agencies</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 border">{user.role}</span>
                  </TableCell>
                  <TableCell>
                    <Select defaultValue={user.role} onValueChange={(v) => handleRoleChange(user.id, v as UserRole)}>
                      <SelectTrigger className="w-[180px]">
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
