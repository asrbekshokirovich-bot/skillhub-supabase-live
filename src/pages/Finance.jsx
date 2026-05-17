import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Loader2, CheckCircle2, XCircle, Trash2, ArrowUpRight, AlertCircle, Wallet, FileText, Receipt, TrendingUp } from 'lucide-react';
import { financeService } from '../lib/services/financeService';
import NewInvoiceModal from '../components/NewInvoiceModal';
import NewExpenseModal from '../components/NewExpenseModal';

const STATUS_META = {
  pending:   { label: 'Pending',   color: 'var(--accent-warning-text)', bg: 'var(--accent-warning-muted)' },
  paid:      { label: 'Paid',      color: 'var(--accent-success-text)', bg: 'var(--accent-success-muted)' },
  overdue:   { label: 'Overdue',   color: 'var(--alert-error-text)',    bg: 'var(--alert-error-bg)' },
  cancelled: { label: 'Cancelled', color: 'var(--text-tertiary)',       bg: 'var(--bg-tertiary)' },
};

const fmtMoney = (amount, currency = 'USD') => {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount) || 0); }
  catch { return `${currency} ${Number(amount || 0).toFixed(0)}`; }
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso); if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function Finance({ currentUser }) {
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('invoices'); // 'invoices' | 'expenses'
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [inv, exp] = await Promise.all([
        financeService.listInvoices(),
        financeService.listExpenses(),
      ]);
      setInvoices(inv); setExpenses(exp);
    } catch (err) {
      console.error('Finance fetch error:', err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const stats = useMemo(() => financeService.computeStats(invoices, expenses), [invoices, expenses]);

  const visibleInvoices = useMemo(() => {
    if (statusFilter === 'all') return invoices;
    if (statusFilter === 'overdue') {
      const today = new Date().toISOString().slice(0, 10);
      return invoices.filter(i => (i.status === 'pending' || i.status === 'overdue') && i.dueDate && i.dueDate < today);
    }
    return invoices.filter(i => i.status === statusFilter);
  }, [invoices, statusFilter]);

  const onMarkPaid = async (id) => {
    try {
      const updated = await financeService.markPaid(id);
      setInvoices(l => l.map(i => i.id === id ? updated : i));
    } catch (err) {
      alert('Failed to mark paid: ' + err.message);
    }
  };

  const onCancel = async (id) => {
    if (!confirm('Cancel this invoice?')) return;
    try { await financeService.cancelInvoice(id); setInvoices(l => l.map(i => i.id === id ? { ...i, status: 'cancelled' } : i)); }
    catch (err) { alert('Failed: ' + err.message); }
  };

  const onDeleteInvoice = async (id) => {
    if (!confirm('Permanently delete this invoice?')) return;
    try { await financeService.deleteInvoice(id); setInvoices(l => l.filter(i => i.id !== id)); }
    catch (err) { alert('Failed: ' + err.message); }
  };

  const onDeleteExpense = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try { await financeService.deleteExpense(id); setExpenses(l => l.filter(x => x.id !== id)); }
    catch (err) { alert('Failed: ' + err.message); }
  };

  return (
    <div className="flex-col gap-5 animate-fade-in" style={{ width: '100%' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>Finance</h2>
          <p className="text-secondary" style={{ marginTop: 4, fontSize: '0.875rem' }}>
            Track invoices, expenses, and overall profitability.
          </p>
        </div>
        {mode === 'invoices' ? (
          <button className="btn btn-primary" onClick={() => setShowInvoiceModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> New invoice
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> New expense
          </button>
        )}
      </div>

      {/* STATS */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <StatCard label="Revenue (paid)"  value={fmtMoney(stats.revenue)}       subtitle={`${stats.paidCount} paid`}        icon={<ArrowUpRight size={18} />}  color="var(--accent-success-text)" />
        <StatCard label="Outstanding"     value={fmtMoney(stats.outstanding)}   subtitle={`${stats.pendingCount} pending`}  icon={<Wallet size={18} />}        color="var(--accent-warning-text)" />
        <StatCard label="Overdue"         value={fmtMoney(stats.overdue)}       subtitle={`${stats.overdueCount} late`}     icon={<AlertCircle size={18} />}   color="var(--alert-error-text)" />
        <StatCard label="Expenses"        value={fmtMoney(stats.expensesTotal)} subtitle={`${expenses.length} entries`}     icon={<Receipt size={18} />}       color="var(--text-secondary)" />
        <StatCard label="Net (paid − exp)" value={fmtMoney(stats.net)}          subtitle={stats.net >= 0 ? 'profit' : 'loss'} icon={<TrendingUp size={18} />}    color={stats.net >= 0 ? 'var(--accent-primary-text)' : 'var(--alert-error-text)'} />
      </div>

      {/* MODE TABS */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <ModeTab active={mode === 'invoices'} onClick={() => { setMode('invoices'); setStatusFilter('all'); }}>
          <FileText size={14} /> Invoices <span style={{ marginLeft: 4, opacity: 0.6 }}>{invoices.length}</span>
        </ModeTab>
        <ModeTab active={mode === 'expenses'} onClick={() => setMode('expenses')}>
          <Receipt size={14} /> Expenses <span style={{ marginLeft: 4, opacity: 0.6 }}>{expenses.length}</span>
        </ModeTab>
      </div>

      {/* SUB-FILTERS (only on invoices) */}
      {mode === 'invoices' && (
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {[
            { id: 'all',       label: 'All' },
            { id: 'pending',   label: 'Pending' },
            { id: 'overdue',   label: 'Overdue' },
            { id: 'paid',      label: 'Paid' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map(t => (
            <button key={t.id} onClick={() => setStatusFilter(t.id)}
              style={{
                padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-md)',
                background: statusFilter === t.id ? 'var(--bg-tertiary)' : 'transparent',
                color: statusFilter === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* CONTENT */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      ) : mode === 'invoices' ? (
        <InvoiceTable
          invoices={visibleInvoices}
          statusFilter={statusFilter}
          onMarkPaid={onMarkPaid}
          onCancel={onCancel}
          onDelete={onDeleteInvoice}
        />
      ) : (
        <ExpenseTable expenses={expenses} onDelete={onDeleteExpense} />
      )}

      {showInvoiceModal && (
        <NewInvoiceModal
          currentUser={currentUser}
          onClose={() => setShowInvoiceModal(false)}
          onCreated={(inv) => setInvoices(l => [inv, ...l])}
        />
      )}
      {showExpenseModal && (
        <NewExpenseModal
          currentUser={currentUser}
          onClose={() => setShowExpenseModal(false)}
          onCreated={(exp) => setExpenses(l => [exp, ...l])}
        />
      )}
    </div>
  );
}

// ── INVOICES TABLE ──
function InvoiceTable({ invoices, statusFilter, onMarkPaid, onCancel, onDelete }) {
  if (invoices.length === 0) {
    return (
      <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <FileText size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4, display: 'block' }} />
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No invoices yet</div>
        <div style={{ fontSize: '0.875rem' }}>
          {statusFilter === 'all' ? 'Click "New invoice" to create one.' : `No ${statusFilter} invoices.`}
        </div>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
              <Th>Invoice</Th><Th>Client</Th><Th>Amount</Th><Th>Issued</Th><Th>Due</Th><Th>Status</Th>
              <Th style={{ textAlign: 'right' }}>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => {
              const today = new Date().toISOString().slice(0, 10);
              const effective = (inv.status === 'pending' && inv.dueDate && inv.dueDate < today) ? 'overdue' : inv.status;
              const meta = STATUS_META[effective] || STATUS_META.pending;
              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <Td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.invoiceNumber || '—'}</div>
                    {inv.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.description}</div>}
                  </Td>
                  <Td>{inv.client}</Td>
                  <Td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtMoney(inv.amount, inv.currency)}</Td>
                  <Td style={{ color: 'var(--text-secondary)' }}>{fmtDate(inv.issuedDate)}</Td>
                  <Td style={{ color: effective === 'overdue' ? 'var(--alert-error-text)' : 'var(--text-secondary)', fontWeight: effective === 'overdue' ? 600 : 400 }}>{fmtDate(inv.dueDate)}</Td>
                  <Td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 999,
                      fontSize: '0.7rem', fontWeight: 600,
                      color: meta.color, background: meta.bg,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>{meta.label}</span>
                  </Td>
                  <Td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      {effective !== 'paid' && effective !== 'cancelled' && (
                        <IconBtn title="Mark as paid" onClick={() => onMarkPaid(inv.id)} color="var(--accent-success-text)"><CheckCircle2 size={15} /></IconBtn>
                      )}
                      {effective !== 'cancelled' && effective !== 'paid' && (
                        <IconBtn title="Cancel" onClick={() => onCancel(inv.id)} color="var(--text-secondary)"><XCircle size={15} /></IconBtn>
                      )}
                      <IconBtn title="Delete" onClick={() => onDelete(inv.id)} color="var(--alert-error-text)"><Trash2 size={15} /></IconBtn>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── EXPENSES TABLE ──
function ExpenseTable({ expenses, onDelete }) {
  if (expenses.length === 0) {
    return (
      <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Receipt size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4, display: 'block' }} />
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No expenses recorded</div>
        <div style={{ fontSize: '0.875rem' }}>Click "New expense" to add the first one.</div>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
              <Th>Description</Th><Th>Category</Th><Th>Amount</Th><Th>Date</Th>
              <Th style={{ textAlign: 'right' }}>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(exp => (
              <tr key={exp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <Td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{exp.description || '—'}</div>
                </Td>
                <Td>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                    fontSize: '0.7rem', fontWeight: 600,
                    color: 'var(--accent-primary-text)', background: 'var(--accent-primary-muted)',
                  }}>{exp.category}</span>
                </Td>
                <Td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtMoney(exp.amount, exp.currency)}</Td>
                <Td style={{ color: 'var(--text-secondary)' }}>{fmtDate(exp.date)}</Td>
                <Td style={{ textAlign: 'right' }}>
                  <IconBtn title="Delete" onClick={() => onDelete(exp.id)} color="var(--alert-error-text)"><Trash2 size={15} /></IconBtn>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── HELPERS ──
const StatCard = ({ label, value, subtitle, icon, color }) => (
  <div className="card" style={{ flex: '1 1 180px', minWidth: 160, padding: '1rem 1.125rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{subtitle}</div>}
      </div>
      <div style={{ color, opacity: 0.85, flexShrink: 0 }}>{icon}</div>
    </div>
  </div>
);

const ModeTab = ({ active, onClick, children }) => (
  <button onClick={onClick}
    style={{
      padding: '0.5rem 0.875rem', fontSize: '0.875rem', fontWeight: 600,
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      borderBottom: active ? '2px solid var(--accent-primary)' : '2px solid transparent',
      background: 'transparent', border: 'none',
      marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
    {children}
  </button>
);

const Th = ({ children, style = {} }) => (
  <th style={{ padding: '0.625rem 0.875rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', ...style }}>{children}</th>
);
const Td = ({ children, style = {} }) => (
  <td style={{ padding: '0.75rem 0.875rem', verticalAlign: 'middle', ...style }}>{children}</td>
);
const IconBtn = ({ children, onClick, title, color }) => (
  <button onClick={onClick} title={title}
    style={{ padding: 6, borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none', cursor: 'pointer', color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
    {children}
  </button>
);
