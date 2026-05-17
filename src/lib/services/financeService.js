import { supabase } from '../supabase';

const INVOICE_FIELDS = 'id, projectId, invoiceNumber, client, amount, currency, issuedDate, dueDate, paidDate, status, description, createdBy, createdAt';
const EXPENSE_FIELDS = 'id, projectId, category, amount, currency, date, description, createdBy, createdAt';

export const financeService = {
  // ── Invoices ──
  async listInvoices({ status = null, projectId = null } = {}) {
    let q = supabase.from('invoices').select(INVOICE_FIELDS).order('issuedDate', { ascending: false });
    if (status) q = q.eq('status', status);
    if (projectId) q = q.eq('projectId', projectId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async createInvoice(payload) {
    const { data, error } = await supabase.from('invoices').insert([payload]).select(INVOICE_FIELDS).single();
    if (error) throw error;
    return data;
  },

  async markPaid(id) {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'paid', paidDate: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select(INVOICE_FIELDS)
      .single();
    if (error) throw error;
    return data;
  },

  async cancelInvoice(id) {
    const { error } = await supabase.from('invoices').update({ status: 'cancelled', updatedAt: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },

  async deleteInvoice(id) {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Expenses ──
  async listExpenses({ projectId = null } = {}) {
    let q = supabase.from('expenses').select(EXPENSE_FIELDS).order('date', { ascending: false });
    if (projectId) q = q.eq('projectId', projectId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async createExpense(payload) {
    const { data, error } = await supabase.from('expenses').insert([payload]).select(EXPENSE_FIELDS).single();
    if (error) throw error;
    return data;
  },

  async deleteExpense(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Aggregates ──
  computeStats(invoices, expenses) {
    const today = new Date().toISOString().slice(0, 10);
    const sum = arr => arr.reduce((s, x) => s + Number(x.amount || 0), 0);

    const paid = invoices.filter(i => i.status === 'paid');
    const pending = invoices.filter(i => i.status === 'pending');
    const overdueComputed = invoices.filter(i =>
      (i.status === 'pending' || i.status === 'overdue') &&
      i.dueDate && i.dueDate < today
    );

    return {
      revenue: sum(paid),
      outstanding: sum(pending),
      overdue: sum(overdueComputed),
      expensesTotal: sum(expenses),
      net: sum(paid) - sum(expenses),
      invoiceCount: invoices.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      overdueCount: overdueComputed.length,
    };
  },
};
