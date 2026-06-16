import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { leadService, STAGES, STAGE_LABELS } from '../../lib/services/leadService';

const FIELDS = [
  'Furniture & Woodworking', 'Retail & E-commerce', 'Logistics & Fleet', 'FinTech', 'Healthcare',
  'Restaurants & Food', 'Education', 'Real Estate', 'Media', 'Fitness', 'Energy', 'Manufacturing', 'Other',
];
const SOURCES = ['Website', 'Referral', 'Instagram', 'Facebook', 'Event', 'Cold outreach'];

// Full editor for an existing lead. Telegram-only contact (no email/phone field).
export default function EditLeadModal({ lead, users = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    company: lead.company || '',
    contact: lead.contact || '',
    telegram: lead.telegram || '',
    field: lead.field || 'Furniture & Woodworking',
    source: lead.source || 'Instagram',
    value: lead.value ?? 0,
    stage: lead.stage || 'new',
    intent: lead.intent || '',
    score: lead.score ?? 0,
    followUp: lead.followUp || '',
    owner: lead.owner || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.company.trim()) { setErr('Company is required.'); return; }
    if (saving) return;
    setSaving(true); setErr('');
    try {
      const patch = {
        company: form.company.trim(),
        contact: form.contact.trim() || null,
        telegram: form.telegram.trim() || null,
        field: form.field || null,
        source: form.source || null,
        value: Number(form.value) || 0,
        stage: form.stage,
        intent: form.intent || null,
        score: Math.max(0, Math.min(100, Number(form.score) || 0)),
        followUp: form.followUp || null,
        owner: form.owner || null,
      };
      const updated = await leadService.updateLead(lead.id, patch);
      onSaved(updated);
    } catch (e) {
      setErr(e.message || 'Failed to save.');
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(8,7,6,0.62)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <form className="animate-slide-up" onSubmit={(e) => { e.preventDefault(); submit(); }}
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>Edit lead</h3>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Company *"><input ref={firstRef} value={form.company} onChange={set('company')} style={inp} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Contact"><input value={form.contact} onChange={set('contact')} placeholder="Full name" style={inp} /></Field>
            <Field label="Telegram (@username or +998…)"><input value={form.telegram} onChange={set('telegram')} placeholder="@username" style={inp} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Field"><select value={form.field} onChange={set('field')} style={inp}>{FIELDS.map(f => <option key={f} value={f}>{f}</option>)}</select></Field>
            <Field label="Source"><select value={form.source} onChange={set('source')} style={inp}>{SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Stage"><select value={form.stage} onChange={set('stage')} style={inp}>{STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}</select></Field>
            <Field label="Interest"><select value={form.intent} onChange={set('intent')} style={inp}>
              <option value="">Unmarked</option><option value="subscribe">Subscribe to SaaS</option><option value="build">Build custom</option>
            </select></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Est. value (USD)"><input type="number" min="0" value={form.value} onChange={set('value')} style={inp} /></Field>
            <Field label="AI score (0-100)"><input type="number" min="0" max="100" value={form.score} onChange={set('score')} style={inp} /></Field>
            <Field label="Follow-up"><input type="date" value={form.followUp} onChange={set('followUp')} style={inp} /></Field>
          </div>
          <Field label="Owner">
            <select value={form.owner} onChange={set('owner')} style={inp}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}{u.role ? ` · ${u.role}` : ''}</option>)}
            </select>
          </Field>

          {err && <div style={{ fontSize: 12.5, color: 'var(--alert-error-text)', background: 'var(--alert-error-bg)', border: '1px solid var(--alert-error-border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>{err}</div>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--border-color)' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

const inp = { width: '100%', height: 38, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', padding: '0 11px', fontFamily: 'inherit', fontSize: 13, outline: 'none' };
const Field = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{label}</span>
    {children}
  </label>
);
