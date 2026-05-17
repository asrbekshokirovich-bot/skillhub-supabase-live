import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { financeService } from '../lib/services/financeService';
import { projectService } from '../lib/services/projectService';

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
        // Fallback to direct query
        import('../lib/supabase').then(({ supabase }) =>
          supabase.from('projects').select('id, title, client').then(({ data }) => setProjects(data || []))
        );
      });
  }, []);

  const updateField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Auto-fill client + suggest invoice number when project is picked
  const onProjectChange = (id) => {
    const p = projects.find(x => x.id === id);
    setForm(f => ({
      ...f,
      projectId: id,
      client: p?.client || f.client,
      invoiceNumber: f.invoiceNumber || `INV-${String(Date.now()).slice(-6)}`,
    }));
  };

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

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card"
        style={{ width: '100%', maxWidth: 520, padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>New Invoice</h2>
          <button onClick={onClose} className="btn-icon" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <Field label="Project (optional)">
            <select
              className="input w-full"
              value={form.projectId}
              onChange={e => onProjectChange(e.target.value)}
            >
              <option value="">— No project —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title || p.name}</option>)}
            </select>
          </Field>

          <Row>
            <Field label="Invoice #">
              <input
                className="input w-full" type="text"
                placeholder="INV-0001"
                value={form.invoiceNumber}
                onChange={e => updateField('invoiceNumber', e.target.value)}
              />
            </Field>
            <Field label="Client *">
              <input
                className="input w-full" type="text" required
                placeholder="Acme Inc."
                value={form.client}
                onChange={e => updateField('client', e.target.value)}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Amount *">
              <input
                className="input w-full" type="number" step="0.01" min="0" required
                placeholder="1500.00"
                value={form.amount}
                onChange={e => updateField('amount', e.target.value)}
              />
            </Field>
            <Field label="Currency">
              <select
                className="input w-full"
                value={form.currency}
                onChange={e => updateField('currency', e.target.value)}
              >
                <option>USD</option>
                <option>EUR</option>
                <option>UZS</option>
                <option>RUB</option>
              </select>
            </Field>
          </Row>

          <Row>
            <Field label="Issued">
              <input
                className="input w-full" type="date"
                value={form.issuedDate}
                onChange={e => updateField('issuedDate', e.target.value)}
              />
            </Field>
            <Field label="Due">
              <input
                className="input w-full" type="date"
                value={form.dueDate}
                onChange={e => updateField('dueDate', e.target.value)}
              />
            </Field>
          </Row>

          <Field label="Notes">
            <textarea
              className="input w-full"
              rows={2}
              placeholder="Services rendered, payment terms, etc."
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
            />
          </Field>

          {error && (
            <div style={{
              padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)',
              background: 'var(--alert-error-bg)', color: 'var(--alert-error-text)',
              border: '1px solid var(--alert-error-border)', fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Create invoice'}
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

const Row = ({ children }) => (
  <div style={{ display: 'flex', gap: '0.75rem' }}>{children}</div>
);
