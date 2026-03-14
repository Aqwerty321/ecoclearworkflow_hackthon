"use client";

/**
 * AadhaarEKYC Component — Aadhaar-based electronic KYC verification.
 *
 * Two modes, togglable at runtime:
 *
 *  DEMO MODE (default) — instant verification, no SMS, no Firebase quota.
 *    Shows the full form flow but bypasses real OTP. Safe for repeated demos
 *    on the same phone. Pre-filled with sample values to speed up presentations.
 *
 *  LIVE MODE — real Firebase Phone Auth. Sends actual SMS OTP to the mobile
 *    number entered. Use this when you want to impress a judge with a real
 *    phone ping. Switch back to Demo Mode between sessions to avoid rate limits.
 *
 * Mode is persisted in sessionStorage so it survives page navigations within
 * the same browser tab but resets on a fresh tab (intentional for demos).
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Fingerprint,
  Phone,
  UserCheck,
  Zap,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";

// ── Types ─────────────────────────────────────────────────────────────

export interface EKYCIdentity {
  name: string;
  maskedAadhaar: string;
  phone: string;
  verifiedAt: string;
  /** Whether this was verified via real SMS OTP or demo bypass */
  verificationMode: "demo" | "live";
}

export type EKYCStatus = "pending" | "otp_sent" | "verified" | "failed";
type VerificationMode = "demo" | "live";

interface AadhaarEKYCProps {
  onVerified?: (identity: EKYCIdentity) => void;
  compact?: boolean;
  className?: string;
  userName?: string;
}

// Pre-filled demo values — saves time during presentations
const DEMO_AADHAAR = "999988887777";
const DEMO_PHONE   = "9876543210";

// ── Component ─────────────────────────────────────────────────────────

export function AadhaarEKYC({ onVerified, compact = false, className, userName }: AadhaarEKYCProps) {
  // Restore mode from sessionStorage so it survives navigations within a tab
  const [mode, setMode] = useState<VerificationMode>(() => {
    if (typeof window === "undefined") return "demo";
    return (sessionStorage.getItem("ekyc_mode") as VerificationMode) ?? "demo";
  });

  const [aadhaarNumber, setAadhaarNumber] = useState(DEMO_AADHAAR);
  const [phoneNumber, setPhoneNumber]     = useState(DEMO_PHONE);
  const [otp, setOtp]                     = useState("");
  const [status, setStatus]               = useState<EKYCStatus>("pending");
  const [identity, setIdentity]           = useState<EKYCIdentity | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [loading, setLoading]             = useState(false);
  const [consent, setConsent]             = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const cooldownRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef  = useRef<RecaptchaVerifier | null>(null);

  const firebaseAvailable = !!auth;

  // Persist mode to sessionStorage and reset form state
  const switchMode = useCallback((next: VerificationMode) => {
    if (typeof window !== "undefined") sessionStorage.setItem("ekyc_mode", next);
    setMode(next);
    setStatus("pending");
    setOtp("");
    setError(null);
    setResendCooldown(0);
    if (next === "demo") {
      setAadhaarNumber(DEMO_AADHAAR);
      setPhoneNumber(DEMO_PHONE);
    } else {
      setAadhaarNumber("");
      setPhoneNumber("");
    }
  }, []);

  // Countdown timer
  const startCooldown = useCallback((seconds = 60) => {
    setResendCooldown(seconds);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear(); } catch { /* ignore */ }
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────

  const formatAadhaar = (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 12);
    return d.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const isValidPhone = (p: string) => /^\d{10}$/.test(p);
  const getE164      = (p: string) => `+91${p}`;

  // ── DEMO path: instant verify ─────────────────────────────────────────

  const handleDemoVerify = useCallback(async () => {
    setError(null);
    setLoading(true);
    // Brief delay so it feels like processing
    await new Promise(r => setTimeout(r, 900));
    const digits = aadhaarNumber.replace(/\D/g, "");
    const maskedAadhaar = `XXXX-XXXX-${digits.slice(-4) || "7777"}`;
    const verified: EKYCIdentity = {
      name: userName || "Demo User",
      maskedAadhaar,
      phone: getE164(phoneNumber || DEMO_PHONE),
      verifiedAt: new Date().toISOString(),
      verificationMode: "demo",
    };
    setIdentity(verified);
    setStatus("verified");
    onVerified?.(verified);
    setLoading(false);
  }, [aadhaarNumber, phoneNumber, userName, onVerified]);

  // ── LIVE path: send real SMS OTP ──────────────────────────────────────

  const handleSendOTP = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(
          auth!,
          "recaptcha-container",
          { size: "invisible" }
        );
      }
      const result = await signInWithPhoneNumber(auth!, getE164(phoneNumber), recaptchaVerifierRef.current);
      confirmationResultRef.current = result;
      setStatus("otp_sent");
      startCooldown(60);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      let msg = "Failed to send OTP. Please try again.";
      if (code === "auth/invalid-phone-number")  msg = "Invalid phone number. Enter a valid 10-digit Indian mobile number.";
      if (code === "auth/too-many-requests")      msg = "Too many attempts — Firebase rate limit hit. Switch to Demo Mode to continue.";
      if (code === "auth/quota-exceeded")         msg = "SMS quota exceeded. Switch to Demo Mode to continue without limits.";
      if (code === "auth/captcha-check-failed") {
        msg = "reCAPTCHA failed. Please refresh and try again.";
        if (recaptchaVerifierRef.current) {
          try { recaptchaVerifierRef.current.clear(); } catch { /* ignore */ }
          recaptchaVerifierRef.current = null;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, startCooldown]);

  // ── LIVE path: confirm OTP ────────────────────────────────────────────

  const handleConfirmOTP = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await confirmationResultRef.current!.confirm(otp);
      const digits = aadhaarNumber.replace(/\D/g, "");
      const maskedAadhaar = `XXXX-XXXX-${digits.slice(-4)}`;
      const verified: EKYCIdentity = {
        name: userName || "Verified User",
        maskedAadhaar,
        phone: getE164(phoneNumber),
        verifiedAt: new Date().toISOString(),
        verificationMode: "live",
      };
      setIdentity(verified);
      setStatus("verified");
      onVerified?.(verified);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      let msg = "Verification failed.";
      if (code === "auth/invalid-verification-code") msg = "Incorrect OTP. Please check and retry.";
      if (code === "auth/code-expired")               msg = "OTP has expired. Please request a new one.";
      setError(msg);
      setStatus("failed");
    } finally {
      setLoading(false);
    }
  }, [otp, aadhaarNumber, phoneNumber, userName, onVerified]);

  // ── Verified card ─────────────────────────────────────────────────────

  if (status === "verified" && identity) {
    const isDemo = identity.verificationMode === "demo";
    return (
      <Card className={cn(
        isDemo ? "border-blue-200 dark:border-blue-500/30" : "border-green-200 dark:border-green-500/30",
        className
      )}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isDemo ? "bg-blue-100 dark:bg-blue-500/20" : "bg-green-100 dark:bg-green-500/20"
            )}>
              <UserCheck className={cn(
                "h-5 w-5",
                isDemo ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className={cn(
                  "font-semibold",
                  isDemo ? "text-blue-700 dark:text-blue-300" : "text-green-700 dark:text-green-300"
                )}>
                  Identity Verified
                </p>
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                  isDemo
                    ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                    : "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300"
                )}>
                  {isDemo ? "Demo" : "Live"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isDemo ? "Instant demo verification" : "Real SMS OTP confirmed via Firebase"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Name</p>
              <p className="font-medium">{identity.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Aadhaar (masked)</p>
              <p className="font-mono">{identity.maskedAadhaar}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Mobile</p>
              <p>{identity.phone}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Verified At</p>
              <p className="text-xs">{new Date(identity.verifiedAt).toLocaleString()}</p>
            </div>
          </div>

          <div className={cn(
            "mt-3 flex items-center gap-1 text-xs",
            isDemo ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"
          )}>
            <CheckCircle2 className="h-3 w-3" />
            {isDemo
              ? "Demo mode — instant pre-verification for presentation"
              : "Live mode — Aadhaar eKYC confirmed via real SMS OTP"}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────

  const isDemoMode = mode === "demo";

  return (
    <Card className={cn("border-border/50", className)}>
      {/* Invisible reCAPTCHA anchor (must stay in DOM for Live mode) */}
      <div id="recaptcha-container" />

      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Aadhaar e-KYC Verification</CardTitle>
          </div>

          {/* Demo / Live toggle — always visible */}
          <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => switchMode("demo")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md transition-all",
                isDemoMode
                  ? "bg-background shadow text-blue-600 dark:text-blue-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Zap className="h-3 w-3" />
              Demo
            </button>
            <button
              type="button"
              onClick={() => switchMode("live")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md transition-all",
                !isDemoMode
                  ? "bg-background shadow text-green-600 dark:text-green-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
              disabled={!firebaseAvailable}
              title={!firebaseAvailable ? "Firebase not configured" : undefined}
            >
              <Radio className="h-3 w-3" />
              Live OTP
            </button>
          </div>
        </div>

        {!compact && (
          <CardDescription>
            {isDemoMode
              ? "Demo mode — instant verification, no SMS. Toggle to Live OTP to send a real SMS when presenting to judges."
              : "Live mode — a real SMS OTP will be sent. Switch back to Demo Mode between repeated sessions to avoid rate limits."}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">

        {/* Mode banners */}
        {isDemoMode && (
          <div className="flex items-start gap-2 text-xs bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 rounded-lg px-3 py-2">
            <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              <strong>Demo Mode:</strong> Pre-filled with sample Aadhaar + phone. Hit{" "}
              <strong>Instant Verify</strong> to proceed — no SMS sent, no rate limits, works unlimited times.
            </span>
          </div>
        )}

        {!isDemoMode && (
          <div className="flex items-start gap-2 text-xs bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-300 rounded-lg px-3 py-2">
            <Radio className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              <strong>Live OTP Mode:</strong> Real SMS will be sent. Firebase limits ~5 SMS / 10 min to the same
              number — switch to <strong>Demo Mode</strong> between repeated demos to avoid hitting the limit.
            </span>
          </div>
        )}

        {/* Aadhaar Number */}
        <div className="space-y-2">
          <Label htmlFor="aadhaar">Aadhaar Number</Label>
          <Input
            id="aadhaar"
            placeholder="XXXX XXXX XXXX"
            value={formatAadhaar(aadhaarNumber)}
            onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ""))}
            maxLength={14}
            disabled={status === "otp_sent" || loading}
            className="font-mono"
          />
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phone">
            Mobile Number{" "}
            <span className="text-muted-foreground font-normal text-xs">(Aadhaar-linked)</span>
          </Label>
          <div className="flex gap-2">
            <div className="flex items-center px-3 bg-muted border border-border rounded-md text-sm text-muted-foreground select-none shrink-0">
              +91
            </div>
            <Input
              id="phone"
              placeholder="9876543210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              maxLength={10}
              disabled={status === "otp_sent" || loading}
              className="font-mono"
              inputMode="numeric"
            />

            {/* LIVE: Send OTP button */}
            {!isDemoMode && status === "pending" && (
              <Button
                onClick={handleSendOTP}
                disabled={
                  aadhaarNumber.replace(/\D/g, "").length !== 12 ||
                  !isValidPhone(phoneNumber) ||
                  loading
                }
                size="sm"
                className="gap-1 whitespace-nowrap"
              >
                {loading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Phone className="h-4 w-4" />}
                Send OTP
              </Button>
            )}
          </div>
        </div>

        {/* DEMO: single instant-verify button */}
        {isDemoMode && status === "pending" && (
          <Button
            onClick={handleDemoVerify}
            disabled={aadhaarNumber.replace(/\D/g, "").length !== 12 || loading}
            className="w-full gap-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
            ) : (
              <><Zap className="h-4 w-4" /> Instant Verify (Demo)</>
            )}
          </Button>
        )}

        {/* LIVE: OTP input + confirm */}
        {!isDemoMode && status === "otp_sent" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="otp">Enter OTP</Label>
              <Input
                id="otp"
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                disabled={loading}
                className="font-mono text-center tracking-widest text-lg"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              <p className="text-xs text-muted-foreground">
                OTP sent to +91 {phoneNumber}
              </p>
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={resendCooldown > 0 || loading}
                className="text-xs text-primary disabled:text-muted-foreground underline-offset-2 hover:underline disabled:no-underline transition-colors"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
              </button>
            </div>

            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <span className="text-muted-foreground">
                I authorize CECB to verify my identity via Aadhaar e-KYC. My phone number
                and masked Aadhaar will be stored solely for identity verification.
              </span>
            </label>

            <Button
              onClick={handleConfirmOTP}
              disabled={otp.length !== 6 || !consent || loading}
              className="w-full gap-2"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
              ) : (
                <><Shield className="h-4 w-4" /> Verify Identity</>
              )}
            </Button>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Failed: retry */}
        {status === "failed" && (
          <Button
            variant="outline"
            onClick={() => { setStatus("otp_sent"); setOtp(""); setError(null); }}
            className="w-full"
          >
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
