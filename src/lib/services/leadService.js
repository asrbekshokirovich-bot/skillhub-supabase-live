import { supabase } from '../supabase';
import { projectService } from './projectService';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

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

  // ── AI: analyse a lead's notes and recommend status/intent/score ──
  // Reads the lead + its activity log and returns a structured recommendation
  // the UI can apply. Mirrors the Gemini pattern in aiTaskService/voiceAiService.
  async analyzeLead(lead, activities = []) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('Missing VITE_GEMINI_API_KEY in environment variables.');

    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        stage:    { type: SchemaType.STRING, format: 'enum', enum: ['new', 'contacted', 'inprocess', 'proposal', 'won', 'lost'],
                    description: 'Best current pipeline stage given the notes. lost only if the client clearly declined / went cold.' },
        intent:   { type: SchemaType.STRING, format: 'enum', enum: ['build', 'subscribe', 'unknown'],
                    description: "build = wants a custom solution; subscribe = wants a ready SaaS/subscription; unknown if the notes don't say." },
        score:    { type: SchemaType.NUMBER, description: 'AI lead score 0-100. Hot >=80, Warm >=60, Cold otherwise.' },
        signals:  { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER }, description: 'Exactly 4 values 0-100: [intent, engagement, budget, timeline].' },
        summary:  { type: SchemaType.STRING, description: 'A concise English summary (1-2 sentences) of where this lead stands, grounded in the notes.' },
        nextStep: { type: SchemaType.STRING, description: 'One concrete next action for the operator. Telegram only — never suggest calling or emailing.' },
      },
      required: ['stage', 'intent', 'score', 'signals', 'summary', 'nextStep'],
    };

    const notes = [
      lead.summary && `Existing summary: ${lead.summary}`,
      ...activities.map(a => `Activity: ${a.body}`),
    ].filter(Boolean).join('\n') || '(no notes recorded)';

    const prompt = `You are a sales operations analyst for Skillhub, a software agency in Uzbekistan. ` +
      `Analyse one CRM lead and decide its correct pipeline stage, the client's interest, a 0-100 score, and the next step. ` +
      `These are Telegram-first leads (no email, no phone calls) — any next step must use Telegram.\n\n` +
      `Pipeline stages: new -> contacted -> inprocess -> proposal -> won (lost is terminal).\n` +
      `Rules: move forward only as far as the notes justify. If the notes mention a sent/awaited proposal or pricing, use "proposal". ` +
      `If there is active back-and-forth or a scoping discussion, use "inprocess". If only a first touch, "contacted". ` +
      `If the client declined, went silent after rejection, or is a junk/test entry, use "lost". ` +
      `Infer intent (build vs subscribe) from the notes (e.g. CRM/3D/chatbot/custom dashboard = build; ready catalog/subscription = subscribe).\n\n` +
      `LEAD\nCompany: ${lead.company}\nField: ${lead.field || '—'}\nSource: ${lead.source || '—'}\n` +
      `Current stage: ${lead.stage}\nCurrent intent: ${lead.intent || 'unmarked'}\n\nNOTES\n${notes}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const attempt = async (modelName, retries = 2) => {
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: 'application/json', responseSchema: schema } });
      for (let i = 0; i <= retries; i++) {
        try { const r = await model.generateContent([{ text: prompt }]); return r.response.text(); }
        catch (err) {
          const overloaded = err.message?.includes('503') || err.message?.includes('429');
          if (overloaded && i < retries) { await new Promise(res => setTimeout(res, (2 ** i) * 1000)); continue; }
          throw err;
        }
      }
    };

    let text;
    try { text = await attempt('gemini-2.5-flash'); }
    catch { text = await attempt('gemini-flash-latest'); }

    let p;
    try { p = JSON.parse(text); } catch { throw new Error('AI returned invalid data format.'); }

    const sig = Array.isArray(p.signals) ? p.signals.slice(0, 4).map(n => Math.max(0, Math.min(100, Math.round(Number(n) || 0)))) : [0, 0, 0, 0];
    while (sig.length < 4) sig.push(0);
    const stage = STAGES.includes(p.stage) ? p.stage : lead.stage;
    const intent = p.intent === 'build' || p.intent === 'subscribe' ? p.intent : null;
    return {
      stage,
      intent,
      score: Math.max(0, Math.min(100, Math.round(Number(p.score) || 0))),
      signals: sig,
      summary: (p.summary || '').trim() || lead.summary || null,
      nextStep: (p.nextStep || '').trim() || lead.nextStep || null,
    };
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
