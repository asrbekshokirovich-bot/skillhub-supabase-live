import React from 'react';
import { tierTone } from '../../lib/services/leadService';

// AI score ring — r=18, circumference 2πr; offset = C·(1 − score/100).
export default function ScoreRing({ score = 0, size = 44, stroke = 4 }) {
  const r = 18;
  const C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = C * (1 - pct / 100);
  const color = tierTone(score).ring;
  const box = 44; // viewBox the geometry is drawn in

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${box} ${box}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="var(--border-color)" strokeWidth={stroke} />
        <circle
          cx={box / 2} cy={box / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700,
        fontSize: size <= 36 ? 11 : 13, color: 'var(--text-primary)',
      }}>{pct}</span>
    </div>
  );
}
