#!/usr/bin/env node
/**
 * seed-firestore.mjs
 * Seeds Firestore with initial sectors and 4 demo user accounts.
 * Uses Firebase Auth REST API + Firestore REST API (Node 22 native fetch).
 * No service account key required — only the Web API key.
 *
 * Run:  node scripts/seed-firestore.mjs
 */

const API_KEY    = 'AIzaSyB3EgWykv8pBFijz9d_s8-2pzb2t_uGy9Q';
const PROJECT_ID = 'ecoclear-a6a33';
const AUTH_BASE  = 'https://identitytoolkit.googleapis.com/v1';
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Seed data ──────────────────────────────────────────────────────────────

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
    assignedState:   'Chhattisgarh',
    assignedDistrict: 'Raipur',
    assignedSectors: ['Mining & Quarrying', 'Thermal Power Plants', 'Iron & Steel'],
  },
  {
    email:    'mike@ecoclear.gov',
    password: 'Mike@12345',
    name:     'Mike MoM',
    role:     'MoM Team',
    assignedState:   'Chhattisgarh',
    assignedDistrict: 'Bilaspur',
    assignedSectors: ['Chemical Industries', 'Cement', 'Distilleries'],
  },
];

const SEED_SECTORS = [
  { id: 'mining',      name: 'Mining & Quarrying',       description: 'Coal, iron ore, limestone, and other mineral extraction activities.' },
  { id: 'thermal',     name: 'Thermal Power Plants',     description: 'Coal/gas-based electricity generation facilities (≥25 MW).' },
  { id: 'coal-wash',   name: 'Coal Washeries',           description: 'Coal beneficiation and washing plants.' },
  { id: 'iron-steel',  name: 'Iron & Steel',             description: 'Integrated steel plants, sponge iron, ferro-alloy units.' },
  { id: 'cement',      name: 'Cement',                   description: 'Clinker grinding, rotary kiln, and cement manufacturing.' },
  { id: 'chemical',    name: 'Chemical Industries',      description: 'Bulk chemicals, pesticides, dyes, and intermediates.' },
  { id: 'petroleum',   name: 'Petroleum Products',       description: 'Refineries, storage depots, and petrochemical complexes.' },
  { id: 'distillery',  name: 'Distilleries',             description: 'Molasses, grain, and other alcohol distillation units.' },
  { id: 'sugar',       name: 'Sugar',                    description: 'Cane crushing and sugar manufacturing plants.' },
  { id: 'paper',       name: 'Paper & Pulp',             description: 'Wood/agro-based paper and pulp manufacturing.' },
  { id: 'textile',     name: 'Textile & Dyeing',         description: 'Spinning, weaving, processing, and effluent-generating units.' },
  { id: 'infra',       name: 'Infrastructure',           description: 'Highways, bridges, industrial parks, and area development.' },
  { id: 'river',       name: 'River Valley Projects',    description: 'Dams, barrages, hydro-power, and irrigation projects.' },
  { id: 'food',        name: 'Food Processing',          description: 'Slaughterhouses, fish processing, and food manufacturing.' },
];

// ── Firestore type helpers ─────────────────────────────────────────────────

function str(v)  { return { stringValue: v }; }
function bool(v) { return { booleanValue: v }; }
function arr(vs) { return { arrayValue: { values: vs.map(str) } }; }

function userFields(u, uid) {
  const now = new Date().toISOString();
  const f = {
    id:           str(uid),
    name:         str(u.name),
    email:        str(u.email),
    role:         str(u.role),
    createdAt:    str(now),
    assignedState: str(u.assignedState ?? 'Chhattisgarh'),
  };
  if (u.assignedDistrict)  f.assignedDistrict = str(u.assignedDistrict);
  if (u.assignedSectors)   f.assignedSectors  = arr(u.assignedSectors);
  return { fields: f };
}

function sectorFields(s) {
  return {
    fields: {
      id:          str(s.id),
      name:        str(s.name),
      description: str(s.description),
    },
  };
}

// ── Firebase Auth REST helpers ─────────────────────────────────────────────

async function signUp(email, password) {
  const res = await fetch(`${AUTH_BASE}/accounts:signUp?key=${API_KEY}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { uid: data.localId, idToken: data.idToken };
}

async function signIn(email, password) {
  const res = await fetch(`${AUTH_BASE}/accounts:signInWithPassword?key=${API_KEY}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { uid: data.localId, idToken: data.idToken };
}

/** Create Auth account or sign in if it already exists. */
async function getOrCreateAuth(email, password) {
  try {
    const result = await signUp(email, password);
    console.log(`  ✔ Created Auth account: ${email}`);
    return result;
  } catch (e) {
    if (e.message === 'EMAIL_EXISTS') {
      const result = await signIn(email, password);
      console.log(`  ↩ Auth account already exists, signed in: ${email}`);
      return result;
    }
    throw e;
  }
}

// ── Firestore REST helpers ─────────────────────────────────────────────────

async function writeDoc(collection, docId, body, idToken) {
  const url = `${FS_BASE}/${collection}/${docId}`;
  const res = await fetch(url, {
    method:  'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data;
}

async function docExists(collection, docId, idToken) {
  const url = `${FS_BASE}/${collection}/${docId}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${idToken}` },
  });
  if (res.status === 404) return false;
  const data = await res.json();
  return !data.error;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  EcoClear Firestore Seeder\n');

  // 1. Create / sign-in all Auth accounts first
  const authResults = [];
  for (const u of SEED_USERS) {
    const auth = await getOrCreateAuth(u.email, u.password);
    authResults.push({ ...u, uid: auth.uid, idToken: auth.idToken });
  }

  // 2. Write each user's Firestore document (each signed in as themselves)
  console.log('\n📝  Writing user documents...');
  for (const u of authResults) {
    const exists = await docExists('users', u.uid, u.idToken);
    if (exists) {
      console.log(`  ↩ users/${u.uid} already exists (${u.email}), skipping`);
      continue;
    }
    await writeDoc('users', u.uid, userFields(u, u.uid), u.idToken);
    console.log(`  ✔ users/${u.uid}  [${u.role}]  ${u.email}`);
  }

  // 3. Write sectors using admin's token (requires Admin role in Firestore doc)
  const admin = authResults.find(u => u.role === 'Admin');
  // Re-sign-in admin to get a fresh token (the token above may be seconds old — still valid)
  console.log('\n🏭  Writing sectors (as admin)...');
  for (const s of SEED_SECTORS) {
    const exists = await docExists('sectors', s.id, admin.idToken);
    if (exists) {
      console.log(`  ↩ sectors/${s.id} already exists, skipping`);
      continue;
    }
    await writeDoc('sectors', s.id, sectorFields(s), admin.idToken);
    console.log(`  ✔ sectors/${s.id}  "${s.name}"`);
  }

  console.log('\n✅  Seed complete!\n');
  console.log('Demo credentials:');
  for (const u of SEED_USERS) {
    console.log(`  ${u.role.padEnd(20)}  ${u.email}  /  ${u.password}`);
  }
  console.log();
}

main().catch(err => { console.error('\n❌ Seed failed:', err.message); process.exit(1); });
