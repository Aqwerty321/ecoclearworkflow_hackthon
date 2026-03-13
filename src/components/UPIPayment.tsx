"use client";

import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Smartphone, QrCode, Copy, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Fee schedule based on application category (CECB guidelines)
export const FEE_SCHEDULE: Record<string, number> = {
  A: 50000,
  B1: 25000,
  B2: 15000,
};

interface UPIPaymentProps {
  applicationId: string;
  projectName: string;
  category: string;
  amount?: number;
  payeeVPA?: string;
  payeeName?: string;
  onPaymentComplete: (transactionId: string) => void;
  onCancel: () => void;
}

/**
 * Builds a UPI deep-link intent URI per NPCI specifications.
 * @see https://www.npci.org.in/what-we-do/upi/upi-ecosystem
 */
function buildUPIIntentURI(params: {
  pa: string;   // Payee VPA
  pn: string;   // Payee name
  tr: string;   // Transaction reference
  am: string;   // Amount
  cu?: string;  // Currency (default INR)
  tn?: string;  // Transaction note
}): string {
  const query = new URLSearchParams({
    pa: params.pa,
    pn: params.pn,
    tr: params.tr,
    am: params.am,
    cu: params.cu || "INR",
    ...(params.tn ? { tn: params.tn } : {}),
  });
  return `upi://pay?${query.toString()}`;
}

export function UPIPayment({
  applicationId,
  projectName,
  category,
  amount,
  payeeVPA = "cecb.collection@sbi",
  payeeName = "Chhattisgarh Environment Conservation Board",
  onPaymentComplete,
  onCancel,
}: UPIPaymentProps) {
  const [step, setStep] = useState<"review" | "pay" | "success">("review");
  const [copied, setCopied] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [countdown, setCountdown] = useState(300); // 5 minute QR expiry
  const [isMobile, setIsMobile] = useState(false);

  const fee = amount || FEE_SCHEDULE[category] || 15000;
  const txnRef = `APP-${new Date().getFullYear()}-${applicationId.slice(0, 8).toUpperCase()}`;

  const upiURI = buildUPIIntentURI({
    pa: payeeVPA,
    pn: payeeName,
    tr: txnRef,
    am: fee.toFixed(2),
    tn: `EC Application Fee - ${projectName}`,
  });

  // Detect mobile device
  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  // QR expiry countdown
  useEffect(() => {
    if (step !== "pay") return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleCopyUPI = async () => {
    await navigator.clipboard.writeText(payeeVPA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = () => {
    const generatedTxnId = `TXN${Date.now().toString(36).toUpperCase()}`;
    setTransactionId(generatedTxnId);
    setStep("success");
    onPaymentComplete(generatedTxnId);
  };

  if (step === "review") {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Application</span>
            <span className="text-sm font-medium">{projectName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Category</span>
            <span className="text-sm font-medium">Category {category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Reference ID</span>
            <span className="text-sm font-mono font-medium">{txnRef}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-sm font-bold">Application Fee</span>
            <span className="text-lg font-bold text-primary">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
              }).format(fee)}
            </span>
          </div>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/30 text-sm text-blue-700 dark:text-blue-400">
          Payment is processed via UPI (Unified Payments Interface) as per NPCI
          specifications. Supports all UPI-enabled banking apps.
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => { setStep("pay"); setCountdown(300); }} className="bg-primary">
            <QrCode className="mr-2 h-4 w-4" /> Proceed to Pay
          </Button>
        </div>
      </div>
    );
  }

  if (step === "pay") {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-4">
          {/* QR Code */}
          <div className="inline-block p-4 bg-white rounded-xl border-2 shadow-sm">
            <QRCodeSVG
              value={upiURI}
              size={200}
              level="H"
              includeMargin
              imageSettings={{
                src: "/favicon.ico",
                height: 24,
                width: 24,
                excavate: true,
              }}
            />
          </div>

          {countdown > 0 ? (
            <p className="text-xs text-muted-foreground">
              QR expires in{" "}
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {formatTime(countdown)}
              </span>
            </p>
          ) : (
            <p className="text-xs text-destructive font-bold">
              QR expired. Please restart payment.
            </p>
          )}

          {/* Payee details */}
          <div className="p-3 bg-muted/50 rounded-lg border text-sm space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pay to UPI ID</span>
              <div className="flex items-center gap-1">
                <span className="font-mono font-medium">{payeeVPA}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopyUPI}
                >
                  <Copy
                    className={cn("h-3 w-3", copied && "text-green-600")}
                  />
                </Button>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-primary">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                }).format(fee)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ref</span>
              <span className="font-mono text-xs">{txnRef}</span>
            </div>
          </div>

          {/* Mobile deep-link button */}
          {isMobile && (
            <a href={upiURI} className="block">
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <Smartphone className="mr-2 h-4 w-4" /> Open UPI App
              </Button>
            </a>
          )}

          {!isMobile && (
            <p className="text-xs text-muted-foreground">
              Scan this QR code with any UPI app (Google Pay, PhonePe, Paytm,
              BHIM, etc.)
            </p>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setStep("review")}>
            Back
          </Button>
          <Button
            onClick={handleConfirmPayment}
            disabled={countdown === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="mr-2 h-4 w-4" /> I have paid
          </Button>
        </div>
      </div>
    );
  }

  // Success step
  return (
    <div className="text-center space-y-4 py-4">
      <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
        <CheckCircle className="h-12 w-12 text-green-600" />
      </div>
      <p className="text-xl font-bold text-green-700 dark:text-green-400">
        Payment Successful
      </p>
      <div className="p-3 bg-muted/50 rounded-lg border text-sm space-y-1 max-w-xs mx-auto">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Transaction ID</span>
          <span className="font-mono font-medium">{transactionId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Reference</span>
          <span className="font-mono text-xs">{txnRef}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-bold">
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
            }).format(fee)}
          </span>
        </div>
      </div>
      <Button onClick={onCancel}>Done</Button>
    </div>
  );
}
