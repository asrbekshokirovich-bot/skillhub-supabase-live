import React, { useState, useEffect, useRef } from 'react';
import {
  X, Send, FolderPlus, Boxes, Repeat, Sparkles, Building2, User, Wallet,
  UserCircle, Clock, Plus, Loader2,
} from 'lucide-react';
import ScoreRing from './ScoreRing';
import StageStepper from './StageStepper';
import { leadService, tierTone, fmtMoneyFull, followMeta, initials } from '../../lib/services/leadService';

const SIGNAL_LABELS = ['Intent', 'Engagement', 'Budget fit', 'Timeline'];

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export default function LeadModal({ lead, ownerName, onClose, onStage, onIntent, onConvert, onLog }) {
  const [activities, setActivities] = useState([]);
  const [loadingAct, setLoadingAct] = useState(true);
  const [note, setNote] = useState('');
  const [posting, setPosting] = useState(false);
  const [converting, setConverting] = useState(false);
  const composerRef = useRef(null);

  const t = tierTone(lead.score);
  const fm = followMeta(lead.followUp);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingAct(true);
      try {
        const rows = await leadService.listActivities(lead.id);
        if (!cancelled) setActivities(rows);
      } catch { if (!cancelled) setActivities([]); }
      finally { if (!cancelled) setLoadingAct(false); }
    })();
    return () => { cancelled = true; };
  }, [lead.id]);

  // Synthesised base timeline (created → re-scored) merged with real notes.
  const baseTimeline = [
    { kind: 'created', label: 'Lead created', at: lead.createdAt },
    { kind: 'scored', label: `AI scored this lead ${lead.score} (${t.label})`, at: lead.createdAt },
  ];

  const handleTelegram = () => {
    const handle = (lead.telegram || '').replace(/^@/, '');
    if (handle) window.open(`https://t.me/${handle}`, '_blank', 'noopener');
  };

  const handleConvert = async () => {
    setConverting(true);
    try { await onConvert(lead); } finally { setConverting(false); }
  };

  const submitNote = async () => {
    const body = note.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      const created = await onLog(lead.id, body);
      if (created) setActivities(a => [...a, created]);
      setNote('');
    } finally { setPosting(false); }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(8,7,6,0.62)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 16,
      }}
    >
      <div
        className="animate-slide-up"
        style={{
          background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          width: '100%', maxWidth: 920, maxHeight: '90vh', overflow: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 14, padding: '18px 22px',
          borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0,
          background: 'var(--bg-primary)', zIndex: 2,
        }}>
          <span style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: 'var(--accent-primary-muted)', color: 'var(--accent-primary-text)',
            border: '1px solid var(--accent-primary-border)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700,
          }}>{initials(lead.company)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{lead.company}</h3>
            <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 3 }}>
              {[lead.contact, lead.source, lead.field].filter(Boolean).join(' · ')}
            </div>
          </div>
          <ScoreRing score={lead.score} size={48} />
          <button onClick={onClose} aria-label="Close" style={iconBtn}>
            <X size={18} />
          </button>
        </div>

        {/* Stepper + actions */}
        <div style={{ padding: '20px 22px 14px', borderBottom: '1px solid var(--border-color)' }}>
          <StageStepper stage={lead.stage} onSelect={(s) => onStage(lead.id, s)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <button onClick={handleTelegram} disabled={!lead.telegram}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: lead.telegram ? 1 : 0.5 }}>
              <Send size={14} />Message on Telegram
            </button>
            <button onClick={handleConvert} disabled={converting || lead.stage === 'won'}
              className="btn"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--accent-primary)', color: '#fff', fontWeight: 600,
                opacity: lead.stage === 'won' ? 0.5 : 1,
              }}>
              {converting ? <Loader2 size={14} className="animate-spin" /> : <FolderPlus size={14} />}
              {lead.stage === 'won' ? 'Converted' : 'Convert to project'}
            </button>
          </div>
        </div>

        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 0 }} className="lead-modal-grid">
          {/* LEFT */}
          <div style={{ padding: '18px 22px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Client interest marker */}
            <div>
              <Overline>Client interest <span style={{ color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>· set by the call operator</span></Overline>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <InterestToggle active={lead.intent === 'build'} icon={<Boxes size={14} />} label="Build custom"
                  onClick={() => onIntent(lead.id, 'build')} />
                <InterestToggle active={lead.intent === 'subscribe'} icon={<Repeat size={14} />} label="Subscribe to SaaS"
                  onClick={() => onIntent(lead.id, 'subscribe')} />
              </div>
              {lead.field && (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
                  Field / industry: <strong style={{ color: 'var(--text-secondary)' }}>{lead.field}</strong>
                </div>
              )}
            </div>

            {/* Contact grid — Telegram only, no email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ContactCell icon={<User size={13} />} label="Contact" value={lead.contact || '—'} />
              <ContactCell icon={<Send size={13} />} label="Telegram" value={lead.telegram || '—'}
                onClick={lead.telegram ? handleTelegram : undefined} />
              <ContactCell icon={<Wallet size={13} />} label="Est. value" value={fmtMoneyFull(lead.value)} mono />
              <ContactCell icon={<UserCircle size={13} />} label="Owner" value={ownerName || 'Unassigned'} />
            </div>

            {/* AI analysis */}
            <div style={{
              background: 'var(--accent-primary-muted)', border: '1px solid var(--accent-primary-border)',
              borderRadius: 'var(--radius-md)', padding: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Sparkles size={14} style={{ color: 'var(--accent-primary-text)' }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent-primary-text)' }}>Skillhub AI analysis</span>
              </div>
              {lead.summary && (
                <p style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>{lead.summary}</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SIGNAL_LABELS.map((label, i) => {
                  const v = Math.max(0, Math.min(100, Number(lead.signals?.[i]) || 0));
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 78, fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}>{label}</span>
                      <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                        <div style={{ width: `${v}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: 999, transition: 'width 0.4s' }} />
                      </div>
                      <span style={{ width: 26, textAlign: 'right', fontSize: 11, fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700, color: 'var(--text-secondary)' }}>{v}</span>
                    </div>
                  );
                })}
              </div>
              {lead.nextStep && (
                <div style={{
                  marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--accent-primary-border)',
                  fontSize: 12.5, color: 'var(--text-primary)', display: 'flex', gap: 6,
                }}>
                  <Sparkles size={13} style={{ color: 'var(--accent-primary-text)', flexShrink: 0, marginTop: 2 }} />
                  <span><strong>Suggested next step:</strong> {lead.nextStep}</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — activity */}
          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Overline>Activity</Overline>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {baseTimeline.map((ev, i) => (
                <TimelineRow key={'b' + i} label={ev.label} at={fmtTime(ev.at)} accent={ev.kind === 'scored'} />
              ))}
              {loadingAct ? (
                <div style={{ padding: '8px 0' }}><Loader2 size={14} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
              ) : activities.map(a => (
                <TimelineRow key={a.id} label={a.body} at={fmtTime(a.createdAt)} />
              ))}
              {fm.label && <TimelineRow label={`Next follow-up: ${fm.label}`} at="" pending due={fm.due} />}
            </div>

            {/* Composer */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                ref={composerRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitNote(); }}
                placeholder="Log a call note, next step, or update…"
                rows={2}
                style={{
                  width: '100%', resize: 'vertical', minHeight: 56,
                  border: '1px solid var(--border-color)', background: 'var(--bg-primary)',
                  color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', padding: '8px 10px',
                  fontFamily: 'inherit', fontSize: 13, outline: 'none',
                }}
              />
              <button onClick={submitNote} disabled={!note.trim() || posting}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: note.trim() ? 1 : 0.6 }}>
                {posting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}Log activity
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── bits ──
const iconBtn = {
  width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
  background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

const Overline = ({ children }) => (
  <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{children}</div>
);

function InterestToggle({ active, icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '9px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 12.5, fontWeight: 600,
      background: active ? 'var(--accent-primary)' : 'var(--bg-secondary)',
      color: active ? '#fff' : 'var(--text-secondary)',
      border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-color)'}`,
      transition: 'background 0.12s',
    }}>{icon}{label}</button>
  );
}

function ContactCell({ icon, label, value, mono, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)', padding: '9px 11px', cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-tertiary)', marginBottom: 3 }}>
        {icon}<span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{
        fontSize: 13, fontWeight: 600, color: onClick ? 'var(--accent-primary-text)' : 'var(--text-primary)',
        fontFamily: mono ? 'ui-monospace, Menlo, monospace' : 'inherit',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</div>
    </div>
  );
}

function TimelineRow({ label, at, accent, pending, due }) {
  return (
    <div style={{ display: 'flex', gap: 10, paddingBottom: 14, position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%', marginTop: 3,
          background: pending ? 'transparent' : accent ? 'var(--accent-primary)' : 'var(--text-tertiary)',
          border: pending ? `2px dashed ${due ? 'var(--alert-error-text)' : 'var(--text-tertiary)'}` : 'none',
        }} />
        <span style={{ flex: 1, width: 2, background: 'var(--border-color)', marginTop: 2 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: pending && due ? 'var(--alert-error-text)' : 'var(--text-secondary)', lineHeight: 1.45 }}>{label}</div>
        {at && <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 2 }}>{at}</div>}
      </div>
    </div>
  );
}
