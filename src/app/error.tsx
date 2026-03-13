"use client";

/**
 * Global Error Boundary — Next.js app/error.tsx
 *
 * Catches unhandled errors in the application shell and displays a
 * user-friendly recovery UI instead of a blank white screen.
 * Uses the Next.js Error Boundary convention (must be a Client Component).
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to console in development; in production this would go to an
    // observability service (e.g., Sentry, Datadog).
    console.error("[EcoClear] Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">
            An unexpected error occurred in the EcoClear application. Your data is safe — please
            try recovering or return to the dashboard.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-1 rounded inline-block">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
          <Button variant="outline" asChild>
            <a href="/dashboard" className="gap-2 flex items-center">
              <Home className="h-4 w-4" /> Go to Dashboard
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
