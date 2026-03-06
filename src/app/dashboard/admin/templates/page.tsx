
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, FileText, Layout } from "lucide-react";

export default function SystemTemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Settings className="h-8 w-8" />
          System Templates
        </h1>
        <p className="text-muted-foreground">Manage document templates and AI prompt configurations</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Document Templates</CardTitle>
            </div>
            <CardDescription>Manage structured layouts for EDS letters and EC certificates</CardDescription>
          </CardHeader>
          <CardContent className="h-40 flex items-center justify-center border-t">
            <p className="text-sm text-muted-foreground italic">Template editor interface is under maintenance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Layout className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">UI Configurations</CardTitle>
            </div>
            <CardDescription>Customize dashboard layout and branding for different departments</CardDescription>
          </CardHeader>
          <CardContent className="h-40 flex items-center justify-center border-t">
            <p className="text-sm text-muted-foreground italic">Branding settings coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
