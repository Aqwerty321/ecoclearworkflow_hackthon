import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — EcoClear Workflow",
  description: "Terms of Service for EcoClear Workflow — Environmental Clearance Platform operated by CECB, Chhattisgarh.",
};

export default function TermsPage() {
  const lastUpdated = "March 2026";

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to EcoClear Workflow
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <FileText className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">EcoClear Workflow</span>
        </div>
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="text-muted-foreground text-sm">Last updated: {lastUpdated}</p>
      </div>

      <div className="space-y-6 text-foreground/80 leading-relaxed">

        {/* Introduction */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using EcoClear Workflow (&ldquo;Platform&rdquo;), you agree to be bound by
            these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, do not
            use the Platform.
          </p>
          <p>
            EcoClear Workflow is an official digital platform operated for the{" "}
            <strong>Chhattisgarh Environment Conservation Board (CECB)</strong> to facilitate
            environmental clearance (EC) application processing under the{" "}
            <strong>Environment Impact Assessment (EIA) Notification, 2006</strong> and the{" "}
            <strong>Environment Protection Act, 1986</strong>.
          </p>
        </section>

        {/* Eligibility */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">2. Eligibility and Access</h2>
          <p>The Platform is restricted to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Project Proponents</strong> — entities or individuals seeking environmental clearance for projects in Chhattisgarh</li>
            <li><strong>CECB Officials</strong> — authorized scrutiny officers, Minutes of Meeting (MoM) team members, and administrators</li>
            <li><strong>Authorized Representatives</strong> — duly authorized agents acting on behalf of the above parties</li>
          </ul>
          <p>
            Unauthorized access, including any attempt to access another user&apos;s account or data, is
            strictly prohibited and may result in legal action under the{" "}
            <strong>Information Technology Act, 2000</strong>.
          </p>
        </section>

        {/* User Obligations */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">3. User Obligations</h2>
          <p>You agree to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide accurate, complete, and truthful information in all application submissions</li>
            <li>Not submit forged, falsified, or misleading documents</li>
            <li>Maintain the confidentiality of your account credentials</li>
            <li>Notify the system administrator immediately of any unauthorized use of your account</li>
            <li>Comply with all applicable environmental laws, regulations, and CECB guidelines</li>
            <li>Not use the Platform for any unlawful purpose</li>
          </ul>
          <p className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3 text-amber-800 dark:text-amber-300 text-sm">
            <strong>Warning:</strong> Submission of false information in environmental clearance
            applications is a criminal offence under Section 14 of the Environment Protection Act, 1986,
            punishable by imprisonment of up to 5 years and/or a fine.
          </p>
        </section>

        {/* AI Features */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">4. AI-Assisted Features</h2>
          <p>
            The Platform incorporates AI-assisted tools (powered by Google Gemini) for document
            analysis, Expert Decision Sheet (EDS) generation, and compliance checks. You acknowledge
            that:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              AI-generated outputs are provided for <strong>informational and workflow assistance
              purposes only</strong> and do not constitute official regulatory decisions
            </li>
            <li>
              All final decisions on environmental clearance applications are made by{" "}
              <strong>authorized CECB officials</strong> and are subject to applicable law
            </li>
            <li>
              AI outputs may contain errors; users should independently verify AI-generated content
              before relying on it for official purposes
            </li>
            <li>
              Application data submitted for AI analysis is processed via Google&apos;s Gemini API;
              by using AI features, you consent to this processing
            </li>
          </ul>
        </section>

        {/* Identity Verification */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">5. Identity Verification (e-KYC)</h2>
          <p>
            The Platform offers phone-based identity verification using Firebase Authentication for
            OTP delivery. By completing e-KYC verification, you:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Confirm that the mobile number provided is registered in your name</li>
            <li>Consent to your phone number being used for identity verification purposes</li>
            <li>
              Acknowledge that the Aadhaar number entered is stored in masked form only (last 4
              digits visible) and is used solely as an identity reference
            </li>
          </ul>
        </section>

        {/* Intellectual Property */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">6. Intellectual Property</h2>
          <p>
            The Platform software, design, and AI models are proprietary. Environmental clearance
            applications, reports, and official documents submitted through the Platform become part
            of the official CECB record. Users retain ownership of documents they create but grant
            CECB a perpetual license to use, store, and process such documents for regulatory purposes.
          </p>
        </section>

        {/* Disclaimers */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">7. Disclaimers and Limitation of Liability</h2>
          <p>
            The Platform is provided &ldquo;as is&rdquo; without warranties of any kind. CECB and the
            Platform operators shall not be liable for:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Temporary unavailability of the Platform due to maintenance or technical issues</li>
            <li>Delays in application processing caused by incomplete or inaccurate submissions</li>
            <li>Errors in AI-generated recommendations that are not independently verified</li>
            <li>Data loss due to force majeure events</li>
          </ul>
        </section>

        {/* Governing Law */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">8. Governing Law</h2>
          <p>
            These Terms are governed by the laws of India. Any disputes arising from use of the
            Platform shall be subject to the exclusive jurisdiction of the courts in{" "}
            <strong>Raipur, Chhattisgarh</strong>.
          </p>
        </section>

        {/* Changes */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">9. Changes to Terms</h2>
          <p>
            CECB reserves the right to update these Terms at any time. Users will be notified of
            material changes via registered email. Continued use of the Platform after changes
            constitutes acceptance of the revised Terms.
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">10. Contact</h2>
          <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
            <p><strong>EcoClear Workflow — Platform Administrator</strong></p>
            <p>Chhattisgarh Environment Conservation Board (CECB)</p>
            <p>Raipur, Chhattisgarh, India</p>
            <p>
              Email:{" "}
              <a href="mailto:aadityasoni2020@gmail.com" className="text-primary underline underline-offset-2">
                aadityasoni2020@gmail.com
              </a>
            </p>
          </div>
        </section>

        <div className="border-t border-border pt-4 text-xs text-muted-foreground">
          These Terms of Service are effective as of {lastUpdated}.
          By using EcoClear Workflow, you acknowledge that you have read, understood, and agree to
          these Terms.
        </div>
      </div>
    </div>
  );
}
