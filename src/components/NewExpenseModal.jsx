// ─────────────────────────────────────────────────────────────────────────
// NewExpenseModal — token-driven, polished V2 layout.
// Drop-in replacement. Same financeService.createExpense call, same props.
// ─────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { X, Loader2, Plus, Receipt, AlertCircle, Calendar } from 'lucide-react';
import { financeService } from '../lib/services/financeService';
import { supabase } from '../lib/supabase';
import CustomSelect from './CustomSelect';

const CATEGORIES = ['Marketing', 'Operations', 'Salaries', 'Subscriptions', 'Travel', 'Office', 'Software', 'Other'];
const CURRENCIES = ['USD', 'EUR', 'UZS', 'RUB'];

export default function NewExpenseModal({ currentUser, onClose, onCreated }) {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({
    projectId: '',
    category: 'Operations',
    amount: '',
    currency: 'USD',
    date: new Date().toISOString().slice(0, 10),
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.from('projects').select('id, title, name').neq('isArchived', true)
      .then(({ data }) => setProjects(data || []));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.amount) { setError('Amount is required.'); return; }
    setSubmitting(true);
    try {
      const created = await financeService.createExpense({
        ...form,
        amount: Number(form.amount),
        projectId: form.projectId || null,
        createdBy: currentUser.id,
      });
      onCreated?.(created);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create expense.');
    } finally { setSubmitting(false); }
  };

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(8,7,6,0.62)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}>
      <div onClick={e => e.stopPropagation()} className="animate-slide-up"
        style={{
          width: '95vw', maxWidth: 520,
          background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '92vh',
        }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 30, height: 30, borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}><Receipt size={14}/></span>
            <div>
              <div style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: 'var(--text-tertiary)',
              }}>New expense</div>
              <div style={{ marginTop: 2, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Record a cost
              </div>
            </div>
          </div>
          <IconClose onClick={onClose}/>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="custom-scrollbar"
            style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>

            <Field label="Category">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                {CATEGORIES.map(c => (
                  <button key={c} type="button" onClick={() => set('category', c)}
                    style={{
                      padding: '7px 8px', borderRadius: 'var(--radius-sm)',
                      background: form.category === c ? 'var(--accent-primary-muted)' : 'var(--bg-secondary)',
                      color: form.category === c ? 'var(--accent-primary-text)' : 'var(--text-secondary)',
                      border: `1px solid ${form.category === c ? 'var(--accent-primary-border)' : 'var(--border-color)'}`,
                      fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                      transition: 'background 0.12s, color 0.12s',
                    }}>
                    {c}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Project" hint="optional · or general overhead">
              <CustomSelect
                value={form.projectId}
                onChange={(v) => set('projectId', v)}
                placeholder="— General overhead —"
                options={[{ value: '', label: '— General overhead —' }, ...projects.map(p => ({ value: p.id, label: p.title || p.name }))]}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <Field label="Amount" required>
                <div style={{ position: 'relative' }}>
                  <input className="input" type="number" step="0.01" min="0" required
                    placeholder="500.00" value={form.amount}
                    onChange={e => set('amount', e.target.value)}
                    style={{ paddingLeft: 28, fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 600 }}/>
                  <span style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)', fontSize: 14, fontWeight: 600, pointerEvents: 'none',
                  }}>{form.currency === 'USD' ? '$' : form.currency === 'EUR' ? '€' : form.currency === 'UZS' ? 'сум' : '₽'}</span>
                </div>
              </Field>
              <Field label="Currency">
                <CustomSelect
                  value={form.currency}
                  onChange={(v) => set('currency', v)}
                  options={CURRENCIES.map(c => ({ value: c, label: c }))}
                />
              </Field>
            </div>

            <Field label="Date">
              <DateInput value={form.date} onChange={(v) => set('date', v)}/>
            </Field>

            <Field label="Description" hint="optional">
              <textarea className="input" rows={2}
                placeholder="e.g. Google Workspace subscription"
                value={form.description} onChange={e => set('description', e.target.value)}/>
            </Field>

            {error && <ErrorBanner>{error}</ErrorBanner>}
          </div>

          <div style={{
            padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', gap: 8,
            borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
          }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {submitting ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
              {submitting ? 'Adding…' : 'Add expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const Field = ({ label, required, hint, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)',
    }}>
      <span>{label}{required && <span style={{ color: 'var(--alert-error-text)', marginLeft: 3 }}>*</span>}</span>
      {hint && <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{hint}</span>}
    </div>
    {children}
  </div>
);

const DateInput = ({ value, onChange }) => (
  <div style={{ position: 'relative' }}>
    <input className="input" type="date" value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{ paddingLeft: 30 }}/>
    <Calendar size={13} style={{
      position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
      color: 'var(--text-tertiary)', pointerEvents: 'none',
    }}/>
  </div>
);

const ErrorBanner = ({ children }) => (
  <div style={{
    padding: '10px 12px', borderRadius: 'var(--radius-md)',
    background: 'var(--alert-error-bg)', color: 'var(--alert-error-text)',
    border: '1px solid var(--alert-error-border)',
    fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.5,
    display: 'flex', alignItems: 'flex-start', gap: 8,
  }}>
    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }}/>
    <span>{children}</span>
  </div>
);

const IconClose = ({ onClick }) => (
  <button type="button" onClick={onClick} aria-label="Close"
    style={{
      width: 28, height: 28, padding: 0, borderRadius: 'var(--radius-sm)',
      background: 'transparent', border: 'none', cursor: 'pointer',
      color: 'var(--text-secondary)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}><X size={14}/></button>
);
