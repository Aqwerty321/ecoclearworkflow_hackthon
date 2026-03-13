#!/usr/bin/env node
/**
 * seed-firestore.mjs
 * Seeds Firestore with users, sectors, and 4 demo applications spanning
 * every workflow stage (Draft → Under Scrutiny → Referred → Finalized).
 *
 * Uses Firebase Auth REST API + Firestore REST API (Node 22 native fetch).
 * No service-account key required — only the Web API key.
 *
 * Run:  node scripts/seed-firestore.mjs
 * Safe to re-run — every write is idempotent (skips existing docs).
 */

const API_KEY    = 'AIzaSyB3EgWykv8pBFijz9d_s8-2pzb2t_uGy9Q';
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
  ];
}

// ── Seed: documents ─────────────────────────────────────────────────────────

function buildDocuments(johnUid) {
  return [
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

  return [
    {
      docId: 'demo-app-referred-001',   // gists are keyed by applicationId
      fields: {
        applicationId: str('demo-app-referred-001'),
        generatedText: str(gistText),
        editedText:    str(gistText),
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

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n✅  Seed complete!\n');
  console.log('Demo credentials:');
  console.log('  Role                  Email                     Password');
  console.log('  ─────────────────────────────────────────────────────────');
  for (const u of SEED_USERS) {
    console.log(`  ${u.role.padEnd(22)}${u.email.padEnd(30)}${u.password}`);
  }
  console.log('\nDemo applications:');
  console.log('  ID                         Status          Project');
  console.log('  ─────────────────────────────────────────────────────────────────');
  console.log('  demo-app-draft-001         Draft           Durg Sponge Iron Unit');
  console.log('  demo-app-scrutiny-001      UnderScrutiny   Raipur Coal Beneficiation Plant');
  console.log('  demo-app-referred-001      Referred        Bilaspur Cement Grinding Unit');
  console.log('  demo-app-finalized-001     Finalized       Korba Thermal Power Extension');
  console.log();
}

main().catch(err => { console.error('\n❌ Seed failed:', err.message); process.exit(1); });
