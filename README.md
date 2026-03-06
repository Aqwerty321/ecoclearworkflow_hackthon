
# EcoClear Workflow

An AI-powered, role-based platform for digitising India's environmental clearance process — from application submission through committee review to final EC approval.

## Developer
Developed by [Lalitheswar](https://github.com/lalitheswar09-data).

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 15.5 (App Router, Turbopack) |
| Styling | Tailwind CSS 3.4 + shadcn/ui |
| Animations | CSS keyframes + ReactBits-inspired primitives |
| Dark Mode | next-themes (system toggle) |
| AI | Google Genkit + Gemini 2.5 Flash |
| State | Zustand + localStorage persistence |
| Exports | jsPDF + docx (MoM PDF/DOCX export) |

## Features
- **Role-based dashboards** — Admin, Project Proponent, Scrutiny Team, MoM Team
- **Multi-step application form** — animated step indicator, category A/B1/B2 support
- **AI scrutiny assistant** — document compliance analysis with environmental impact flagging
- **Meeting gist editor** — AI-generated meeting gist → structured MoM draft
- **PDF/DOCX export** — finalized Minutes of Meeting export
- **Payment simulation** — UPI payment flow with transaction ID
- **Admin panel** — sector CRUD, template management, user role assignment
- **Dark mode** — full dark/light toggle across all pages
- **Animated UI** — SpotlightCard, CountUp, GradientText, AnimatedContainer, ShimmerButton

## Demo Accounts (local dev)
| Role | Email | Password |
|---|---|---|
| Admin | admin@ecoclear.gov | any |
| Proponent | john@builder.com | any |
| Scrutiny | sarah@ecoclear.gov | any |
| MoM Team | mike@ecoclear.gov | any |

## Local Setup
1. **Clone & install**
   ```bash
   git clone https://github.com/lalitheswar09-data/ecoclearworkflow_hackthon.git
   cd ecoclearworkflow_hackthon
   npm install
   ```
2. **Environment variables** — copy the example and fill in your keys:
   ```bash
   cp .env.local.example .env.local
   ```
3. **Run development server** (port 9002):
   ```bash
   npm run dev
   ```
4. **Run Genkit AI dev server** (separate terminal):
   ```bash
   npm run genkit:dev
   ```

## Project Structure
```
src/
  app/              # Next.js App Router pages
    dashboard/      # Role-gated dashboard pages
    page.tsx        # Login
    register/       # Registration
  ai/flows/         # Genkit AI flows (scrutiny, MoM, gist)
  components/
    ui/             # shadcn/ui + custom animated primitives
    layout/         # Navbar, Sidebar
  lib/              # Zustand store, types, utils
docs/
  blueprint.md      # Full feature specification
```

## Scripts
```bash
npm run dev          # Next.js dev server (port 9002)
npm run build        # Production build
npm run genkit:dev   # Genkit AI dev UI
```
