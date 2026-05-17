import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { financeService } from '../lib/services/financeService';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['Marketing', 'Operations', 'Salaries', 'Subscriptions', 'Travel', 'Office', 'Software', 'Other'];

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
    supabase.from('projects').select('id, title').neq('isArchived', true).then(({ data }) => setProjects(data || []));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.amount) {
      setError('Amount is required.');
      return;
    }
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
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 480, padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>New Expense</h2>
          <button onClick={onClose} className="btn-icon" aria-label="Close"><X size={18} /></button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <Field label="Category">
            <select className="input w-full" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Project (optional)">
            <select className="input w-full" value={form.projectId} onChange={e => set('projectId', e.target.value)}>
              <option value="">— No project (general overhead) —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </Field>

          <Row>
            <Field label="Amount *">
              <input className="input w-full" type="number" step="0.01" min="0" required
                placeholder="500.00" value={form.amount}
                onChange={e => set('amount', e.target.value)} />
            </Field>
            <Field label="Currency">
              <select className="input w-full" value={form.currency} onChange={e => set('currency', e.target.value)}>
                <option>USD</option><option>EUR</option><option>UZS</option><option>RUB</option>
              </select>
            </Field>
          </Row>

          <Field label="Date">
            <input className="input w-full" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </Field>

          <Field label="Description">
            <textarea className="input w-full" rows={2}
              placeholder="e.g. Google Workspace subscription"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </Field>

          {error && (
            <div style={{ padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)',
              background: 'var(--alert-error-bg)', color: 'var(--alert-error-text)',
              border: '1px solid var(--alert-error-border)', fontSize: '0.875rem' }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Add expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1, minWidth: 0 }}>
    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
    {children}
  </label>
);
const Row = ({ children }) => <div style={{ display: 'flex', gap: '0.75rem' }}>{children}</div>;
