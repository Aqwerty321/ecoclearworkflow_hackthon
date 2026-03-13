# EcoClear Workflow

> AI-powered, role-based platform for digitising India's Environmental Clearance (EC) process — from application submission and document scrutiny through committee review to final EC approval.

Built for the **Chhattisgarh Environment Conservation Board (CECB)** as a hackathon submission.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 15.5 Frontend (port 9002)                          │
│  App Router · TypeScript · Tailwind CSS · shadcn/ui         │
│  Firebase Auth + Firestore (real-time onSnapshot listeners) │
│  Firebase Storage (document uploads, SHA-256 verified)      │
└──────────────┬──────────────────────────────────────────────┘
               │ REST / WebSocket
    ┌──────────┼──────────────────────────┐
    ▼          ▼                          ▼
┌────────┐  ┌──────────────┐  ┌────────────────────┐
│ AI     │  │ GIS Service  │  │ Collaboration      │
│ Agent  │  │ (port 8002)  │  │ Service (port 8003)│
│ Service│  │ FastAPI      │  │ Hocuspocus/Yjs     │
│:8001   │  │ Shapely      │  │ Node.js + SQLite   │
│FastAPI │  │ GeoPandas    │  │ CRDT sync for MoM  │
│LangGraph│ │ Sentinel-2   │  │ editor             │
│Gemini  │  │ NDVI mock    │  └────────────────────┘
└────────┘  └──────────────┘
```

**Dual-mode store:** Firebase Firestore when configured; localStorage fallback for offline/demo mode.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3.4 + shadcn/ui |
| Auth & DB | Firebase Auth + Firestore v11 |
| Storage | Firebase Storage (20 MB cap, PDF/image) |
| State | React Context + `onSnapshot` real-time listeners |
| AI | Google Genkit + Gemini 2.5 Flash (scrutiny, MoM draft, gist) |
| AI Microservice | FastAPI + LangGraph + `langchain-google-genai` |
| GIS Microservice | FastAPI + Shapely + GeoPandas + Sentinel-2 NDVI mock |
| Collaboration | Hocuspocus WebSocket server + Yjs CRDT (TipTap editor) |
| India Stack | Aadhaar eKYC mock + CCA eSign OTP mock |
| Payments | UPI deep-link (NPCI spec) + QR code |
| Document Integrity | SHA-256 hash at upload, verified on retrieval |
| Exports | jsPDF (page-break-aware) + docx |
| Orchestration | Docker Compose (all 4 services) |
| Deployment | Vercel (Next.js) + Cloud Run (Python services) |

---

## Features by Role

### Project Proponent
- Submit Category A / B1 / B2 environmental clearance applications
- Aadhaar eKYC identity verification (OTP mock)
- UPI payment (QR + deep-link, ₹50k / ₹25k / ₹15k by category)
- Upload documents with real SHA-256 integrity hashing
- Track application status through 7 workflow stages
- Download final EC (PDF / DOCX)

### Scrutiny Team
- ABAC-filtered scrutiny pool (sector + district assignment)
- Accept applications → trigger AI compliance analysis (LangGraph pipeline)
- View GIS proximity analysis and Sentinel-2 NDVI satellite data
- Issue EDS (Environmental Data Supplement) comments
- Refer applications to the Expert Appraisal Committee

### MoM Team
- ABAC-filtered meeting desk (sector + district assignment)
- Schedule Expert Appraisal Committee meetings
- AI-generated meeting gist → CRDT collaborative editor (real-time multi-user)
- Template-driven MoM drafting with `{{variable}}` substitution engine
- Digital eSign (CCA OTP mock) → finalize → export PDF/DOCX

### Admin
- User management (assign roles + ABAC attributes)
- Industry sector CRUD (14 sectors seeded)
- MoM template management
- Pipeline status dashboard with live counts

---

## Quick Start

### Prerequisites
- Node.js 20+ (recommend [nvm](https://github.com/nvm-sh/nvm): `nvm use 22`)
- Python 3.11+ (for microservices)
- Docker & Docker Compose (for microservices)
- Firebase project with Firestore, Auth, Storage enabled

### 1. Clone & install

```bash
git clone https://github.com/Aqwerty321/ecoclearworkflow_hackthon.git
cd ecoclearworkflow_hackthon
npm install --legacy-peer-deps
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
# Firebase (required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google AI (for Genkit flows)
GOOGLE_GENAI_API_KEY=your_gemini_api_key

# India Stack (set to true to use mock mode — default)
NEXT_PUBLIC_INDIA_STACK_MOCK=true

# UPI payee VPA
NEXT_PUBLIC_CECB_UPI_VPA=cecb.collection@sbi

# Microservice URLs (optional — app works without them)
AI_AGENT_SERVICE_URL=http://localhost:8001
GIS_SERVICE_URL=http://localhost:8002
COLLABORATION_SERVICE_URL=http://localhost:8003

# Collaborative editor WebSocket (optional)
NEXT_PUBLIC_COLLAB_WS_URL=ws://localhost:8003
```

### 3. Deploy Firebase rules & seed data

```bash
# Install Firebase CLI (once)
npm install -g firebase-tools

# Login
firebase login

# Deploy Firestore rules, indexes, Storage rules
firebase deploy --only firestore:rules,firestore:indexes,storage

# Seed users, sectors, and demo applications
node scripts/seed-firestore.mjs
```

### 4. Run the app

```bash
# Next.js dev server (port 9002)
npm run dev

# (Optional) Genkit AI dev UI
npm run genkit:dev
```

### 5. Run microservices (optional, via Docker)

```bash
docker compose up --build
```

Individual services:
```bash
# AI agent service
cd services/ai-agent-service && pip install -r requirements.txt && uvicorn app.main:app --port 8001

# GIS service
cd services/gis-service && pip install -r requirements.txt && uvicorn app.main:app --port 8002

# Collaboration service
cd services/collaboration-service && npm install && npm start
```

---

## Demo Credentials (seeded via `scripts/seed-firestore.mjs`)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ecoclear.gov` | `Admin@1234` |
| Project Proponent | `john@builder.com` | `John@12345` |
| Scrutiny Team | `sarah@ecoclear.gov` | `Sarah@1234` |
| MoM Team | `mike@ecoclear.gov` | `Mike@12345` |

**Note:** In offline/demo mode (no Firebase env vars), any password is accepted for these accounts.

---

## Demo Applications (seeded)

| Application ID | Status | Project | Category |
|---|---|---|---|
| `demo-app-draft-001` | Draft | Durg Sponge Iron Unit | B1 |
| `demo-app-scrutiny-001` | UnderScrutiny | Raipur Coal Beneficiation Plant | A |
| `demo-app-referred-001` | Referred | Bilaspur Cement Grinding Unit | B1 |
| `demo-app-finalized-001` | Finalized | Korba Thermal Power Extension | A |

The seeded applications include linked documents, EDS comments, a meeting gist, and a signed Minutes of Meeting — covering every stage of the workflow.

---

## Workflow Stages

```
Draft → Submitted → UnderScrutiny → EDS → Referred → MoMGenerated → Finalized
```

| Stage | Actor | Key Actions |
|---|---|---|
| Draft | Proponent | Fill form, attach documents |
| Submitted | Proponent | Pay application fee (UPI) |
| UnderScrutiny | Scrutiny | AI analysis, EDS comments |
| EDS | Proponent | Respond to EDS queries |
| Referred | MoM Team | Schedule meeting, write gist |
| MoMGenerated | MoM Team | Collaborative MoM drafting, eSign |
| Finalized | MoM Team | Export PDF/DOCX |

---

## Project Structure

```
ecoclearworkflow_hackthon/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Login
│   │   ├── register/                   # Registration
│   │   ├── forgot-password/            # Password reset
│   │   └── dashboard/
│   │       ├── page.tsx                # Role-aware home
│   │       ├── admin/                  # Admin hub + users/sectors/templates
│   │       ├── applications/[id]/      # Application detail (5 tabs)
│   │       ├── my-applications/        # Proponent application list
│   │       ├── proponent/new/          # New application form
│   │       ├── scrutiny/               # Scrutiny pool (ABAC filtered)
│   │       └── mom/                    # Meeting desk + CRDT editor
│   ├── ai/flows/                       # Genkit AI flows
│   │   ├── scrutiny-document-summary-and-flagging.ts
│   │   ├── generate-meeting-gist.ts
│   │   └── generate-minutes-of-meeting-draft.ts
│   ├── components/
│   │   ├── CollaborativeEditor.tsx     # TipTap + Yjs CRDT editor
│   │   ├── MapPicker.tsx               # Leaflet GIS map picker
│   │   ├── UPIPayment.tsx              # NPCI UPI deep-link + QR
│   │   ├── AadhaarEKYC.tsx             # Aadhaar OTP mock
│   │   ├── ESignDocument.tsx           # CCA eSign OTP mock
│   │   ├── ApplicationTimeline.tsx     # Status timeline
│   │   └── ui/                         # shadcn/ui + animated primitives
│   └── lib/
│       ├── StoreContext.tsx            # Firebase + localStorage dual-mode store
│       ├── types.ts                    # Types + ABAC policy engine
│       ├── firebase.ts                 # Firebase SDK init
│       ├── api-client.ts               # Microservice REST clients
│       ├── crypto.ts                   # SHA-256 document hashing
│       ├── india-stack.ts              # Aadhaar/eSign mock
│       └── template-vars.ts           # {{variable}} substitution engine
├── services/
│   ├── ai-agent-service/               # FastAPI + LangGraph + Gemini
│   ├── gis-service/                    # FastAPI + Shapely + GeoPandas
│   └── collaboration-service/          # Hocuspocus WebSocket server
├── scripts/
│   └── seed-firestore.mjs              # Idempotent Firebase seeder
├── firebase.json                       # Firebase CLI config
├── firestore.rules                     # Firestore security rules (RBAC)
├── firestore.indexes.json              # Composite indexes
├── storage.rules                       # Firebase Storage rules
└── docker-compose.yml                  # All 4 services orchestrated
```

---

## Firebase Security Rules Summary

| Collection | Read | Create | Update | Delete |
|---|---|---|---|---|
| `users` | Authenticated | Own UID | Own or Admin | Admin |
| `applications` | Authenticated | Own applicantId | Owner / Scrutiny / MoM / Admin | Admin |
| `documents` | Authenticated | Authenticated | Scrutiny/Admin | Admin |
| `sectors` | Authenticated | — | Admin | Admin |
| `edsComments` | Authenticated | Scrutiny/Admin | Admin | Admin |
| `meetingGists` | Authenticated | MoM/Scrutiny | MoM/Scrutiny | MoM/Scrutiny |
| `templates` | Authenticated | — | Admin | Admin |
| `payments` | Owner or Admin | Authenticated | Admin | Admin |
| `minutesOfMeeting` | Authenticated | MoM/Admin | MoM/Admin | MoM/Admin |

---

## AI Pipeline (LangGraph)

The `ai-agent-service` runs a 4-node LangGraph pipeline for scrutiny analysis:

```
Ingestion Node → Regulatory Analyzer → Validation/Draft Node → Reflector
                                                    ↓ (if requires_eds)
                                              EDS Generator
```

Outputs: `overall_risk` (LOW/MEDIUM/HIGH/CRITICAL), `compliance_score`, `compliance_issues[]`, `missing_documents[]`, `recommendations[]`, `reflector_quality_score`.

---

## GIS Service

The `gis-service` provides:
- **Proximity analysis** — buffer zones per category (A: 10km, B1: 5km, B2: 2km) against Chhattisgarh eco-sensitive zones
- **Buffer intersection** — calculate overlap with protected areas
- **Satellite NDVI** — Sentinel-2 vegetation index mock (NDVI mean, land use breakdown, trend)

---

## Scripts Reference

```bash
npm run dev           # Next.js dev (port 9002, Turbopack)
npm run build         # Production build
npm run typecheck     # TypeScript type check (no emit)
npm run genkit:dev    # Genkit AI dev UI

node scripts/seed-firestore.mjs   # Seed/re-seed Firestore (idempotent)

firebase deploy --only firestore:rules,firestore:indexes,storage
```
