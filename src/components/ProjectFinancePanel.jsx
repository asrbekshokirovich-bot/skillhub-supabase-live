import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ArrowUpRight, Wallet, Receipt, TrendingUp, ChevronDown, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import { financeService } from '../lib/services/financeService';
import NewInvoiceModal from './NewInvoiceModal';
import NewExpenseModal from './NewExpenseModal';

const fmtMoney = (amount, currency = 'USD') => {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount) || 0); }
  catch { return `${currency} ${Number(amount || 0).toFixed(0)}`; }
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso); if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function ProjectFinancePanel({ projectId, currentUser }) {
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showExpense, setShowExpense] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      financeService.listInvoices({ projectId }),
      financeService.listExpenses({ projectId }),
    ]).then(([inv, exp]) => {
      setInvoices(inv); setExpenses(exp);
    }).catch(err => console.error('ProjectFinance load error:', err))
      .finally(() => setLoading(false));
  }, [projectId]);

  const stats = useMemo(() => financeService.computeStats(invoices, expenses), [invoices, expenses]);

  if (loading) {
    return (
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
        <Loader2 size={14} className="animate-spin" />
        <span style={{ fontSize: '0.8125rem' }}>Loading finance…</span>
      </div>
    );
  }

  // Hide entirely if nothing yet, but keep the "+ Add" button accessible
  const isEmpty = invoices.length === 0 && expenses.length === 0;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* COMPACT HEADER */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '0.625rem 1rem', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex' }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Project finance
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Mini label="Revenue"   value={fmtMoney(stats.revenue)}        color="var(--accent-success-text)" />
          <Mini label="Outstanding" value={fmtMoney(stats.outstanding)}  color="var(--accent-warning-text)" />
          <Mini label="Expenses"  value={fmtMoney(stats.expensesTotal)}  color="var(--text-secondary)" />
          <Mini label="Net"       value={fmtMoney(stats.net)}            color={stats.net >= 0 ? 'var(--accent-primary-text)' : 'var(--alert-error-text)'} />
        </div>
      </button>

      {/* EXPANDED CONTENT */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-color)', padding: '0.75rem 1rem' }}>
          {currentUser.role === 'ceo' && (
            <div style={{ display: 'flex', gap: 6, marginBottom: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.625rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => setShowInvoice(true)}>
                <Plus size={12} /> Invoice
              </button>
              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.625rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => setShowExpense(true)}>
                <Plus size={12} /> Expense
              </button>
            </div>
          )}

          {isEmpty ? (
            <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
              No invoices or expenses yet for this project.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              {/* Invoices */}
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Invoices ({invoices.length})
                </div>
                {invoices.length === 0 ? (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>None yet.</div>
                ) : (
                  invoices.slice(0, 4).map(inv => (
                    <Row key={inv.id}>
                      <span style={{ fontWeight: 500 }}>{inv.invoiceNumber || '—'}</span>
                      <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {inv.client}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtMoney(inv.amount, inv.currency)}</span>
                      <StatusDot status={inv.status} dueDate={inv.dueDate} />
                    </Row>
                  ))
                )}
              </div>
              {/* Expenses */}
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Expenses ({expenses.length})
                </div>
                {expenses.length === 0 ? (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>None yet.</div>
                ) : (
                  expenses.slice(0, 4).map(exp => (
                    <Row key={exp.id}>
                      <span style={{
                        fontSize: '0.6875rem', padding: '1px 6px', borderRadius: 999,
                        color: 'var(--accent-primary-text)', background: 'var(--accent-primary-muted)', fontWeight: 600,
                      }}>{exp.category}</span>
                      <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exp.description || '—'}
                      </span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtMoney(exp.amount, exp.currency)}</span>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>{fmtDate(exp.date)}</span>
                    </Row>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showInvoice && (
        <NewInvoiceModal
          currentUser={currentUser}
          onClose={() => setShowInvoice(false)}
          onCreated={(inv) => { setInvoices(l => [inv, ...l]); }}
        />
      )}
      {showExpense && (
        <NewExpenseModal
          currentUser={currentUser}
          onClose={() => setShowExpense(false)}
          onCreated={(exp) => { setExpenses(l => [exp, ...l]); }}
        />
      )}
    </div>
  );
}

const Mini = ({ label, value, color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    <span style={{ fontSize: '0.875rem', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{value}</span>
  </div>
);

const Row = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: '0.8125rem', borderTop: '1px solid var(--border-color)' }}>
    {children}
  </div>
);

const StatusDot = ({ status, dueDate }) => {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = (status === 'pending' || status === 'overdue') && dueDate && dueDate < today;
  const color =
    status === 'paid' ? 'var(--accent-success-text)' :
    overdue ? 'var(--alert-error-text)' :
    status === 'pending' ? 'var(--accent-warning-text)' :
    'var(--text-tertiary)';
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} title={overdue ? 'overdue' : status} />;
};
