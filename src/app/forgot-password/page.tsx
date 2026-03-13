"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowLeft, Mail, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { GradientText } from "@/components/ui/gradient-text";

export default function ForgotPasswordPage() {
  const { forgotPassword, firebaseConnected } = useAppStore();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await forgotPassword(email);
    if (result.success) {
      setSent(true);
    } else {
      setError(result.error ?? "Failed to send reset email. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 overflow-auto">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-teal-50 dark:from-slate-950 dark:via-blue-950/50 dark:to-slate-950" />
        <div className="absolute inset-0 opacity-30 dark:opacity-20" style={{
          backgroundImage: "radial-gradient(ellipse at 20% 50%, hsl(210 100% 80% / 0.3), transparent 50%), radial-gradient(ellipse at 80% 20%, hsl(195 80% 70% / 0.3), transparent 50%)",
        }} />
      </div>

      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 lg:gap-12 items-center min-h-screen py-8 md:py-12 px-4 md:px-6">
        {/* Left panel */}
        <div className="space-y-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium text-sm">
            <Shield className="h-4 w-4" />
            Government Authorized System
          </div>
          <h1 className="text-4xl sm:text-5xl font-headline font-bold tracking-tight leading-[1.1]">
            <GradientText className="font-extrabold">EcoClear</GradientText>
            <br />
            <span className="text-foreground/80 font-light">Workflow</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg">
            Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
          </p>
          <div className="p-5 rounded-xl border bg-card/80 backdrop-blur-sm shadow-sm">
            <h3 className="font-semibold text-foreground">Password Reset</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {firebaseConnected
                ? "A reset link will be sent to your inbox via Firebase Authentication. Check your spam folder if you don't see it."
                : "Demo mode: password reset is simulated — no email is actually sent."}
            </p>
          </div>
        </div>

        {/* Right panel — card */}
        <div className="animate-scale-in delay-200">
          <Card className="w-full max-w-md mx-auto glass-strong shadow-2xl shadow-primary/5 border-white/20 dark:border-white/10">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
              </div>
              <CardDescription>
                We&apos;ll send a reset link to your email address
              </CardDescription>
            </CardHeader>

            <CardContent>
              {sent ? (
                /* ── Success state ── */
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Reset link sent!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {firebaseConnected
                          ? `Check your inbox at ${email} for the password reset link.`
                          : `Demo mode: no real email sent. Use the existing password for ${email}.`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => { setSent(false); setEmail(""); }}
                  >
                    Send to a different email
                  </Button>
                </div>
              ) : (
                /* ── Form state ── */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@organization.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <Button className="w-full h-11 font-bold gap-2" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                    ) : (
                      <><Mail className="h-4 w-4" /> Send Reset Link</>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>

            <CardFooter className="flex justify-center border-t border-border/50 pt-4">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
