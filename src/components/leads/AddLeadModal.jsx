import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Loader2, Boxes, Repeat } from 'lucide-react';
import { leadService } from '../../lib/services/leadService';

const FIELDS = [
  'Retail & E-commerce', 'Logistics & Fleet', 'FinTech', 'Healthcare',
  'Restaurants & Food', 'Education', 'Real Estate', 'Media', 'Fitness', 'Energy', 'Other',
];
const SOURCES = ['Website', 'Referral', 'Instagram', 'Event', 'Cold outreach'];
// Priority seeds the initial signal/score.
const PRIORITY = {
  Hot:  { score: 84, signals: [85, 82, 84, 80] },
  Warm: { score: 66, signals: [68, 64, 62, 66] },
  Cold: { score: 44, signals: [46, 42, 40, 44] },
};

export default function AddLeadModal({ currentUser, onClose, onCreated }) {
  const [form, setForm] = useState({
    company: '', contact: '', telegram: '', intent: 'subscribe',
    field: 'Retail & E-commerce', source: 'Website', value: '', priority: 'Warm',
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
      const pr = PRIORITY[form.priority] || PRIORITY.Warm;
      const created = await leadService.createLead({
        company: form.company.trim(),
        contact: form.contact.trim(),
        telegram: form.telegram.trim(),
        intent: form.intent || null,
        field: form.field,
        source: form.source,
        value: Number(form.value) || 0,
        stage: 'new',
        score: pr.score,
        signals: pr.signals,
        owner: currentUser?.id || null,
        summary: '',
        nextStep: '',
      });
      onCreated(created);
    } catch (e) {
      setErr(e.message || 'Failed to create lead.');
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(8,7,6,0.62)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <form
        className="animate-slide-up"
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        style={{
          background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border-color)',
        }}>
          <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>Add lead</h3>
          <button type="button" onClick={onClose} aria-label="Close" style={{
            width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={18} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Company *">
            <input ref={firstRef} value={form.company} onChange={set('company')} placeholder="e.g. Korzinka Express" style={inp} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Contact">
              <input value={form.contact} onChange={set('contact')} placeholder="Full name" style={inp} />
            </Field>
            <Field label="Telegram">
              <input value={form.telegram} onChange={set('telegram')} placeholder="@username" style={inp} />
            </Field>
          </div>

          <Field label="Interest">
            <div style={{ display: 'flex', gap: 8 }}>
              <Toggle active={form.intent === 'subscribe'} icon={<Repeat size={14} />} label="Subscribe"
                onClick={() => setForm(f => ({ ...f, intent: 'subscribe' }))} />
              <Toggle active={form.intent === 'build'} icon={<Boxes size={14} />} label="Build"
                onClick={() => setForm(f => ({ ...f, intent: 'build' }))} />
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Field">
              <select value={form.field} onChange={set('field')} style={inp}>
                {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Source">
              <select value={form.source} onChange={set('source')} style={inp}>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Est. value (USD)">
              <input type="number" min="0" value={form.value} onChange={set('value')} placeholder="0" style={inp} />
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={set('priority')} style={inp}>
                {Object.keys(PRIORITY).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          {err && (
            <div style={{
              fontSize: 12.5, color: 'var(--alert-error-text)', background: 'var(--alert-error-bg)',
              border: '1px solid var(--alert-error-border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px',
            }}>{err}</div>
          )}
        </div>

        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px',
          borderTop: '1px solid var(--border-color)',
        }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Add lead
          </button>
        </div>
      </form>
    </div>
  );
}

const inp = {
  width: '100%', height: 38, border: '1px solid var(--border-color)', background: 'var(--bg-primary)',
  color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', padding: '0 11px',
  fontFamily: 'inherit', fontSize: 13, outline: 'none',
};

const Field = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{label}</span>
    {children}
  </label>
);

function Toggle({ active, icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '9px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 12.5, fontWeight: 600,
      background: active ? 'var(--accent-primary)' : 'var(--bg-secondary)',
      color: active ? '#fff' : 'var(--text-secondary)',
      border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-color)'}`,
    }}>{icon}{label}</button>
  );
}
