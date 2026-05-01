import React from 'react';
import { FileText, Clock } from 'lucide-react';

// SYSTEM RULE: Pages must not expose non-functional features.
// Finance is in development. Show an intentional "coming soon" state.
export default function Finance({ currentUser }) {
  if (!currentUser) return null;

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold">Financial Control</h2>
        <p className="text-secondary">Invoicing and billing management for your projects.</p>
      </div>

      <div
        className="card animate-slide-up"
        style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
      >
        <div
          style={{
            width: 64, height: 64, borderRadius: '16px',
            backgroundColor: 'var(--accent-primary-muted)',
            border: '1px solid var(--accent-primary-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-primary-text)',
            marginBottom: '0.5rem',
          }}
        >
          <FileText size={28} />
        </div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Invoicing Coming Soon
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '360px', lineHeight: 1.6, margin: 0 }}>
          Financial management features are actively being built. Invoice creation, payment tracking, and billing reports will be available in an upcoming update.
        </p>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            marginTop: '0.5rem', padding: '0.4rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}
        >
          <Clock size={14} />
          Under development
        </div>
      </div>
    </div>
  );
}
