import React from 'react';
import { Download, FileText } from 'lucide-react';

const mockInvoices = [];

const Finance = ({ currentUser }) => {
  // Filter for client mode
  const displayInvoices = currentUser.role === 'client' 
    ? mockInvoices.filter(i => i.client === 'Acme Corp') 
    : mockInvoices;

  return (
    <div className="flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Financial Control</h2>
          <p className="text-secondary">View and manage invoices and billing.</p>
        </div>
        {currentUser.role === 'admin' && (
          <button className="btn btn-primary">Create Invoice</button>
        )}
      </div>

      <div className="card">
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>Invoice ID</th>
                <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>Client</th>
                <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>Date</th>
                <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>Amount</th>
                <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>Action</th>
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
                  <tr key={invoice.id} className={`animate-slide-up delay-${(index + 1) * 100}`} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>
                      <div className="flex items-center gap-2">
                         <FileText size={16} className="text-secondary" />
                         {invoice.id}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{invoice.client}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{invoice.date}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>{invoice.amount}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge" style={{ 
                        backgroundColor: invoice.status === 'Paid' ? 'var(--bg-tertiary)' : invoice.status === 'Overdue' ? '#fecaca' : 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                      }}>
                        {invoice.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button className="btn btn-secondary flex items-center justify-center p-2">
                         <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Finance;
