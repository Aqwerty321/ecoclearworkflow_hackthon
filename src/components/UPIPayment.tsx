"use client";

import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { CheckCircle, QrCode, Copy, Smartphone, Loader2, ShieldCheck } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

// Razorpay window types
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: any) => { open(): void };
  }
}

/**
 * Builds a UPI deep-link intent URI per NPCI specifications.
 * Used for the fallback QR code display alongside Razorpay.
 */
function buildUPIIntentURI(params: {
  pa: string;
  pn: string;
  tr: string;
  am: string;
  cu?: string;
  tn?: string;
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

const DEFAULT_VPA =
  process.env.NEXT_PUBLIC_CECB_UPI_VPA || "cecb.collection@sbi";

/** Dynamically loads the Razorpay checkout script once. */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function UPIPayment({
  applicationId,
  projectName,
  category,
  amount,
  payeeVPA = DEFAULT_VPA,
  payeeName = "Chhattisgarh Environment Conservation Board",
  onPaymentComplete,
  onCancel,
}: UPIPaymentProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"review" | "pay" | "success">("review");
  const [paying, setPaying] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [copied, setCopied] = useState(false);
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

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  const handleCopyUPI = async () => {
    await navigator.clipboard.writeText(payeeVPA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRazorpayPayment = useCallback(async () => {
    setPaying(true);
    try {
      // 1. Load Razorpay checkout script
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        toast({ variant: "destructive", title: "Payment Error", description: "Could not load payment gateway. Please try again." });
        setPaying(false);
        return;
      }

      // 2. Create order on server
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: fee, applicationId, projectName }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.error || "Failed to create payment order");
      }

      const { orderId: newOrderId } = await orderRes.json();
      setOrderId(newOrderId);

      // 3. Open Razorpay checkout modal
      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: fee * 100, // paise
        currency: "INR",
        name: "CECB — EcoClear Workflow",
        description: `EC Application Fee — ${projectName} (${category})`,
        order_id: newOrderId,
        image: "/favicon.ico",
        theme: { color: "#16a34a" },
        prefill: {},
        notes: { applicationId, reference: txnRef },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // 4. Verify HMAC signature server-side
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) {
              const err = await verifyRes.json();
              throw new Error(err.error || "Signature verification failed");
            }

            // 5. Mark payment complete
            setTransactionId(response.razorpay_payment_id);
            setStep("success");
            onPaymentComplete(response.razorpay_payment_id);
          } catch (verifyErr) {
            console.error("[payment verify]", verifyErr);
            toast({
              variant: "destructive",
              title: "Verification Failed",
              description: "Payment received but verification failed. Contact support with your payment ID.",
            });
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
      });

      rzp.open();
    } catch (err) {
      console.error("[payment]", err);
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: err instanceof Error ? err.message : "Payment failed. Please try again.",
      });
      setPaying(false);
    }
  }, [fee, applicationId, projectName, category, txnRef, onPaymentComplete, toast]);

  // ── Review step ───────────────────────────────────────────────────────────
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

        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/30 text-sm text-blue-700 dark:text-blue-400">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Secured by <strong>Razorpay</strong> — supports UPI, Net Banking, Cards & Wallets.
            Payment verified server-side before confirmation.
          </span>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => setStep("pay")} className="bg-primary">
            <QrCode className="mr-2 h-4 w-4" /> Proceed to Pay
          </Button>
        </div>
      </div>
    );
  }

  // ── Pay step ──────────────────────────────────────────────────────────────
  if (step === "pay") {
    return (
      <div className="space-y-5">
        {/* Razorpay CTA — primary */}
        <div className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-primary/30 bg-primary/5">
          <img
            src="https://razorpay.com/favicon.png"
            alt="Razorpay"
            className="h-8 w-8 rounded"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <p className="text-sm text-center text-muted-foreground">
            Pay securely via Razorpay — UPI, Cards, Net Banking, Wallets
          </p>
          <Button
            className="w-full bg-primary hover:bg-primary/90 gap-2"
            onClick={handleRazorpayPayment}
            disabled={paying}
          >
            {paying ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Opening gateway...</>
            ) : (
              <><ShieldCheck className="h-4 w-4" /> Pay {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(fee)}</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Payment signature verified server-side after checkout
          </p>
        </div>

        {/* UPI QR fallback */}
        <div className="space-y-2">
          <p className="text-xs text-center text-muted-foreground font-medium uppercase tracking-wide">
            — or scan UPI QR directly —
          </p>
          <div className="flex flex-col items-center gap-3">
            <div className="inline-block p-3 bg-white rounded-xl border shadow-sm">
              <QRCodeSVG value={upiURI} size={140} level="H" includeMargin />
            </div>
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <div className="flex items-center gap-1 justify-center">
                <span className="font-mono">{payeeVPA}</span>
                <button onClick={handleCopyUPI} className="p-1 hover:text-foreground transition-colors">
                  <Copy className={cn("h-3 w-3", copied && "text-green-600")} />
                </button>
              </div>
              {isMobile && (
                <a href={upiURI}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Smartphone className="h-3.5 w-3.5" /> Open UPI App
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-start">
          <Button variant="ghost" size="sm" onClick={() => setStep("review")}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  // ── Success step ──────────────────────────────────────────────────────────
  return (
    <div className="text-center space-y-4 py-4">
      <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
        <CheckCircle className="h-12 w-12 text-green-600" />
      </div>
      <p className="text-xl font-bold text-green-700 dark:text-green-400">
        Payment Verified
      </p>
      <div className="p-3 bg-muted/50 rounded-lg border text-sm space-y-1 max-w-xs mx-auto">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Payment ID</span>
          <span className="font-mono font-medium text-xs">{transactionId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Order ID</span>
          <span className="font-mono text-xs">{orderId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Reference</span>
          <span className="font-mono text-xs">{txnRef}</span>
        </div>
        <div className="flex justify-between border-t pt-1">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-bold">
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
            }).format(fee)}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1.5 text-xs text-green-600 dark:text-green-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        Signature verified by CECB payment server
      </div>
      <Button onClick={onCancel}>Done</Button>
    </div>
  );
}
