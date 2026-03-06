
"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowRight, Github } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { login, currentUser, hydrated } = useAppStore();
  const [email, setEmail] = useState("proponent-1"); // Default for demo
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (hydrated && currentUser) {
      router.push("/dashboard");
    }
  }, [currentUser, hydrated, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const user = login(email.includes("@") ? email : `${email}@builder.com`);
    if (user) {
      router.push("/dashboard");
    } else {
      alert("User not found. Try: admin-1, proponent-1, scrutiny-1, or mom-1");
    }
    setLoading(false);
  };

  if (!hydrated) return null;

  return (
    <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center py-12 px-4">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-primary border border-accent/30 font-medium text-sm">
          <Shield className="h-4 w-4" />
          Government Authorized System
        </div>
        <h1 className="text-5xl font-headline font-bold text-primary tracking-tight leading-tight">
          EcoClear <span className="text-accent-foreground font-light">Workflow</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg">
          A secure, AI-powered platform for environmental clearance applications, scrutiny, and committee decision-making.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border bg-white shadow-sm">
            <h3 className="font-bold text-primary">Proponents</h3>
            <p className="text-sm text-muted-foreground">Submit and track EC applications in real-time.</p>
          </div>
          <div className="p-4 rounded-xl border bg-white shadow-sm">
            <h3 className="font-bold text-primary">Authorities</h3>
            <p className="text-sm text-muted-foreground">Streamlined scrutiny and meeting management.</p>
          </div>
        </div>
        
        <div className="pt-4">
          <Button variant="outline" asChild className="gap-2">
            <a href="https://github.com/lalitheswar09-data" target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4" />
              View Developer GitHub
            </a>
          </Button>
        </div>
      </div>

      <Card className="w-full max-w-md mx-auto shadow-2xl border-primary/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>Enter your official credentials to access the portal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                placeholder="email@organization.gov" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-[10px] text-muted-foreground italic">Demo hints: proponent-1, admin-1, scrutiny-1, mom-1</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" required />
            </div>
            <Button className="w-full font-bold h-12" disabled={loading}>
              {loading ? "Authenticating..." : "Login to Workspace"}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
