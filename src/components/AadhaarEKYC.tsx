"use client";

/**
 * AadhaarEKYC Component — Aadhaar-based electronic KYC verification.
 *
 * Implements the India Stack e-KYC flow for verifying Project Proponent
 * and RQP identities. Phone OTP is delivered via Firebase Authentication
 * (real SMS to the user's mobile phone). The Aadhaar number is collected
 * as an identity reference and stored in masked form only.
 *
 * Flow:
 *   1. User enters 12-digit Aadhaar number
 *   2. User enters mobile number (Aadhaar-linked)
 *   3. Invisible reCAPTCHA is solved (automatic)
 *   4. Firebase sends a real SMS OTP to the mobile number
 *   5. User enters OTP → Firebase confirms → eKYC marked verified
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";

export interface EKYCIdentity {
  name: string;
  maskedAadhaar: string;
  phone: string;
  verifiedAt: string;
}

export type EKYCStatus = "pending" | "otp_sent" | "verified" | "failed";

interface AadhaarEKYCProps {
  /** Called when verification completes successfully */
  onVerified?: (identity: EKYCIdentity) => void;
  /** Whether the component is in compact mode */
  compact?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Display name of the logged-in user */
  userName?: string;
}

export function AadhaarEKYC({ onVerified, compact = false, className, userName }: AadhaarEKYCProps) {
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<EKYCStatus>("pending");
  const [identity, setIdentity] = useState<EKYCIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Determine if Firebase Phone Auth is available
  const firebaseAvailable = !!auth;

  // Start 60s cooldown timer
  const startCooldown = useCallback(() => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      // Clean up reCAPTCHA on unmount
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear(); } catch { /* ignore */ }
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  // Format Aadhaar with spaces: XXXX XXXX XXXX
  const formatAadhaar = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  // Format phone number display
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    return digits;
  };

  // Validate phone number (10-digit Indian number)
  const isValidPhone = (phone: string) => /^\d{10}$/.test(phone);

  const getE164Phone = (phone: string) => `+91${phone}`;

  const handleSendOTP = useCallback(async () => {
    setError(null);
    setLoading(true);

    if (!firebaseAvailable) {
      // Fallback demo mode when Firebase is not configured
      await new Promise(r => setTimeout(r, 800));
      confirmationResultRef.current = null;
      setStatus("otp_sent");
      startCooldown();
      setLoading(false);
      return;
    }

    try {
      // Create or reuse an invisible reCAPTCHA verifier
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(
          auth!,
          "recaptcha-container",
          { size: "invisible", callback: () => { /* auto */ } }
        );
      }

      const e164 = getE164Phone(phoneNumber);
      const confirmationResult = await signInWithPhoneNumber(
        auth!,
        e164,
        recaptchaVerifierRef.current
      );
      confirmationResultRef.current = confirmationResult;
      setStatus("otp_sent");
      startCooldown();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      let message = "Failed to send OTP. Please try again.";
      if (code === "auth/invalid-phone-number") {
        message = "Invalid phone number. Enter a valid 10-digit Indian mobile number.";
      } else if (code === "auth/too-many-requests") {
        message = "Too many requests. Please wait a few minutes before trying again.";
      } else if (code === "auth/quota-exceeded") {
        message = "SMS quota exceeded. Please try again later.";
      } else if (code === "auth/captcha-check-failed") {
        message = "reCAPTCHA verification failed. Please refresh the page and try again.";
        // Clear the verifier so it regenerates next time
        if (recaptchaVerifierRef.current) {
          try { recaptchaVerifierRef.current.clear(); } catch { /* ignore */ }
          recaptchaVerifierRef.current = null;
        }
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [firebaseAvailable, phoneNumber, startCooldown]);

  const handleVerify = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      let verified = false;

      if (confirmationResultRef.current) {
        // Real Firebase phone auth verification
        await confirmationResultRef.current.confirm(otp);
        verified = true;
      } else {
        // Demo mode fallback — accept any 6-digit OTP
        if (/^\d{6}$/.test(otp)) {
          verified = true;
        } else {
          setError("Invalid OTP. Please enter the 6-digit code.");
          setLoading(false);
          return;
        }
      }

      if (verified) {
        const maskedAadhaar = `XXXX-XXXX-${aadhaarNumber.slice(-4)}`;
        const verifiedIdentity: EKYCIdentity = {
          name: userName || "Verified User",
          maskedAadhaar,
          phone: getE164Phone(phoneNumber),
          verifiedAt: new Date().toISOString(),
        };
        setIdentity(verifiedIdentity);
        setStatus("verified");
        onVerified?.(verifiedIdentity);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      let message = "Verification failed. Please try again.";
      if (code === "auth/invalid-verification-code") {
        message = "Incorrect OTP. Please check the code and try again.";
      } else if (code === "auth/code-expired") {
        message = "OTP has expired. Please request a new one.";
      }
      setError(message);
      setStatus("failed");
    } finally {
      setLoading(false);
    }
  }, [otp, aadhaarNumber, phoneNumber, userName, onVerified]);

  // ── Verified state ──────────────────────────────────────────────────
  if (status === "verified" && identity) {
    return (
      <Card className={cn("border-green-200 dark:border-green-500/30", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-green-700 dark:text-green-300">Identity Verified</p>
              <p className="text-xs text-muted-foreground">
                {firebaseAvailable ? "Phone OTP verified via Firebase" : "Demo mode verification"}
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
          <div className="mt-3 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            {firebaseAvailable
              ? "Phone number verified — real SMS OTP confirmed"
              : "Demo verification complete"}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────
  return (
    <Card className={cn("border-border/50", className)}>
      {/* Invisible reCAPTCHA container — must stay in DOM */}
      <div id="recaptcha-container" />

      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Aadhaar e-KYC Verification</CardTitle>
        </div>
        {!compact && (
          <CardDescription>
            Verify your identity using your Aadhaar number and mobile OTP
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Step 1: Aadhaar Number */}
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

        {/* Step 1b: Phone Number (new field) */}
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
              value={formatPhone(phoneNumber)}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
              maxLength={10}
              disabled={status === "otp_sent" || loading}
              className="font-mono"
              inputMode="numeric"
            />
            {status === "pending" && (
              <Button
                onClick={handleSendOTP}
                disabled={
                  aadhaarNumber.length !== 12 ||
                  !isValidPhone(phoneNumber) ||
                  loading
                }
                size="sm"
                className="gap-1 whitespace-nowrap"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
                Send OTP
              </Button>
            )}
          </div>
          {status === "pending" && !firebaseAvailable && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Demo mode: Firebase not configured — any OTP will be accepted
            </p>
          )}
          {status === "pending" && firebaseAvailable && (
            <p className="text-xs text-muted-foreground">
              A real SMS OTP will be sent to this number via Firebase Authentication
            </p>
          )}
        </div>

        {/* Step 2: OTP Verification */}
        {status === "otp_sent" && (
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
                {firebaseAvailable
                  ? `OTP sent to +91 ${phoneNumber} via SMS`
                  : "Demo mode: enter any 6-digit code (e.g. 123456)"}
              </p>
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={resendCooldown > 0 || loading}
                className="text-xs text-primary disabled:text-muted-foreground underline-offset-2 hover:underline disabled:no-underline transition-colors"
              >
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
              </button>
            </div>

            {/* Consent */}
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <span className="text-muted-foreground">
                I authorize CECB to verify my identity via Aadhaar e-KYC as per UIDAI guidelines.
                I understand my phone number and Aadhaar (masked) will be stored solely for
                identity verification.
              </span>
            </label>

            <Button
              onClick={handleVerify}
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

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Failed state */}
        {status === "failed" && (
          <Button
            variant="outline"
            onClick={() => {
              setStatus("otp_sent");
              setOtp("");
              setError(null);
            }}
            className="w-full"
          >
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
