# **App Name**: EcoClear Workflow

> Last updated: March 2026 — Full-scale UI overhaul completed (dark mode, animations, ReactBits-inspired components, responsive redesign across all pages).

## UI Design System (v2 — March 2026)

### Design Direction
Hybrid "Modern Gov-tech + Corporate Enterprise" — clean data-dense layouts with polished animations and full dark mode support.

### Custom Animated Primitives (`src/components/ui/`)
- **AnimatedContainer** — IntersectionObserver-triggered entrance animations (fade-in, slide-up, scale-in). Supports `delay` and `once` props.
- **StaggerChildren** — wraps children in sequential AnimatedContainers for list entrance effects.
- **CountUp** — animated number counter with ease-out cubic easing, IntersectionObserver triggered.
- **SpotlightCard** — card with a 400px radial gradient that follows the cursor on hover.
- **GradientText** — animated gradient sweep text (135deg, blue→teal→green).
- **ShimmerButton** — extends shadcn Button with a shine sweep overlay on hover.
- **PageSkeleton** — `DashboardSkeleton`, `TableSkeleton`, `FormSkeleton`, `DetailSkeleton` components.
- **ThemeToggle** — Sun/Moon toggle using `next-themes`, hydration-safe.

### Animation Keyframes (globals.css)
`fade-in`, `slide-up`, `scale-in`, `float`, `shimmer`, `pulse-soft`, `gradient-shift`, `shake`, `draw-line`, `spin-slow` — all defined as CSS keyframes with Tailwind utility classes.

### Dark Mode
Full dark mode via `next-themes` (`ThemeProvider` in root layout). All pages use HSL CSS variables with complete dark overrides. Role badge colors, status pills, and card borders all have `dark:` variants.

---

## Core Features:

- Secure User Authentication & Registration: User registration for Project Proponents and email/password login for all roles, utilizing Firebase Authentication for secure session management.
- Role-Based Access Control & User Management: Admin users can assign and manage user roles (Admin, Project Proponent, Scrutiny Team, MoM Team) with roles stored in Firestore. Ensures strict access permissions and restricts application routes based on user roles, including viewing and assigning roles from the Admin Dashboard.
- Dynamic Role Dashboards: Each user role sees a personalized dashboard displaying relevant applications, tasks, and status updates, with routes restricted based on assigned roles. The Project Proponent dashboard allows creating new applications.
- Environmental Application Submission: Project Proponents can submit new environmental clearance applications through a multi-step form, including fields such as Project Name, Industry Sector, Application Category (A, B1, B2), and Project Description. All application metadata is stored in Firestore.
- Document Management: Users can securely upload application-related documents (e.g., Environmental Report, Land Document, Pollution Analysis) to Firebase Storage and manage them, with file URLs attached to their submissions in Firestore.
- Workflow Review and Status Tracking: Scrutiny and MoM teams can review applications, request additional information (EDS), and refer applications to meetings, with strict, step-by-step status transitions (Draft -> Submitted -> UnderScrutiny -> EDS -> Submitted; UnderScrutiny -> Referred -> MoMGenerated -> Finalized) enforced to prevent skipping steps. All status updates are managed in real-time in Firestore. Project Proponents and other relevant roles can track their application's progress through an interactive application status timeline on the application details page.
- AI-Powered Scrutiny Assistant: An AI tool for the Scrutiny Team to analyze submitted documents for common compliance issues, highlight missing information, or suggest potential environmental impacts.
- Application Payment Processing: Project Proponents can initiate payment for application fees through a simulated 'Pay Application Fee' button which simulates a UPI payment and marks the paymentStatus as 'paid' in Firestore.
- Meeting Gist Editing & MoM Generation: An AI tool automatically generates a meeting gist using application data (Project Name, Industry Sector, Category, Location, Environmental Risk Summary) when an application is referred to a meeting. The MoM Team can then view and edit this AI-generated gist. Another AI tool assists in converting the edited gist into a structured Minutes of Meeting document, populating fields like Project Name, Discussion Summary, Committee Decision, and Conditions, which can then be exported as PDF or DOCX. Once finalized, editing is locked, and the application status is updated to 'Finalized'.
- Admin Template Management: Admin users can create, edit, and manage templates for application forms or other standardized documents, including specific gist templates for categories A, B1, and B2.
- Firestore Database Schema: Designed to support the EcoClear Workflow, the Firestore database schema includes the following collections: 'users' (fields: name, email, role, createdAt), 'applications' (fields: projectName, industrySector, category (A, B1, B2), description, applicantId, status (Draft, Submitted, UnderScrutiny, EDS, Referred, MoMGenerated, Finalized), createdAt), 'documents' (fields: applicationId, documentType, fileURL, uploadedAt), 'payments' (fields: applicationId, amount, paymentStatus, paymentMethod), 'meetingGists' (fields: applicationId, generatedText, editedText), 'minutesOfMeeting' (fields: applicationId, finalDocumentURL, finalizedAt), 'templates' (fields: templateName, content, type, createdAt), and 'sectors' (fields: name, description, createdAt).
- Firestore Data Access & Service Functions: Implements core data operations and service functions for seamless interaction with the Firestore database. This includes functions for user management (create, retrieve, update users and their roles), application lifecycle management (submit, update status, fetch applications by status or user), document handling (upload, retrieve documents), payment processing (record, update payments), meeting record keeping (save gists, generate/finalize minutes), template management, and sector management. Example queries will support fetching all applications for a specific user, applications by current status, documents related to a given application, and user-specific role checks for access control.
- Scrutiny Team Dashboard View: Scrutiny Team members can view a table listing all submitted applications with columns for Project Name, Applicant, Status, Payment, and Actions.
- Application Details View (Scrutiny): Ability to open and view detailed information for each application, including project details, uploaded documents, and an application status timeline to track progress.
- Document Verification & Payment Check (Scrutiny): Scrutiny Team can verify uploaded documents and confirm payment status for applications.
- Approve for Scrutiny Action: Action to formally approve an application for the scrutiny process, updating its status.
- Request EDS (Environmental Data Submission) Action: Action to request additional documents or corrections from the Project Proponent, changing the application status to 'EDS' and allowing the Scrutiny Team to add comments explaining missing documents.
- Refer to Meeting Action: Action to refer an application to a meeting, typically for further discussion or decision, updating its status.
- MoM Team Dashboard View: MoM Team members can view a table listing referred applications, access auto-generated meeting gists, and initiate the Minutes of Meeting generation and finalization process.
- MoM Document Export: Ability to export finalized Minutes of Meeting documents as PDF or DOCX files.
- Admin Dashboard View: A dedicated dashboard for Admin users to manage user accounts (view and assign roles), manage application templates (including gist templates for categories A, B1, B2), and manage industry sectors (add/edit sectors like Mining, Infrastructure, Energy) using simple tables and forms.
- Sector Management: Admin users can add and manage various industry sectors (e.g., Mining, Infrastructure, Energy) which can then be associated with environmental applications. This involves storing sector data in Firestore.

## Style Guidelines:

- Primary color: Corporate blue (#004080) for main headings, interactive elements, and key branding. Secondary color: Clean white (#FFFFFF) for backgrounds and main content areas, ensuring readability. Accent color: A lighter, professional blue (#ADD8E6) for subtle highlights and secondary actions. Overall theme is minimal, corporate, and clean.
- The 'Inter' sans-serif typeface is used for all text (headlines and body) due to its modern, neutral, and highly readable design, perfect for data-rich interfaces.
- Utilize clean, vector-based icons that clearly communicate actions and statuses within the workflow, adhering to a minimalist aesthetic to maintain focus on functionality.
- A responsive layout featuring a persistent Navbar for global navigation and a Sidebar for role-specific navigation. Content areas will use simple cards for overview summaries and responsive tables for detailed data. Forms will be structured cleanly, and each role will have its dedicated dashboard page. The layout prioritizes simplicity and responsiveness across devices.
- Subtle and functional animations provide user feedback for actions such as form submission, status updates, or data loading, avoiding decorative movements to maintain a focus on efficiency.