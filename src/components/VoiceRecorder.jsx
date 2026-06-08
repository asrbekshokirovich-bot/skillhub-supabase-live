import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, RotateCcw, Send, Loader2, Sparkles } from 'lucide-react';
import { RecorderCard, Waveform, AudioBar, Btn, MONO, ON_ACCENT } from './voiceUi';

// ─────────────────────────────────────────────────────────────────────────
// VoiceRecorder — browser mic capture via MediaRecorder.
// VISUAL redesign per voice/VoiceReports.reference.jsx; the recording LOGIC
// (MediaRecorder, timer, blob, handlers) is unchanged — only the rendered
// markup of the idle / recording / preview phases was swapped.
// Calls onSubmit(blob, durationSec, mimeType).
// ─────────────────────────────────────────────────────────────────────────

const PREFERRED_MIME = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
];

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const t of PREFERRED_MIME) {
    try { if (MediaRecorder.isTypeSupported(t)) return t; } catch { /* noop */ }
  }
  return '';
}

const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export default function VoiceRecorder({ onSubmit, busy = false }) {
  const [phase, setPhase] = useState('idle');     // idle | recording | recorded
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const blobRef = useRef(null);
  const mimeRef = useRef('');
  const durationRef = useRef(0);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => () => {
    clearTimer();
    stopStream();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl, stopStream]);

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      mimeRef.current = mime;
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const type = mr.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        blobRef.current = blob;
        mimeRef.current = type;
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        setPhase('recorded');
        stopStream();
      };
      mr.start();
      recorderRef.current = mr;
      setSeconds(0);
      durationRef.current = 0;
      setPhase('recording');
      timerRef.current = setInterval(() => {
        setSeconds((s) => { durationRef.current = s + 1; return s + 1; });
      }, 1000);
    } catch (err) {
      setError(
        err?.name === 'NotAllowedError'
          ? "Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering."
          : `Mikrofonni ochib bo'lmadi: ${err?.message || err}`
      );
    }
  };

  const stopRecording = () => {
    clearTimer();
    const mr = recorderRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl('');
    blobRef.current = null;
    setSeconds(0);
    durationRef.current = 0;
    setPhase('idle');
  };

  const submit = () => {
    if (blobRef.current) onSubmit?.(blobRef.current, durationRef.current, mimeRef.current);
  };

  // ── render: error banner (if any) + the current phase ──
  const errorBanner = error ? (
    <div style={{
      background: 'var(--alert-error-bg)', color: 'var(--alert-error-text)',
      border: '1px solid var(--alert-error-border)', borderRadius: 10,
      padding: '10px 14px', fontSize: 13, marginBottom: 12, textAlign: 'center',
    }}>{error}</div>
  ) : null;

  if (phase === 'recording') {
    const mm = String(Math.floor(seconds / 60)).padStart(1, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return (
      <>
        {errorBanner}
        <RecorderCard>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%' }}>
            <Waveform active />
            <div style={{ fontSize: 34, fontWeight: 700, fontFamily: MONO, color: 'var(--text-primary)', letterSpacing: 1 }}>{mm}:{ss}</div>
            <button onClick={stopRecording} aria-label="Stop" style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--alert-error-bg)', border: '1px solid var(--alert-error-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Square size={26} fill="var(--alert-error-text)" stroke="var(--alert-error-text)" />
            </button>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-tertiary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--alert-error-text)' }} />
              Yozilmoqda… tugatganda to'xtatish tugmasini bosing
            </div>
          </div>
        </RecorderCard>
      </>
    );
  }

  if (phase === 'recorded') {
    return (
      <>
        {errorBanner}
        <RecorderCard>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%', maxWidth: 460 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', fontWeight: 600 }}>
              Yozib olindi · <span style={{ color: 'var(--text-secondary)', fontFamily: MONO }}>{fmt(durationRef.current)}</span>
            </div>
            <AudioBar src={audioUrl} knownDur={durationRef.current} />
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn kind="secondary" onClick={reset} disabled={busy}><RotateCcw size={13} /> Qayta yozish</Btn>
              <Btn kind="primary" onClick={submit} disabled={busy}>
                {busy ? <><Loader2 size={13} className="animate-spin" stroke={ON_ACCENT} /> Tahlil qilinmoqda…</> : <>Yuborish <Send size={13} stroke={ON_ACCENT} /></>}
              </Btn>
            </div>
          </div>
        </RecorderCard>
      </>
    );
  }

  // idle
  return (
    <>
      {errorBanner}
      <RecorderCard>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ position: 'relative', width: 88, height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="vr-pulse" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--accent-primary)', animation: 'vrPulse 2.4s ease-out infinite', pointerEvents: 'none' }} />
            <button onClick={startRecording} aria-label="Record" style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--accent-primary-muted)', border: '1px solid var(--accent-primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Mic size={34} style={{ color: 'var(--accent-primary)' }} />
            </button>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Bugungi hisobotni ovozli ayting</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 6 }}>Kecha nima qildingiz? To'siqlar? Bugun nima qilasiz?</div>
            <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>
              <Sparkles size={11} style={{ color: 'var(--accent-primary-text)' }} /> AI avtomatik bo'limlarga ajratadi · 3–5 daqiqa
            </div>
          </div>
        </div>
      </RecorderCard>
    </>
  );
}
