import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Check, AlertTriangle, ListChecks, ChevronRight, ChevronDown,
  Calendar, Loader2, Send, RotateCcw,
} from 'lucide-react';
import VoiceRecorder from '../components/VoiceRecorder';
import {
  VoiceKeyframes, VoiceHeader, AudioBar, SectionBlock, StatusBadge, Btn, ON_ACCENT,
} from '../components/voiceUi';
import { useSystem } from '../components/SystemUI';
import { supabase } from '../lib/supabase';
import { voiceReportService } from '../lib/services/voiceReportService';
import { voiceAiService } from '../lib/services/voiceAiService';

// blob -> base64 (strip the data: URL prefix) for Gemini inlineData
const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onloadend = () => resolve(String(r.result).split(',')[1]);
  r.onerror = reject;
  r.readAsDataURL(blob);
});

// Business day in Asia/Tashkent (UTC+5, no DST). The DB default is CURRENT_DATE
// in UTC, which rolls over at 05:00 local and mislabels early-morning standups.
const tashkentToday = () =>
  new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const fmtDate = (r) => {
  const d = r?.reportDate || r?.createdAt;
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return String(d).slice(0, 10); }
};

const ICONS = {
  kecha: <ListChecks size={12} style={{ color: 'var(--accent-success-text)' }} />,
  tosiq: <AlertTriangle size={12} style={{ color: 'var(--alert-error-text)' }} />,
  bugun: <ListChecks size={12} style={{ color: 'var(--accent-primary-text)' }} />,
};

// ── AI processing (shimmer) ──
function AiProcessing() {
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
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
              <div key={j} className="vr-shim" style={{ height: 12, width: w, borderRadius: 4, background: 'linear-gradient(90deg, var(--bg-secondary) 0%, var(--bg-tertiary) 50%, var(--bg-secondary) 100%)', backgroundSize: '200% 100%', animation: 'vrShim 1.4s linear infinite' }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════ WORKER ═══════════════════════════

function WorkerView({ currentUser }) {
  const { toast } = useSystem();
  const [stage, setStage] = useState('record');   // record | processing | review | failed
  const [draft, setDraft] = useState(null);
  const [edits, setEdits] = useState({ yesterday: '', blockers: '', today: '', transcript: '' });
  const [clarify, setClarify] = useState([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [myReports, setMyReports] = useState([]);
  const [saving, setSaving] = useState(false);
  // Hold the last recording so a failed AI/upload step can be retried WITHOUT
  // forcing the worker to record again.
  const [lastRec, setLastRec] = useState(null);   // { blob, durationSec, mimeType }
  const [errMsg, setErrMsg] = useState('');

  const loadMine = useCallback(async () => {
    try { setMyReports(await voiceReportService.getMyReports(currentUser.id)); }
    catch (e) { console.warn('load my reports', e); }
  }, [currentUser.id]);

  useEffect(() => { loadMine(); }, [loadMine]);

  // Transcribe with the AI FIRST; only upload the audio once that succeeds, so a
  // failed AI step never leaves an orphan file in storage. On any failure we keep
  // the recording and move to a retryable 'failed' state.
  const handleSubmit = async (blob, durationSec, mimeType) => {
    setLastRec({ blob, durationSec, mimeType });
    setErrMsg('');
    setStage('processing');
    try {
      const audioBase64 = await blobToBase64(blob);
      const context = await voiceReportService.getWorkerContext(currentUser.id);
      const ai = await voiceAiService.transcribeAndStructure({ audioBase64, mimeType, context });

      // AI succeeded — now persist the audio + the draft row.
      const audioUrl = await voiceReportService.uploadAudio(currentUser.id, blob, mimeType);
      const created = await voiceReportService.createDraft({
        workerId: currentUser.id,
        projectId: context.projects?.[0]?.id || null,
        audioUrl,
        durationSec,
        reportDate: tashkentToday(),
        transcript: ai.transcript,
        yesterday: ai.yesterday,
        blockers: ai.blockers,
        today: ai.today,
        clarifyingQuestions: ai.clarifyingQuestions,
      });
      setDraft(created);
      setEdits({ yesterday: ai.yesterday, blockers: ai.blockers, today: ai.today, transcript: ai.transcript });
      setClarify(ai.clarifyingQuestions || []);
      setShowTranscript(false);
      setStage('review');
    } catch (e) {
      console.error(e);
      const msg = e?.message || String(e);
      setErrMsg(msg);
      toast.error(`Xatolik: ${msg}`);
      setStage('failed');
    }
  };

  const retryLast = () => {
    if (lastRec) handleSubmit(lastRec.blob, lastRec.durationSec, lastRec.mimeType);
  };

  const discardLast = () => {
    setLastRec(null);
    setErrMsg('');
    setStage('record');
  };

  const handleApprove = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await voiceReportService.approve(draft.id, {
        yesterday: edits.yesterday, blockers: edits.blockers, today: edits.today, transcript: edits.transcript,
      });
      toast.success('Hisobot tasdiqlandi va menejerga yuborildi.');
      setDraft(null);
      setStage('record');
      loadMine();
    } catch (e) {
      toast.error(`Tasdiqlashda xatolik: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <VoiceHeader title="Ovozli hisobot" subtitle="Gapiring — tizim avtomatik tarzda Kecha / To'siqlar / Bugun bo'limlariga ajratadi. Siz tekshirib tasdiqlaysiz." />

      {stage === 'record' && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <VoiceRecorder onSubmit={handleSubmit} />
        </div>
      )}

      {stage === 'processing' && <AiProcessing />}

      {stage === 'failed' && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--alert-error-border)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <AlertTriangle size={18} style={{ color: 'var(--alert-error-text)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Tahlil qilishda xatolik</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
            Ovoz yozuvingiz saqlanib qoldi — qayta urinib ko'rishingiz mumkin.
          </div>
          {errMsg && (
            <div style={{ fontSize: 12.5, color: 'var(--alert-error-text)', background: 'var(--alert-error-bg)', border: '1px solid var(--alert-error-border)', borderRadius: 10, padding: '8px 12px', marginBottom: 16 }}>
              {errMsg}
            </div>
          )}
          {lastRec?.blob && <AudioBar src={URL.createObjectURL(lastRec.blob)} knownDur={lastRec.durationSec || 0} />}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
            <Btn kind="ghost" onClick={discardLast}>Bekor qilish</Btn>
            <Btn kind="primary" onClick={retryLast}><RotateCcw size={14} stroke={ON_ACCENT} /> Qayta urinish</Btn>
          </div>
        </div>
      )}

      {stage === 'review' && draft && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Sparkles size={15} style={{ color: 'var(--accent-primary-text)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Tekshiring va kerak bo'lsa tahrirlang</span>
          </div>

          {clarify.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', marginBottom: 16, background: 'var(--accent-primary-muted)', border: '1px solid var(--accent-primary-border)', borderRadius: 10, fontSize: 12.5, color: 'var(--accent-primary-text)' }}>
              {clarify.map((q, i) => <div key={i}>• {q}</div>)}
            </div>
          )}

          <SectionBlock editable tone="success" value={edits.yesterday} onChange={(e) => setEdits((s) => ({ ...s, yesterday: e.target.value }))}
            icon={<Check size={12} style={{ color: 'var(--accent-success-text)' }} />} label="Kecha bajarilgan" />
          <SectionBlock editable tone="danger" value={edits.blockers} onChange={(e) => setEdits((s) => ({ ...s, blockers: e.target.value }))}
            icon={<AlertTriangle size={12} style={{ color: 'var(--alert-error-text)' }} />} label="To'siqlar" rows={2} />
          <SectionBlock editable tone="accent" value={edits.today} onChange={(e) => setEdits((s) => ({ ...s, today: e.target.value }))}
            icon={<ListChecks size={12} style={{ color: 'var(--accent-primary-text)' }} />} label="Bugun rejalashtirilgan" />

          <div onClick={() => setShowTranscript((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, margin: '6px 0 12px', cursor: 'pointer' }}>
            {showTranscript ? <ChevronDown size={11} /> : <ChevronRight size={11} />} To'liq transkript (ixtiyoriy tahrir)
          </div>
          {showTranscript && (
            <textarea value={edits.transcript} onChange={(e) => setEdits((s) => ({ ...s, transcript: e.target.value }))} rows={5}
              style={{ width: '100%', padding: '12px 14px', marginBottom: 14, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
          )}

          {draft.audioUrl && <AudioBar src={draft.audioUrl} knownDur={draft.durationSec || 0} />}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
            <Btn kind="ghost" onClick={() => { setStage('record'); setDraft(null); }} disabled={saving}>Bekor qilish</Btn>
            <Btn kind="primary" onClick={handleApprove} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" stroke={ON_ACCENT} /> : <Check size={14} stroke={ON_ACCENT} />} Tasdiqlash va yuborish
            </Btn>
          </div>
        </div>
      )}

      {/* History */}
      {myReports.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '24px 0 12px' }}>
            Oldingi hisobotlarim
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {myReports.map((r) => (
              <div key={r.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <Calendar size={13} style={{ color: 'var(--text-tertiary)' }} />{fmtDate(r)}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                <SectionBlock tone="success" icon={ICONS.kecha} label="Kecha">{r.yesterday}</SectionBlock>
                <SectionBlock tone="danger" icon={ICONS.tosiq} label="To'siqlar">{r.blockers}</SectionBlock>
                <SectionBlock tone="accent" icon={ICONS.bugun} label="Bugun">{r.today}</SectionBlock>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ═══════════════════════════ CEO / PM ═══════════════════════════

function ManagerView({ currentUser }) {
  const { toast } = useSystem();
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rep, { data: us }] = await Promise.all([
        voiceReportService.getApprovedReports(),
        supabase.from('users').select('id, name'),
      ]);
      setReports(rep);
      const map = {};
      (us || []).forEach((u) => { map[u.id] = u.name; });
      setUsers(map);
    } catch (e) {
      console.error(e);
      toast.error(`Hisobotlarni yuklashda xatolik: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const managerInitial = String(currentUser.name || '?').charAt(0).toUpperCase();

  return (
    <>
      <VoiceHeader title="Jamoa hisobotlari" subtitle="Har bir xodimning kunlik hisoboti — qisqacha, ovoz yozuvi va savol-javob bilan." />
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      ) : reports.length === 0 ? (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
          Hozircha tasdiqlangan hisobotlar yo'q.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {reports.map((r) => (
            <TeamReportCard key={r.id} report={r} workerName={users[r.workerId] || 'Xodim'} managerInitial={managerInitial} />
          ))}
        </div>
      )}
    </>
  );
}

function TeamReportCard({ report, workerName, managerInitial }) {
  const { toast } = useSystem();
  const [showTranscript, setShowTranscript] = useState(false);
  const [q, setQ] = useState('');
  const [asking, setAsking] = useState(false);
  const [notes, setNotes] = useState(Array.isArray(report.managerNotes) ? report.managerNotes : []);

  // ── unchanged logic: grounded AI Q&A, persisted to managerNotes ──
  const ask = async () => {
    const question = q.trim();
    if (!question) return;
    setAsking(true);
    try {
      const context = await voiceReportService.getWorkerContext(report.workerId);
      const a = await voiceAiService.answerManagerQuestion({ question, report, context, workerName });
      const note = { q: question, a, at: new Date().toISOString() };
      await voiceReportService.appendManagerNote(report.id, note);
      setNotes((n) => [...n, note]);
      setQ('');
    } catch (e) {
      toast.error(`Savolga javob olishda xatolik: ${e.message || e}`);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-success-muted)', color: 'var(--accent-success-text)', border: '1px solid var(--accent-success-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, textTransform: 'uppercase' }}>
          {String(workerName).charAt(0)}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{workerName}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
            <Calendar size={12} />{fmtDate(report)}
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}><StatusBadge status={report.status || 'approved'} /></div>
      </div>

      <SectionBlock tone="success" icon={ICONS.kecha} label="Kecha bajarilgan">{report.yesterday}</SectionBlock>
      <SectionBlock tone="danger" icon={ICONS.tosiq} label="To'siqlar">{report.blockers}</SectionBlock>
      <SectionBlock tone="accent" icon={ICONS.bugun} label="Bugun">{report.today}</SectionBlock>

      <div style={{ margin: '14px 0' }}>
        {report.audioUrl && <AudioBar src={report.audioUrl} knownDur={report.durationSec || 0} />}
        {report.transcript && (
          <>
            <div onClick={() => setShowTranscript((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, marginTop: 10, cursor: 'pointer' }}>
              {showTranscript ? <ChevronDown size={11} /> : <ChevronRight size={11} />} To'liq transkript
            </div>
            {showTranscript && (
              <div style={{ marginTop: 8, padding: 12, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                {report.transcript}
              </div>
            )}
          </>
        )}
      </div>

      {/* AI Q&A */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Sparkles size={13} style={{ color: 'var(--accent-primary-text)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-primary-text)' }}>Hisobot bo'yicha AI savol-javob</span>
        </div>

        {notes.map((x, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: 'var(--accent-primary-muted)', color: 'var(--accent-primary-text)', border: '1px solid var(--accent-primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{managerInitial}</div>
              <div style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 10, borderTopLeftRadius: 3, fontSize: 13, color: 'var(--text-primary)' }}>{x.q}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: 'var(--accent-primary-muted)', border: '1px solid var(--accent-primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={12} style={{ color: 'var(--accent-primary-text)' }} />
              </div>
              <div style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, borderTopLeftRadius: 3, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{x.a}</div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px 8px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 12 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !asking) ask(); }}
            placeholder="Bu hisobot bo'yicha savol bering…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', padding: 0 }} />
          <button onClick={ask} disabled={asking || !q.trim()} aria-label="Send" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-primary)', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: asking || !q.trim() ? 'not-allowed' : 'pointer', opacity: asking || !q.trim() ? 0.6 : 1 }}>
            {asking ? <Loader2 size={13} className="animate-spin" stroke={ON_ACCENT} /> : <Send size={13} stroke={ON_ACCENT} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════ ENTRY ═══════════════════════════

export default function VoiceReports({ currentUser }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', width: '100%', padding: '28px 40px' }}>
      <VoiceKeyframes />
      {currentUser.role === 'ceo'
        ? <ManagerView currentUser={currentUser} />
        : <WorkerView currentUser={currentUser} />}
    </div>
  );
}
