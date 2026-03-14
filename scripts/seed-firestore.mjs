#!/usr/bin/env node
/**
 * seed-firestore.mjs
 * Seeds Firestore with users, sectors, and 4 demo applications spanning
 * every workflow stage (Draft → Under Scrutiny → Referred → Finalized).
 *
 * Uses Firebase Auth REST API + Firestore REST API (Node 22 native fetch).
 * No service-account key required — only the Web API key.
 *
 * Run:  FIREBASE_API_KEY=<your-key> node scripts/seed-firestore.mjs
 *   or: node scripts/seed-firestore.mjs  (reads from .env.local automatically)
 *
 * Safe to re-run — every write is idempotent (skips existing docs).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local if present (dev convenience)
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch { /* .env.local not present — that's fine */ }

const API_KEY = process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
if (!API_KEY) {
  console.error('ERROR: FIREBASE_API_KEY is not set.');
  console.error('Run: FIREBASE_API_KEY=<your-key> node scripts/seed-firestore.mjs');
  process.exit(1);
}

const PROJECT_ID = 'ecoclear-a6a33';
const AUTH_BASE  = 'https://identitytoolkit.googleapis.com/v1';
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Time helpers ────────────────────────────────────────────────────────────

const daysAgo  = (n) => new Date(Date.now() - n * 86_400_000).toISOString();
const daysAhead = (n) => new Date(Date.now() + n * 86_400_000).toISOString();

// ── Firestore field-type helpers ────────────────────────────────────────────

const str  = (v)  => ({ stringValue:  String(v)  });
const num  = (v)  => ({ doubleValue:  Number(v)  });
const bool = (v)  => ({ booleanValue: Boolean(v) });
const arr  = (vs) => ({ arrayValue: { values: vs.map(str) } });
const map  = (f)  => ({ mapValue: { fields: f } });

// ── Seed: users ─────────────────────────────────────────────────────────────

const SEED_USERS = [
  {
    email:    'admin@ecoclear.gov',
    password: 'Admin@1234',
    name:     'Admin CECB',
    role:     'Admin',
    assignedState: 'Chhattisgarh',
  },
  {
    email:    'john@builder.com',
    password: 'John@12345',
    name:     'John Builder',
    role:     'Project Proponent',
    assignedState: 'Chhattisgarh',
  },
  {
    email:    'sarah@ecoclear.gov',
    password: 'Sarah@1234',
    name:     'Sarah EDS',
    role:     'Scrutiny Team',
    assignedState:    'Chhattisgarh',
    assignedDistrict: 'Raipur',
    assignedSectors:  ['Mining & Quarrying', 'Thermal Power Plants', 'Iron & Steel', 'Coal Washeries'],
  },
  {
    email:    'mike@ecoclear.gov',
    password: 'Mike@12345',
    name:     'Mike MoM',
    role:     'MoM Team',
    assignedState:    'Chhattisgarh',
    assignedDistrict: 'Bilaspur',
    assignedSectors:  ['Chemical Industries', 'Cement', 'Distilleries', 'Thermal Power Plants'],
  },
];

// ── Seed: sectors ───────────────────────────────────────────────────────────

const SEED_SECTORS = [
  { id: 'mining',      name: 'Mining & Quarrying',    description: 'Coal, iron ore, limestone, and other mineral extraction activities.' },
  { id: 'thermal',     name: 'Thermal Power Plants',  description: 'Coal/gas-based electricity generation facilities (≥25 MW).' },
  { id: 'coal-wash',   name: 'Coal Washeries',        description: 'Coal beneficiation and washing plants.' },
  { id: 'iron-steel',  name: 'Iron & Steel',          description: 'Integrated steel plants, sponge iron, ferro-alloy units.' },
  { id: 'cement',      name: 'Cement',                description: 'Clinker grinding, rotary kiln, and cement manufacturing.' },
  { id: 'chemical',    name: 'Chemical Industries',   description: 'Bulk chemicals, pesticides, dyes, and intermediates.' },
  { id: 'petroleum',   name: 'Petroleum Products',    description: 'Refineries, storage depots, and petrochemical complexes.' },
  { id: 'distillery',  name: 'Distilleries',          description: 'Molasses, grain, and other alcohol distillation units.' },
  { id: 'sugar',       name: 'Sugar',                 description: 'Cane crushing and sugar manufacturing plants.' },
  { id: 'paper',       name: 'Paper & Pulp',          description: 'Wood/agro-based paper and pulp manufacturing.' },
  { id: 'textile',     name: 'Textile & Dyeing',      description: 'Spinning, weaving, processing, and effluent-generating units.' },
  { id: 'infra',       name: 'Infrastructure',        description: 'Highways, bridges, industrial parks, and area development.' },
  { id: 'river',       name: 'River Valley Projects', description: 'Dams, barrages, hydro-power, and irrigation projects.' },
  { id: 'food',        name: 'Food Processing',       description: 'Slaughterhouses, fish processing, and food manufacturing.' },
];

// ── Seed: applications ──────────────────────────────────────────────────────
// Built lazily inside seedApplications() once we have john's UID.

function buildApplications(johnUid) {
  return [
    // ── 1. Draft ──────────────────────────────────────────────────────────
    {
      docId: 'demo-app-draft-001',
      fields: {
        id:             str('demo-app-draft-001'),
        projectName:    str('Durg Sponge Iron Unit'),
        industrySector: str('Iron & Steel'),
        category:       str('B1'),
        description:    str(
          '250 TPD DRI (Direct Reduced Iron) sponge iron plant at Borai Industrial ' +
          'Area, Durg. Coal-based rotary kiln technology with ESP-equipped waste heat ' +
          'recovery boiler. Total project cost ₹42 Cr.'
        ),
        applicantId:    str(johnUid),
        status:         str('Draft'),
        paymentStatus:  str('pending'),
        createdAt:      str(daysAgo(3)),
        updatedAt:      str(daysAgo(3)),
        location:       str('Borai Industrial Area, Durg'),
        district:       str('Durg'),
        coordinates:    map({ lat: num(21.19), lng: num(81.28) }),
      },
    },

    // ── 2. Under Scrutiny ─────────────────────────────────────────────────
    {
      docId: 'demo-app-scrutiny-001',
      fields: {
        id:             str('demo-app-scrutiny-001'),
        projectName:    str('Raipur Coal Beneficiation Plant'),
        industrySector: str('Coal Washeries'),
        category:       str('A'),
        description:    str(
          '500 TPD coal washery with closed-circuit water recycling and thickener-based ' +
          'effluent treatment at Urla Industrial Growth Centre, Raipur. Total project ' +
          'cost ₹78 Cr.'
        ),
        applicantId:    str(johnUid),
        status:         str('UnderScrutiny'),
        paymentStatus:  str('paid'),
        paidAmount:     num(50000),
        transactionId:  str('TXN-DEMO-2024-RCB'),
        paidAt:         str(daysAgo(7)),
        createdAt:      str(daysAgo(14)),
        updatedAt:      str(daysAgo(7)),
        location:       str('Urla Industrial Growth Centre, Raipur'),
        district:       str('Raipur'),
        coordinates:    map({ lat: num(21.25), lng: num(81.63) }),
        riskSummary:    str(
          'HIGH risk – coal washery generating effluent with high suspended solids. ' +
          'Potential groundwater contamination identified. Robust ETP and zero liquid ' +
          'discharge plan required. Air quality impacts from coal dust to be addressed ' +
          'with dust suppression systems and covered conveyors.'
        ),
      },
    },

    // ── 3. Referred to Meeting ────────────────────────────────────────────
    {
      docId: 'demo-app-referred-001',
      fields: {
        id:              str('demo-app-referred-001'),
        projectName:     str('Bilaspur Cement Grinding Unit'),
        industrySector:  str('Cement'),
        category:        str('B1'),
        description:     str(
          '1 MTPA clinker grinding and cement manufacturing unit at Sirgitti Industrial ' +
          'Area, Bilaspur. Bag house filters and dry-type ESP for particulate control. ' +
          'Total project cost ₹95 Cr.'
        ),
        applicantId:     str(johnUid),
        status:          str('Referred'),
        paymentStatus:   str('paid'),
        paidAmount:      num(25000),
        transactionId:   str('TXN-DEMO-2024-BCG'),
        paidAt:          str(daysAgo(15)),
        createdAt:       str(daysAgo(21)),
        updatedAt:       str(daysAgo(5)),
        location:        str('Sirgitti Industrial Area, Bilaspur'),
        district:        str('Bilaspur'),
        coordinates:     map({ lat: num(22.09), lng: num(82.14) }),
        riskSummary:     str(
          'MEDIUM risk – cement grinding unit with controlled particulate emissions. ' +
          'Bag house filter efficiency >99.5%. Water consumption minimal (dry process). ' +
          'Ambient air quality baseline within CPCB limits. Green belt development plan adequate.'
        ),
        scheduledMeetingAt: str(daysAhead(1).replace('T', 'T10:00').slice(0, 16) + ':00.000Z'),
      },
    },

    // ── 4. Finalized ──────────────────────────────────────────────────────
    {
      docId: 'demo-app-finalized-001',
      fields: {
        id:             str('demo-app-finalized-001'),
        projectName:    str('Korba Thermal Power Extension'),
        industrySector: str('Thermal Power Plants'),
        category:       str('A'),
        description:    str(
          '2×300 MW supercritical coal-fired extension at NTPC Korba Super Thermal ' +
          'Power Station. Advanced FGD (Flue Gas Desulfurization) and 99.97%-efficiency ' +
          'ESP meeting MoEFCC 2017 emission norms. Total project cost ₹3,800 Cr.'
        ),
        applicantId:    str(johnUid),
        status:         str('Finalized'),
        paymentStatus:  str('paid'),
        paidAmount:     num(50000),
        transactionId:  str('TXN-DEMO-2024-KTP'),
        paidAt:         str(daysAgo(40)),
        createdAt:      str(daysAgo(45)),
        updatedAt:      str(daysAgo(2)),
        location:       str('NTPC Korba Super Thermal Power Station, Korba'),
        district:       str('Korba'),
        coordinates:    map({ lat: num(22.35), lng: num(82.68) }),
        riskSummary:    str(
          'HIGH risk – major thermal power plant. FGD commissioned for SO2 control. ' +
          'ESP efficiency 99.97% for particulate. Ash pond management plan approved by CECB. ' +
          'Conditional environmental clearance recommended.'
        ),
      },
    },

    // ── 5. Proponent Demo — EDS (data deficiency) ────────────────────────
    // john@builder.com's application in the EDS state awaiting resubmission.
    // Showcases: EDS comments tab, resubmit button, paid payment, documents.
    {
      docId: 'demo-proponent-001',
      fields: {
        id:             str('demo-proponent-001'),
        projectName:    str('Raipur Steel Rolling Mill'),
        industrySector: str('Iron & Steel'),
        category:       str('B1'),
        description:    str(
          '100 TPD steel rolling mill producing TMT bars and structural sections at ' +
          'Urla Industrial Growth Centre, Raipur. Electric arc furnace with secondary ' +
          'metallurgy, bag filter-based fume extraction, and mill scale collection sump. ' +
          'Total project cost ₹28 Cr.'
        ),
        applicantId:    str(johnUid),
        status:         str('EDS'),
        paymentStatus:  str('paid'),
        paidAmount:     num(30000),
        transactionId:  str('TXN-DEMO-2024-RSR'),
        paidAt:         str(daysAgo(8)),
        createdAt:      str(daysAgo(12)),
        updatedAt:      str(daysAgo(3)),
        location:       str('Urla Industrial Growth Centre, Raipur'),
        district:       str('Raipur'),
        coordinates:    map({ lat: num(21.22), lng: num(81.61) }),
        riskSummary:    str(
          'MEDIUM risk — rolling mill with controlled air emissions from EAF fume ' +
          'extraction (bag filter efficiency >99%). Pickling effluent requires dedicated ' +
          'acid recovery plant. Mill scale management and scrap yard dust suppression required.'
        ),
      },
    },

    // ── 6. Scrutiny Demo — Submitted (ready for acceptance) ──────────────
    // Assigned to sarah@ecoclear.gov (Mining & Quarrying, Raipur district).
    // Showcases: Accept for Scrutiny, AI analysis, EDS or Refer actions.
    {
      docId: 'demo-scrutiny-002',
      fields: {
        id:             str('demo-scrutiny-002'),
        projectName:    str('Raipur Iron Ore Pellet Plant'),
        industrySector: str('Mining & Quarrying'),
        category:       str('A'),
        description:    str(
          '1.5 MTPA iron ore pelletization plant at Naya Raipur Growth Corridor. ' +
          'Induration machine with ESP for off-gas cleaning. Dual-fuel (natural gas / ' +
          'producer gas) firing, 100% process water recycling via closed-circuit cooling. ' +
          'Total project cost ₹185 Cr.'
        ),
        applicantId:    str(johnUid),
        status:         str('Submitted'),
        paymentStatus:  str('paid'),
        paidAmount:     num(50000),
        transactionId:  str('TXN-DEMO-2024-RPP'),
        paidAt:         str(daysAgo(2)),
        createdAt:      str(daysAgo(5)),
        updatedAt:      str(daysAgo(2)),
        location:       str('Naya Raipur Growth Corridor, Raipur'),
        district:       str('Raipur'),
        coordinates:    map({ lat: num(21.30), lng: num(81.70) }),
      },
    },

    // ── 7. MoM Demo — MoMGenerated (ready for e-sign + finalize) ─────────
    // Assigned to mike@ecoclear.gov (Chemical Industries, Bilaspur district).
    // Showcases: pre-seeded gist + structured MoM, e-sign, finalize.
    {
      docId: 'demo-mom-001',
      fields: {
        id:             str('demo-mom-001'),
        projectName:    str('Bilaspur Chlor-Alkali Chemical Plant'),
        industrySector: str('Chemical Industries'),
        category:       str('A'),
        description:    str(
          '50,000 TPA chlor-alkali plant using membrane cell technology producing liquid ' +
          'chlorine, caustic soda flakes and hydrochloric acid at Sirgitti Industrial Area, ' +
          'Bilaspur. Zero mercury process, online CEMS, full containment dikes for chlorine ' +
          'storage, tertiary RO effluent treatment for ZLD. Total project cost ₹220 Cr.'
        ),
        applicantId:    str(johnUid),
        status:         str('MoMGenerated'),
        paymentStatus:  str('paid'),
        paidAmount:     num(50000),
        transactionId:  str('TXN-DEMO-2024-BCA'),
        paidAt:         str(daysAgo(18)),
        createdAt:      str(daysAgo(25)),
        updatedAt:      str(daysAgo(1)),
        location:       str('Sirgitti Industrial Area, Bilaspur'),
        district:       str('Bilaspur'),
        coordinates:    map({ lat: num(22.07), lng: num(82.12) }),
        scheduledMeetingAt: str(daysAgo(1).replace('T', 'T10:00').slice(0, 16) + ':00.000Z'),
        riskSummary:    str(
          'HIGH risk — chlor-alkali plant with chlorine gas handling. Membrane cell ' +
          'technology eliminates mercury contamination risk. Critical controls required: ' +
          'chlorine gas detectors at 8 perimeter points, automatic shut-off valves, ' +
          'scrubber backup system. Emergency Response Plan verified by district SDMA. ' +
          'ZLD achieved via RO + multiple-effect evaporator with 97% brine recovery.'
        ),
      },
    },
  ];
}

// ── Seed: documents ─────────────────────────────────────────────────────────

function buildDocuments(johnUid) {
  return [
    // existing apps
    {
      docId: 'demo-doc-scrutiny-001',
      fields: {
        id:            str('demo-doc-scrutiny-001'),
        applicationId: str('demo-app-scrutiny-001'),
        name:          str('Environmental Impact Assessment Report'),
        type:          str('EIA Report'),
        fileUrl:       str('#demo'),
        uploadedAt:    str(daysAgo(12)),
        sha256Hash:    str('3a7bd3e2360a3d29aa625519ffd19a76a41ed3b6f3dde98dfa8dd53e3526f780'),
        fileSize:      num(4_200_000),
        verified:      bool(true),
      },
    },
    {
      docId: 'demo-doc-scrutiny-002',
      fields: {
        id:            str('demo-doc-scrutiny-002'),
        applicationId: str('demo-app-scrutiny-001'),
        name:          str('Consent to Establish — CPCB'),
        type:          str('Regulatory Consent'),
        fileUrl:       str('#demo'),
        uploadedAt:    str(daysAgo(11)),
        sha256Hash:    str('9b2c7a1f4e86d3c0b5a2891647f3820e4d9c16b7a3f2e85d1c74092836f5a4b'),
        fileSize:      num(850_000),
        verified:      bool(true),
      },
    },
    {
      docId: 'demo-doc-referred-001',
      fields: {
        id:            str('demo-doc-referred-001'),
        applicationId: str('demo-app-referred-001'),
        name:          str('Environment Management Plan'),
        type:          str('EMP'),
        fileUrl:       str('#demo'),
        uploadedAt:    str(daysAgo(18)),
        sha256Hash:    str('c4f8d2a1e9b3760f5c2d8a4b9e1f3076d2c8b4a1f9e3720c5d2b8a4f1e9c374'),
        fileSize:      num(2_100_000),
        verified:      bool(true),
      },
    },
    {
      docId: 'demo-doc-finalized-001',
      fields: {
        id:            str('demo-doc-finalized-001'),
        applicationId: str('demo-app-finalized-001'),
        name:          str('Detailed Project Report (DPR)'),
        type:          str('DPR'),
        fileUrl:       str('#demo'),
        uploadedAt:    str(daysAgo(43)),
        sha256Hash:    str('f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2'),
        fileSize:      num(18_500_000),
        verified:      bool(true),
      },
    },
    // ── Proponent demo docs (demo-proponent-001) ─────────────────────────
    {
      docId: 'demo-doc-proponent-001',
      fields: {
        id:            str('demo-doc-proponent-001'),
        applicationId: str('demo-proponent-001'),
        name:          str('Pre-Feasibility Report'),
        type:          str('Environmental Report'),
        fileUrl:       str('#demo'),
        uploadedAt:    str(daysAgo(10)),
        sha256Hash:    str('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'),
        fileSize:      num(3_800_000),
        verified:      bool(true),
      },
    },
    {
      docId: 'demo-doc-proponent-002',
      fields: {
        id:            str('demo-doc-proponent-002'),
        applicationId: str('demo-proponent-001'),
        name:          str('Site Layout and Land Use Plan'),
        type:          str('Site Plan'),
        fileUrl:       str('#demo'),
        uploadedAt:    str(daysAgo(10)),
        sha256Hash:    str('b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3'),
        fileSize:      num(1_200_000),
        verified:      bool(true),
      },
    },
    // ── Scrutiny demo docs (demo-scrutiny-002) ────────────────────────────
    {
      docId: 'demo-doc-scrutiny-003',
      fields: {
        id:            str('demo-doc-scrutiny-003'),
        applicationId: str('demo-scrutiny-002'),
        name:          str('Environmental Impact Assessment (EIA) Report'),
        type:          str('EIA Report'),
        fileUrl:       str('#demo'),
        uploadedAt:    str(daysAgo(2)),
        sha256Hash:    str('c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4'),
        fileSize:      num(6_500_000),
        verified:      bool(true),
      },
    },
    {
      docId: 'demo-doc-scrutiny-004',
      fields: {
        id:            str('demo-doc-scrutiny-004'),
        applicationId: str('demo-scrutiny-002'),
        name:          str('Mining Plan and Mine Closure Plan'),
        type:          str('Environmental Report'),
        fileUrl:       str('#demo'),
        uploadedAt:    str(daysAgo(2)),
        sha256Hash:    str('d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5'),
        fileSize:      num(2_900_000),
        verified:      bool(true),
      },
    },
    {
      docId: 'demo-doc-scrutiny-005',
      fields: {
        id:            str('demo-doc-scrutiny-005'),
        applicationId: str('demo-scrutiny-002'),
        name:          str('Consent to Establish — CPCB NOC'),
        type:          str('NOC Certificate'),
        fileUrl:       str('#demo'),
        uploadedAt:    str(daysAgo(2)),
        sha256Hash:    str('e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6'),
        fileSize:      num(480_000),
        verified:      bool(true),
      },
    },
    // ── MoM demo doc (demo-mom-001) ───────────────────────────────────────
    {
      docId: 'demo-doc-mom-001',
      fields: {
        id:            str('demo-doc-mom-001'),
        applicationId: str('demo-mom-001'),
        name:          str('Detailed Project Report and Risk Assessment'),
        type:          str('DPR'),
        fileUrl:       str('#demo'),
        uploadedAt:    str(daysAgo(20)),
        sha256Hash:    str('f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7'),
        fileSize:      num(14_200_000),
        verified:      bool(true),
      },
    },
  ];
}

// ── Seed: EDS comments ──────────────────────────────────────────────────────

function buildEDSComments(sarahUid) {
  return [
    {
      docId: 'demo-eds-001',
      fields: {
        id:            str('demo-eds-001'),
        applicationId: str('demo-app-scrutiny-001'),
        authorId:      str(sarahUid),
        authorName:    str('Sarah EDS'),
        comment:       str(
          'Section 4.3 of the EIA report does not adequately address groundwater impact ' +
          'for coal washery effluent. Please submit a detailed hydrogeological study with ' +
          'revised water balance calculations within 21 days. Reference: CECB EIA Guideline ' +
          '2019, Para 7.2.'
        ),
        createdAt:     str(daysAgo(5)),
      },
    },
    {
      docId: 'demo-eds-002',
      fields: {
        id:            str('demo-eds-002'),
        applicationId: str('demo-app-scrutiny-001'),
        authorId:      str(sarahUid),
        authorName:    str('Sarah EDS'),
        comment:       str(
          'Dust suppression and covered conveyor details are missing from the EMP. ' +
          'Please include technical specifications for the coal handling plant enclosure ' +
          'and water-spray dust suppression system capacity.'
        ),
        createdAt:     str(daysAgo(4)),
      },
    },
    // ── Proponent demo EDS comments (demo-proponent-001) ─────────────────
    {
      docId: 'demo-eds-proponent-001',
      fields: {
        id:            str('demo-eds-proponent-001'),
        applicationId: str('demo-proponent-001'),
        authorId:      str(sarahUid),
        authorName:    str('Sarah EDS'),
        comment:       str(
          'Section 3.2 of the Pre-Feasibility Report lacks quantification of pickling ' +
          'effluent generation and acid recovery efficiency. Please submit a detailed ' +
          'effluent characterization report including pH, heavy metal concentrations ' +
          '(Cr, Ni, Zn) and the proposed treatment flowsheet within 21 days. ' +
          'Reference: CECB Guideline for Iron & Steel Sector, Para 5.1.3.'
        ),
        createdAt:     str(daysAgo(3)),
      },
    },
    {
      docId: 'demo-eds-proponent-002',
      fields: {
        id:            str('demo-eds-proponent-002'),
        applicationId: str('demo-proponent-001'),
        authorId:      str(sarahUid),
        authorName:    str('Sarah EDS'),
        comment:       str(
          'The site layout plan does not clearly demarcate the scrap storage yard ' +
          'with dust suppression coverage area. Please revise the plan to include the ' +
          'dust suppression nozzle layout, water consumption figures, and coverage radius ' +
          'for each nozzle bank as per CPCB emission norms for fugitive sources.'
        ),
        createdAt:     str(daysAgo(3)),
      },
    },
  ];
}

// ── Seed: meeting gists ─────────────────────────────────────────────────────

function buildGists() {
  const gistText =
    'Meeting Gist — Bilaspur Cement Grinding Unit (demo-app-referred-001)\n\n' +
    'Project: 1 MTPA clinker grinding, Sirgitti Industrial Area, Bilaspur\n' +
    'Category: B1 | Sector: Cement\n\n' +
    'Key Discussion Points:\n' +
    '1. Particulate emission control via bag house filters (efficiency 99.5%)\n' +
    '2. Ambient air quality baseline within CPCB PM10 and PM2.5 limits\n' +
    '3. Minimal water usage — dry grinding process, no process effluent\n' +
    '4. Green belt development plan covers 33% of project area\n' +
    '5. Clinker transportation in closed trucks; fugitive emission plan adequate\n\n' +
    'Compliance Status: MEDIUM risk — all regulatory parameters within limits.\n' +
    'Recommendation: Proceed to Environmental Clearance with standard conditions.';

  const momGistText =
    'Meeting Gist — Bilaspur Chlor-Alkali Chemical Plant (demo-mom-001)\n\n' +
    'Project: 50,000 TPA Chlor-Alkali Plant, Sirgitti Industrial Area, Bilaspur\n' +
    'Category: A | Sector: Chemical Industries\n' +
    'Committee Meeting: ' + new Date(Date.now() - 86_400_000).toLocaleDateString('en-IN') + '\n\n' +
    'Key Discussion Points:\n' +
    '1. Membrane cell technology confirmed — zero mercury process; eliminates Hg contamination risk\n' +
    '2. Chlorine storage: 1-day maximum inventory, full containment dike, chlorine scrubbers operational\n' +
    '3. Emergency Response Plan (ERP) verified by district SDMA; community evacuation protocol in place\n' +
    '4. Effluent treatment: RO + multiple-effect evaporator for ZLD; brine recovery efficiency at 97%\n' +
    '5. Online CEMS covering Cl₂, HCl and stack PM with real-time CECB data link commissioned\n' +
    '6. Green belt buffer of 200 m around chlorine storage; 33% of total land under vegetation\n\n' +
    'Risk Assessment: HIGH — chlorine handling requires continuous monitoring and robust emergency response.\n' +
    'Compliance Status: All major regulatory requirements addressed with proposed technical controls.\n' +
    'Recommendation: Grant conditional EC with mandatory CEMS reporting and monthly CECB inspection for first 2 years.';

  return [
    {
      docId: 'demo-app-referred-001',   // gists are keyed by applicationId
      fields: {
        applicationId: str('demo-app-referred-001'),
        generatedText: str(gistText),
        editedText:    str(gistText),
      },
    },
    {
      docId: 'demo-mom-001',            // MoM demo gist
      fields: {
        applicationId: str('demo-mom-001'),
        generatedText: str(momGistText),
        editedText:    str(momGistText),
      },
    },
  ];
}

// ── Seed: minutes of meeting ─────────────────────────────────────────────────

function buildMinutes() {
  return [
    {
      docId: 'demo-app-finalized-001',  // MoM keyed by applicationId
      fields: {
        id:                    str('demo-app-finalized-001'),
        applicationId:         str('demo-app-finalized-001'),
        discussionSummary:     str(
          'The Expert Appraisal Committee reviewed the EIA/EMP for the 2×300 MW ' +
          'supercritical extension at Korba STPS. The project proponent presented ' +
          'updated emission control technology, a 100% flyash utilization plan within ' +
          '3 years, and water recycling commitments. The committee noted satisfactory ' +
          'responses to earlier EDS queries on mercury content in coal and bottom ash ' +
          'management. Stack height calculations were verified against CPCB norms.'
        ),
        committeeDecision:     str('Environmental Clearance Granted with Conditions'),
        conditions:            arr([
          'FGD units commissioned within 18 months of plant operation; SO₂ ≤ 100 mg/Nm³.',
          'ESP efficiency maintained >99.97%; particulate matter ≤ 50 mg/Nm³.',
          '100% flyash utilization achieved within 3 years; annual audit reports to CECB.',
          'Groundwater quality monitoring at 6 locations on quarterly basis; reports to CGWB.',
          'Green belt of minimum 1 km around plant periphery; 33% of total land under vegetation.',
          'Dedicated flyash silos and covered transport to prevent fugitive emissions.',
          'Online CEMS installed and data feed connected to CECB central server.',
        ]),
        recommendations:       arr([
          'Adopt zero liquid discharge (ZLD) for cooling water circuits.',
          'Commission third-party EMP compliance audit within 6 months of operation.',
        ]),
        finalizedAt:           str(daysAgo(2)),
        esignCertificateSerial: str('DEMO-CERT-20240101-KTP-001'),
        esignIssuer:           str('CCA India (eMudhra)'),
        esignSignedAt:         str(daysAgo(2)),
        esignSignerName:       str('Dr. R. K. Sharma, CECB Member Secretary'),
        esignDocumentHash:     str('a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'),
      },
    },
    // ── MoM demo: draft generated, e-sign + finalize pending ─────────────
    {
      docId: 'demo-mom-001',
      fields: {
        id:                str('demo-mom-001'),
        applicationId:     str('demo-mom-001'),
        discussionSummary: str(
          'The Expert Appraisal Committee reviewed the EIA/EMP for the 50,000 TPA ' +
          'chlor-alkali plant at Sirgitti Industrial Area, Bilaspur. The proponent ' +
          'confirmed adoption of membrane cell technology with complete elimination of ' +
          'mercury from the process chain. The committee verified the Emergency Response ' +
          'Plan (ERP) with the district SDMA and confirmed the automatic chlorine shut-off ' +
          'valve system. Online CEMS covering Cl₂, HCl and stack PM has been pre-installed ' +
          'and connected to CECB central server. The zero-liquid-discharge effluent system ' +
          'using RO + multiple-effect evaporator was accepted. Stack height calculations ' +
          'for HCl and Cl₂ emissions were verified against CPCB norms for Schedule-I chemicals.'
        ),
        committeeDecision: str('Environmental Clearance Granted with Conditions (Category A)'),
        conditions:        arr([
          'Membrane cell technology mandatory; no mercury cell or diaphragm cell permitted at any stage.',
          'Chlorine storage inventory capped at 24-hour production volume with full containment dike.',
          'Online CEMS for Cl₂ and HCl at plant boundary; real-time data feed to CECB server operational before commissioning.',
          'Emergency Response Plan rehearsal with district SDMA every 6 months; records submitted to CECB.',
          'Zero Liquid Discharge (ZLD) mandatory; RO + MEE system commissioned before first chlorine production.',
          'Green belt of 200 m buffer around chlorine storage area maintained; 33% total land under vegetation.',
        ]),
        recommendations:   arr([
          'Install redundant chlorine gas scrubbers with automatic switch-over to ensure no uncontrolled release during maintenance.',
          'Commission independent third-party safety audit (HAZOP) within 3 months of commissioning; report to CECB.',
        ]),
        // NOTE: no esign fields — Mike must complete e-sign in the demo
      },
    },
  ];
}

// ── Seed: gist templates (Admin demo) ───────────────────────────────────────

function buildTemplates() {
  const ecTemplate =
    'Meeting Gist — {{project_name}}\n\n' +
    'Project: {{project_name}}, {{location}}\n' +
    'Category: {{category}} | Sector: {{sector}}\n' +
    'Officer: {{officer_name}} | Date: {{today}}\n' +
    'Board: {{board_name}}\n\n' +
    'Key Discussion Points:\n' +
    '1. [Emission control technology and efficiency]\n' +
    '2. [Effluent treatment and water management]\n' +
    '3. [Ambient air/water quality baseline compliance]\n' +
    '4. [Green belt and land use commitments]\n' +
    '5. [Monitoring and reporting framework]\n\n' +
    'Compliance Status: [LOW / MEDIUM / HIGH risk]\n' +
    'Recommendation: [Grant EC / Request EDS / Reject]';

  const edsTemplate =
    'EDS Follow-up Review Gist — {{project_name}}\n\n' +
    'Project: {{project_name}}, {{location}}\n' +
    'Category: {{category}} | Sector: {{sector}}\n' +
    'Officer: {{officer_name}} | Date: {{today}}\n\n' +
    'EDS Resolution Summary:\n' +
    '1. [Query 1 — original deficiency and proponent response]\n' +
    '2. [Query 2 — original deficiency and proponent response]\n' +
    '3. [Query 3 — original deficiency and proponent response]\n\n' +
    'Committee Assessment of Responses:\n' +
    '- Adequate responses: [list]\n' +
    '- Partially adequate (conditions required): [list]\n' +
    '- Outstanding issues: [list]\n\n' +
    'Recommendation after EDS: [Refer to Meeting / Re-issue EDS]';

  return [
    {
      docId: 'demo-template-ec-gist',
      fields: {
        id:           str('demo-template-ec-gist'),
        templateName: str('Standard EC Meeting Gist'),
        content:      str(ecTemplate),
        type:         str('gist'),
        createdAt:    str(daysAgo(30)),
      },
    },
    {
      docId: 'demo-template-eds-gist',
      fields: {
        id:           str('demo-template-eds-gist'),
        templateName: str('EDS Follow-up Review Gist'),
        content:      str(edsTemplate),
        type:         str('gist'),
        createdAt:    str(daysAgo(30)),
      },
    },
  ];
}

// ── Firebase Auth REST ───────────────────────────────────────────────────────

async function signUp(email, password) {
  const res  = await fetch(`${AUTH_BASE}/accounts:signUp?key=${API_KEY}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { uid: data.localId, idToken: data.idToken };
}

async function signIn(email, password) {
  const res  = await fetch(`${AUTH_BASE}/accounts:signInWithPassword?key=${API_KEY}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { uid: data.localId, idToken: data.idToken };
}

async function getOrCreateAuth(email, password) {
  try {
    const r = await signUp(email, password);
    console.log(`  ✔ Created Auth account: ${email}`);
    return r;
  } catch (e) {
    if (e.message === 'EMAIL_EXISTS') {
      const r = await signIn(email, password);
      console.log(`  ↩ Already exists, signed in: ${email}`);
      return r;
    }
    throw e;
  }
}

// ── Firestore REST ───────────────────────────────────────────────────────────

async function writeDoc(collection, docId, fields, idToken) {
  const url = `${FS_BASE}/${collection}/${docId}`;
  const res = await fetch(url, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body:    JSON.stringify({ fields }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`[${collection}/${docId}] ${JSON.stringify(data.error)}`);
  return data;
}

async function docExists(collection, docId, idToken) {
  const res  = await fetch(`${FS_BASE}/${collection}/${docId}`, {
    headers: { 'Authorization': `Bearer ${idToken}` },
  });
  if (res.status === 404) return false;
  const data = await res.json();
  return !data.error;
}

async function maybeWrite(collection, docId, fields, idToken, label) {
  if (await docExists(collection, docId, idToken)) {
    console.log(`  ↩ ${collection}/${docId} exists, skipping`);
    return;
  }
  await writeDoc(collection, docId, fields, idToken);
  console.log(`  ✔ ${collection}/${docId}  ${label || ''}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  EcoClear Firestore Seeder\n');

  // ── Step 1: Auth accounts ──────────────────────────────────────────────
  console.log('👤  Auth accounts...');
  const authResults = [];
  for (const u of SEED_USERS) {
    const auth = await getOrCreateAuth(u.email, u.password);
    authResults.push({ ...u, uid: auth.uid, idToken: auth.idToken });
  }

  const admin = authResults.find(u => u.role === 'Admin');
  const john  = authResults.find(u => u.role === 'Project Proponent');
  const sarah = authResults.find(u => u.role === 'Scrutiny Team');
  const mike  = authResults.find(u => u.role === 'MoM Team');

  // ── Step 2: User Firestore docs ────────────────────────────────────────
  console.log('\n📝  User documents...');
  for (const u of authResults) {
    const now = new Date().toISOString();
    const fields = {
      id:           str(u.uid),
      name:         str(u.name),
      email:        str(u.email),
      role:         str(u.role),
      createdAt:    str(now),
      assignedState: str(u.assignedState ?? 'Chhattisgarh'),
    };
    if (u.assignedDistrict) fields.assignedDistrict = str(u.assignedDistrict);
    if (u.assignedSectors)  fields.assignedSectors  = arr(u.assignedSectors);
    await maybeWrite('users', u.uid, fields, u.idToken, `[${u.role}] ${u.email}`);
  }

  // ── Step 3: Sectors (admin-only write) ────────────────────────────────
  console.log('\n🏭  Sectors...');
  for (const s of SEED_SECTORS) {
    await maybeWrite('sectors', s.id, {
      id:          str(s.id),
      name:        str(s.name),
      description: str(s.description),
    }, admin.idToken, `"${s.name}"`);
  }

  // ── Step 4: Demo applications (written by john as applicant) ──────────
  console.log('\n📋  Demo applications...');
  for (const app of buildApplications(john.uid)) {
    await maybeWrite('applications', app.docId, app.fields, john.idToken, app.fields.projectName?.stringValue);
  }

  // ── Step 5: Documents ─────────────────────────────────────────────────
  console.log('\n📄  Documents...');
  for (const doc of buildDocuments(john.uid)) {
    await maybeWrite('documents', doc.docId, doc.fields, john.idToken, doc.fields.name?.stringValue);
  }

  // ── Step 6: EDS comments (written by sarah — Scrutiny Team) ──────────
  console.log('\n💬  EDS comments...');
  for (const c of buildEDSComments(sarah.uid)) {
    await maybeWrite('edsComments', c.docId, c.fields, sarah.idToken, c.fields.comment?.stringValue?.slice(0, 60) + '…');
  }

  // ── Step 7: Meeting gists (written by mike — MoM Team) ───────────────
  console.log('\n📝  Meeting gists...');
  for (const g of buildGists()) {
    await maybeWrite('meetingGists', g.docId, g.fields, mike.idToken, `gist for ${g.docId}`);
  }

  // ── Step 8: Minutes of Meeting (written by mike — MoM Team) ──────────
  console.log('\n📜  Minutes of Meeting...');
  for (const m of buildMinutes()) {
    await maybeWrite('minutesOfMeeting', m.docId, m.fields, mike.idToken, `MoM for ${m.docId}`);
  }

  // ── Step 9: Templates (written by admin) ──────────────────────────────
  console.log('\n📋  Gist templates...');
  for (const t of buildTemplates()) {
    await maybeWrite('templates', t.docId, t.fields, admin.idToken, t.fields.templateName?.stringValue);
  }

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n✅  Seed complete!\n');
  console.log('Demo credentials:');
  console.log('  Role                  Email                     Password');
  console.log('  ─────────────────────────────────────────────────────────');
  for (const u of SEED_USERS) {
    console.log(`  ${u.role.padEnd(22)}${u.email.padEnd(30)}${u.password}`);
  }
  console.log('\nDemo applications (one per role):');
  console.log('  ID                         Status          Role Demo         Project');
  console.log('  ──────────────────────────────────────────────────────────────────────────────');
  console.log('  demo-proponent-001         EDS             Proponent         Raipur Steel Rolling Mill');
  console.log('  demo-scrutiny-002          Submitted       Scrutiny Team     Raipur Iron Ore Pellet Plant');
  console.log('  demo-mom-001               MoMGenerated    MoM Team          Bilaspur Chlor-Alkali Chemical Plant');
  console.log('  demo-template-ec-gist      —               Admin             Standard EC Meeting Gist template');
  console.log('  demo-template-eds-gist     —               Admin             EDS Follow-up Review Gist template');
  console.log('\nExisting lifecycle apps:');
  console.log('  demo-app-draft-001         Draft           Proponent         Durg Sponge Iron Unit');
  console.log('  demo-app-scrutiny-001      UnderScrutiny   Scrutiny Team     Raipur Coal Beneficiation Plant');
  console.log('  demo-app-referred-001      Referred        MoM Team          Bilaspur Cement Grinding Unit');
  console.log('  demo-app-finalized-001     Finalized       All               Korba Thermal Power Extension');
  console.log();
}

main().catch(err => { console.error('\n❌ Seed failed:', err.message); process.exit(1); });
