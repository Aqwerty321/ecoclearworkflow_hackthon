"use client";

/**
 * AadhaarEKYC Component — Aadhaar-based electronic KYC verification.
 *
 * Implements the India Stack e-KYC flow for verifying Project Proponent
 * and RQP identities against UIDAI database.
 *
 * Flow: Enter Aadhaar → Send OTP → Enter OTP → Verify Identity
 */

import { useState, useCallback } from "react";
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
import {
  initiateAadhaarOTP,
  verifyAadhaarEKYC,
  type AadhaarEKYCResponse,
  type EKYCStatus,
} from "@/lib/india-stack";

interface AadhaarEKYCProps {
  /** Called when verification completes successfully */
  onVerified?: (identity: NonNullable<AadhaarEKYCResponse["identity"]>) => void;
  /** Whether the component is in compact mode */
  compact?: boolean;
  /** Additional CSS class */
  className?: string;
}

export function AadhaarEKYC({ onVerified, compact = false, className }: AadhaarEKYCProps) {
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<EKYCStatus>("pending");
  const [transactionId, setTransactionId] = useState("");
  const [identity, setIdentity] = useState<AadhaarEKYCResponse["identity"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);

  const handleSendOTP = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await initiateAadhaarOTP(aadhaarNumber);
      if (result.success) {
        setTransactionId(result.transactionId);
        setStatus("otp_sent");
      } else {
        setError(result.message);
      }
    } catch {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [aadhaarNumber]);

  const handleVerify = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await verifyAadhaarEKYC({
        aadhaarNumber,
        otp,
        transactionId,
        consent,
      });

      if (result.success && result.identity) {
        setIdentity(result.identity);
        setStatus("verified");
        onVerified?.(result.identity);
      } else {
        setError(result.error?.message || "Verification failed.");
        setStatus("failed");
      }
    } catch {
      setError("Verification failed. Please try again.");
      setStatus("failed");
    } finally {
      setLoading(false);
    }
  }, [aadhaarNumber, otp, transactionId, consent, onVerified]);

  // Format Aadhaar with spaces: XXXX XXXX XXXX
  const formatAadhaar = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

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
              <p className="text-xs text-muted-foreground">Aadhaar e-KYC | UIDAI</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Name</p>
              <p className="font-medium">{identity.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Aadhaar</p>
              <p className="font-mono">{identity.maskedAadhaar}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">DOB</p>
              <p>{identity.dateOfBirth}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Verified At</p>
              <p className="text-xs">{new Date(identity.verifiedAt).toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Shield className="h-3 w-3" /> Verified via UIDAI Aadhaar e-KYC
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Aadhaar e-KYC Verification</CardTitle>
        </div>
        {!compact && (
          <CardDescription>
            Verify your identity using Aadhaar-based electronic KYC (UIDAI)
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Aadhaar Number */}
        <div className="space-y-2">
          <Label htmlFor="aadhaar">Aadhaar Number</Label>
          <div className="flex gap-2">
            <Input
              id="aadhaar"
              placeholder="XXXX XXXX XXXX"
              value={formatAadhaar(aadhaarNumber)}
              onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ""))}
              maxLength={14}
              disabled={status === "otp_sent" || loading}
              className="font-mono"
            />
            {status === "pending" && (
              <Button
                onClick={handleSendOTP}
                disabled={aadhaarNumber.length !== 12 || loading}
                size="sm"
                className="gap-1 whitespace-nowrap"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                Send OTP
              </Button>
            )}
          </div>
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
              />
              <p className="text-xs text-muted-foreground">
                OTP sent to your Aadhaar-linked mobile number
              </p>
            </div>

            {/* Consent checkbox */}
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <span className="text-muted-foreground">
                I authorize CECB to verify my identity via Aadhaar e-KYC as per
                UIDAI guidelines. I understand my biometric/demographic data will
                be used solely for identity verification.
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
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Failed state — allow retry */}
        {status === "failed" && (
          <Button
            variant="outline"
            onClick={() => {
              setStatus("pending");
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
