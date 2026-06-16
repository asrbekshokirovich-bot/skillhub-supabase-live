import React from 'react';
import { Boxes, Repeat, HelpCircle } from 'lucide-react';

// Interest badge — Subscribe / Custom build / Mark interest (unmarked).
export default function InterestBadge({ intent, field, onClick, size = 'sm' }) {
  const meta = intent === 'subscribe'
    ? { label: 'Subscribe',    icon: <Repeat size={11} />, color: 'var(--accent-primary-text)', bg: 'var(--accent-primary-muted)', br: 'var(--accent-primary-border)' }
    : intent === 'build'
    ? { label: 'Custom build', icon: <Boxes size={11} />,  color: 'var(--accent-success-text)', bg: 'var(--accent-success-muted)', br: 'var(--accent-success-border)' }
    : { label: 'Mark interest', icon: <HelpCircle size={11} />, color: 'var(--text-tertiary)', bg: 'var(--bg-tertiary)', br: 'var(--border-color)' };

  return (
    <span
      onClick={onClick}
      title={field ? `${meta.label} · ${field}` : meta.label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: size === 'sm' ? '2px 8px' : '3px 10px', borderRadius: 999,
        fontSize: size === 'sm' ? '0.6875rem' : '0.75rem', fontWeight: 700,
        letterSpacing: '0.02em',
        color: meta.color, background: meta.bg, border: `1px solid ${meta.br}`,
        cursor: onClick ? 'pointer' : 'default', whiteSpace: 'nowrap',
      }}
    >
      {meta.icon}{meta.label}
    </span>
  );
}
