import React, { useEffect, useState, useCallback } from 'react';
import { History as HistoryIcon, RefreshCw, Loader2, Plus, Pencil, Archive, Trash2 } from 'lucide-react';
import { activityService } from '../lib/services/activityService';

const ACTIONS = {
  created:  { label: 'created',  color: 'var(--accent-success-text)', Icon: Plus },
  updated:  { label: 'updated',  color: 'var(--accent-primary-text)', Icon: Pencil },
  archived: { label: 'archived', color: 'var(--accent-warning-text)', Icon: Archive },
  deleted:  { label: 'deleted',  color: 'var(--alert-error-text)',    Icon: Trash2 },
};
const ENTITY = { tasks: 'task', projects: 'project' };

function ago(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return ''; }
}

export default function History({ currentUser }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const isCeo = currentUser?.role === 'ceo';

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await activityService.getRecent(300)); }
    catch (e) { console.warn('activity load', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', width: '100%', padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            <HistoryIcon size={20} style={{ color: 'var(--accent-primary)' }} /> Activity history
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
            {isCeo ? 'Every action your team takes on tasks & projects.' : 'Your recent actions.'}
          </p>
        </div>
        <button onClick={load} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      ) : rows.length === 0 ? (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
          No activity yet.
        </div>
      ) : (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
          {rows.map((r, i) => {
            const a = ACTIONS[r.action] || { label: r.action, color: 'var(--text-secondary)', Icon: Pencil };
            const Icon = a.Icon;
            const ent = ENTITY[r.entityType] || r.entityType;
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'var(--accent-primary-muted)', color: 'var(--accent-primary-text)', border: '1px solid var(--accent-primary-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                  {String(r.actorName || '?').charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                    <strong style={{ fontWeight: 700 }}>{r.actorName || 'Someone'}</strong>
                    {' '}<span style={{ color: a.color, fontWeight: 600 }}>{a.label}</span>
                    {' '}a {ent}
                    {r.entityTitle ? <>: <span style={{ color: 'var(--text-secondary)' }}>{r.entityTitle}</span></> : null}
                  </div>
                  {r.actorRole ? (
                    <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{r.actorRole}</div>
                  ) : null}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <Icon size={14} style={{ color: a.color }} />
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{ago(r.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
