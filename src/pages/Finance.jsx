// ─────────────────────────────────────────────────────────────────────────
// Finance — hero KPI + clean invoices/expenses table.
//
// Drop-in replacement for src/pages/Finance.jsx.
// All service calls, modal triggers and data shapes unchanged.
// ─────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Loader2, CheckCircle2, XCircle, Trash2, ArrowUpRight,
  AlertCircle, Wallet, FileText, Receipt, TrendingUp, Search,
  RefreshCw, ArrowDownToLine,
} from 'lucide-react';
import { financeService } from '../lib/services/financeService';
import NewInvoiceModal from '../components/NewInvoiceModal';
import NewExpenseModal from '../components/NewExpenseModal';

const STATUS_META = {
  pending:   { label: 'Pending',   color: 'var(--accent-warning-text)', bg: 'var(--accent-warning-muted)', br: 'var(--accent-warning-text)' },
  paid:      { label: 'Paid',      color: 'var(--accent-success-text)', bg: 'var(--accent-success-muted)', br: 'var(--accent-success-border)' },
  overdue:   { label: 'Overdue',   color: 'var(--alert-error-text)',    bg: 'var(--alert-error-bg)',       br: 'var(--alert-error-border)' },
  cancelled: { label: 'Cancelled', color: 'var(--text-tertiary)',       bg: 'var(--bg-tertiary)',          br: 'var(--border-color)' },
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
  const [mode, setMode] = useState('invoices');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
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
    let list = invoices;
    if (statusFilter === 'overdue') {
      const today = new Date().toISOString().slice(0, 10);
      list = invoices.filter(i => (i.status === 'pending' || i.status === 'overdue') && i.dueDate && i.dueDate < today);
    } else if (statusFilter !== 'all') {
      list = invoices.filter(i => i.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i =>
        (i.invoiceNumber || '').toLowerCase().includes(q) ||
        (i.client || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, statusFilter, search]);

  const onMarkPaid = async (id) => {
    try {
      const updated = await financeService.markPaid(id);
      setInvoices(l => l.map(i => i.id === id ? updated : i));
    } catch (err) { alert('Failed to mark paid: ' + err.message); }
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

  const counts = {
    all:       invoices.length,
    paid:      invoices.filter(i => i.status === 'paid').length,
    pending:   invoices.filter(i => i.status === 'pending').length,
    overdue:   (() => { const t = new Date().toISOString().slice(0, 10);
                       return invoices.filter(i => (i.status === 'pending' || i.status === 'overdue') && i.dueDate && i.dueDate < t).length; })(),
    cancelled: invoices.filter(i => i.status === 'cancelled').length,
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.015em', margin: 0 }}>Finance</h2>
          <p style={{ marginTop: 4, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            {invoices.length} invoice{invoices.length === 1 ? '' : 's'}
            <Dot/>{stats.paidCount} paid · {stats.pendingCount} pending
            <Dot/>net {fmtMoney(stats.net)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <GhostBtn onClick={fetchAll}><RefreshCw size={13}/>Sync</GhostBtn>
          {mode === 'invoices' ? (
            <button className="btn btn-primary" onClick={() => setShowInvoiceModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14}/>New invoice
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14}/>New expense
            </button>
          )}
        </div>
      </div>

      {/* KPI ROW — hero + 3 supporting */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 12 }}>
        <Kpi big tone="accent" label="Net revenue · last 6 months"
          value={fmtMoney(stats.net)}
          extra={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 7px', borderRadius: 999,
                  background: stats.net >= 0 ? 'var(--accent-success-muted)' : 'var(--alert-error-bg)',
                  color: stats.net >= 0 ? 'var(--accent-success-text)' : 'var(--alert-error-text)',
                  border: `1px solid ${stats.net >= 0 ? 'var(--accent-success-border)' : 'var(--alert-error-border)'}`,
                  fontSize: 10.5, fontWeight: 700,
                }}>
                  <ArrowUpRight size={10} style={{ transform: stats.net >= 0 ? 'none' : 'rotate(90deg)' }}/>
                  {stats.net >= 0 ? 'Profit' : 'Loss'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {fmtMoney(stats.revenue)} in − {fmtMoney(stats.expensesTotal)} out
                </span>
              </div>
              <RevenueSparkline invoices={invoices} expenses={expenses}/>
            </div>
          }
        />
        <Kpi tone="success" label={`Paid · ${stats.paidCount} invoices`} value={fmtMoney(stats.revenue)}/>
        <Kpi tone="warning" label={`Outstanding · ${stats.pendingCount} pending`} value={fmtMoney(stats.outstanding)}/>
        <Kpi tone={stats.overdueCount > 0 ? 'danger' : 'neutral'}
          label={`Overdue · ${stats.overdueCount} late`} value={fmtMoney(stats.overdue)}/>
      </div>

      {/* CARD: tabs + filters + table */}
      <Card>
        {/* Mode tabs */}
        <div style={{
          padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <ModeTab active={mode === 'invoices'} onClick={() => { setMode('invoices'); setStatusFilter('all'); }}>
              <FileText size={13}/>Invoices <Pill>{invoices.length}</Pill>
            </ModeTab>
            <ModeTab active={mode === 'expenses'} onClick={() => setMode('expenses')}>
              <Receipt size={13}/>Expenses <Pill>{expenses.length}</Pill>
            </ModeTab>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <SearchBox value={search} onChange={setSearch} placeholder={`Search ${mode}…`}/>
            <GhostBtn><ArrowDownToLine size={13}/>Export CSV</GhostBtn>
          </div>
        </div>

        {/* Status sub-filters */}
        {mode === 'invoices' && (
          <div style={{
            padding: '8px 16px', borderBottom: '1px solid var(--border-color)',
            display: 'flex', gap: 4, flexWrap: 'wrap',
          }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'paid', label: 'Paid' },
              { id: 'pending', label: 'Pending' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map(t => (
              <button key={t.id} onClick={() => setStatusFilter(t.id)}
                style={{
                  padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                  background: statusFilter === t.id ? 'var(--bg-tertiary)' : 'transparent',
                  color: statusFilter === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: statusFilter === t.id ? '1px solid var(--border-color)' : '1px solid transparent',
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                {t.label} <span style={{ marginLeft: 4, color: 'var(--text-tertiary)', fontWeight: 500 }}>{counts[t.id]}</span>
              </button>
            ))}
          </div>
        )}

        {/* CONTENT */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-secondary)' }}/>
          </div>
        ) : mode === 'invoices' ? (
          <InvoiceTable invoices={visibleInvoices} statusFilter={statusFilter}
            onMarkPaid={onMarkPaid} onCancel={onCancel} onDelete={onDeleteInvoice}/>
        ) : (
          <ExpenseTable expenses={expenses} onDelete={onDeleteExpense}/>
        )}
      </Card>

      {showInvoiceModal && (
        <NewInvoiceModal currentUser={currentUser}
          onClose={() => setShowInvoiceModal(false)}
          onCreated={(inv) => setInvoices(l => [inv, ...l])}/>
      )}
      {showExpenseModal && (
        <NewExpenseModal currentUser={currentUser}
          onClose={() => setShowExpenseModal(false)}
          onCreated={(exp) => setExpenses(l => [exp, ...l])}/>
      )}
    </div>
  );
}

// ── Invoice table ─────────────────────────────────────────────────────────

function InvoiceTable({ invoices, statusFilter, onMarkPaid, onCancel, onDelete }) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={<FileText size={28}/>}
        title="No invoices"
        body={statusFilter === 'all' ? 'Create your first invoice to start tracking revenue.' : `No ${statusFilter} invoices to show.`}
      />
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr>
            <Th>Invoice</Th><Th>Client</Th>
            <Th align="right">Amount</Th>
            <Th>Issued</Th><Th>Due</Th><Th>Status</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv, i) => {
            const today = new Date().toISOString().slice(0, 10);
            const effective = (inv.status === 'pending' && inv.dueDate && inv.dueDate < today) ? 'overdue' : inv.status;
            const meta = STATUS_META[effective] || STATUS_META.pending;
            return (
              <tr key={inv.id}
                style={{
                  borderBottom: i === invoices.length - 1 ? 'none' : '1px solid var(--border-color)',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                <Td>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.8125rem' }}>
                    {inv.invoiceNumber || '—'}
                  </div>
                  {inv.description && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inv.description}
                    </div>
                  )}
                </Td>
                <Td><span style={{ color: 'var(--text-secondary)' }}>{inv.client}</span></Td>
                <Td align="right">
                  <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {fmtMoney(inv.amount, inv.currency)}
                  </span>
                </Td>
                <Td><span style={{ color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(inv.issuedDate)}</span></Td>
                <Td>
                  <span style={{
                    color: effective === 'overdue' ? 'var(--alert-error-text)' : 'var(--text-tertiary)',
                    fontWeight: effective === 'overdue' ? 600 : 400,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{fmtDate(inv.dueDate)}</span>
                </Td>
                <Td>
                  <StatusBadge color={meta.color} bg={meta.bg} br={meta.br}>{meta.label}</StatusBadge>
                </Td>
                <Td align="right">
                  <div style={{ display: 'inline-flex', gap: 2, justifyContent: 'flex-end' }}>
                    {effective !== 'paid' && effective !== 'cancelled' && (
                      <IconBtn title="Mark as paid" onClick={() => onMarkPaid(inv.id)} color="var(--accent-success-text)"><CheckCircle2 size={14}/></IconBtn>
                    )}
                    {effective !== 'cancelled' && effective !== 'paid' && (
                      <IconBtn title="Cancel" onClick={() => onCancel(inv.id)} color="var(--text-secondary)"><XCircle size={14}/></IconBtn>
                    )}
                    <IconBtn title="Delete" onClick={() => onDelete(inv.id)} color="var(--alert-error-text)"><Trash2 size={14}/></IconBtn>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Expense table ────────────────────────────────────────────────────────

function ExpenseTable({ expenses, onDelete }) {
  if (expenses.length === 0) {
    return <EmptyState icon={<Receipt size={28}/>} title="No expenses" body="Click 'New expense' to add one."/>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr>
            <Th>Description</Th><Th>Category</Th>
            <Th align="right">Amount</Th><Th>Date</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp, i) => (
            <tr key={exp.id} style={{
              borderBottom: i === expenses.length - 1 ? 'none' : '1px solid var(--border-color)',
              transition: 'background 0.12s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <Td><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{exp.description || '—'}</span></Td>
              <Td>
                <StatusBadge color="var(--accent-primary-text)" bg="var(--accent-primary-muted)" br="var(--accent-primary-border)">
                  {exp.category}
                </StatusBadge>
              </Td>
              <Td align="right">
                <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {fmtMoney(exp.amount, exp.currency)}
                </span>
              </Td>
              <Td><span style={{ color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(exp.date)}</span></Td>
              <Td align="right">
                <IconBtn title="Delete" onClick={() => onDelete(exp.id)} color="var(--alert-error-text)"><Trash2 size={14}/></IconBtn>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

const Card = ({ children }) => (
  <div style={{
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
  }}>{children}</div>
);

const Kpi = ({ big, tone = 'neutral', label, value, extra }) => {
  const color = {
    accent:  'var(--accent-primary-text)',
    success: 'var(--accent-success-text)',
    warning: 'var(--accent-warning-text)',
    danger:  'var(--alert-error-text)',
    neutral: 'var(--text-primary)',
  }[tone];
  return (
    <div style={{
      padding: big ? '18px 20px' : '14px 16px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{
        fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: 'var(--text-tertiary)',
      }}>{label}</div>
      <div style={{
        fontSize: big ? '2rem' : '1.375rem', fontWeight: 700,
        color, letterSpacing: '-0.025em',
        fontFamily: 'ui-monospace, Menlo, monospace', lineHeight: 1.1,
      }}>{value}</div>
      {extra}
    </div>
  );
};

const ModeTab = ({ active, onClick, children }) => (
  <button onClick={onClick}
    style={{
      padding: '6px 12px', borderRadius: 'var(--radius-sm)',
      background: active ? 'var(--bg-tertiary)' : 'transparent',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      border: active ? '1px solid var(--border-color)' : '1px solid transparent',
      fontFamily: 'inherit', fontSize: '0.8125rem', fontWeight: 600,
      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
    {children}
  </button>
);

const Pill = ({ children }) => (
  <span style={{
    padding: '0px 6px', borderRadius: 999,
    background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)', fontSize: '0.6875rem', fontWeight: 700,
  }}>{children}</span>
);

const SearchBox = ({ value, onChange, placeholder }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '0 10px', height: 28,
    background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
  }}>
    <Search size={12}/>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{
        width: 140, height: '100%', border: 'none', outline: 'none',
        background: 'transparent', color: 'var(--text-primary)',
        fontFamily: 'inherit', fontSize: 12, padding: 0,
      }}
    />
  </div>
);

const GhostBtn = ({ children, onClick }) => (
  <button onClick={onClick}
    style={{
      height: 28, padding: '0 10px', borderRadius: 'var(--radius-sm)',
      background: 'transparent', border: '1px solid transparent',
      color: 'var(--text-secondary)', fontFamily: 'inherit',
      fontSize: 12, fontWeight: 600, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
  >
    {children}
  </button>
);

const Th = ({ children, align = 'left' }) => (
  <th style={{
    padding: '10px 14px', textAlign: align,
    fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--text-tertiary)',
    borderBottom: '1px solid var(--border-color)',
  }}>{children}</th>
);

const Td = ({ children, align = 'left' }) => (
  <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: align }}>{children}</td>
);

const IconBtn = ({ children, onClick, title, color }) => (
  <button onClick={onClick} title={title}
    style={{
      width: 26, height: 26, padding: 0, borderRadius: 'var(--radius-sm)',
      background: 'transparent', border: 'none', cursor: 'pointer', color,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
    {children}
  </button>
);

const StatusBadge = ({ children, color, bg, br }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', borderRadius: 999,
    fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color, background: bg, border: `1px solid ${br}`,
  }}>{children}</span>
);

const EmptyState = ({ icon, title, body }) => (
  <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
    <div style={{ color: 'var(--text-tertiary)', marginBottom: 12, display: 'inline-flex' }}>{icon}</div>
    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: '0.875rem' }}>{body}</div>
  </div>
);

const Dot = () => <span style={{ margin: '0 8px', color: 'var(--text-tertiary)' }}>·</span>;

// ── Revenue sparkline ───────────────────────────────────────────────────
// Renders the last 6 calendar months of paid-invoice revenue as a tiny
// inline bar chart with hover tooltips.
const RevenueSparkline = ({ invoices = [], expenses = [] }) => {
  // Bucket into the last 6 months (oldest → newest)
  const now = new Date();
  const buckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
      revenue: 0,
      expense: 0,
    });
  }
  const indexFor = (iso) => {
    if (!iso) return -1;
    const d = new Date(iso); if (isNaN(d)) return -1;
    return buckets.findIndex(b => b.year === d.getFullYear() && b.month === d.getMonth());
  };
  invoices.forEach(inv => {
    if (inv.status !== 'paid') return;
    const idx = indexFor(inv.paidAt || inv.paidDate || inv.issuedDate);
    if (idx >= 0) buckets[idx].revenue += Number(inv.amount) || 0;
  });
  expenses.forEach(exp => {
    const idx = indexFor(exp.date);
    if (idx >= 0) buckets[idx].expense += Number(exp.amount) || 0;
  });

  const max = Math.max(1, ...buckets.map(b => Math.max(b.revenue, b.expense)));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 56 }}>
        {buckets.map((b, i) => {
          const revH = Math.round((b.revenue / max) * 48);
          const expH = Math.round((b.expense / max) * 48);
          return (
            <div key={b.key} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              height: '100%', justifyContent: 'flex-end',
            }} title={`${b.label}: ${fmtMoney(b.revenue)} in · ${fmtMoney(b.expense)} out`}>
              <div style={{ position: 'relative', width: '100%', height: 48,
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}>
                <div style={{
                  width: '38%', height: Math.max(2, revH),
                  background: i === buckets.length - 1 ? 'var(--accent-primary)' : 'var(--accent-primary-muted)',
                  borderTop: i === buckets.length - 1 ? 'none' : `1px solid var(--accent-primary-border)`,
                  borderRadius: '3px 3px 0 0',
                  transition: 'background 0.15s',
                }}/>
                <div style={{
                  width: '38%', height: Math.max(2, expH),
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '3px 3px 0 0',
                }}/>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {buckets.map(b => (
          <span key={b.key} style={{
            flex: 1, textAlign: 'center', fontSize: 9.5, fontWeight: 600,
            color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>{b.label}</span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-tertiary)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-primary)' }}/>Revenue
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-tertiary)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}/>Expenses
        </span>
      </div>
    </div>
  );
};
