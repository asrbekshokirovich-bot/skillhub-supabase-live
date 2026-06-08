import React, { useRef, useState } from 'react';
import { Mic, Play, Pause } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────
// voiceUi — shared PRESENTATIONAL primitives for the Voice Reports redesign.
// Pure visuals built on the SkillHub CSS variables (src/index.css) + lucide.
// No business logic lives here. Matches voice/VoiceReports.reference.jsx.
// ─────────────────────────────────────────────────────────────────────────

export const MONO = 'ui-monospace, Menlo, monospace';
// Deliberate dark glyph/text color for foreground ON the salmon accent
// (the one fixed constant the reference uses — there is no token for it).
export const ON_ACCENT = '#1A1815';

// ── one-time keyframes (pulse / waveform / shimmer) + reduced-motion ──
const VR_CSS = `
@keyframes vrPulse { 0%{transform:scale(1);opacity:.5} 70%{transform:scale(1.8);opacity:0} 100%{opacity:0} }
@keyframes vrBar { 0%,100%{transform:scaleY(.25)} 50%{transform:scaleY(1)} }
@keyframes vrShim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
/* Decorative animated layers must never intercept clicks — the idle mic pulse
   ring is absolutely positioned over the record button and would eat the tap. */
.vr-pulse, .vr-bar, .vr-shim { pointer-events: none; }
@media (prefers-reduced-motion: reduce) {
  .vr-pulse, .vr-bar, .vr-shim { animation: none !important; }
}
`;
export const VoiceKeyframes = () => <style dangerouslySetInnerHTML={{ __html: VR_CSS }} />;

// ── page header ──
export const VoiceHeader = ({ title, subtitle }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Mic size={20} style={{ color: 'var(--accent-primary)' }} />
      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>{title}</h2>
    </div>
    <p style={{ margin: '8px 0 0 0', fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{subtitle}</p>
  </div>
);

// ── recorder surface ──
export const RecorderCard = ({ children, minHeight = 300 }) => (
  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, minHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
    {children}
  </div>
);

// ── animated waveform ──
const WAVE = [.4,.7,.45,.9,.6,1,.5,.75,.35,.85,.55,.95,.4,.7,.5,.8,.45,.65,.9,.5,.7,.4,.85,.6,.5,.75,.4,.9,.55,.7];
export const Waveform = ({ active = true }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 44 }}>
    {WAVE.map((h, i) => (
      <span key={i} className="vr-bar" style={{
        width: 3, height: `${h * 100}%`, borderRadius: 2, background: 'var(--accent-primary)', transformOrigin: 'center',
        animation: active ? `vrBar ${0.7 + (i % 5) * 0.12}s ease-in-out infinite` : 'none',
        opacity: active ? 1 : 0.35,
      }} />
    ))}
  </div>
);

const fmtClock = (s) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
};

// ── custom audio bar: wraps a REAL hidden <audio>, no native chrome ──
export function AudioBar({ src, knownDur = 0 }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  const effDur = (isFinite(dur) && dur > 0) ? dur : (knownDur || 0);
  const progress = effDur ? Math.min(100, (cur / effDur) * 100) : 0;

  const toggle = () => { const a = ref.current; if (!a) return; if (a.paused) a.play().catch(() => {}); else a.pause(); };
  const seek = (e) => {
    const a = ref.current; if (!a || !effDur) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = Math.min(effDur, Math.max(0, ((e.clientX - r.left) / r.width) * effDur));
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, width: '100%' }}>
      <audio ref={ref} src={src} preload="metadata" style={{ display: 'none' }}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
        onTimeUpdate={() => setCur(ref.current?.currentTime || 0)}
        onLoadedMetadata={() => setDur(ref.current?.duration || 0)} />
      <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-primary)', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
        {playing ? <Pause size={14} fill={ON_ACCENT} stroke={ON_ACCENT} /> : <Play size={14} fill={ON_ACCENT} stroke={ON_ACCENT} />}
      </button>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: MONO, minWidth: 34 }}>{fmtClock(cur)}</span>
      <div onClick={seek} style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--bg-tertiary)', position: 'relative', cursor: 'pointer' }}>
        <div style={{ width: `${progress}%`, height: '100%', borderRadius: 99, background: 'var(--accent-primary)' }} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: MONO, minWidth: 34 }}>{fmtClock(effDur)}</span>
    </div>
  );
}

// ── one labelled section (read-only paragraph OR editable textarea) ──
export const TONES = {
  success: 'var(--accent-success-text)',
  danger: 'var(--alert-error-text)',
  accent: 'var(--accent-primary-text)',
};
export const SectionBlock = ({ icon, label, tone, children, editable, value, onChange, rows = 3 }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      {icon}
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: TONES[tone] }}>{label}</span>
    </div>
    {editable ? (
      <textarea value={value} onChange={onChange} rows={rows}
        style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
    ) : (
      <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
        {(children == null || (typeof children === 'string' && children.trim() === '')) ? '—' : children}
      </div>
    )}
  </div>
);

// ── status badge ──
export const StatusBadge = ({ status }) => {
  const map = {
    approved: { label: 'Tasdiqlangan', c: 'var(--accent-success-text)', bg: 'var(--accent-success-muted)', br: 'var(--accent-success-border)' },
    pending: { label: "Ko'rib chiqilmoqda", c: 'var(--accent-warning-text)', bg: 'var(--accent-warning-muted)', br: 'var(--accent-warning-text)' },
    draft: { label: 'Qoralama', c: 'var(--text-secondary)', bg: 'var(--bg-tertiary)', br: 'var(--border-color)' },
  }[status] || { label: status, c: 'var(--text-secondary)', bg: 'var(--bg-tertiary)', br: 'var(--border-color)' };
  return (
    <span style={{ padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: map.c, background: map.bg, border: `1px solid ${map.br}` }}>
      {map.label}
    </span>
  );
};

// ── shared button ──
export function Btn({ kind = 'secondary', children, onClick, disabled = false, type = 'button' }) {
  const k = {
    primary: { bg: 'var(--accent-primary)', fg: ON_ACCENT, br: 'var(--accent-primary)' },
    secondary: { bg: 'var(--bg-tertiary)', fg: 'var(--text-primary)', br: 'var(--border-color)' },
    ghost: { bg: 'transparent', fg: 'var(--text-secondary)', br: 'transparent' },
  }[kind];
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      height: 36, padding: '0 14px', borderRadius: 8, background: k.bg, color: k.fg,
      border: `1px solid ${k.br}`, fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
    }}>{children}</button>
  );
}
