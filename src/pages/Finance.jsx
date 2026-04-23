import React from 'react';
import { Download, FileText } from 'lucide-react';

const mockInvoices = [];

// Constants to remove magic strings
const FILTER_CLIENT = 'Acme Corp';
const STATUS_COLORS = {
  Paid: 'var(--bg-tertiary)',
  Overdue: '#fecaca',
  Pending: 'var(--bg-secondary)' // Default fallback
};

/**
 * Returns the appropriate background color for an invoice status badge.
 */
function getStatusBgColor(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.Pending;
}

/**
 * Renders a single invoice row in the table.
 */
const InvoiceRow = ({ invoice, index }) => {
  return (
    <tr 
      className={`invoice-row animate-slide-up delay-${(index + 1) * 100}`}
    >
      <td data-label="Invoice ID" className="table-cell" style={{ fontWeight: 500 }}>
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-secondary" />
          <span>{invoice.id}</span>
        </div>
      </td>
      <td data-label="Client" className="table-cell">{invoice.client}</td>
      <td data-label="Date" className="table-cell" style={{ color: 'var(--text-secondary)' }}>
        {invoice.date}
      </td>
      <td data-label="Amount" className="table-cell" style={{ fontWeight: 500 }}>
        {invoice.amount}
      </td>
      <td data-label="Status" className="table-cell">
        <span 
          className="badge" 
          style={{ backgroundColor: getStatusBgColor(invoice.status), color: 'var(--text-primary)' }}
        >
          {invoice.status}
        </span>
      </td>
      <td data-label="Action" className="table-cell">
        <button className="btn btn-secondary p-2">
          <Download size={16} />
        </button>
      </td>
    </tr>
  );
};

export default function Finance({ currentUser }) {
  // Use early exit pattern if no user
  if (!currentUser) return null;

  // Filter based on role (Functional logic kept simple)
  const displayInvoices = currentUser.role === 'client' 
    ? mockInvoices.filter(invoice => invoice.client === FILTER_CLIENT) 
    : mockInvoices;

  return (
    <div className="flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Financial Control</h2>
          <p className="text-secondary">View and manage invoices and billing.</p>
        </div>
        {currentUser.role === 'ceo' && (
          <button className="btn btn-primary">Create Invoice</button>
        )}
      </div>

      <div className="card">
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table className="responsive-cards" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <th className="table-header-cell">Invoice ID</th>
                <th className="table-header-cell">Client</th>
                <th className="table-header-cell">Date</th>
                <th className="table-header-cell">Amount</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayInvoices.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                displayInvoices.map((invoice, index) => (
                  <InvoiceRow key={invoice.id} invoice={invoice} index={index} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
