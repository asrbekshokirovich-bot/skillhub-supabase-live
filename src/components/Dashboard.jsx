import React, { useState, useEffect } from 'react';
import { Loader2, FolderKanban, CheckSquare, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// SYSTEM RULE: Stat cards are navigation triggers — no dead-end displays.
const StatCard = ({ label, value, icon, accentBg, accentBorder, accentText, loading, delay, to }) => (
  <Link
    to={to}
    className={`card flex-1 hover-elevate animate-slide-up delay-${delay}`}
    style={{ minWidth: 'min(100%, 280px)', textDecoration: 'none', display: 'block' }}
  >
    <div className="card-body flex justify-between items-center gap-4" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        {loading
          ? <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          : <span style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--text-primary)' }}>{value}</span>
        }
      </div>
      <div style={{
        width: 48, height: 48, borderRadius: '12px', flexShrink: 0,
        backgroundColor: accentBg,
        border: `1px solid ${accentBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accentText,
      }}>
        {icon}
      </div>
    </div>
  </Link>
);


export const Dashboard = ({ currentUser }) => {
  const [stats, setStats] = useState({ activeProjects: 0, openTasks: 0, pendingInvoices: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const { data: allProjects } = await supabase
          .from('projects')
          .select('id, assignee, client, status');

        let relevantProjects = allProjects || [];
        if (currentUser.role === 'worker') {
          relevantProjects = allProjects.filter(p => p.assignee === currentUser.id);
        } else if (currentUser.role === 'client') {
          relevantProjects = allProjects.filter(p => p.client === currentUser.name);
        }

        const activeProjects = relevantProjects.filter(p => p.status !== 'Done' && p.status !== 'Completed');

        let openTasksCount = 0;
        const projectIds = activeProjects.map(p => p.id);

        if (projectIds.length > 0) {
          try {
            const { data: tasksSnap, error } = await supabase
              .from('tasks')
              .select('status')
              .in('projectId', projectIds);

            if (!error && tasksSnap) {
              openTasksCount = tasksSnap.filter(t => t.status !== 'Done' && t.status !== 'Completed').length;
            }
          } catch (e) {
            console.error('Error fetching tasks:', e);
          }
        }

        setStats({
          activeProjects: activeProjects.length,
          openTasks: openTasksCount,
          pendingInvoices: 0,
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentUser]);

  return (
    <div className="flex-col gap-6 w-full">
      <div className="flex gap-6 w-full flex-wrap">
        <StatCard
          label="Active Projects"
          value={stats.activeProjects}
          icon={<FolderKanban size={22} />}
          accentBg="var(--accent-primary-muted)"
          accentBorder="var(--accent-primary-border)"
          accentText="var(--accent-primary-text)"
          loading={loading}
          delay={100}
          to="/projects"
        />
        <StatCard
          label="Open Tasks"
          value={stats.openTasks}
          icon={<CheckSquare size={22} />}
          accentBg="var(--accent-warning-muted)"
          accentBorder="rgba(245,158,11,0.25)"
          accentText="var(--accent-warning-text)"
          loading={loading}
          delay={200}
          to="/projects"
        />
        {currentUser.role !== 'worker' && (
          <StatCard
            label="Pending Invoices"
            value={stats.pendingInvoices}
            icon={<FileText size={22} />}
            accentBg="var(--accent-success-muted)"
            accentBorder="var(--accent-success-border)"
            accentText="var(--accent-success-text)"
            loading={loading}
            delay={300}
            to="/finance"
          />
        )}
      </div>
    </div>
  );
};
