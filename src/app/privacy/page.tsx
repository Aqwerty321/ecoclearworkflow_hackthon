import type { Metadata } from "next";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — EcoClear Workflow",
  description: "Privacy Policy for EcoClear Workflow — Environmental Clearance Platform operated by CECB, Chhattisgarh.",
};

export default function PrivacyPage() {
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
          <Shield className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">EcoClear Workflow</span>
        </div>
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm">Last updated: {lastUpdated}</p>
      </div>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground/80 leading-relaxed">

        {/* Introduction */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
          <p>
            EcoClear Workflow (&ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is an AI-powered environmental
            clearance management system operated on behalf of the{" "}
            <strong>Chhattisgarh Environment Conservation Board (CECB)</strong>. This Privacy Policy
            explains how we collect, use, and protect personal information when you use our Platform.
          </p>
          <p>
            By accessing or using EcoClear Workflow, you agree to the data practices described in this
            policy. This Platform is intended for government officials, project proponents, and
            authorized personnel involved in the environmental clearance process under the{" "}
            <strong>Environment Impact Assessment (EIA) Notification, 2006</strong>.
          </p>
        </section>

        {/* Data We Collect */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>

          <h3 className="text-base font-semibold text-foreground">2.1 Account Information</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Full name, official email address, and organizational designation</li>
            <li>Role and department (Project Proponent, Scrutiny Officer, MoM Team, Admin)</li>
            <li>Authentication credentials (passwords are hashed and never stored in plain text)</li>
          </ul>

          <h3 className="text-base font-semibold text-foreground">2.2 Aadhaar e-KYC Verification</h3>
          <p>
            To verify the identity of project proponents and authorized representatives, we collect:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Mobile phone number (for OTP delivery via Firebase Authentication)</li>
            <li>
              Aadhaar number (collected only for reference; only the{" "}
              <strong>last 4 digits are stored</strong> in masked form — e.g., XXXX-XXXX-1234)
            </li>
            <li>Verification timestamp and transaction ID</li>
          </ul>
          <p className="text-sm bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-3 text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> EcoClear Workflow does not connect to UIDAI&apos;s live Aadhaar
            Authentication API. Phone-based OTP verification is performed via Firebase Authentication
            (Google LLC). The Aadhaar number is used solely as an identity reference and is masked
            before storage.
          </p>

          <h3 className="text-base font-semibold text-foreground">2.3 Application Data</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Environmental clearance application details (project name, type, location, sector)</li>
            <li>Uploaded documents (EIA reports, site maps, compliance certificates)</li>
            <li>Scrutiny comments, Expert Decision Sheets (EDS), and Minutes of Meeting (MoM)</li>
            <li>Payment transaction references</li>
          </ul>

          <h3 className="text-base font-semibold text-foreground">2.4 Usage Data</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Login timestamps and IP addresses (via Firebase Authentication logs)</li>
            <li>Page visits and feature interactions (via Firebase Analytics, if enabled)</li>
          </ul>
        </section>

        {/* How We Use It */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
          <p>We use the collected information exclusively for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Authenticating users and enforcing role-based access control</li>
            <li>Processing and tracking environmental clearance applications</li>
            <li>Generating AI-assisted scrutiny reports and Expert Decision Sheets via Google Gemini</li>
            <li>Facilitating committee meetings and generating digitally-signed Minutes of Meeting</li>
            <li>Sending administrative notifications related to application status changes</li>
            <li>Maintaining an audit trail for regulatory compliance</li>
          </ul>
        </section>

        {/* Data Sharing */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">4. Data Sharing and Third Parties</h2>
          <p>We use the following third-party services to operate the Platform:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border px-3 py-2 text-left font-semibold">Service</th>
                  <th className="border border-border px-3 py-2 text-left font-semibold">Provider</th>
                  <th className="border border-border px-3 py-2 text-left font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border px-3 py-2">Firebase Authentication</td>
                  <td className="border border-border px-3 py-2">Google LLC</td>
                  <td className="border border-border px-3 py-2">User login, phone OTP verification</td>
                </tr>
                <tr className="bg-muted/20">
                  <td className="border border-border px-3 py-2">Firestore</td>
                  <td className="border border-border px-3 py-2">Google LLC</td>
                  <td className="border border-border px-3 py-2">Application data storage</td>
                </tr>
                <tr>
                  <td className="border border-border px-3 py-2">Google Gemini AI</td>
                  <td className="border border-border px-3 py-2">Google LLC</td>
                  <td className="border border-border px-3 py-2">AI-assisted document analysis and EDS generation</td>
                </tr>
                <tr className="bg-muted/20">
                  <td className="border border-border px-3 py-2">Vercel</td>
                  <td className="border border-border px-3 py-2">Vercel Inc.</td>
                  <td className="border border-border px-3 py-2">Web hosting and deployment</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            We do not sell, rent, or share personal data with any third party for commercial purposes.
            Data may be disclosed to law enforcement authorities when required by applicable Indian law.
          </p>
        </section>

        {/* Data Retention */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">5. Data Retention</h2>
          <p>
            Application records and associated documents are retained for a minimum of{" "}
            <strong>7 years</strong> from the date of final decision, in compliance with the Environment
            Protection Act, 1986 and associated record-keeping guidelines. User account data is
            retained for the duration of employment and for 2 years thereafter.
          </p>
        </section>

        {/* Security */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">6. Data Security</h2>
          <p>We implement the following security measures:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>All data in transit is encrypted using TLS 1.2+</li>
            <li>Firestore security rules enforce role-based access — users can only read/write data within their authorization scope</li>
            <li>Firebase Authentication enforces strong password requirements and session management</li>
            <li>AI-generated content is processed server-side via Next.js API routes; no application data is sent to external AI providers without user-initiated action</li>
          </ul>
        </section>

        {/* Your Rights */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">7. Your Rights</h2>
          <p>As a user of this Platform, you have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access the personal data stored about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account (subject to regulatory retention requirements)</li>
            <li>Withdraw consent for phone-based verification at any time</li>
          </ul>
          <p>
            To exercise these rights, contact the CECB system administrator at{" "}
            <a href="mailto:aadityasoni2020@gmail.com" className="text-primary underline underline-offset-2">
              aadityasoni2020@gmail.com
            </a>
            .
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">8. Contact Us</h2>
          <p>For privacy-related queries:</p>
          <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
            <p><strong>EcoClear Workflow — Data Controller</strong></p>
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
          This Privacy Policy is effective as of {lastUpdated} and may be updated periodically.
          Continued use of the Platform after changes constitutes acceptance of the revised policy.
        </div>
      </div>
    </div>
  );
}
