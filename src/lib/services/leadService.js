import { supabase } from '../supabase';
import { projectService } from './projectService';

// ─────────────────────────────────────────────────────────────────────────
// leadService — data access for the Leads / CRM module.
// Mirrors financeService: thin Supabase wrappers + pure aggregate helpers.
// Telegram-only — there is no email field anywhere.
// ─────────────────────────────────────────────────────────────────────────

const LEAD_FIELDS =
  'id, createdAt, updatedAt, company, contact, telegram, source, stage, intent, field, value, score, followUp, owner, summary, nextStep, signals';

// Pipeline stages in board order. 'lost' is terminal (Table only).
export const STAGES = ['new', 'contacted', 'inprocess', 'proposal', 'won', 'lost'];
export const STAGE_LABELS = {
  new: 'New', contacted: 'Contacted', inprocess: 'In Process',
  proposal: 'Proposal', won: 'Won', lost: 'Lost',
};
// Stepper stages exclude 'lost'.
export const STEPPER_STAGES = ['new', 'contacted', 'inprocess', 'proposal', 'won'];

const todayStr = () => new Date().toISOString().slice(0, 10);

// Two-letter initials from a name/company, for avatars.
export const initials = (name = '') =>
  name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

// ── tier / formatting helpers ──────────────────────────────────────────────
export function tier(score) {
  if (score >= 80) return 'Hot';
  if (score >= 60) return 'Warm';
  return 'Cold';
}

export function tierTone(score) {
  if (score >= 80) return { label: 'Hot',  color: 'var(--accent-primary-text)', bg: 'var(--accent-primary-muted)', br: 'var(--accent-primary-border)', ring: 'var(--accent-primary)' };
  if (score >= 60) return { label: 'Warm', color: 'var(--accent-warning-text)', bg: 'var(--accent-warning-muted)', br: 'var(--accent-warning-text)',   ring: 'var(--accent-warning-text)' };
  return            { label: 'Cold', color: 'var(--text-tertiary)',       bg: 'var(--bg-tertiary)',           br: 'var(--border-color)',         ring: 'var(--text-tertiary)' };
}

// $Xk style money — compact, like the design.
export function fmtMoneyK(n) {
  const v = Number(n) || 0;
  if (v >= 1000) {
    const k = v / 1000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `$${v}`;
}

export function fmtMoneyFull(n) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n) || 0); }
  catch { return `$${Number(n || 0).toFixed(0)}`; }
}

// Follow-up label + whether it's due (today or overdue).
export function followMeta(followUp) {
  if (!followUp) return { label: '', due: false, overdue: false };
  const today = todayStr();
  const days = Math.round((new Date(followUp + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
  if (days < 0)  return { label: 'Overdue',          due: true,  overdue: true };
  if (days === 0) return { label: 'Today',            due: true,  overdue: false };
  if (days === 1) return { label: 'Tomorrow',         due: false, overdue: false };
  return { label: `In ${days} days`, due: false, overdue: false };
}

export const isOpen = (l) => l.stage !== 'won' && l.stage !== 'lost';

export const leadService = {
  STAGES, STAGE_LABELS, STEPPER_STAGES,

  async listLeads() {
    const { data, error } = await supabase
      .from('leads').select(LEAD_FIELDS).order('createdAt', { ascending: false });
    if (error) throw error;
    return (data || []).map(normalize);
  },

  async createLead(payload) {
    const insert = {
      company: payload.company,
      contact: payload.contact || null,
      telegram: normalizeHandle(payload.telegram),
      source: payload.source || null,
      stage: payload.stage || 'new',
      intent: payload.intent || null,
      field: payload.field || null,
      value: Number(payload.value) || 0,
      score: payload.score ?? 0,
      followUp: payload.followUp || null,
      owner: payload.owner || null,
      summary: payload.summary || null,
      nextStep: payload.nextStep || null,
      signals: payload.signals || [0, 0, 0, 0],
    };
    const { data, error } = await supabase.from('leads').insert([insert]).select(LEAD_FIELDS).single();
    if (error) throw error;
    return normalize(data);
  },

  async updateLead(id, patch) {
    const body = { ...patch, updatedAt: new Date().toISOString() };
    if (body.telegram !== undefined) body.telegram = normalizeHandle(body.telegram);
    const { data, error } = await supabase.from('leads').update(body).eq('id', id).select(LEAD_FIELDS).single();
    if (error) throw error;
    return normalize(data);
  },

  async deleteLead(id) {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
  },

  setStage(id, stage) { return this.updateLead(id, { stage }); },
  setIntent(id, intent) { return this.updateLead(id, { intent }); },

  // Creates a project from the lead, then marks the lead won.
  async convertToProject(lead, currentUser) {
    const project = await projectService.createProject({
      name: lead.company,
      client: lead.company,
      assignee: lead.owner || (currentUser && currentUser.id) || 'Unassigned',
      status: 'Active',
      startDate: todayStr(),
      dueDate: null,
      projectDescription: lead.summary || `Converted from lead — ${lead.field || ''}`.trim(),
      clientNotes: lead.telegram ? `Telegram: ${lead.telegram}` : '',
      createdBy: currentUser && currentUser.id,
    });
    const updated = await this.setStage(lead.id, 'won');
    return { project, lead: updated };
  },

  // ── Activity log ──
  async listActivities(leadId) {
    const { data, error } = await supabase
      .from('lead_activities')
      .select('id, leadId, author, body, createdAt')
      .eq('leadId', leadId)
      .order('createdAt', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async logActivity(leadId, body, author = null) {
    const { data, error } = await supabase
      .from('lead_activities')
      .insert([{ leadId, body, author }])
      .select('id, leadId, author, body, createdAt')
      .single();
    if (error) throw error;
    return data;
  },

  // ── Scoring ──
  // Derive a 0-100 score from the four signal bars. This is a deterministic
  // weighted average; swap in a real AI call at the marked hook below.
  scoreLead(lead) {
    // === AI HOOK ===========================================================
    // Replace this block with a call to your scoring model. It must return
    // an int 0-100. The signals array is [intent, engagement, budget, timeline].
    const s = Array.isArray(lead.signals) ? lead.signals : [0, 0, 0, 0];
    const weights = [0.35, 0.25, 0.25, 0.15]; // intent-heavy
    const weighted = s.reduce((acc, v, i) => acc + (Number(v) || 0) * weights[i], 0);
    return Math.max(0, Math.min(100, Math.round(weighted)));
    // =======================================================================
  },

  // ── Aggregates ──
  computeStats(leads) {
    const open = leads.filter(isOpen);
    const today = todayStr();
    const sum = arr => arr.reduce((acc, l) => acc + (Number(l.value) || 0), 0);

    const dueToday = open.filter(l => l.followUp && l.followUp <= today).length;
    const subscribe = leads.filter(l => l.intent === 'subscribe');
    const build = leads.filter(l => l.intent === 'build');
    const unmarked = open.filter(l => !l.intent);
    const subFields = new Set(subscribe.map(l => l.field).filter(Boolean));

    // Won this month
    const monthPrefix = today.slice(0, 7);
    const wonThisMonth = leads.filter(l => l.stage === 'won' &&
      (l.updatedAt || l.createdAt || '').slice(0, 7) === monthPrefix);
    const closed = leads.filter(l => l.stage === 'won' || l.stage === 'lost');
    const winRate = closed.length ? Math.round((leads.filter(l => l.stage === 'won').length / closed.length) * 100) : 0;

    return {
      openCount: open.length,
      pipelineValue: sum(open),
      hot: open.filter(l => l.score >= 80).length,
      dueToday,
      subscribeCount: subscribe.length,
      buildCount: build.length,
      unmarkedCount: unmarked.length,
      wonCount: wonThisMonth.length,
      wonValue: sum(wonThisMonth),
      winRate,
      subFieldCount: subFields.size,
      subValueTotal: sum(subscribe),
    };
  },

  // Group marked leads by field; recommend "Build SaaS" when subscribe >= 2.
  demandByField(leads) {
    const map = {};
    leads.forEach(l => {
      if (!l.field || !l.intent) return;
      const f = (map[l.field] ||= { field: l.field, subscribe: 0, build: 0, subValue: 0 });
      if (l.intent === 'subscribe') { f.subscribe += 1; f.subValue += Number(l.value) || 0; }
      else if (l.intent === 'build') { f.build += 1; }
    });
    return Object.values(map)
      .map(f => ({ ...f, recommend: f.subscribe >= 2 }))
      .sort((a, b) => b.subscribe - a.subscribe || b.subValue - a.subValue);
  },
};

// ── internal helpers ──
function normalizeHandle(h) {
  if (!h) return null;
  const t = String(h).trim();
  if (!t) return null;
  return t.startsWith('@') ? t : '@' + t.replace(/^@+/, '');
}

function normalize(row) {
  if (!row) return row;
  return {
    ...row,
    value: Number(row.value) || 0,
    score: Number(row.score) || 0,
    signals: Array.isArray(row.signals) ? row.signals : [0, 0, 0, 0],
  };
}
