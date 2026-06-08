// ─────────────────────────────────────────────────────────────────────────
// VoiceReports — REFERENCE IMPLEMENTATION (presentational).
//
// This file is the DESIGN, written as real React. It renders every Voice
// Reports state exactly as the approved screenshots. It uses the SkillHub
// CSS variables already in src/index.css (no hard-coded hex), and lucide-react
// (already a dependency).
//
// HOW TO USE (for Claude Code):
//   • This is the visual target. Keep ALL existing recording / Gemini
//     transcription / Supabase logic and handlers in the live VoiceReports
//     page. Replace ONLY the rendered markup + styles so each live state
//     matches the matching component below.
//   • State → component map:
//       idle (no recording)            → <RecorderIdle/>
//       recording in progress          → <RecorderRecording seconds=…/>
//       recorded, before AI            → <RecorderPreview/>
//       calling Gemini                 → <AiProcessing/>
//       AI returned the 3 sections     → <ReviewEdit .../>
//       worker's own past reports      → <HistoryList/>
//       CEO/PM feed of all workers     → <TeamReports/>
//   • Wire the buttons to the existing handlers (start/stop/re-record/send/
//     confirm/ask-AI). Do not change behavior.
// ─────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  Mic, Square, Play, RotateCcw, Send, Check, AlertTriangle,
  Sparkles, ListChecks, Calendar, ChevronRight, ChevronDown, Loader2,
} from 'lucide-react';

// ── one-time keyframes (pulse / waveform / shimmer) ──
const VR_CSS = `
@keyframes vrPulse { 0%{transform:scale(1);opacity:.5} 70%{transform:scale(1.8);opacity:0} 100%{opacity:0} }
@keyframes vrBar { 0%,100%{transform:scaleY(.25)} 50%{transform:scaleY(1)} }
@keyframes vrShim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
`;
const Style = () => <style dangerouslySetInnerHTML={{ __html: VR_CSS }} />;

// ── shared page header ──
export const VoiceHeader = ({ title, subtitle }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Mic size={20} style={{ color: 'var(--accent-primary)' }} />
      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>{title}</h2>
    </div>
    <p style={{ margin: '8px 0 0 0', fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{subtitle}</p>
  </div>
);

const RecorderCard = ({ children, minHeight = 300 }) => (
  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, minHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
    {children}
  </div>
);

// ── waveform (animated while recording) ──
const Waveform = ({ active }) => {
  const bars = [.4,.7,.45,.9,.6,1,.5,.75,.35,.85,.55,.95,.4,.7,.5,.8,.45,.65,.9,.5,.7,.4,.85,.6,.5,.75,.4,.9,.55,.7];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 44 }}>
      {bars.map((h, i) => (
        <span key={i} style={{
          width: 3, height: `${h * 100}%`, borderRadius: 2, background: 'var(--accent-primary)',
          transformOrigin: 'center',
          animation: active ? `vrBar ${0.7 + (i % 5) * 0.12}s ease-in-out infinite` : 'none',
          opacity: active ? 1 : 0.35,
        }} />
      ))}
    </div>
  );
};

// ── custom audio bar (wrap the real <audio> ref behind this look) ──
export const AudioBar = ({ pos = '0:00', dur = '0:00', progress = 0, onPlay }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, width: '100%' }}>
    <button onClick={onPlay} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-primary)', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
      <Play size={14} fill="#1A1815" stroke="#1A1815" />
    </button>
    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'ui-monospace, Menlo, monospace', minWidth: 34 }}>{pos}</span>
    <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--bg-tertiary)', position: 'relative' }}>
      <div style={{ width: `${progress}%`, height: '100%', borderRadius: 99, background: 'var(--accent-primary)' }} />
    </div>
    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'ui-monospace, Menlo, monospace', minWidth: 34 }}>{dur}</span>
  </div>
);

// ── one labelled section (Kecha / To'siqlar / Bugun) ──
const TONES = {
  success: 'var(--accent-success-text)',
  danger:  'var(--alert-error-text)',
  accent:  'var(--accent-primary-text)',
};
const SectionBlock = ({ icon, label, tone, children, editable, value, onChange }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      {icon}
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: TONES[tone] }}>{label}</span>
    </div>
    {editable ? (
      <textarea
        value={value}
        onChange={onChange}
        rows={3}
        style={{
          width: '100%', padding: '12px 14px', background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)', borderRadius: 10,
          fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-primary)',
          fontFamily: 'inherit', outline: 'none', resize: 'vertical',
        }}
      />
    ) : (
      <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-secondary)' }}>{children}</div>
    )}
  </div>
);

// ═══════════════════════════ WORKER STATES ═══════════════════════════

export const RecorderIdle = ({ onStart, compact }) => (
  <RecorderCard minHeight={compact ? 220 : 300}>
    <Style />
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 14 : 18 }}>
      <div style={{ position: 'relative', width: compact ? 72 : 88, height: compact ? 72 : 88, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!compact && <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--accent-primary)', animation: 'vrPulse 2.4s ease-out infinite' }} />}
        <button onClick={onStart} style={{ width: compact ? 72 : 88, height: compact ? 72 : 88, borderRadius: '50%', background: 'var(--accent-primary-muted)', border: '1px solid var(--accent-primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Mic size={compact ? 28 : 34} style={{ color: 'var(--accent-primary)' }} />
        </button>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: compact ? 15 : 16, fontWeight: 600, color: 'var(--text-primary)' }}>Bugungi hisobotni ovozli ayting</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 6 }}>Kecha nima qildingiz? To'siqlar? Bugun nima qilasiz?</div>
        {!compact && (
          <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>
            <Sparkles size={11} style={{ color: 'var(--accent-primary-text)' }} /> AI avtomatik bo'limlarga ajratadi · 3–5 daqiqa
          </div>
        )}
      </div>
    </div>
  </RecorderCard>
);

export const RecorderRecording = ({ seconds = 0, onStop }) => {
  const mm = String(Math.floor(seconds / 60)).padStart(1, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return (
    <RecorderCard>
      <Style />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%' }}>
        <Waveform active />
        <div style={{ fontSize: 34, fontWeight: 700, fontFamily: 'ui-monospace, Menlo, monospace', color: 'var(--text-primary)', letterSpacing: 1 }}>{mm}:{ss}</div>
        <button onClick={onStop} style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--alert-error-bg)', border: '1px solid var(--alert-error-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Square size={26} fill="var(--alert-error-text)" stroke="var(--alert-error-text)" />
        </button>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-tertiary)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--alert-error-text)' }} />
          Yozilmoqda… tugatganda to'xtatish tugmasini bosing
        </div>
      </div>
    </RecorderCard>
  );
};

export const RecorderPreview = ({ dur = '0:00', onRedo, onSend }) => (
  <RecorderCard>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%', maxWidth: 460 }}>
      <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', fontWeight: 600 }}>Yozib olindi · <span style={{ color: 'var(--text-secondary)', fontFamily: 'ui-monospace, Menlo, monospace' }}>{dur}</span></div>
      <AudioBar dur={dur} />
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn kind="secondary" onClick={onRedo}><RotateCcw size={13} /> Qayta yozish</Btn>
        <Btn kind="primary" onClick={onSend}>Yuborish <Send size={13} /></Btn>
      </div>
    </div>
  </RecorderCard>
);

export const AiProcessing = () => (
  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
    <Style />
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
      <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>AI hisobotni tahlil qilmoqda…</span>
      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Kecha / To'siqlar / Bugun bo'limlariga ajratilmoqda</span>
    </div>
    {['Kecha bajarilgan', "To'siqlar", 'Bugun rejalashtirilgan'].map((l, i) => (
      <div key={l} style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>{l}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {['100%', '92%', i === 1 ? '60%' : '78%'].map((w, j) => (
            <div key={j} style={{ height: 12, width: w, borderRadius: 4, background: 'linear-gradient(90deg, var(--bg-secondary) 0%, var(--bg-tertiary) 50%, var(--bg-secondary) 100%)', backgroundSize: '200% 100%', animation: 'vrShim 1.4s linear infinite' }} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const ReviewEdit = ({ kecha, tosiq, bugun, setKecha, setTosiq, setBugun, dur = '0:00', onCancel, onConfirm }) => (
  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
      <Sparkles size={15} style={{ color: 'var(--accent-primary-text)' }} />
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Tekshiring va kerak bo'lsa tahrirlang</span>
    </div>
    <SectionBlock editable tone="success" value={kecha} onChange={e => setKecha?.(e.target.value)}
      icon={<Check size={12} style={{ color: 'var(--accent-success-text)' }} />} label="Kecha bajarilgan" />
    <SectionBlock editable tone="danger" value={tosiq} onChange={e => setTosiq?.(e.target.value)}
      icon={<AlertTriangle size={12} style={{ color: 'var(--alert-error-text)' }} />} label="To'siqlar" />
    <SectionBlock editable tone="accent" value={bugun} onChange={e => setBugun?.(e.target.value)}
      icon={<ListChecks size={12} style={{ color: 'var(--accent-primary-text)' }} />} label="Bugun rejalashtirilgan" />

    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, margin: '6px 0 14px', cursor: 'pointer' }}>
      <ChevronRight size={11} /> To'liq transkript (ixtiyoriy tahrir)
    </div>

    <AudioBar dur={dur} />

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
      <Btn kind="ghost" onClick={onCancel}>Bekor qilish</Btn>
      <Btn kind="primary" onClick={onConfirm}><Check size={14} stroke="#1A1815" /> Tasdiqlash va yuborish</Btn>
    </div>
  </div>
);

// worker's own past reports
const KECHA = "SkillHub IT US veb-saytining UI'ni yangiladim, ikki xil — oq va qora fondagi ko'zga yoqimli va tushunarli tartibda.";
const TOSIQ = "Loyiha menejeriga to'lov qilish uchun ikki marta kutilgan vaqt tufayli bir soatdan ortiq vaqtim bekor ketdi.";
const BUGUN = "SkillHub IT US UI dizaynini davom ettiraman, har bir tugmani sinovdan o'tkazaman.";

export const HistoryList = ({ reports }) => (
  <>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '24px 0 12px' }}>
      Oldingi hisobotlarim
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(reports || [{ date: 'Jun 7, 2026', status: 'approved' }, { date: 'Jun 5, 2026', status: 'pending' }]).map((r, i) => (
        <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
              <Calendar size={13} style={{ color: 'var(--text-tertiary)' }} />{r.date}
            </span>
            <StatusBadge status={r.status} />
          </div>
          <SectionBlock tone="success" icon={<ListChecks size={12} style={{ color: 'var(--accent-success-text)' }} />} label="Kecha">{r.kecha || KECHA}</SectionBlock>
          <SectionBlock tone="danger" icon={<AlertTriangle size={12} style={{ color: 'var(--alert-error-text)' }} />} label="To'siqlar">{r.tosiq || TOSIQ}</SectionBlock>
          <SectionBlock tone="accent" icon={<ListChecks size={12} style={{ color: 'var(--accent-primary-text)' }} />} label="Bugun">{r.bugun || BUGUN}</SectionBlock>
        </div>
      ))}
    </div>
  </>
);

const StatusBadge = ({ status }) => {
  const map = {
    approved: { label: 'Tasdiqlangan', c: 'var(--accent-success-text)', bg: 'var(--accent-success-muted)', br: 'var(--accent-success-border)' },
    pending:  { label: "Ko'rib chiqilmoqda", c: 'var(--accent-warning-text)', bg: 'var(--accent-warning-muted)', br: 'var(--accent-warning-text)' },
  }[status] || { label: status, c: 'var(--text-secondary)', bg: 'var(--bg-tertiary)', br: 'var(--border-color)' };
  return (
    <span style={{ padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: map.c, background: map.bg, border: `1px solid ${map.br}` }}>
      {map.label}
    </span>
  );
};

// ═══════════════════════════ CEO / PM FEED ═══════════════════════════

export const TeamReports = ({ reports }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    {(reports || [{ name: 'worker', date: 'Jun 7, 2026', status: 'approved' }]).map((r, i) => (
      <TeamReportCard key={i} report={r} />
    ))}
  </div>
);

const TeamReportCard = ({ report }) => {
  const [q, setQ] = useState('');
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-success-muted)', color: 'var(--accent-success-text)', border: '1px solid var(--accent-success-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, textTransform: 'uppercase' }}>
          {(report.name || '?').charAt(0)}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{report.name}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
            <Calendar size={12} />{report.date}
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}><StatusBadge status={report.status || 'approved'} /></div>
      </div>

      <SectionBlock tone="success" icon={<ListChecks size={12} style={{ color: 'var(--accent-success-text)' }} />} label="Kecha bajarilgan">{report.kecha || KECHA}</SectionBlock>
      <SectionBlock tone="danger" icon={<AlertTriangle size={12} style={{ color: 'var(--alert-error-text)' }} />} label="To'siqlar">{report.tosiq || TOSIQ}</SectionBlock>
      <SectionBlock tone="accent" icon={<ListChecks size={12} style={{ color: 'var(--accent-primary-text)' }} />} label="Bugun">{report.bugun || BUGUN}</SectionBlock>

      <div style={{ margin: '14px 0' }}>
        <AudioBar dur="3:26" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, marginTop: 10, cursor: 'pointer' }}>
          <ChevronDown size={11} /> To'liq transkript
        </div>
      </div>

      {/* AI Q&A */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Sparkles size={13} style={{ color: 'var(--accent-primary-text)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-primary-text)' }}>Hisobot bo'yicha AI savol-javob</span>
        </div>
        {(report.qa || [{ q: 'Nega bir soat bekor ketdi?', a: "Hisobotga ko'ra, to'lovda ikki marta kutish va Wi-Fi beqarorligi sabab bo'lgan." }]).map((x, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: 'var(--accent-primary-muted)', color: 'var(--accent-primary-text)', border: '1px solid var(--accent-primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>D</div>
              <div style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 10, borderTopLeftRadius: 3, fontSize: 13, color: 'var(--text-primary)' }}>{x.q}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: 'var(--accent-primary-muted)', border: '1px solid var(--accent-primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={12} style={{ color: 'var(--accent-primary-text)' }} />
              </div>
              <div style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, borderTopLeftRadius: 3, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{x.a}</div>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px 8px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 12 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Bu hisobot bo'yicha savol bering…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', padding: 0 }} />
          <button style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-primary)', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Send size={13} stroke="#1A1815" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── shared button ──
function Btn({ kind = 'secondary', children, onClick }) {
  const k = {
    primary:   { bg: 'var(--accent-primary)', fg: '#1A1815', br: 'var(--accent-primary)' },
    secondary: { bg: 'var(--bg-tertiary)', fg: 'var(--text-primary)', br: 'var(--border-color)' },
    ghost:     { bg: 'transparent', fg: 'var(--text-secondary)', br: 'transparent' },
  }[kind];
  return (
    <button onClick={onClick} style={{
      height: 36, padding: '0 14px', borderRadius: 8, background: k.bg, color: k.fg,
      border: `1px solid ${k.br}`, fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
      display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
    }}>{children}</button>
  );
}
