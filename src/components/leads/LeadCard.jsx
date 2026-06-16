import React from 'react';
import { Sparkles, ChevronRight, Clock } from 'lucide-react';
import ScoreRing from './ScoreRing';
import InterestBadge from './InterestBadge';
import { tierTone, followMeta, initials } from '../../lib/services/leadService';

// Pipeline lead card. The whole card opens the modal. No call/phone buttons.
export default function LeadCard({ lead, onOpen, onToggleInterest, innerRef, draggableProps, dragHandleProps, isDragging }) {
  const t = tierTone(lead.score);
  const fm = followMeta(lead.followUp);

  return (
    <div
      ref={innerRef}
      onClick={() => onOpen(lead)}
      {...(draggableProps || {})}
      {...(dragHandleProps || {})}
      style={{
        ...(draggableProps?.style || {}),
        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)', padding: 12, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 9,
        boxShadow: isDragging ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        transition: 'box-shadow 0.12s, border-color 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary-border)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
    >
      {/* top: avatar + company + field + ring */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
        <span style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent-primary-muted)', color: 'var(--accent-primary-text)',
          border: '1px solid var(--accent-primary-border)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11.5, fontWeight: 700,
        }}>{initials(lead.company)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{lead.company}</div>
          <div style={{
            fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{lead.field || '—'}</div>
        </div>
        <ScoreRing score={lead.score} size={38} />
      </div>

      {/* badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 999, fontSize: '0.6875rem', fontWeight: 700,
          color: t.color, background: t.bg, border: `1px solid ${t.br}`,
        }}>{t.label}</span>
        <InterestBadge intent={lead.intent} field={lead.field}
          onClick={onToggleInterest ? (e) => { e.stopPropagation(); onToggleInterest(lead); } : undefined} />
      </div>

      {/* AI next step */}
      {lead.nextStep && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <Sparkles size={12} style={{ color: 'var(--accent-primary-text)', flexShrink: 0, marginTop: 2 }} />
          <span style={{
            fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{lead.nextStep}</span>
        </div>
      )}

      {/* footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 1 }}>
        {fm.label ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 999, fontSize: '0.6875rem', fontWeight: 700,
            color: fm.due ? 'var(--alert-error-text)' : 'var(--text-secondary)',
            background: fm.due ? 'var(--alert-error-bg)' : 'var(--bg-tertiary)',
            border: `1px solid ${fm.due ? 'var(--alert-error-border)' : 'var(--border-color)'}`,
          }}><Clock size={10} />{fm.label}</span>
        ) : <span />}
        <ChevronRight size={15} style={{ color: 'var(--text-tertiary)' }} />
      </div>
    </div>
  );
}
