
"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowRight, Github, Leaf, FileCheck, Users, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GradientText } from "@/components/ui/gradient-text";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { login, currentUser, hydrated, firebaseConnected } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (hydrated && currentUser) {
      router.push("/dashboard");
    }
  }, [currentUser, hydrated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const loginEmail = firebaseConnected
      ? email
      : email.includes("@") ? email : `${email}@builder.com`;

    const user = await login(loginEmail, password);
    if (user) {
      router.push("/dashboard");
    } else {
      setError(
        firebaseConnected
          ? "Invalid email or password."
          : "User not found. Check your email and password."
      );
    }
    setLoading(false);
  };

  if (!hydrated) return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-full max-w-md space-y-4 px-4">
        <Skeleton className="h-12 w-48 mx-auto rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );

  const features = [
    { icon: FileCheck, title: "Proponents", desc: "Submit and track EC applications in real-time." },
    { icon: Users, title: "Authorities", desc: "Streamlined scrutiny and meeting management." },
    { icon: Leaf, title: "AI-Powered", desc: "Smart scrutiny analysis and document flagging." },
    { icon: Zap, title: "Real-Time", desc: "Live status updates and instant notifications." },
  ];

  return (
    <div className="fixed inset-0 overflow-auto">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-teal-50 dark:from-slate-950 dark:via-blue-950/50 dark:to-slate-950" />
        <div className="absolute inset-0 opacity-30 dark:opacity-20 animate-gradient" style={{
          backgroundImage: "radial-gradient(ellipse at 20% 50%, hsl(210 100% 80% / 0.3), transparent 50%), radial-gradient(ellipse at 80% 20%, hsl(195 80% 70% / 0.3), transparent 50%), radial-gradient(ellipse at 50% 80%, hsl(170 60% 70% / 0.2), transparent 50%)",
          backgroundSize: "200% 200%",
        }} />
      </div>

      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 lg:gap-12 items-center min-h-screen py-8 md:py-12 px-4 md:px-6">
        {/* Hero Section */}
        <div className="space-y-6 animate-fade-in">
          <div 
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium text-sm animate-slide-up"
          >
            <Shield className="h-4 w-4" />
            Government Authorized System
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-headline font-bold tracking-tight leading-[1.1] animate-slide-up delay-100">
            <GradientText className="font-extrabold">EcoClear</GradientText>
            <br />
            <span className="text-foreground/80 font-light">Workflow</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-lg animate-slide-up delay-200">
            A secure, AI-powered platform for environmental clearance applications, scrutiny, and committee decision-making.
          </p>

          <div className="grid grid-cols-2 gap-3 animate-slide-up delay-300">
            {features.map((f, i) => (
              <SpotlightCard key={f.title} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">{f.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>
          
          <div className="pt-2 animate-slide-up delay-400">
            <Button variant="outline" asChild className="gap-2 rounded-full">
              <a href="https://github.com/lalitheswar09-data" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
                View Developer GitHub
              </a>
            </Button>
          </div>
        </div>

        {/* Login Card */}
        <div className="animate-scale-in delay-200">
          <Card className="w-full max-w-md mx-auto glass-strong shadow-2xl shadow-primary/5 border-white/20 dark:border-white/10">
            <CardHeader className="space-y-1 pb-4">
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
                    className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                  {!firebaseConnected && (
                    <p className="text-[10px] text-muted-foreground italic">
                      Demo mode active — use your assigned credentials
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive font-medium animate-shake">{error}</p>
                )}
                <ShimmerButton className="w-full font-bold h-12 text-base" disabled={loading}>
                  {loading ? "Authenticating..." : "Login to Workspace"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </ShimmerButton>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-border/50 pt-4">
              <p className="text-sm text-muted-foreground">
                New proponent?{" "}
                <Link href="/register" className="text-primary font-semibold hover:underline transition-colors">
                  Register here
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
