import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, Clock, CheckCircle2, MessageSquare, FileCheck, FolderKanban, ArrowRight, Sparkles } from 'lucide-react';
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
        // Projects + tasks (RLS already scopes them to what the user can see)
        const [projectsRes, tasksRes] = await Promise.all([
          supabase.from('projects').select('id, title, status, isArchived').neq('isArchived', true),
          supabase.from('tasks').select('id, projectId, title, status, urgency, assignee, dueDate, comments, isApproved, updatedAt').neq('isArchived', true),
        ]);

        const projects = projectsRes.data || [];
        const tasks = tasksRes.data || [];

        // CEO-only fetches
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

    const overdue   = my.filter(t => t.dueDate && t.dueDate < today);
    const dueToday  = my.filter(t => t.dueDate && t.dueDate.startsWith(today));
    const thisWeek  = my.filter(t => t.dueDate && t.dueDate >= today && t.dueDate <= weekISO && !t.dueDate.startsWith(today));
    const noDue     = my.filter(t => !t.dueDate);

    // Recent activity across ALL visible tasks (not just mine):
    //   - mentions of me (comments where current user is in mentions[])
    //   - comments on tasks I'm assigned to (legacy, authored by someone else)
    const fourteenDaysAgo = new Date(); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const mentionsOfMe = [];
    const recentCommentsOnMine = [];

    tasks.forEach(t => {
      const comments = Array.isArray(t.comments) ? t.comments : [];
      comments.forEach(c => {
        const when = new Date(c.createdAt || c.timestamp || 0);
        if (when < fourteenDaysAgo || c.isSystem) return;
        const isAuthor = c.authorId === currentUser.id || c.author === currentUser.name;
        if (isAuthor) return; // don't show my own comments back to me

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
  const allOpenTasks = tasks.filter(t => t.status !== 'Done' && t.status !== 'Completed').length;
  const projectsById = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects]);

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
    <div className="flex-col gap-6 animate-fade-in" style={{ width: '100%', maxWidth: 920 }}>
      {/* HEADER */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.625rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            {greeting()}, {currentUser.name.split(' ')[0]}
          </h1>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>
        <div style={{ marginTop: 6, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <Inline label={activeProjects} suffix="active projects" />
          <Sep />
          <Inline label={allOpenTasks} suffix="open tasks" />
          <Sep />
          <Inline label={myStuff.total} suffix="assigned to you" />
        </div>
      </div>

      {/* NEEDS YOUR ACTION */}
      <Section title="Needs your action" count={actionItemsCount}>
        {actionItemsCount === 0 ? (
          <EmptyAllCaughtUp />
        ) : (
          <>
            {myStuff.overdue.map(t => (
              <ActionRow key={t.id}
                to={`/projects/${t.projectId}`}
                icon={<AlertCircle size={16} />}
                iconColor="var(--alert-error-text)"
                title={t.title}
                subtitle={`${projectsById[t.projectId]?.title || 'Project'} · overdue ${daysAgo(t.dueDate)}d`}
                badge="OVERDUE" badgeColor="var(--alert-error-text)" badgeBg="var(--alert-error-bg)"
              />
            ))}
            {myStuff.dueToday.map(t => (
              <ActionRow key={t.id}
                to={`/projects/${t.projectId}`}
                icon={<Clock size={16} />}
                iconColor="var(--accent-warning-text)"
                title={t.title}
                subtitle={`${projectsById[t.projectId]?.title || 'Project'} · due today`}
                badge="TODAY" badgeColor="var(--accent-warning-text)" badgeBg="var(--accent-warning-muted)"
              />
            ))}
            {currentUser.role === 'ceo' && pendingApprovals.slice(0, 5).map(t => (
              <ActionRow key={t.id}
                to={`/projects/${t.projectId}`}
                icon={<FileCheck size={16} />}
                iconColor="var(--accent-primary-text)"
                title={t.title}
                subtitle={`${projectsById[t.projectId]?.title || 'Project'} · awaiting your approval`}
                badge="APPROVE" badgeColor="var(--accent-primary-text)" badgeBg="var(--accent-primary-muted)"
              />
            ))}
            {currentUser.role === 'ceo' && overdueInvoices.slice(0, 5).map(inv => (
              <ActionRow key={inv.id}
                to="/finance"
                icon={<AlertCircle size={16} />}
                iconColor="var(--alert-error-text)"
                title={`${inv.invoiceNumber || 'Invoice'} · ${inv.client}`}
                subtitle={`${fmtCurrency(inv.amount, inv.currency)} · overdue ${daysAgo(inv.dueDate)}d`}
                badge="OVERDUE" badgeColor="var(--alert-error-text)" badgeBg="var(--alert-error-bg)"
              />
            ))}
          </>
        )}
      </Section>

      {/* MENTIONS OF YOU */}
      {myStuff.mentionsOfMe.length > 0 && (
        <Section title="Mentioned you" count={myStuff.mentionsOfMe.length}>
          {myStuff.mentionsOfMe.map((c, i) => (
            <ActionRow key={`men-${i}`}
              to={`/projects/${c.projectId}`}
              icon={<MessageSquare size={16} />}
              iconColor="var(--accent-primary-text)"
              title={c.taskTitle}
              subtitle={`${c.author}: "${(c.text || '').slice(0, 80)}${(c.text || '').length > 80 ? '…' : ''}"`}
              badge="@MENTION" badgeColor="var(--accent-primary-text)" badgeBg="var(--accent-primary-muted)"
            />
          ))}
        </Section>
      )}

      {/* RECENT COMMENTS */}
      {myStuff.recentComments.length > 0 && (
        <Section title="Recent comments on your tasks" count={myStuff.recentComments.length}>
          {myStuff.recentComments.map((c, i) => (
            <ActionRow key={`com-${i}`}
              to={`/projects/${c.projectId}`}
              icon={<MessageSquare size={16} />}
              iconColor="var(--text-secondary)"
              title={c.taskTitle}
              subtitle={`${c.author}: "${(c.text || '').slice(0, 80)}${(c.text || '').length > 80 ? '…' : ''}"`}
            />
          ))}
        </Section>
      )}

      {/* THIS WEEK */}
      {myStuff.thisWeek.length > 0 && (
        <Section title="Due this week" count={myStuff.thisWeek.length}>
          {myStuff.thisWeek.map(t => (
            <ActionRow key={t.id}
              to={`/projects/${t.projectId}`}
              icon={<Clock size={16} />}
              iconColor="var(--text-secondary)"
              title={t.title}
              subtitle={`${projectsById[t.projectId]?.title || 'Project'} · due ${fmtDate(t.dueDate)}`}
            />
          ))}
        </Section>
      )}

      {/* NO DUE DATE */}
      {myStuff.noDue.length > 0 && (
        <Section title="No due date" count={myStuff.noDue.length}>
          {myStuff.noDue.slice(0, 5).map(t => (
            <ActionRow key={t.id}
              to={`/projects/${t.projectId}`}
              icon={<FolderKanban size={16} />}
              iconColor="var(--text-tertiary)"
              title={t.title}
              subtitle={projectsById[t.projectId]?.title || 'Project'}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

// ── helpers ──
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
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(Number(n) || 0);
  } catch {
    return `${cur} ${Number(n || 0).toFixed(0)}`;
  }
};

const Inline = ({ label, suffix }) => (
  <span>
    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{label}</span>{' '}
    <span>{suffix}</span>
  </span>
);
const Sep = () => <span style={{ margin: '0 8px', color: 'var(--text-tertiary)' }}>·</span>;

const Section = ({ title, count, children }) => (
  <div className="flex-col gap-2">
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
      <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>
        {title}
      </h3>
      {count !== undefined && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>{count}</span>
      )}
    </div>
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>{children}</div>
  </div>
);

const ActionRow = ({ to, icon, iconColor, title, subtitle, badge, badgeColor, badgeBg }) => (
  <Link
    to={to}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.75rem 1rem',
      borderBottom: '1px solid var(--border-color)',
      textDecoration: 'none', color: 'inherit',
      transition: 'background 80ms',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
  >
    <span style={{ color: iconColor, flexShrink: 0, display: 'inline-flex' }}>{icon}</span>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>
    </div>
    {badge && (
      <span style={{
        fontSize: '0.6875rem', fontWeight: 700,
        padding: '2px 7px', borderRadius: 999,
        color: badgeColor, background: badgeBg,
        letterSpacing: '0.05em',
      }}>{badge}</span>
    )}
    <ArrowRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
  </Link>
);

const EmptyAllCaughtUp = () => (
  <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
    <div style={{
      width: 44, height: 44, borderRadius: '50%',
      background: 'var(--accent-success-muted)', color: 'var(--accent-success-text)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem',
    }}>
      <Sparkles size={20} />
    </div>
    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>All caught up</div>
    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Nothing urgent right now. Good time to move work forward.</div>
  </div>
);
