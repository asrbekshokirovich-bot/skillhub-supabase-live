// ─────────────────────────────────────────────────────────────────────────
// NewInvoiceModal — token-driven, polished V2 layout.
// Drop-in replacement. Same financeService.createInvoice call, same props.
// ─────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { X, Loader2, Plus, FileText, AlertCircle, Calendar } from 'lucide-react';
import { financeService } from '../lib/services/financeService';
import { projectService } from '../lib/services/projectService';
import CustomSelect from './CustomSelect';

const CURRENCIES = ['USD', 'EUR', 'UZS', 'RUB'];

export default function NewInvoiceModal({ currentUser, onClose, onCreated }) {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({
    invoiceNumber: '',
    projectId: '',
    client: '',
    amount: '',
    currency: 'USD',
    issuedDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    projectService.getAllProjects?.()
      .then(setProjects)
      .catch(() => {
        import('../lib/supabase').then(({ supabase }) =>
          supabase.from('projects').select('id, title, name, client').then(({ data }) => setProjects(data || []))
        );
      });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onProjectChange = (id) => {
    const p = projects.find(x => x.id === id);
    setForm(f => ({
      ...f,
      projectId: id,
      client: p?.client || f.client,
      invoiceNumber: f.invoiceNumber || `INV-${String(Date.now()).slice(-6)}`,
    }));
  };

  // Auto-default due date to 30 days after issued if blank
  useEffect(() => {
    if (form.issuedDate && !form.dueDate) {
      const d = new Date(form.issuedDate);
      d.setDate(d.getDate() + 30);
      set('dueDate', d.toISOString().slice(0, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.issuedDate]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.client.trim() || !form.amount) {
      setError('Client and amount are required.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await financeService.createInvoice({
        ...form,
        amount: Number(form.amount),
        projectId: form.projectId || null,
        dueDate: form.dueDate || null,
        createdBy: currentUser.id,
        status: 'pending',
      });
      onCreated?.(created);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  // Live preview of total amount
  const previewAmount = (() => {
    const n = Number(form.amount);
    if (!Number.isFinite(n) || n <= 0) return null;
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: form.currency, maximumFractionDigits: 2 }).format(n); }
    catch { return `${form.currency} ${n.toFixed(2)}`; }
  })();

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(8,7,6,0.62)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}>
      <div onClick={e => e.stopPropagation()} className="animate-slide-up"
        style={{
          width: '95vw', maxWidth: 560, maxHeight: '92vh',
          background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 30, height: 30, borderRadius: 'var(--radius-md)',
              background: 'var(--accent-primary-muted)', color: 'var(--accent-primary-text)',
              border: '1px solid var(--accent-primary-border)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}><FileText size={14}/></span>
            <div>
              <div style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: 'var(--text-tertiary)',
              }}>New invoice</div>
              <div style={{ marginTop: 2, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Bill a client
              </div>
            </div>
          </div>
          <IconClose onClick={onClose}/>
        </div>

        {/* Body */}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="custom-scrollbar"
            style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>

            <Field label="Project" hint="optional · pre-fills client">
              <CustomSelect
                value={form.projectId}
                onChange={(v) => onProjectChange(v)}
                placeholder="— No project —"
                options={[{ value: '', label: '— No project —' }, ...projects.map(p => ({ value: p.id, label: p.title || p.name }))]}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <Field label="Invoice #">
                <input className="input" type="text" placeholder="INV-0001"
                  value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)}/>
              </Field>
              <Field label="Client" required>
                <input className="input" type="text" required placeholder="Acme Inc."
                  value={form.client} onChange={e => set('client', e.target.value)}/>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <Field label="Amount" required>
                <div style={{ position: 'relative' }}>
                  <input className="input" type="number" step="0.01" min="0" required
                    placeholder="1500.00" value={form.amount}
                    onChange={e => set('amount', e.target.value)}
                    style={{ paddingLeft: 28, fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 600 }}/>
                  <span style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)', fontSize: 14, fontWeight: 600, pointerEvents: 'none',
                  }}>{form.currency === 'USD' ? '$' : form.currency === 'EUR' ? '€' : form.currency === 'UZS' ? 'сум' : '₽'}</span>
                </div>
                {previewAmount && (
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    Total: {previewAmount}
                  </span>
                )}
              </Field>
              <Field label="Currency">
                <CustomSelect
                  value={form.currency}
                  onChange={(v) => set('currency', v)}
                  options={CURRENCIES.map(c => ({ value: c, label: c }))}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Issued">
                <DateInput value={form.issuedDate} onChange={(v) => set('issuedDate', v)}/>
              </Field>
              <Field label="Due">
                <DateInput value={form.dueDate} onChange={(v) => set('dueDate', v)}/>
              </Field>
            </div>

            <Field label="Notes" hint="optional · shown on the invoice">
              <textarea className="input" rows={3}
                placeholder="Services rendered, payment terms, etc."
                value={form.description} onChange={e => set('description', e.target.value)}/>
            </Field>

            {error && <ErrorBanner>{error}</ErrorBanner>}
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Invoice will be marked <strong style={{ color: 'var(--accent-warning-text)' }}>Pending</strong> until paid.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {submitting ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
                {submitting ? 'Creating…' : 'Create invoice'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

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
