import React from 'react';
import { Check } from 'lucide-react';
import { STEPPER_STAGES, STAGE_LABELS } from '../../lib/services/leadService';

// Clickable stage stepper: New → Contacted → In Process → Proposal → Won.
// Completed steps are filled with a check, the current step with a dot.
export default function StageStepper({ stage, onSelect }) {
  const currentIdx = STEPPER_STAGES.indexOf(stage);
  // 'lost' is not on the stepper — treat as nothing completed.
  const activeIdx = currentIdx; // -1 when lost

  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      {STEPPER_STAGES.map((s, i) => {
        const done = activeIdx >= 0 && i < activeIdx;
        const current = i === activeIdx;
        const fill = done || current;
        return (
          <React.Fragment key={s}>
            <button
              onClick={() => onSelect && onSelect(s)}
              title={STAGE_LABELS[s]}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'transparent', border: 'none', cursor: onSelect ? 'pointer' : 'default',
                padding: 0, fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              <span style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: fill ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                border: `2px solid ${fill ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                color: fill ? '#fff' : 'var(--text-tertiary)',
                transition: 'background 0.15s, border-color 0.15s',
              }}>
                {done ? <Check size={13} strokeWidth={3} />
                  : current ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
                  : <span style={{ fontSize: 11, fontWeight: 700 }}>{i + 1}</span>}
              </span>
              <span style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.02em',
                color: current ? 'var(--text-primary)' : 'var(--text-tertiary)', whiteSpace: 'nowrap',
              }}>{STAGE_LABELS[s]}</span>
            </button>
            {i < STEPPER_STAGES.length - 1 && (
              <span style={{
                flex: 1, height: 2, margin: '0 6px', marginBottom: 20,
                background: (activeIdx > i) ? 'var(--accent-primary)' : 'var(--border-color)',
                transition: 'background 0.15s',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
