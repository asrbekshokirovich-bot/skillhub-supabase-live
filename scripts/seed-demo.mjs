#!/usr/bin/env node
/**
 * scripts/seed-demo.mjs — One-time demo seed for SkillHub.
 *
 * Populates the project with realistic data spanning the last 6 months
 * so every page in the app is demonstrable.
 *
 * ─── Required env vars (set inline or in `.env.local` at repo root) ──────
 *
 *   SUPABASE_URL                = https://<your-project-ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   = eyJ...  (service_role JWT — admin access)
 *   SEED_CONFIRM                = YES    (safety guard — script refuses without it)
 *
 * Optional:
 *   --reset                     Delete previously-seeded rows before inserting.
 *
 * Usage:
 *   SEED_CONFIRM=YES npm run seed-demo
 *   SEED_CONFIRM=YES npm run seed-demo -- --reset
 *
 * Idempotency
 * -----------
 *   • Workers + clients are matched by email (`<username>@skillhubapp.com`).
 *   • Projects are matched by exact title from the spec list.
 *   • Invoices + expenses are identified by their description prefix
 *     `[SEED v1] …`.
 *   • Tasks are tagged with `seed:demo-v1` for round-trip recognition.
 *   • Re-running without --reset skips anything already present.
 *   • With --reset the script first deletes everything it had previously
 *     created (and ONLY those rows) before inserting fresh.
 */

import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

// ─── tiny colored logging ─────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', magenta: '\x1b[35m', blue: '\x1b[34m',
};
const log = {
  info: (m)  => console.log(`${C.cyan}ℹ${C.reset} ${m}`),
  ok:   (m)  => console.log(`${C.green}✓${C.reset} ${m}`),
  warn: (m)  => console.log(`${C.yellow}⚠${C.reset} ${m}`),
  err:  (m)  => console.error(`${C.red}✘${C.reset} ${m}`),
  step: (m)  => console.log(`\n${C.bold}${C.cyan}→ ${m}${C.reset}`),
  hr:   ()   => console.log(`${C.dim}${'─'.repeat(60)}${C.reset}`),
};

// ─── env / arg guards ─────────────────────────────────────────────────────
const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL) { log.err('SUPABASE_URL not set. Add it to your env or .env.local'); process.exit(1); }
if (!KEY) { log.err('SUPABASE_SERVICE_ROLE_KEY not set. Get it from Supabase → Settings → API'); process.exit(1); }

if (process.env.SEED_CONFIRM !== 'YES') {
  log.err(`${C.bold}Refusing to run without SEED_CONFIRM=YES.${C.reset}`);
  console.error(`Re-run with: ${C.bold}SEED_CONFIRM=YES npm run seed-demo${C.reset}`);
  console.error(`Add ${C.bold}-- --reset${C.reset} to wipe previously-seeded rows first.`);
  process.exit(1);
}

const RESET = process.argv.includes('--reset');

// ─── Supabase client (service_role — bypasses RLS) ────────────────────────
const sb = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── constants ────────────────────────────────────────────────────────────
const AUTH_DOMAIN = 'skillhubapp.com';
const SEED_MARK = '[SEED v1]';   // prefix on invoice / expense descriptions
const SEED_TAG  = 'seed:demo-v1'; // tag on tasks

// ─── source data ──────────────────────────────────────────────────────────
const WORKERS = [
  { username: 'sindarov', name: 'Sindarov Aziz',     password: 'SkillHub2026!', role: 'worker' },
  { username: 'aziza',    name: 'Aziza Karimova',    password: 'SkillHub2026!', role: 'worker' },
  { username: 'bobur',    name: 'Bobur Tashpulatov', password: 'SkillHub2026!', role: 'worker' },
  { username: 'nodira',   name: 'Nodira Olimova',    password: 'SkillHub2026!', role: 'worker' },
  { username: 'timur',    name: 'Timur Yusupov',     password: 'SkillHub2026!', role: 'worker' },
];

const CLIENTS = [
  { username: 'raketa_client',   name: 'Raketa Holding (Client)', password: 'Demo2026!', role: 'client' },
  { username: 'yuhakway_client', name: 'Yuhakway (Client)',       password: 'Demo2026!', role: 'client' },
];

// monthsAgo: 0 = today, 5 = ~155 days ago. Used both for project createdAt and as
// the floor of the per-task date spread inside each project.
const PROJECT_SPECS = [
  {
    title: 'Raketa Marketplace v2',
    client: 'Raketa Holding',
    lead: 'sindarov',
    status: 'In Progress',
    startedMonthsAgo: 5,
    taskCount: 24,
    revenueTarget: 8400,
    description:
      '<p><strong>Phase 1:</strong> Multi-vendor account model, KYC ingest, vendor onboarding flow.</p>' +
      '<p><strong>Phase 2:</strong> Checkout to Stripe Connect, refunds &amp; disputes handling.</p>' +
      '<p><strong>Phase 3:</strong> Vendor analytics dashboard + weekly payout reconciliation.</p>',
    clientNotes:
      'Founder calls fortnightly Tuesday 10:00 (TST).\n' +
      'Priority order: payments → vendor UX → analytics.\n' +
      'Refunds policy: 14-day, vendor-funded — confirmed.',
  },
  {
    title: 'Yuhakway Mobile App',
    client: 'Yuhakway',
    lead: 'aziza',
    status: 'In Progress',
    startedMonthsAgo: 4,
    taskCount: 18,
    description:
      '<p><strong>Phase 1:</strong> React Native shell, auth + push notifications.</p>' +
      '<p><strong>Phase 2:</strong> Korean–English subtitle pipeline, offline cache.</p>' +
      '<p><strong>Phase 3:</strong> In-app purchase + family-share plan.</p>',
    clientNotes:
      'App Store submission target: end of June.\n' +
      'Founder prefers Slack > email.\n' +
      'Translation review owned by Yuhakway team.',
  },
  {
    title: 'AliCargo CRM',
    client: 'Ali Logistics',
    lead: 'bobur',
    status: 'In Progress',
    startedMonthsAgo: 3,
    taskCount: 14,
    description:
      '<p><strong>Phase 1:</strong> Shipment ingest + customs document upload.</p>' +
      '<p><strong>Phase 2:</strong> Route status board + driver assignment.</p>' +
      '<p><strong>Phase 3:</strong> Customer portal + auto-generated invoices.</p>',
    clientNotes:
      'CEO wants Telegram bot integration in phase 2.\n' +
      'Drivers are Android-first; iOS later.',
  },
  {
    title: 'Hanguk Academy Web',
    client: 'Hanguk EDU',
    lead: 'nodira',
    status: 'Done',
    startedMonthsAgo: 5,
    completedMonthsAgo: 1,
    taskCount: 12,
    description:
      '<p><strong>Phase 1:</strong> Course catalog + enrollment flow.</p>' +
      '<p><strong>Phase 2:</strong> Lesson player + progress tracking.</p>' +
      '<p><strong>Done:</strong> Shipped April 14.</p>',
    clientNotes:
      'Shipped April 14, 2026. Retainer for tiny tweaks now.\n' +
      'Quarterly review on the books for July.',
  },
  {
    title: 'Korean AI Coach — MVP',
    client: 'Internal',
    lead: 'timur',
    status: 'Done',
    startedMonthsAgo: 4,
    completedMonthsAgo: 2,
    taskCount: 10,
    description:
      '<p><strong>Phase 1:</strong> Speech-to-text + pronunciation scoring.</p>' +
      '<p><strong>Phase 2:</strong> Conversation prompts + spaced repetition.</p>' +
      '<p><strong>Done:</strong> MVP demo recorded, parked for SkillHub launch sprint.</p>',
    clientNotes:
      'Internal R&D — no client.\n' +
      'Re-open after Raketa ships.',
  },
  {
    title: 'BillSense Subscription Tracker',
    client: 'Internal',
    lead: 'sindarov',
    status: 'In Progress',
    startedMonthsAgo: 2,
    taskCount: 10,
    description:
      '<p><strong>Phase 1:</strong> Bank-statement parser (Visa/UzCard/Humo).</p>' +
      '<p><strong>Phase 2:</strong> Recurring-charge clustering + cancel suggestions.</p>' +
      '<p><strong>Phase 3:</strong> Mobile UI + push notifications.</p>',
    clientNotes:
      'Internal product — bring to market once Raketa is shipped.\n' +
      'Soft-launch to friends-and-family in July.',
  },
  {
    title: 'EU Hedge Fund Site',
    client: 'EU Hedge Fund',
    lead: 'aziza',
    status: 'Undone',
    startInFuture: true,
    taskCount: 8,
    description:
      '<p><strong>Phase 1:</strong> Brand site + investor login.</p>' +
      '<p><strong>Phase 2:</strong> Quarterly report PDF generator.</p>',
    clientNotes:
      'Kickoff scheduled June 1.\n' +
      'NDA signed; brand kit pending.',
  },
  {
    title: 'FocusGuard AppLocker',
    client: 'Internal',
    lead: 'bobur',
    status: 'Undone',
    startYesterday: true,
    taskCount: 8,
    description:
      '<p><strong>Phase 1:</strong> Android-only MVP: app blocking + accountability buddy.</p>' +
      '<p><strong>Phase 2:</strong> iOS + Mac.</p>',
    clientNotes:
      'Internal — kickoff yesterday.\n' +
      'Awaiting Bobur\'s "start now" approval from CEO.',
  },
];

// task title pool — realistic engineering / design / QA work
const TASK_TITLE_POOL = [
  'Wire up checkout to Stripe Connect',
  'Korean–English subtitle sync — edge case for line breaks',
  'RLS policy audit: invoices table',
  'Onboarding email sequence (welcome + day-3 nudge)',
  'Fix iOS keyboard pushing the tab bar',
  'Refactor projectService.getProjectsByAssignee — eager-load tasks',
  'Vendor analytics dashboard — weekly revenue + payouts',
  'Migrate file vault to Supabase Storage signed URLs',
  'QA: refund + dispute paths',
  'Settings page — add timezone preference',
  'Driver app: offline shipment scan queue',
  'Customs document upload — virus scan + thumbnailing',
  'Vendor KYC ingest — passport OCR',
  'Telegram bot: order status pings',
  'Mobile bottom-sheet ergonomics on small Androids',
  'Lesson player: keyboard nav for /vocab cards',
  'Spaced-repetition scheduler — overdue queue cap',
  'Bank statement parser: handle UzCard CSV quirks',
  'Recurring-charge clustering threshold tuning',
  'iOS Family Sharing entitlement renewal',
  'Vercel preview: gate by GitHub team',
  'Sidebar: collapse rules on narrow viewports',
  'Inbox: timezone bug on dueDate comparison',
  'Approve-task email digest (CEO, 09:00 local)',
  'Pricing page A/B: hero CTA wording',
  'Brand kit ingest from PDF → Figma library',
  'Course progress: reset-button confirmation modal',
  'Quarterly report PDF generator — typography pass',
  'Investor login — magic-link or password? RFC needed',
  'Database migration runbook — write & rehearse',
  'Push notification opt-in copy — A/B variants',
  'Refactor Discussions kanban column into its own component',
  'Fix sticky table headers in dark mode',
  'Audit @-mentions: should they be case-insensitive?',
  'Settings: localize date format to ru-RU when role=client',
  'Mark all read button in Inbox',
  'Add /api/healthcheck — uptime probe',
  'Vault: PIN-on-reveal for credentials',
  'CSV export: include cancellation reason column',
  'Sentry: configure release tagging from Vercel build',
  'Onboarding: skip-step affordance for power users',
  'Avatar uploads — strip EXIF, resize to 512px',
  'Project archive flow — confirmation + undo',
  'Trash: 30-day retention badge',
  'Worker availability indicator (online / away / off)',
  'Optimize tasks query — paginate by status group',
  'Mobile: long-press to multi-select tasks',
  'Inbox empty state copy — friendlier',
  'Refund Stripe webhook → finance.expenses entry',
  'Budget tracker: monthly cap warning at 80%',
  'Light theme: hover-state contrast pass',
  'Cypress smoke test: auth + create-task',
  'Playwright: kanban drag-drop coverage',
  'Doc site: getting-started copy review',
  'Customer portal: change-password flow',
  'Two-factor auth — TOTP first, SMS later',
  'Stripe Connect: revoke + reconnect handler',
  'Edge case: project with 0 tasks should show empty-state cta',
];

const TAGS_POOL = [
  'frontend', 'backend', 'payments', 'design', 'qa', 'infra',
  'copy', 'ai', 'mobile', 'ios', 'android', 'supabase',
  'refactor', 'phase-1', 'phase-2', 'phase-3',
];

// expense list per spec (exact strings)
const EXPENSE_SPECS = [
  ['Google Workspace · Apr',           58,  'Subscriptions', 1.0],
  ['Supabase Pro · Q2',                300, 'Subscriptions', 2.0],
  ['Vercel team plan · Mar',           80,  'Subscriptions', 2.0],
  ['Tashkent ↔ Seoul · client trip',   1400,'Travel',        3.0],
  ['Sindarov · April retainer',        3200,'Salaries',      1.0],
  ['Google Ads · Raketa launch',       650, 'Marketing',     1.5],
  ['Figma org seats × 6',              90,  'Subscriptions', 0.5],
  ['Notion team plan',                 48,  'Subscriptions', 0.5],
  ['Coffee + meals · sprint week',     120, 'Operations',    2.0],
  ['Domain renewals (3)',              42,  'Operations',    4.0],
  ['Stripe processing fees · Apr',     214, 'Operations',    1.0],
  ['DigitalOcean droplets · staging',  60,  'Infra',         2.5],
  ['Adobe Creative Cloud · 2 seats',   110, 'Subscriptions', 3.0],
  ['Cursor IDE · annual × 5',          1000,'Software',      4.0],
  ['Translator (Korean) · January',    600, 'Operations',    4.5],
];

// ─── helpers ──────────────────────────────────────────────────────────────
const pick    = (a) => a[Math.floor(Math.random() * a.length)];
const pickN   = (a, n) => { const c = [...a]; const out = []; for (let i = 0; i < n && c.length; i++) out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]); return out; };
const between = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const weighted = (entries) => { // entries: [[value, weight], ...]
  const total = entries.reduce((s, e) => s + e[1], 0);
  let r = Math.random() * total;
  for (const [v, w] of entries) { r -= w; if (r <= 0) return v; }
  return entries[0][0];
};

const monthsAgoISO = (months, jitterDays = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  if (jitterDays) d.setDate(d.getDate() + between(-jitterDays, jitterDays));
  return d.toISOString();
};
const daysAgoISO = (days) => {
  const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString();
};
const inFutureISO = (days) => {
  const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString();
};
const isoDate = (iso) => iso.slice(0, 10); // YYYY-MM-DD

// Recency-weighted month picker (0 = this month, 5 = ~5 months ago).
// Returns months ago in [floor, 0] with newer months ~2x more likely.
const recencyWeightedMonths = (floor) => {
  const entries = [];
  for (let m = 0; m <= floor; m++) {
    entries.push([m, Math.pow(2, (floor - m))]); // 0 → 2^floor weight
  }
  return weighted(entries);
};

// ─── orchestration ────────────────────────────────────────────────────────
const created = {
  workers: [], clients: [], projects: [], tasks: [], comments: 0,
  invoices: [], expenses: [], files: 0,
  skipped: { workers: 0, clients: 0, projects: 0 },
};
let ceo = null;
let userByUsername = {}; // username → { id, email, name, role }

// ── 1. CEO discovery (never modify) ──
async function findCeo() {
  log.step('1. Looking up existing CEO');
  const { data, error } = await sb.from('users').select('id, email, name, role').eq('role', 'ceo').limit(1);
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('No CEO found in public.users. Aborting — set a CEO first.');
  ceo = data[0];
  ceo.username = ceo.email.split('@')[0];
  log.ok(`CEO is ${C.bold}${ceo.name || '(no name)'}${C.reset} <${ceo.email}>`);
}

// ── 2. Reset (delete only what we previously seeded) ──
async function resetSeed() {
  if (!RESET) return;
  log.step('2. --reset: deleting previously-seeded rows');

  const seedTitles = PROJECT_SPECS.map(p => p.title);
  const { data: existingProjects } = await sb.from('projects').select('id, title').in('title', seedTitles);
  const seedProjectIds = (existingProjects || []).map(p => p.id);

  if (seedProjectIds.length) {
    // Cascade: deleting projects deletes tasks via FK ON DELETE CASCADE.
    const { error: invErr } = await sb.from('invoices').delete().in('projectId', seedProjectIds);
    if (invErr) log.warn('invoices delete: ' + invErr.message);
    const { error: expErr } = await sb.from('expenses').delete().in('projectId', seedProjectIds);
    if (expErr) log.warn('expenses delete: ' + expErr.message);
    const { error: projErr } = await sb.from('projects').delete().in('id', seedProjectIds);
    if (projErr) throw projErr;
    log.ok(`Deleted ${seedProjectIds.length} seeded projects (cascaded to their tasks)`);
  }

  // Catch general-overhead invoices/expenses (no projectId) by description prefix
  const { error: gInv } = await sb.from('invoices').delete().like('description', `${SEED_MARK}%`);
  if (gInv) log.warn('overhead invoices delete: ' + gInv.message);
  const { error: gExp } = await sb.from('expenses').delete().like('description', `${SEED_MARK}%`);
  if (gExp) log.warn('overhead expenses delete: ' + gExp.message);

  // Delete seed users (cascades public.users via FK).
  const targetEmails = [...WORKERS, ...CLIENTS].map(u => `${u.username}@${AUTH_DOMAIN}`);
  const { data: { users: allAuth } = { users: [] } } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const toDelete = (allAuth || []).filter(u => targetEmails.includes(u.email));
  for (const u of toDelete) {
    const { error } = await sb.auth.admin.deleteUser(u.id);
    if (error) log.warn(`Delete user ${u.email}: ${error.message}`);
  }
  log.ok(`Deleted ${toDelete.length} seeded auth users`);
}

// ── 3. Create users (idempotent) ──
async function createUser(spec) {
  const email = `${spec.username}@${AUTH_DOMAIN}`;
  // existence check
  const { data: { users: all } = { users: [] } } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const existing = (all || []).find(u => u.email === email);
  if (existing) {
    // ensure profile + role is right
    const { data: profile } = await sb.from('users').select('id, name, role').eq('id', existing.id).single();
    if (!profile) {
      await sb.from('users').insert({ id: existing.id, email, name: spec.name, role: spec.role });
    } else if (profile.role !== spec.role || profile.name !== spec.name) {
      await sb.from('users').update({ name: spec.name, role: spec.role }).eq('id', existing.id);
    }
    userByUsername[spec.username] = { id: existing.id, username: spec.username, email, name: spec.name, role: spec.role };
    return { reused: true, id: existing.id };
  }

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: spec.password,
    email_confirm: true,
    user_metadata: { name: spec.name, role: spec.role },
  });
  if (error) throw new Error(`Create ${email}: ${error.message}`);

  // Make sure public.users row reflects the role exactly (trigger defaults to worker).
  await sb.from('users').upsert({
    id: data.user.id,
    email,
    name: spec.name,
    role: spec.role,
  });

  userByUsername[spec.username] = { id: data.user.id, username: spec.username, email, name: spec.name, role: spec.role };
  return { reused: false, id: data.user.id };
}

async function createUsers() {
  log.step('3. Provisioning workers and clients');
  for (const w of WORKERS) {
    const r = await createUser(w);
    if (r.reused) { created.skipped.workers++; log.info(`  worker ${C.dim}skipped${C.reset} ${w.username} (already exists)`); }
    else          { created.workers.push(w); log.ok(`  worker ${C.green}created${C.reset} ${w.username}`); }
  }
  for (const c of CLIENTS) {
    const r = await createUser(c);
    if (r.reused) { created.skipped.clients++; log.info(`  client ${C.dim}skipped${C.reset} ${c.username} (already exists)`); }
    else          { created.clients.push(c); log.ok(`  client ${C.green}created${C.reset} ${c.username}`); }
  }
  // also stash CEO for mention lookups
  userByUsername[ceo.username] = ceo;
}

// ── 4. Create projects ──
async function createProjects() {
  log.step('4. Creating projects');
  const { data: existing } = await sb.from('projects')
    .select('id, title').in('title', PROJECT_SPECS.map(p => p.title));
  const existingByTitle = Object.fromEntries((existing || []).map(p => [p.title, p.id]));

  for (const spec of PROJECT_SPECS) {
    if (existingByTitle[spec.title]) {
      created.skipped.projects++;
      log.info(`  ${C.dim}skipped${C.reset} ${spec.title} (already exists)`);
      created.projects.push({ ...spec, id: existingByTitle[spec.title], _existing: true });
      continue;
    }

    const lead = userByUsername[spec.lead];
    if (!lead) throw new Error(`Project "${spec.title}" lead "${spec.lead}" not found in created users`);

    let startDate, dueDate, createdAt, updatedAt;
    if (spec.startInFuture) {
      startDate = isoDate(inFutureISO(14));
      dueDate   = isoDate(inFutureISO(90));
      createdAt = daysAgoISO(7);
      updatedAt = createdAt;
    } else if (spec.startYesterday) {
      startDate = isoDate(daysAgoISO(1));
      dueDate   = isoDate(inFutureISO(60));
      createdAt = daysAgoISO(2);
      updatedAt = createdAt;
    } else {
      const startedAt = monthsAgoISO(spec.startedMonthsAgo, 5);
      startDate = isoDate(startedAt);
      dueDate   = isoDate(spec.status === 'Done'
        ? monthsAgoISO(spec.completedMonthsAgo || 0, 3)
        : inFutureISO(between(14, 60)));
      createdAt = startedAt;
      updatedAt = spec.status === 'Done'
        ? monthsAgoISO(spec.completedMonthsAgo || 0, 3)
        : daysAgoISO(between(1, 14));
    }

    const notesJson = JSON.stringify({
      projectDescription: spec.description,
      clientNotes: spec.clientNotes,
    });

    const { data, error } = await sb.from('projects').insert({
      title: spec.title,
      client: spec.client,
      assignee: lead.id,           // text column stores UUID as string
      status: spec.status,
      startDate, dueDate,
      notes: notesJson,
      createdBy: ceo.id,
      members: [lead.id],          // uuid[]
      createdAt, updatedAt,
    }).select('id, title').single();
    if (error) throw new Error(`Create project "${spec.title}": ${error.message}`);

    created.projects.push({ ...spec, id: data.id });
    log.ok(`  ${C.green}created${C.reset} ${spec.title}`);
  }
}

// ── 5. Tasks (with subtasks + comments) ──
function genComments(task, projectMembers, leadUser, statusIsDone) {
  // Returns [comments[], mentionsCount].
  const comments = [];
  const baseTimeIso = task.updatedAt;

  // System comment when task moves to Done (only on done tasks)
  if (statusIsDone) {
    comments.push({
      id: randomUUID(),
      text: 'Task dragged from In Progress to Done. Pending Approval.',
      author: leadUser.name,
      authorId: leadUser.id,
      mentions: [],
      timestamp: baseTimeIso,
      isSystem: true,
      role: leadUser.role,
    });
  }

  const N = between(0, 4);
  const userPool = [ceo, ...Object.values(userByUsername).filter(u => u.role === 'worker')];
  const updatesTemplates = [
    'Pushed first draft. Want a quick look before I keep going?',
    'Blocked on the API key from the client — emailed Davrbek.',
    'Wrapped this up locally; running the QA pass next.',
    'Tiny scope creep: I added a confirm step. Yell if that\'s not okay.',
    'Couple of edge cases left, will tag you tomorrow.',
    'Done. Moving to the next ticket.',
    'Reopened — found a regression on mobile.',
    'Pairing with @sindarov on this tomorrow.',
    '@aziza thoughts on the empty-state copy here?',
    '@davrbek can you confirm refund policy?',
    'Stripe webhook fires twice in dev — looking into idempotency.',
    'Re-tested on Safari iOS 17, looks good.',
    'Updated the spec doc with the new flow.',
    '@bobur this depends on the migration you\'re shipping — coordinate?',
    'LGTM.',
    'Approving — clean work.',
    'Bumping urgency to High based on the support tickets coming in.',
    'Will resume after the Hanguk launch.',
  ];

  for (let i = 0; i < N; i++) {
    const author = pick(userPool);
    let text = pick(updatesTemplates);

    // 15% chance to inject a mention
    let mentions = [];
    if (Math.random() < 0.15 && !text.includes('@')) {
      const target = pick(Object.values(userByUsername).filter(u => u.id !== author.id));
      text = `@${target.username} ${text.toLowerCase()}`;
      mentions = [target.id];
    } else {
      // Detect mentions in the text and resolve
      const matches = [...text.matchAll(/@(\w+)/g)].map(m => m[1].toLowerCase());
      matches.forEach(m => {
        const target = Object.values(userByUsername).find(u =>
          u.username.toLowerCase() === m ||
          (u.name || '').split(' ')[0].toLowerCase() === m
        );
        if (target && !mentions.includes(target.id)) mentions.push(target.id);
      });
    }

    // Spread comment time backwards from updatedAt
    const t = new Date(baseTimeIso);
    t.setDate(t.getDate() - between(0, 14));
    t.setHours(between(8, 19), between(0, 59));

    comments.push({
      id: randomUUID(),
      text,
      author: author.name,
      authorId: author.id,
      mentions,
      createdAt: t.toISOString(),
      role: author.role,
    });
  }

  return comments;
}

function genSubtasks() {
  const N = between(0, 5);
  const pool = [
    'Write the migration', 'Add tests', 'Update docs', 'Ship to staging',
    'Get sign-off from CEO', 'QA on iOS', 'QA on Android', 'Refactor the helper',
    'Add Sentry tag', 'Bench against baseline', 'Update Notion doc',
    'Sync with Sindarov', 'Verify on production-like data',
  ];
  return pickN(pool, N).map(text => ({
    id: randomUUID(),
    text,
    completed: Math.random() < 0.5,
  }));
}

async function createTasks() {
  log.step('5. Creating tasks (with subtasks + comments)');

  // skip projects that already had seed tasks
  for (const proj of created.projects) {
    if (proj._existing) {
      const { count } = await sb.from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('projectId', proj.id)
        .contains('tags', [SEED_TAG]);
      if (count && count > 0) {
        log.info(`  ${C.dim}skipped${C.reset} tasks for ${proj.title} (already seeded: ${count})`);
        continue;
      }
    }

    const N = proj.taskCount;
    const lead = userByUsername[proj.lead];
    const workers = Object.values(userByUsername).filter(u => u.role === 'worker');
    const isProjectDone = proj.status === 'Done';
    const inFuturePlanned = !!proj.startInFuture;

    const titles = pickN(TASK_TITLE_POOL, N);
    const tasks = [];

    for (let i = 0; i < N; i++) {
      // Status mix
      let status;
      if (isProjectDone) status = 'Done';
      else if (inFuturePlanned) status = 'To Do';  // future project: all in backlog
      else {
        const r = Math.random();
        status = r < 0.30 ? 'To Do' : r < 0.55 ? 'In Progress' : 'Done';
      }

      const urgency = weighted([['Low', 35], ['Medium', 45], ['High', 20]]);

      // Assignee: usually the lead, sometimes someone else
      const assignee = (Math.random() < 0.75) ? lead.id : pick(workers).id;

      // Dates: spread across the project window
      const monthsAgoForCreated = inFuturePlanned ? 0 : recencyWeightedMonths(proj.startedMonthsAgo ?? 5);
      const createdAt = monthsAgoISO(monthsAgoForCreated, 10);

      let startDate, dueDate, updatedAt;
      if (inFuturePlanned) {
        startDate = isoDate(inFutureISO(between(14, 21)));
        dueDate   = isoDate(inFutureISO(between(30, 90)));
        updatedAt = createdAt;
      } else if (status === 'Done') {
        startDate = isoDate(monthsAgoISO(monthsAgoForCreated, 5));
        const doneOffset = isProjectDone ? (proj.completedMonthsAgo || 0) : Math.max(0, monthsAgoForCreated - 1);
        dueDate   = isoDate(monthsAgoISO(doneOffset, 4));
        updatedAt = monthsAgoISO(doneOffset, 3);
      } else {
        startDate = isoDate(monthsAgoISO(monthsAgoForCreated, 5));
        // ~8% of open tasks are overdue
        if (Math.random() < 0.08) dueDate = isoDate(daysAgoISO(between(1, 14)));
        else                       dueDate = isoDate(inFutureISO(between(2, 45)));
        updatedAt = daysAgoISO(between(0, 20));
      }

      // isApproved: Done tasks — 70% approved on active projects; 100% on done projects
      let isApproved = false;
      if (status === 'Done') isApproved = isProjectDone ? true : Math.random() < 0.70;

      const tagCount = between(1, 2);
      const tags = [...pickN(TAGS_POOL, tagCount), SEED_TAG];
      const subtasks = genSubtasks();

      const taskObj = {
        projectId: proj.id,
        title: titles[i] || `${proj.title} — task ${i + 1}`,
        description: '',
        status,
        urgency,
        assignee,
        startDate,
        dueDate,
        timeEstimated: between(1, 16),
        tags,
        isApproved,
        isArchived: false,
        subtasks,
        comments: [],   // filled below
        notes: '',
        type: 'task',
        author: lead.name,
        timeTracked: 0,
        watchers: [],
        dependencies: [],
        checklists: [],
        createdAt,
        updatedAt,
      };

      // Comments (depends on the task's own updatedAt)
      taskObj.comments = genComments(taskObj, [lead.id], lead, status === 'Done');
      created.comments += taskObj.comments.length;

      tasks.push(taskObj);
    }

    const { data, error } = await sb.from('tasks').insert(tasks).select('id');
    if (error) throw new Error(`Insert tasks for ${proj.title}: ${error.message}`);
    created.tasks.push(...data);
    log.ok(`  ${C.green}${tasks.length} tasks${C.reset} in ${proj.title}`);
  }
}

// ── 6. Invoices ──
async function createInvoices() {
  log.step('6. Creating invoices');

  // Skip if seeded invoices already present
  const { data: existing } = await sb.from('invoices').select('id').like('description', `${SEED_MARK}%`);
  if (existing && existing.length > 0) {
    log.info(`  ${C.dim}skipped${C.reset} invoices (${existing.length} already seeded)`);
    created.invoices = existing;
    return;
  }

  const activeProjects = created.projects.filter(p => p.status === 'In Progress' || p.status === 'Done');
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const invoices = [];
  let n = 1;

  const push = ({ project, amount, status, monthsAgo, dueOffsetDays, notes }) => {
    const issued = new Date(); issued.setMonth(issued.getMonth() - monthsAgo); issued.setDate(between(2, 27));
    const due = new Date(issued); due.setDate(due.getDate() + (dueOffsetDays ?? between(14, 30)));
    const paid = status === 'paid' ? new Date(due) : null;
    if (paid) paid.setDate(paid.getDate() - between(0, 5));

    invoices.push({
      projectId: project?.id || null,
      invoiceNumber: `INV-${String(n++).padStart(4, '0')}`,
      client: project?.client || 'Internal',
      amount,
      currency: 'USD',
      issuedDate: isoDate(issued.toISOString()),
      dueDate: isoDate(due.toISOString()),
      paidDate: paid ? isoDate(paid.toISOString()) : null,
      status,
      description: `${SEED_MARK} ${notes}`,
      createdBy: ceo.id,
      createdAt: issued.toISOString(),
      updatedAt: (paid || due).toISOString(),
    });
  };

  // 7 paid, spread across months 0..5
  const paidPlan = [
    { months: 5, amount: 4200 }, { months: 4, amount: 2100 },
    { months: 3, amount: 3600 }, { months: 3, amount: 1800 },
    { months: 2, amount: 5400 }, { months: 1, amount: 2750 },
    { months: 1, amount: 6300 },
  ];
  for (let i = 0; i < paidPlan.length; i++) {
    const proj = activeProjects[i % activeProjects.length];
    push({
      project: proj, amount: paidPlan[i].amount, status: 'paid',
      monthsAgo: paidPlan[i].months,
      notes: `Phase ${(i % 3) + 1} deliverable payment · ${proj.title}`,
    });
  }

  // 3 pending (due in the next 30 days)
  for (let i = 0; i < 3; i++) {
    const proj = activeProjects[i % activeProjects.length];
    const issued = new Date(); issued.setDate(issued.getDate() - between(2, 10));
    const due = new Date(); due.setDate(due.getDate() + between(5, 28));
    invoices.push({
      projectId: proj.id, invoiceNumber: `INV-${String(n++).padStart(4, '0')}`,
      client: proj.client, amount: between(1200, 4800), currency: 'USD',
      issuedDate: isoDate(issued.toISOString()), dueDate: isoDate(due.toISOString()),
      paidDate: null, status: 'pending',
      description: `${SEED_MARK} Monthly retainer · ${proj.title}`,
      createdBy: ceo.id,
      createdAt: issued.toISOString(), updatedAt: issued.toISOString(),
    });
  }

  // 2 overdue (due in the past, still pending)
  for (let i = 0; i < 2; i++) {
    const proj = activeProjects[(i + 1) % activeProjects.length];
    const issued = new Date(); issued.setDate(issued.getDate() - between(30, 60));
    const due = new Date(); due.setDate(due.getDate() - between(5, 20));
    invoices.push({
      projectId: proj.id, invoiceNumber: `INV-${String(n++).padStart(4, '0')}`,
      client: proj.client, amount: between(2200, 9400), currency: 'USD',
      issuedDate: isoDate(issued.toISOString()), dueDate: isoDate(due.toISOString()),
      paidDate: null, status: 'pending',
      description: `${SEED_MARK} Late payment · ${proj.title}`,
      createdBy: ceo.id,
      createdAt: issued.toISOString(), updatedAt: issued.toISOString(),
    });
  }

  const { data, error } = await sb.from('invoices').insert(invoices).select('id');
  if (error) throw new Error(`Insert invoices: ${error.message}`);
  created.invoices = data;
  log.ok(`  ${C.green}${invoices.length} invoices${C.reset} created (7 paid · 3 pending · 2 overdue)`);
}

// ── 7. Expenses ──
async function createExpenses() {
  log.step('7. Creating expenses');

  const { data: existing } = await sb.from('expenses').select('id').like('description', `${SEED_MARK}%`);
  if (existing && existing.length > 0) {
    log.info(`  ${C.dim}skipped${C.reset} expenses (${existing.length} already seeded)`);
    created.expenses = existing;
    return;
  }

  const expenses = EXPENSE_SPECS.map(([desc, amount, category, monthsAgo], idx) => {
    const date = new Date();
    date.setMonth(date.getMonth() - Math.floor(monthsAgo));
    date.setDate(between(2, 27));

    // ~half attached to a project, rest general overhead
    const proj = (idx % 2 === 0)
      ? pick(created.projects.filter(p => p.status !== 'Undone'))
      : null;

    return {
      projectId: proj?.id || null,
      category,
      amount,
      currency: 'USD',
      date: isoDate(date.toISOString()),
      description: `${SEED_MARK} ${desc}`,
      createdBy: ceo.id,
      createdAt: date.toISOString(),
    };
  });

  const { data, error } = await sb.from('expenses').insert(expenses).select('id');
  if (error) throw new Error(`Insert expenses: ${error.message}`);
  created.expenses = data;
  log.ok(`  ${C.green}${expenses.length} expenses${C.reset} created across 6 months`);
}

// ─── summary ─────────────────────────────────────────────────────────────
function printSummary() {
  log.hr();
  console.log(`${C.bold}${C.green}✓ Seed complete${C.reset}\n`);

  console.log(`${C.bold}Counts:${C.reset}`);
  console.log(`  Users created  : ${C.green}${created.workers.length + created.clients.length}${C.reset}  ` +
              `(${created.workers.length} workers · ${created.clients.length} clients` +
              (created.skipped.workers + created.skipped.clients > 0
                ? ` · ${C.dim}${created.skipped.workers + created.skipped.clients} already existed${C.reset}`
                : '') + `)`);
  console.log(`  Projects       : ${C.green}${created.projects.length - created.skipped.projects}${C.reset}` +
              (created.skipped.projects > 0 ? `  ${C.dim}(${created.skipped.projects} already existed)${C.reset}` : ''));
  console.log(`  Tasks          : ${C.green}${created.tasks.length}${C.reset}`);
  console.log(`  Task comments  : ${C.green}${created.comments}${C.reset}`);
  console.log(`  Invoices       : ${C.green}${created.invoices.length}${C.reset}`);
  console.log(`  Expenses       : ${C.green}${created.expenses.length}${C.reset}`);
  console.log(`  Files uploaded : ${C.dim}0 (skipped per spec)${C.reset}\n`);

  console.log(`${C.bold}Credentials (copy / save these):${C.reset}`);
  console.log(`  ${C.cyan}CEO${C.reset}     : ${ceo.email}  ${C.dim}/ (your existing password — untouched)${C.reset}`);
  console.log();
  console.log(`  ${C.cyan}Workers (5)${C.reset}`);
  for (const w of WORKERS) {
    console.log(`    ${w.username.padEnd(20)} ${w.username}@${AUTH_DOMAIN}  ·  ${C.bold}${w.password}${C.reset}`);
  }
  console.log();
  console.log(`  ${C.cyan}Clients (2)${C.reset}`);
  for (const c of CLIENTS) {
    console.log(`    ${c.username.padEnd(20)} ${c.username}@${AUTH_DOMAIN}  ·  ${C.bold}${c.password}${C.reset}`);
  }

  log.hr();
  console.log(`${C.bold}Try this:${C.reset}`);
  console.log(`  ${C.dim}•${C.reset} Sign in as ${C.bold}sindarov${C.reset} — Inbox should show overdue + due-today + mentions.`);
  console.log(`  ${C.dim}•${C.reset} As CEO, open the ${C.bold}Raketa Marketplace v2${C.reset} project and approve a Done task.`);
  console.log(`  ${C.dim}•${C.reset} Visit ${C.bold}/finance${C.reset} — sparkline should show 6 months of revenue+expenses bars.`);
  console.log(`  ${C.dim}•${C.reset} Drag any task across columns to trigger the completion modal.`);
  console.log(`  ${C.dim}•${C.reset} Visit ${C.bold}/team${C.reset} — 7 accounts (CEO + 5 workers + 2 clients) listed.`);
  console.log(`  ${C.dim}•${C.reset} DevTools to 390px width: kanban scrolls horizontally and the bottom tab bar appears.`);
  log.hr();
}

// ─── main ─────────────────────────────────────────────────────────────────
async function main() {
  const expectedUsers   = WORKERS.length + CLIENTS.length;
  const expectedProjects = PROJECT_SPECS.length;
  const expectedTasks   = PROJECT_SPECS.reduce((s, p) => s + p.taskCount, 0);

  console.log(`${C.bold}Plan:${C.reset} about to seed ` +
    `${C.cyan}${expectedUsers}${C.reset} users · ` +
    `${C.cyan}${expectedProjects}${C.reset} projects · ` +
    `${C.cyan}~${expectedTasks}${C.reset} tasks · ` +
    `${C.cyan}12${C.reset} invoices · ` +
    `${C.cyan}15${C.reset} expenses` +
    (RESET ? `\n${C.yellow}${C.bold}--reset is set${C.reset} — existing seeded rows will be deleted first.` : ''));
  await new Promise(r => setTimeout(r, 1000));

  try {
    await findCeo();
    await resetSeed();
    await createUsers();
    await createProjects();
    await createTasks();
    await createInvoices();
    await createExpenses();
    printSummary();
  } catch (err) {
    log.err(`Seed failed: ${err.message}`);
    log.warn('Attempting partial rollback (deleting only rows from THIS run)…');

    // Best-effort rollback. We only delete what we tracked in `created`.
    try {
      if (created.invoices.length) {
        const ids = created.invoices.map(i => i.id).filter(Boolean);
        if (ids.length) await sb.from('invoices').delete().in('id', ids);
      }
      if (created.expenses.length) {
        const ids = created.expenses.map(e => e.id).filter(Boolean);
        if (ids.length) await sb.from('expenses').delete().in('id', ids);
      }
      // Deleting projects cascades to tasks.
      const newProjIds = created.projects.filter(p => !p._existing).map(p => p.id);
      if (newProjIds.length) await sb.from('projects').delete().in('id', newProjIds);
      // Auth users we created.
      for (const w of created.workers) {
        const email = `${w.username}@${AUTH_DOMAIN}`;
        const { data: { users } = { users: [] } } = await sb.auth.admin.listUsers({ perPage: 1000 });
        const u = (users || []).find(x => x.email === email);
        if (u) await sb.auth.admin.deleteUser(u.id);
      }
      for (const c of created.clients) {
        const email = `${c.username}@${AUTH_DOMAIN}`;
        const { data: { users } = { users: [] } } = await sb.auth.admin.listUsers({ perPage: 1000 });
        const u = (users || []).find(x => x.email === email);
        if (u) await sb.auth.admin.deleteUser(u.id);
      }
      log.ok('Rollback complete.');
    } catch (rerr) {
      log.err(`Rollback also failed: ${rerr.message}`);
      log.warn('You may want to re-run with --reset to clean up.');
    }
    process.exit(1);
  }
}

main();
