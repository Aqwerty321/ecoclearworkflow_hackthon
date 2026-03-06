
"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Category } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function NewApplicationPage() {
  const { addApplication, sectors, currentUser } = useAppStore();
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    projectName: "",
    industrySector: "",
    category: "B2" as Category,
    description: "",
    location: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const app = addApplication({
      ...formData,
      applicantId: currentUser.id,
    });

    toast({
      title: "Success",
      description: "Application drafted successfully. You can now upload documents.",
    });

    router.push(`/dashboard/applications/${app.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
          <CardTitle className="text-2xl font-bold">New Environmental Clearance Application</CardTitle>
          <CardDescription className="text-primary-foreground/80">Provide core project details for scrutiny</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input 
                  id="projectName" 
                  placeholder="e.g. Solar Power Park Phase 1" 
                  required 
                  value={formData.projectName}
                  onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector">Industry Sector</Label>
                <Select 
                  onValueChange={(v) => setFormData({...formData, industrySector: v})} 
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map(s => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  defaultValue="B2" 
                  onValueChange={(v) => setFormData({...formData, category: v as Category})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Category A (Central Impact)</SelectItem>
                    <SelectItem value="B1">Category B1 (State Impact)</SelectItem>
                    <SelectItem value="B2">Category B2 (Low Impact)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Project Location</Label>
                <Input 
                  id="location" 
                  placeholder="District, State" 
                  required 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Detailed Project Description</Label>
              <Textarea 
                id="description" 
                placeholder="Describe the scope, environmental footprint, and mitigation plans..." 
                className="min-h-[150px]"
                required
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            <Button variant="ghost" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" className="font-bold">Initialize Application</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
