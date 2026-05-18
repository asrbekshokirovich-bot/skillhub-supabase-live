// ─────────────────────────────────────────────────────────────────────────
// Inbox (Home) — inbox-style action feed.
//
// Drop-in replacement for src/pages/Inbox.jsx.
// Same Supabase queries, same memoised groupings, same routing.
// Visual changes only.
// ─────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, AlertCircle, Clock, MessageSquare, FileCheck,
  FolderKanban, ArrowRight, Sparkles, Bell, Wallet, Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const todayISO = () => new Date().toISOString().slice(0, 10);

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5)  return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

export default function Inbox({ currentUser }) {
  const [state, setState] = useState({
    projects: [], tasks: [], pendingApprovals: [], overdueInvoices: [], loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [projectsRes, tasksRes] = await Promise.all([
          supabase.from('projects').select('id, title, name, status, isArchived').neq('isArchived', true),
          supabase.from('tasks').select('id, projectId, title, status, urgency, assignee, dueDate, comments, isApproved, updatedAt').neq('isArchived', true),
        ]);
        const projects = projectsRes.data || [];
        const tasks = tasksRes.data || [];

        let pendingApprovals = [], overdueInvoices = [];
        if (currentUser.role === 'ceo') {
          pendingApprovals = tasks.filter(t =>
            (t.status === 'Done' || t.status === 'Completed') && !t.isApproved
          );
          const invRes = await supabase
            .from('invoices')
            .select('id, invoiceNumber, client, amount, currency, dueDate, status')
            .neq('status', 'paid').neq('status', 'cancelled');
          const today = todayISO();
          overdueInvoices = (invRes.data || []).filter(i => i.dueDate && i.dueDate < today);
        }
        if (!cancelled) setState({ projects, tasks, pendingApprovals, overdueInvoices, loading: false });
      } catch (err) {
        console.error('Inbox load error:', err);
        if (!cancelled) setState(s => ({ ...s, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser.id, currentUser.role]);

  const { projects, tasks, pendingApprovals, overdueInvoices, loading } = state;

  const myStuff = useMemo(() => {
    const today = todayISO();
    const weekFromNow = new Date(); weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekISO = weekFromNow.toISOString().slice(0, 10);

    const my = tasks.filter(t =>
      t.assignee === currentUser.id &&
      t.status !== 'Done' && t.status !== 'Completed'
    );
    const overdue  = my.filter(t => t.dueDate && t.dueDate < today);
    const dueToday = my.filter(t => t.dueDate && t.dueDate.startsWith(today));
    const thisWeek = my.filter(t => t.dueDate && t.dueDate >= today && t.dueDate <= weekISO && !t.dueDate.startsWith(today));
    const noDue    = my.filter(t => !t.dueDate);

    const fourteenDaysAgo = new Date(); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const mentionsOfMe = [];
    const recentCommentsOnMine = [];
    tasks.forEach(t => {
      const comments = Array.isArray(t.comments) ? t.comments : [];
      comments.forEach(c => {
        const when = new Date(c.createdAt || c.timestamp || 0);
        if (when < fourteenDaysAgo || c.isSystem) return;
        const isAuthor = c.authorId === currentUser.id || c.author === currentUser.name;
        if (isAuthor) return;
        const isMention = Array.isArray(c.mentions) && c.mentions.includes(currentUser.id);
        if (isMention) {
          mentionsOfMe.push({ ...c, taskId: t.id, taskTitle: t.title, projectId: t.projectId });
        } else if (t.assignee === currentUser.id) {
          recentCommentsOnMine.push({ ...c, taskId: t.id, taskTitle: t.title, projectId: t.projectId });
        }
      });
    });
    const byTime = (a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0);
    mentionsOfMe.sort(byTime);
    recentCommentsOnMine.sort(byTime);

    return {
      overdue, dueToday, thisWeek, noDue, total: my.length,
      mentionsOfMe: mentionsOfMe.slice(0, 5),
      recentComments: recentCommentsOnMine.slice(0, 5),
    };
  }, [tasks, currentUser]);

  const activeProjects = projects.filter(p => p.status !== 'Done' && p.status !== 'Completed').length;
  const allOpenTasks   = tasks.filter(t => t.status !== 'Done' && t.status !== 'Completed').length;
  const projectsById   = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects]);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
      </div>
    );
  }

  const actionItemsCount =
    myStuff.overdue.length + myStuff.dueToday.length +
    pendingApprovals.length + overdueInvoices.length +
    myStuff.mentionsOfMe.length;

  return (
    <div className="animate-fade-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* HEADER */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 18,
      }}>
        <div>
          <h1 style={{
            fontSize: '1.625rem', fontWeight: 700, letterSpacing: '-0.025em',
            lineHeight: 1.2, margin: 0, color: 'var(--text-primary)',
          }}>
            {greeting()}, <span style={{ color: 'var(--accent-primary-text)' }}>{currentUser.name.split(' ')[0]}</span>
          </h1>
          <div style={{ marginTop: 6, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            <span style={{ margin: '0 8px', color: 'var(--text-tertiary)' }}>·</span>
            here's the state of play
          </div>
        </div>

        {/* stats strip */}
        <div style={{
          display: 'flex', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)',
          overflow: 'hidden',
        }}>
          <Stat n={activeProjects}        label="active projects" />
          <Stat n={allOpenTasks}          label="open tasks" />
          <Stat n={myStuff.total}         label="assigned to you" tone="accent" />
          {currentUser.role === 'ceo' && (
            <Stat n={pendingApprovals.length} label="awaiting approval" tone="warning" last />
          )}
        </div>
      </div>

      {/* NEEDS YOUR ACTION */}
      <Card>
        <CardHeader title="Needs your action" hint={actionItemsCount > 0 ? `${actionItemsCount} items` : 'inbox zero'} />
        {actionItemsCount === 0 ? (
          <EmptyAllCaughtUp />
        ) : (
          <div>
            {myStuff.overdue.map(t => (
              <ActionRow key={t.id} to={`/projects/${t.projectId}`}
                tone="danger" icon={<AlertCircle size={14}/>}
                project={projectsById[t.projectId]?.name || projectsById[t.projectId]?.title || 'Project'}
                title={t.title}
                meta={`Overdue by ${daysAgo(t.dueDate)} day${daysAgo(t.dueDate) === 1 ? '' : 's'}`}
                cta="Open"
              />
            ))}
            {myStuff.dueToday.map(t => (
              <ActionRow key={t.id} to={`/projects/${t.projectId}`}
                tone="warning" icon={<Clock size={14}/>}
                project={projectsById[t.projectId]?.name || projectsById[t.projectId]?.title || 'Project'}
                title={t.title}
                meta="Due today"
                cta="Open"
              />
            ))}
            {currentUser.role === 'ceo' && pendingApprovals.slice(0, 5).map(t => (
              <ActionRow key={t.id} to={`/projects/${t.projectId}`}
                tone="success" icon={<FileCheck size={14}/>}
                project={projectsById[t.projectId]?.name || projectsById[t.projectId]?.title || 'Project'}
                title={`Approve "${t.title}"`}
                meta="Done · awaiting your approval"
                cta="Review"
              />
            ))}
            {myStuff.mentionsOfMe.map((c, i) => (
              <ActionRow key={`men-${i}`} to={`/projects/${c.projectId}`}
                tone="accent" icon={<Bell size={14}/>}
                project={projectsById[c.projectId]?.name || projectsById[c.projectId]?.title || 'Project'}
                title={`@${currentUser.name.split(' ')[0]} — ${c.taskTitle}`}
                meta={`${c.author}: "${(c.text || '').slice(0, 100)}${(c.text || '').length > 100 ? '…' : ''}"`}
                cta="Reply"
              />
            ))}
            {currentUser.role === 'ceo' && overdueInvoices.slice(0, 5).map((inv, i, arr) => (
              <ActionRow key={inv.id} to="/finance"
                tone="danger" icon={<Wallet size={14}/>}
                project="Finance"
                title={`${inv.invoiceNumber || 'Invoice'} overdue`}
                meta={`${fmtCurrency(inv.amount, inv.currency)} · ${inv.client} · ${daysAgo(inv.dueDate)}d late`}
                cta="Send reminder"
                last={i === arr.length - 1}
              />
            ))}
          </div>
        )}
      </Card>

      {/* TWO-UP: recent comments + due this week */}
      {(myStuff.recentComments.length > 0 || myStuff.thisWeek.length > 0 || myStuff.noDue.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {myStuff.recentComments.length > 0 && (
            <Card>
              <CardHeader title="Recent activity" hint={`${myStuff.recentComments.length} new`}/>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myStuff.recentComments.map((c, i) => (
                  <ActivityRow key={`com-${i}`}
                    who={c.author}
                    text={`commented on ${c.taskTitle}`}
                    snippet={(c.text || '').slice(0, 80)}
                    to={`/projects/${c.projectId}`}
                  />
                ))}
              </div>
            </Card>
          )}

          {(myStuff.thisWeek.length > 0 || myStuff.noDue.length > 0) && (
            <Card>
              <CardHeader title="On your plate" hint={`${myStuff.thisWeek.length + myStuff.noDue.length} tasks`}/>
              <div>
                {myStuff.thisWeek.map(t => (
                  <ActionRow key={t.id} to={`/projects/${t.projectId}`}
                    tone="neutral" icon={<Clock size={14}/>}
                    project={projectsById[t.projectId]?.name || projectsById[t.projectId]?.title || 'Project'}
                    title={t.title}
                    meta={`Due ${fmtDate(t.dueDate)}`}
                    compact
                  />
                ))}
                {myStuff.noDue.slice(0, 5).map((t, i, arr) => (
                  <ActionRow key={t.id} to={`/projects/${t.projectId}`}
                    tone="neutral" icon={<FolderKanban size={14}/>}
                    project={projectsById[t.projectId]?.name || projectsById[t.projectId]?.title || 'Project'}
                    title={t.title}
                    meta="No due date"
                    compact
                    last={i === arr.length - 1 && myStuff.thisWeek.length === 0}
                  />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

const daysAgo = (iso) => {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const fmtCurrency = (n, cur = 'USD') => {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(Number(n) || 0); }
  catch { return `${cur} ${Number(n || 0).toFixed(0)}`; }
};

const Stat = ({ n, label, tone = 'neutral', last }) => {
  const color = {
    neutral: 'var(--text-primary)',
    accent:  'var(--accent-primary-text)',
    warning: 'var(--accent-warning-text)',
    danger:  'var(--alert-error-text)',
  }[tone];
  return (
    <div style={{
      padding: '10px 18px', minWidth: 120,
      borderRight: last ? 'none' : '1px solid var(--border-color)',
    }}>
      <div style={{
        fontSize: '1.25rem', fontWeight: 700, color, letterSpacing: '-0.02em',
        lineHeight: 1, fontVariantNumeric: 'tabular-nums',
      }}>{n}</div>
      <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
};

const Card = ({ children }) => (
  <div style={{
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  }}>{children}</div>
);

const CardHeader = ({ title, hint, right }) => (
  <div style={{
    padding: '12px 16px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)',
  }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <h3 style={{
        margin: 0, fontSize: '0.8125rem', fontWeight: 700,
        color: 'var(--text-primary)',
      }}>{title}</h3>
      {hint && (
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{hint}</span>
      )}
    </div>
    {right}
  </div>
);

const ActionRow = ({ to, tone = 'neutral', icon, project, title, meta, cta, compact, last }) => {
  const tones = {
    accent:  { bg: 'var(--accent-primary-muted)',  fg: 'var(--accent-primary-text)', br: 'var(--accent-primary-border)' },
    success: { bg: 'var(--accent-success-muted)',  fg: 'var(--accent-success-text)', br: 'var(--accent-success-border)' },
    warning: { bg: 'var(--accent-warning-muted)',  fg: 'var(--accent-warning-text)', br: 'var(--accent-warning-text)' },
    danger:  { bg: 'var(--alert-error-bg)',        fg: 'var(--alert-error-text)',    br: 'var(--alert-error-border)' },
    neutral: { bg: 'var(--bg-tertiary)',           fg: 'var(--text-secondary)',      br: 'var(--border-color)' },
  };
  const t = tones[tone];

  return (
    <Link to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: compact ? '10px 16px' : '12px 16px',
        borderBottom: last ? 'none' : '1px solid var(--border-color)',
        textDecoration: 'none', color: 'inherit',
        transition: 'background-color 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-primary)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: 'var(--radius-md)', flexShrink: 0,
        background: t.bg, color: t.fg, border: `1px solid ${t.br}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {project && (
          <div style={{
            fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--text-tertiary)',
            marginBottom: 2,
          }}>{project}</div>
        )}
        <div style={{
          fontSize: '0.875rem', fontWeight: 600,
          color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{title}</div>
        {meta && (
          <div style={{
            fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{meta}</div>
        )}
      </div>
      {cta ? (
        <span style={{
          padding: '5px 10px', fontSize: '0.75rem', fontWeight: 600,
          color: 'var(--text-primary)', background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
          flexShrink: 0,
        }}>{cta}</span>
      ) : (
        <ArrowRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}/>
      )}
    </Link>
  );
};

const ActivityRow = ({ who, text, snippet, to }) => (
  <Link to={to} style={{
    display: 'flex', gap: 10, alignItems: 'flex-start',
    textDecoration: 'none', color: 'inherit',
  }}>
    <span style={{
      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
      background: 'var(--accent-primary-muted)', color: 'var(--accent-primary-text)',
      border: '1px solid var(--accent-primary-border)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    }}>{who?.charAt(0) || '?'}</span>
    <div style={{ flex: 1, minWidth: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{who}</span> {text}
      {snippet && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
          "{snippet}{snippet.length === 80 ? '…' : ''}"
        </div>
      )}
    </div>
  </Link>
);

const EmptyAllCaughtUp = () => (
  <div style={{ padding: '36px 24px', textAlign: 'center' }}>
    <div style={{
      width: 44, height: 44, borderRadius: '50%', margin: '0 auto 12px',
      background: 'var(--accent-success-muted)', color: 'var(--accent-success-text)',
      border: '1px solid var(--accent-success-border)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Sparkles size={20}/>
    </div>
    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
      All caught up
    </div>
    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
      Nothing urgent right now. Good time to move work forward.
    </div>
  </div>
);
