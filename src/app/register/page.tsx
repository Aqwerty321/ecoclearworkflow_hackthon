"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowRight, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GradientText } from "@/components/ui/gradient-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";

export default function RegisterPage() {
  const { register, currentUser, hydrated } = useAppStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (hydrated && currentUser) {
      router.push("/dashboard");
    }
  }, [currentUser, hydrated, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const user = await register(name, email, password);
    if (user) {
      router.push("/dashboard");
    } else {
      setError("Registration failed. Email may already be in use.");
    }
    setLoading(false);
  };

  if (!hydrated) return null;

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
        <div className="space-y-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium text-sm animate-slide-up">
            <Shield className="h-4 w-4" />
            Government Authorized System
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-headline font-bold tracking-tight leading-[1.1] animate-slide-up delay-100">
            <GradientText className="font-extrabold">EcoClear</GradientText>
            <br />
            <span className="text-foreground/80 font-light">Workflow</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg animate-slide-up delay-200">
            Register as a Project Proponent to submit environmental clearance applications through our secure platform.
          </p>
          <div className="p-5 rounded-xl border bg-card/80 backdrop-blur-sm shadow-sm animate-slide-up delay-300">
            <h3 className="font-semibold text-foreground">Project Proponent Registration</h3>
            <p className="text-sm text-muted-foreground mt-1">
              After registration, you can submit new environmental clearance applications, upload documents, track your application progress, and make payments.
            </p>
          </div>
        </div>

        <div className="animate-scale-in delay-200">
          <Card className="w-full max-w-md mx-auto glass-strong shadow-2xl shadow-primary/5 border-white/20 dark:border-white/10">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
              <CardDescription>Register as a new Project Proponent</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@organization.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive font-medium animate-shake">{error}</p>
                )}
                <ShimmerButton className="w-full font-bold h-12 text-base" disabled={loading}>
                  {loading ? "Creating Account..." : "Register"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </ShimmerButton>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-border/50 pt-4">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/" className="text-primary font-semibold hover:underline transition-colors">
                  <ArrowLeft className="inline h-3 w-3 mr-1" />
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
