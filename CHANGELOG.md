# CHANGELOG — EcoClear Workflow v2.0 (Hackathon Upgrade)

All notable changes to the EcoClear Workflow platform.

## [2.0.0] — 2026-03-13

Enterprise-grade upgrade implementing the CECB Environmental Clearance workflow enhancements as specified in the Repo Upgrade Implementation Plan.

### Tier 1 — High-Impact Features (within Next.js + Firebase stack)

#### 1.1 Enhanced RBAC-ABAC Access Control
- Extended `User` type with ABAC attributes: `assignedSectors`, `assignedDistrict`, `assignedState`
- Implemented `canAccessApplication()` policy engine with hybrid RBAC + attribute-based evaluation
- Added `filterApplicationsByAccess()` for bulk filtering
- Wired ABAC filtering into Scrutiny Pool and Meeting Desk dashboards
- ABAC indicator badge shown when user has sector/district restrictions
- Added `CG_DISTRICTS` constant (32 Chhattisgarh districts)
- Backwards-compatible: users without ABAC attributes retain full access

**Files:** `src/lib/types.ts`, `src/app/dashboard/scrutiny/page.tsx`, `src/app/dashboard/mom/page.tsx`

#### 1.2 UPI Payment Integration
- Built `UPIPayment` component with NPCI-spec UPI deep-link intent URI
- QR code generation via `qrcode.react` (SVG)
- Mobile detection for deep-link button (Android UPI intent)
- 5-minute QR code expiry countdown timer
- Category-based fee schedule (A=₹50,000, B1=₹25,000, B2=₹15,000)
- Copy-to-clipboard UPI VPA
- Transaction reference tracking with `txn-{appId}-{timestamp}` format
- Extended `Application` type with `transactionId`, `paidAmount`, `paidAt`
- Integrated into application detail page payment dialog

**Files:** `src/components/UPIPayment.tsx`, `src/app/dashboard/applications/[id]/page.tsx`

#### 1.3 CRDT Collaborative MoM Editor
- Built `CollaborativeEditor` using Tiptap + Yjs + y-webrtc + y-indexeddb
- Rich text toolbar: bold, italic, underline, strikethrough, highlight, headings (H1-H3), bullet/ordered lists, undo/redo
- Real-time peer collaboration via WebRTC (serverless)
- Offline-first persistence via IndexedDB
- Peer connection status indicator (connected user count)
- Replaced plain textarea in MoM editor page

**Files:** `src/components/CollaborativeEditor.tsx`, `src/app/dashboard/mom/editor/[id]/page.tsx`

#### 1.4 Document SHA-256 Hashing
- Built `crypto.ts` utility module using Web Crypto API
- `computeSHA256(file)` — compute hex-encoded SHA-256 hash of uploaded files
- `verifySHA256(file, expectedHash)` — tamper detection verification
- `hashString(text)` — hash arbitrary text content
- Integrated into document upload handler — hash computed and stored on every upload
- Document list displays SHA-256 hash prefix with shield icon (verified/unverified)
- Extended `Document` type with `sha256Hash`, `fileSize`, `verified`

**Files:** `src/lib/crypto.ts`, `src/app/dashboard/applications/[id]/page.tsx`, `src/lib/types.ts`

#### 1.5 GIS Map Integration
- Built `MapPicker` component using Leaflet (dynamic import, SSR-safe)
- Two modes: `pick` (click-to-place marker) and `display` (read-only with overlays)
- 8 Chhattisgarh eco-sensitive zones visualized as circles with buffer rings
  - National Parks: Indravati, Kanger Ghati
  - Tiger Reserves: Achanakmar, Udanti-Sitanadi
  - Wildlife Sanctuaries: Barnawapara, Tamor Pingla
  - Reserve Forest: Hasdeo Arand
  - River: Mahanadi Corridor
- Haversine distance calculation for proximity analysis
- Risk-level classification: critical (inside zone), high (in buffer), medium, low
- Category-specific buffer requirements (A=10km, B1=5km, B2=2km)
- Manual coordinate entry with lat/lng input fields
- Color-coded eco-zone legend overlay
- Proximity analysis panel with risk banners
- Extended `Application` type with `coordinates`, `siteGeoJSON`, `district`
- Integrated into new application form as "Site Location" step (step 2 of 4)
- Added district selector (all 32 CG districts) to application form
- Integrated into application detail page as "GIS" tab
- Added `gis-data.ts` with zone definitions, `checkProximity()`, `CATEGORY_BUFFER`

**Files:** `src/components/MapPicker.tsx`, `src/lib/gis-data.ts`, `src/app/dashboard/proponent/new/page.tsx`, `src/app/dashboard/applications/[id]/page.tsx`

#### 1.6 Enhanced AI Scrutiny
- `regulatoryComplianceCheck` Genkit flow — sector-specific parameter checking
  - Hardcoded CECB sector regulations for Mining, Energy, Infrastructure, Manufacturing
  - Compliance scoring with risk levels
  - Missing document detection
  - Regulatory parameter gap analysis
- `generateEDSDraft` Genkit flow — formal EDS letter auto-generation
  - Generates structured EDS letter with CECB formatting
  - Includes compliance findings and required documents
- Both flows registered in `src/ai/dev.ts`

**Files:** `src/ai/flows/regulatory-compliance-check.ts`, `src/ai/dev.ts`

### Tier 2 — Service Layer

#### 2.1 Next.js API Routes
- `GET /api/health` — system health check with feature list
- `POST /api/gis/proximity` — server-side GIS proximity analysis
- `POST /api/documents/verify` — server-side SHA-256 document integrity verification
- `POST /api/applications` — ABAC-filtered application listing endpoint

**Files:** `src/app/api/health/route.ts`, `src/app/api/gis/proximity/route.ts`, `src/app/api/documents/verify/route.ts`, `src/app/api/applications/route.ts`

#### 2.2 Python AI Agent Service (FastAPI + LangGraph)
- **LangGraph Multi-Agent Supervisor Architecture** with 5 specialized nodes:
  - **Ingestion Node** — Parses and structures incoming application data
  - **Regulatory Analyzer Node** — LLM-powered cross-referencing against CECB sector rules (Google Gemini)
  - **Validation & Draft Node** — Structures compliance findings, determines EDS necessity
  - **Reflector/Critic Node** — Quality assurance review of analysis outputs
  - **EDS Generation Node** — Formal EDS letter drafting with CECB formatting
- Conditional routing: Reflector routes to EDS generation only when deficiencies warrant it
- CECB regulatory knowledge base mirroring Next.js Genkit rules (Mining, Energy, Infrastructure, Manufacturing)
- Required document lists per category (A, B1, B2)
- Indian environmental legislation references (EIA 2006, Air Act 1981, Water Act 1974, etc.)
- 3 FastAPI endpoints:
  - `POST /api/scrutiny/analyze` — Full multi-agent scrutiny pipeline
  - `POST /api/eds/generate` — Standalone EDS letter generation
  - `POST /api/compliance/check` — Quick rule-based compliance check
- Health check with agent availability status
- CORS configured for Next.js frontend
- LangSmith observability integration (optional)
- Dockerfile with Python 3.12-slim, health checks, non-root user

**Files:** `services/ai-agent-service/app/main.py`, `app/agents/supervisor.py`, `app/agents/nodes.py`, `app/agents/regulations.py`, `app/models/schemas.py`, `Dockerfile`

#### 2.3 Python GIS Service (FastAPI + Shapely/GeoPandas)
- **Shapely 2.x spatial engine** with proper UTM projection (EPSG:32644) for accurate distance/area calculations
- 8 Chhattisgarh eco-zones as Shapely Polygon geometries (circular approximations from center + radius)
- PyProj WGS84 ↔ UTM Zone 44N projection for meter-accurate buffer/area computations
- Haversine distance for point-to-point proximity
- 3 FastAPI endpoints:
  - `POST /api/gis/proximity` — Proximity analysis against all eco-zones with risk classification
  - `POST /api/gis/buffer` — ST_Buffer equivalent: compute buffer polygon + GeoJSON + area + zone intersections
  - `POST /api/gis/intersection` — ST_Intersects equivalent: check GeoJSON geometry against zone polygons with overlap area
- Category-specific buffer requirements (A=10km, B1=5km, B2=2km)
- Risk-based recommendations for each analysis type
- Dockerfile with GDAL/GEOS/PROJ system dependencies, non-root user

**Files:** `services/gis-service/app/main.py`, `app/data/eco_zones.py`, `app/models/schemas.py`, `Dockerfile`

#### 2.4 Docker Compose Orchestration
- Multi-service orchestration: Next.js frontend + AI Agent (port 8001) + GIS Service (port 8002)
- Service health checks with dependencies (frontend waits for both Python services)
- Shared Docker network (`ecoclear-net`) for inter-service communication
- PostgreSQL + PostGIS container pre-configured (commented out, ready for future migration)
- Environment file support (`.env` per service)

**Files:** `docker-compose.yml`

#### 2.5 Frontend API Client
- TypeScript API client utility (`src/lib/api-client.ts`) for Python microservice communication
- Type-safe request/response interfaces matching Python Pydantic schemas
- Service health check functions
- Timeout handling with AbortController
- Server-side direct calls vs. browser proxy pattern for CORS

**Files:** `src/lib/api-client.ts`

### Dependencies Added

**Node.js (Next.js frontend):**
- `qrcode.react` — QR code SVG generation
- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-highlight`, `@tiptap/extension-collaboration`, `@tiptap/extension-collaboration-cursor` — Rich text editor
- `yjs`, `y-webrtc`, `y-indexeddb` — CRDT sync + offline persistence
- `leaflet`, `react-leaflet`, `@types/leaflet` — Map rendering

**Python (AI Agent Service):**
- `fastapi`, `uvicorn` — ASGI web framework
- `langgraph` — Multi-agent graph orchestration
- `langchain`, `langchain-google-genai`, `langchain-community` — LLM integration
- `langsmith` — LLM observability
- `pydantic` — Data validation
- `httpx` — Async HTTP client

**Python (GIS Service):**
- `fastapi`, `uvicorn` — ASGI web framework
- `shapely` — Computational geometry (ST_Buffer, ST_Intersects equivalents)
- `geopandas` — Geospatial data processing
- `pyproj` — Coordinate reference system projections
- `geojson` — GeoJSON parsing/serialization
- `pydantic` — Data validation

### Architecture Notes
- All new features maintain backwards compatibility with the existing demo mode (localStorage)
- Leaflet is dynamically imported with `ssr: false` to avoid Next.js SSR `window` errors
- Leaflet CSS is injected at runtime via `<link>` element (avoids TypeScript CSS import issues)
- ABAC filtering is additive — users without sector/district assignments see all applications
- UPI payment uses standardized NPCI intent URI format
- Collaborative editor uses WebRTC for peer discovery (no central server needed)
- API routes provide server-side validation layer parallel to client-side logic
- Python services are independent and can run standalone or via Docker Compose
- AI Agent Service uses LangGraph StateGraph with compiled graph singletons for performance
- GIS Service uses UTM Zone 44N (EPSG:32644) projection for Chhattisgarh-accurate spatial calculations
- Inter-service communication uses Docker network DNS names (e.g., `http://gis-service:8002`)
- Frontend API client supports both server-side direct calls and browser-side proxy pattern

### Tier 3 — Advanced Infrastructure & India Stack Integration

#### 3.1 Hocuspocus Collaboration Service
- Production-grade WebSocket CRDT server replacing peer-to-peer y-webrtc
- SQLite persistence via `@hocuspocus/extension-database` (WAL mode for concurrent reads)
- Document history table for audit trail
- Connection authentication (token-based in production, open in dev)
- Origin validation, throttling via `@hocuspocus/extension-throttle`
- Structured logging via `@hocuspocus/extension-logger`
- Graceful shutdown handlers (SIGINT/SIGTERM)
- Dockerfile with Node.js 20 Alpine, non-root user, health check

**Files:** `services/collaboration-service/src/server.js`, `package.json`, `Dockerfile`, `.env.example`

#### 3.2 India Stack Integration — Aadhaar eKYC + CCA eSign
- **Aadhaar e-KYC API stubs** (`india-stack.ts`): `initiateAadhaarOTP()`, `verifyAadhaarEKYC()` with realistic mock responses
  - UIDAI-spec request/response interfaces (AadhaarEKYCRequest, AadhaarEKYCResponse)
  - 12-digit Aadhaar validation, masked storage (last 4 only), consent enforcement
  - Simulated latency for realistic demo UX
- **CCA eSign API stubs** (`india-stack.ts`): `initiateESignOTP()`, `executeESign()`, `verifyESignature()`
  - PKCS#7 mock signature generation with X.509 certificate details
  - Short-term certificate model (30-min validity per CCA spec)
  - IT Act 2000 Section 3A compliance references
- **AadhaarEKYC component** — Full Aadhaar verification UI with OTP flow
  - XXXX XXXX XXXX formatted input, consent checkbox
  - Verified identity display (name, DOB, masked Aadhaar)
  - Wired into proponent application form as Step 0 (identity verification before project details)
  - Skip option for demo mode
- **ESignDocument component** — Digital signature UI with OTP authorization
  - SHA-256 document hash display, signer info
  - OTP entry with 6-digit validation
  - Signed state shows certificate serial, issuer, validity
  - IT Act 2000 legal disclaimer
  - Wired into MoM editor finalization flow — eSign required before "Finalize & Approve EC"

**Files:** `src/lib/india-stack.ts`, `src/components/AadhaarEKYC.tsx`, `src/components/ESignDocument.tsx`, `src/app/dashboard/proponent/new/page.tsx`, `src/app/dashboard/mom/editor/[id]/page.tsx`

#### 3.3 LangSmith Observability
- Explicit LangSmith tracing added to all LLM-calling agent nodes:
  - Regulatory Analyzer Node: run name `ecoclear.regulatory_analyzer` with sector/category metadata
  - Reflector/Critic Node: run name `ecoclear.reflector_critic` with risk level metadata
  - EDS Generation Node: run name `ecoclear.eds_generator` with deficiency counts
- `_trace_metadata()` helper for consistent trace naming, tags, and metadata
- Activated via `LANGCHAIN_TRACING_V2=true` + `LANGCHAIN_API_KEY` environment variables
- Project name configurable via `LANGCHAIN_PROJECT` (default: `ecoclear-scrutiny`)

**Files:** `services/ai-agent-service/app/agents/nodes.py`

#### 3.4 Sentinel-2 Satellite Analysis (NDVI)
- Mock Sentinel-2 NDVI vegetation analysis module (`sentinel.py`)
  - Coordinate-seeded random for reproducible results per location
  - NDVI classification: dense_forest, moderate_vegetation, sparse_vegetation, grassland, barren, urban, water
  - Land-use breakdown (forest, agriculture, grassland, urban, barren, water)
  - 6-month change detection with deforestation risk assessment
  - Environmental recommendations based on NDVI thresholds
- Wired into GIS service: `POST /api/gis/satellite` endpoint
  - Request: lat, lng, buffer_km, optional date range
  - Response: NDVI stats, vegetation class, land-use breakdown, change detection, recommendation
- GIS service version bumped to 2.1.0

**Files:** `services/gis-service/app/data/sentinel.py`, `services/gis-service/app/main.py`

#### 3.5 Turborepo Monorepo Configuration
- `turbo.json` with build/dev/lint/test pipeline definitions
- Proper dependency ordering: build depends on `^build` (topological)
- Output caching for build artifacts and `.next` directories
- Dev and lint tasks marked as persistent (no caching)

**Files:** `turbo.json`

#### 3.6 Docker Compose — Collaboration Service
- Added `collaboration` service container (port 8003)
- SQLite volume mount (`collab-data`) for document persistence
- Health check via Node.js `fetch()` probe
- Shared `ecoclear-net` network

**Files:** `docker-compose.yml`

#### 3.7 CollaborativeEditor — Hocuspocus Dual-Mode
- Installed `@hocuspocus/provider` npm package
- CollaborativeEditor now supports dual sync mode:
  - **Hocuspocus mode**: Server-authoritative WebSocket sync via `HocuspocusProvider` (when `NEXT_PUBLIC_COLLAB_WS_URL` env var or `hocuspocusUrl` prop is set)
  - **WebRTC fallback**: Original peer-to-peer sync via `y-webrtc` (when no server URL configured)
- Server mode indicator icon in toolbar
- Null-safe awareness handling for provider compatibility
- New props: `hocuspocusUrl`, `hocuspocusToken`

**Files:** `src/components/CollaborativeEditor.tsx`, `package.json`

#### 3.8 MoM eSign Finalization Flow
- ESignDocument component integrated into MoM editor page
- SHA-256 hash computed from MoM content (discussion + decision + conditions) via `hashString()`
- Digital signature required before "Finalize & Approve EC" button is enabled
- Signer designation derived from `currentUser.role` (Scrutiny Team → Scrutiny Officer, Admin → Member Secretary)
- Signed confirmation banner shown after successful signature

**Files:** `src/app/dashboard/mom/editor/[id]/page.tsx`

#### 3.9 Proponent eKYC Registration
- AadhaarEKYC component integrated as Step 0 of the new application wizard (5 steps total, was 4)
- Identity verification required before proceeding to project details
- Verified identity (name + masked Aadhaar) displayed in review step
- "Skip for demo" link available for hackathon testing
- Step progression updated throughout the form (0=eKYC, 1=Details, 2=Map, 3=Description, 4=Review)

**Files:** `src/app/dashboard/proponent/new/page.tsx`

### Dependencies Added (Tier 3)

**Node.js (Next.js frontend):**
- `@hocuspocus/provider` — WebSocket CRDT sync client for Hocuspocus server

**Node.js (Collaboration Service):**
- `@hocuspocus/server`, `@hocuspocus/extension-database`, `@hocuspocus/extension-logger`, `@hocuspocus/extension-throttle` — Hocuspocus WebSocket CRDT server
- `better-sqlite3` — SQLite persistence (WAL mode)
- `dotenv` — Environment configuration
