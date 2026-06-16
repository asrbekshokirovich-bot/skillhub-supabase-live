// ─────────────────────────────────────────────────────────────────────────
// App shell — sidebar + header.
//
// Drop-in replacement for src/App.jsx.
// Same routes, same auth flow, same theme handling, same data fetches.
// Visual polish to the sidebar and header so they match the redesigned pages.
// ─────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  Home, FolderKanban, CreditCard, MessageSquare, Settings, LogOut,
  Users, Loader2, Mic, Clock, Target,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Discussions from './pages/Discussions';
import Inbox from './pages/Inbox';
import { MobileTabBar } from './components/MobileTabBar';
import Projects from './pages/Projects';
import Finance from './pages/Finance';
import SettingsView from './pages/Settings';
import Team from './pages/Team';
import VoiceReports from './pages/VoiceReports';
import Leads from './pages/Leads';
import History from './pages/History';
import logoMarkLight from './assets/logo-mark-dark-256.png';
import logoMarkDark  from './assets/logo-mark-white-256.png';
import './App.css';

// ── Sidebar ──────────────────────────────────────────────────────────────

const Sidebar = ({ currentUser, onLogout, isDark, actionCount, voiceCount, leadCount }) => {
  const location = useLocation();
  const navItems = [
    { name: 'Home',     path: '/',         icon: <Home size={16}/>,        badge: actionCount },
    { name: 'Projects', path: '/projects', icon: <FolderKanban size={16}/> },
    ...(currentUser.role !== 'worker' ? [{ name: 'Leads', path: '/leads', icon: <Target size={16}/>, badge: leadCount }] : []),
    { name: 'Voice Reports', path: '/voice-reports', icon: <Mic size={16}/>, badge: voiceCount },
    ...(currentUser.role !== 'worker' ? [{ name: 'Finance', path: '/finance', icon: <CreditCard size={16}/> }] : []),
    ...(currentUser.role === 'ceo'    ? [{ name: 'Team',    path: '/team',    icon: <Users size={16}/> }] : []),
    ...(currentUser.role === 'ceo'    ? [{ name: 'History', path: '/history', icon: <Clock size={16}/> }] : []),
  ];

  return (
    <div className="sidebar">
      <div style={{
        padding: '14px 16px', height: 60, display: 'flex', alignItems: 'center',
        gap: 10, borderBottom: '1px solid var(--border-color)',
      }}>
        <img src={isDark ? logoMarkDark : logoMarkLight} alt="Skillhub"
          style={{ height: 24, width: 'auto', objectFit: 'contain' }}/>
        <span style={{
          fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em',
          color: 'var(--text-primary)',
        }}>Skillhub</span>
      </div>

      <nav style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {navItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              style={{ margin: 0 }}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.name}</span>
              {item.badge > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  padding: '1px 6px', borderRadius: 999, minWidth: 18, textAlign: 'center',
                  background: isActive ? 'var(--bg-primary)' : 'var(--accent-primary-muted)',
                  color: isActive ? 'var(--text-primary)' : 'var(--accent-primary-text)',
                  border: `1px solid ${isActive ? 'var(--border-color)' : 'var(--accent-primary-border)'}`,
                }}>{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border-color)' }}>
        <Link to="/settings"
          className={`sidebar-link ${location.pathname === '/settings' ? 'active' : ''}`}
          style={{ margin: 0, marginBottom: 2 }}>
          <Settings size={16}/>
          <span>Settings</span>
        </Link>
      </div>

      {/* User profile block — anchored to the very bottom */}
      <div style={{
        padding: 10, borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent-primary-muted)', color: 'var(--accent-primary-text)',
          border: '1px solid var(--accent-primary-border)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
        }}>
          {String(currentUser.name || '?').charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{currentUser.name}</div>
          <div style={{
            fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 600,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{currentUser.role}</div>
        </div>
        <button onClick={onLogout} title="Sign out"
          style={{
            width: 28, height: 28, padding: 0, borderRadius: 'var(--radius-sm)',
            background: 'transparent', border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--alert-error-bg)'; e.currentTarget.style.color = 'var(--alert-error-text)'; e.currentTarget.style.borderColor = 'var(--alert-error-border)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
          <LogOut size={13}/>
        </button>
      </div>
    </div>
  );
};

// ── Header ───────────────────────────────────────────────────────────────

const Header = ({ currentUser, title }) => {
  const role = (currentUser.role || 'worker').toLowerCase();
  const roleColors = {
    ceo:    { bg: 'var(--accent-primary-muted)', fg: 'var(--accent-primary-text)', br: 'var(--accent-primary-border)' },
    worker: { bg: 'var(--accent-success-muted)', fg: 'var(--accent-success-text)', br: 'var(--accent-success-border)' },
    client: { bg: 'var(--bg-tertiary)',          fg: 'var(--text-secondary)',      br: 'var(--border-color)' },
  }[role] || { bg: 'var(--bg-tertiary)', fg: 'var(--text-secondary)', br: 'var(--border-color)' };

  return (
    <div className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <h1 style={{
          margin: 0, fontSize: '0.9375rem', fontWeight: 700,
          color: 'var(--text-primary)', letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '4px 10px 4px 4px', borderRadius: 999,
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'var(--accent-primary-muted)', color: 'var(--accent-primary-text)',
            border: '1px solid var(--accent-primary-border)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {String(currentUser.name || '?').charAt(0).toUpperCase()}
          </div>
          <span style={{
            fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)',
            maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{currentUser.name}</span>
          <span style={{
            padding: '1px 7px', borderRadius: 999,
            background: roleColors.bg, color: roleColors.fg, border: `1px solid ${roleColors.br}`,
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>{currentUser.role}</span>
        </div>
      </div>
    </div>
  );
};

// ── Layout ───────────────────────────────────────────────────────────────

const AppLayout = ({ currentUser, onLogout, theme, setTheme, isDark }) => {
  const location = useLocation();
  const [actionCount, setActionCount] = useState(0);
  const [voiceCount, setVoiceCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);

  // Sidebar badge for Leads: count of open leads (not won/lost). CEO + staff only.
  useEffect(() => {
    if (currentUser.role === 'worker') { setLeadCount(0); return; }
    let cancelled = false;
    (async () => {
      try {
        const { count } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .not('stage', 'in', '(won,lost)');
        if (!cancelled) setLeadCount(count || 0);
      } catch { /* table may not exist yet */ }
    })();
    return () => { cancelled = true; };
  }, [currentUser.role, location.pathname]);

  // Badge for the Voice Reports tab: CEO -> today's approved reports;
  // worker -> their own pending drafts. Fails silently if the table is absent.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        let query = supabase.from('voice_reports').select('id', { count: 'exact', head: true });
        query = currentUser.role === 'ceo'
          ? query.eq('status', 'approved').eq('reportDate', today)
          : query.eq('workerId', currentUser.id).eq('status', 'draft');
        const { count } = await query;
        if (!cancelled) setVoiceCount(count || 0);
      } catch { /* table may not exist yet */ }
    })();
    return () => { cancelled = true; };
  }, [currentUser.id, currentUser.role, location.pathname]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, status, assignee, dueDate, isApproved, comments')
          .neq('isArchived', true);

        const my = (tasks || []).filter(t =>
          t.assignee === currentUser.id && t.status !== 'Done' && t.status !== 'Completed'
        );
        const overdue  = my.filter(t => t.dueDate && t.dueDate < today).length;
        const dueToday = my.filter(t => t.dueDate && t.dueDate.startsWith(today)).length;

        let mentions = 0;
        (tasks || []).forEach(t => {
          (Array.isArray(t.comments) ? t.comments : []).forEach(c => {
            if (Array.isArray(c.mentions) && c.mentions.includes(currentUser.id) &&
                c.authorId !== currentUser.id) mentions++;
          });
        });

        let pendingApprovals = 0, overdueInvoices = 0;
        if (currentUser.role === 'ceo') {
          pendingApprovals = (tasks || []).filter(t =>
            (t.status === 'Done' || t.status === 'Completed') && !t.isApproved
          ).length;
          const { data: inv } = await supabase
            .from('invoices').select('dueDate, status')
            .neq('status', 'paid').neq('status', 'cancelled');
          overdueInvoices = (inv || []).filter(i => i.dueDate && i.dueDate < today).length;
        }

        if (!cancelled) setActionCount(overdue + dueToday + mentions + pendingApprovals + overdueInvoices);
      } catch (err) {
        console.warn('Inbox count fetch error:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser.id, currentUser.role, location.pathname]);

  const getRouteTitle = () => {
    if (location.pathname.startsWith('/projects/')) return 'Project';
    switch (location.pathname) {
      case '/':         return 'Home';
      case '/projects': return 'Projects';
      case '/voice-reports': return 'Voice Reports';
      case '/leads':    return 'Leads';
      case '/finance':  return 'Finance';
      case '/settings': return 'Settings';
      case '/team':     return 'Team';
      case '/history':  return 'History';
      default:          return 'Skillhub';
    }
  };

  return (
    <div className="app-layout">
      <Sidebar currentUser={currentUser} onLogout={onLogout} isDark={isDark} actionCount={actionCount} voiceCount={voiceCount} leadCount={leadCount}/>
      <div className="main-content">
        <Header currentUser={currentUser} title={getRouteTitle()}/>
        <div className="page-content" style={{ maxWidth: 1280, margin: '0 auto', width: '100%' }}>
          <div style={{ width: '100%' }}>
            <Routes>
              <Route path="/"                     element={<Inbox       currentUser={currentUser}/>}/>
              <Route path="/projects"             element={<Projects    currentUser={currentUser}/>}/>
              <Route path="/projects/:projectId"  element={<Discussions currentUser={currentUser}/>}/>
              <Route path="/voice-reports"        element={<VoiceReports currentUser={currentUser}/>}/>
              <Route path="/leads"                element={<Leads       currentUser={currentUser}/>}/>
              <Route path="/history"              element={<History     currentUser={currentUser}/>}/>
              <Route path="/finance"              element={<Finance     currentUser={currentUser}/>}/>
              <Route path="/team"                 element={<Team        currentUser={currentUser}/>}/>
              <Route path="/settings"             element={<SettingsView currentUser={currentUser} theme={theme} setTheme={setTheme}/>}/>
            </Routes>
          </div>
        </div>
      </div>
      <MobileTabBar currentUser={currentUser}/>
    </div>
  );
};

// ── App ──────────────────────────────────────────────────────────────────

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [theme, setTheme] = useState('system');
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unmounted = false;
    let resolved  = false;

    const handleSession = async (session) => {
      if (unmounted) return;
      if (session?.user) {
        try {
          let { data: userData, error } = await supabase
            .from('users').select('id, name, role').eq('id', session.user.id).single();

          if (error && error.code === 'PGRST116') {
            const { data: ensured } = await supabase.rpc('ensure_my_profile');
            if (ensured) userData = { id: ensured.id, name: ensured.name, role: ensured.role };
          } else if (error) {
            console.warn('Error fetching user data:', error);
          }

          if (unmounted) return;
          setCurrentUser({
            id: session.user.id,
            email: session.user.email,
            name: userData?.name || session.user.email?.split('@')[0] || 'User',
            role: userData?.role || 'worker',
          });
        } catch (err) {
          console.error('Error fetching profile:', err);
          if (unmounted) return;
          setCurrentUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.email?.split('@')[0] || 'User',
            role: 'worker',
          });
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    };

    // ── Watchdog: never let the loading screen persist past 3 s. ────────
    // If supabase.auth.getSession() hangs (navigator.locks contention,
    // expired token refresh blocking, network stall, …), fall through to
    // Login so the user can at least re-authenticate instead of staring
    // at a black screen forever. If a real session arrives later, the
    // onAuthStateChange subscription below will still pick it up.
    const watchdog = setTimeout(() => {
      if (unmounted || resolved) return;
      console.warn('[App] session bootstrap timed out (3s) — falling through to Login');
      setCurrentUser(null);
      setIsLoading(false);
    }, 3000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        resolved = true;
        clearTimeout(watchdog);
        handleSession(session);
      })
      .catch((err) => {
        resolved = true;
        clearTimeout(watchdog);
        console.error('[App] getSession failed:', err);
        if (!unmounted) {
          setCurrentUser(null);
          setIsLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // If the watchdog fired first, this still resolves the session
      // when supabase eventually wakes up (e.g. user signs in).
      handleSession(session);
    });

    return () => {
      unmounted = true;
      clearTimeout(watchdog);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(dark);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    };
    updateTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', updateTheme);
    return () => mq.removeEventListener('change', updateTheme);
  }, [theme]);

  const handleLogout = async () => { await supabase.auth.signOut(); };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-secondary)' }}/>
      </div>
    );
  }

  if (!currentUser) return <Login isDark={isDark}/>;

  return (
    <AppLayout
      currentUser={currentUser} onLogout={handleLogout}
      theme={theme} setTheme={setTheme} isDark={isDark}
    />
  );
}

export default App;
