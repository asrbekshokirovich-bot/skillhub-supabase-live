import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, CreditCard, MessageSquare, Settings, LogOut, Hexagon, Users, Loader2, Menu, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Discussions from './pages/Discussions';
import { Dashboard } from './components/Dashboard';
import { MobileTabBar } from './components/MobileTabBar';
import Projects from './pages/Projects';
import Finance from './pages/Finance';
import SettingsView from './pages/Settings';
import Team from './pages/Team';
import logoLight from './assets/logo-light.png';
import logoDark from './assets/logo-dark.png';
import './App.css'; 

const Sidebar = ({ currentUser, onLogout, isDark }) => {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Projects', path: '/projects', icon: <FolderKanban size={20} /> },
    ...(currentUser.role !== 'worker' ? [{ name: 'Finance', path: '/finance', icon: <CreditCard size={20} /> }] : []),
    ...(currentUser.role === 'ceo' ? [{ name: 'Team', path: '/team', icon: <Users size={20} /> }] : []),
  ];

  return (
    <div className="sidebar">
      <div className="flex items-center justify-between" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <img src={isDark ? logoDark : logoLight} alt="Skillhub Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
          <span className="font-bold text-xl tracking-tight">Skillhub</span>
        </div>
      </div>
      
      <div className="flex-col flex-1" style={{ padding: '1.5rem 0', overflowY: 'auto' }}>
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path} 
            className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.icon}
            {item.name}
          </Link>
        ))}
      </div>

      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
        <Link 
          to="/settings" 
          className={`sidebar-link w-full ${location.pathname === '/settings' ? 'active' : ''}`} 
          style={{ justifyContent: 'flex-start', margin: 0 }}
        >
          <Settings size={20} /> Settings
        </Link>
        <button 
          onClick={onLogout}
          className="sidebar-link w-full mt-2" 
          style={{ justifyContent: 'flex-start', margin: 0, color: 'var(--text-secondary)' }}
        >
          <LogOut size={20} /> Logout
        </button>
      </div>
    </div>
  );
};

const Header = ({ currentUser, title }) => {
  return (
    <div className="header">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="badge" style={{ textTransform: 'capitalize' }}>
          {currentUser.role} Mode
        </span>
        <div className="flex items-center gap-2">
          <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {currentUser.name.charAt(0)}
          </div>
          <span className="font-medium text-sm">{currentUser.name}</span>
        </div>
      </div>
    </div>
  );
};

// --- Page Components (Imported) ---

const AppLayout = ({ currentUser, onLogout, theme, setTheme, isDark }) => {
  const location = useLocation();

  const getRouteTitle = () => {
    if (location.pathname.startsWith('/projects/')) return 'Project Workspace';
    switch (location.pathname) {
      case '/': return 'Overview';
      case '/projects': return 'Projects';
      case '/finance': return 'Financial Control';
      case '/settings': return 'Platform Settings';
      case '/team': return 'Team Management';
      default: return 'Skillhub';
    }
  };

  return (
    <div className="app-layout">
      <Sidebar currentUser={currentUser} onLogout={onLogout} isDark={isDark} />
      <div className="main-content">
        <Header currentUser={currentUser} title={getRouteTitle()} />
        <div className="page-content" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <div className="h-full container">
            <Routes>
              <Route path="/" element={<Dashboard currentUser={currentUser} />} />
              <Route path="/projects" element={<Projects currentUser={currentUser} />} />
              <Route path="/projects/:projectId" element={<Discussions currentUser={currentUser} />} />
              <Route path="/finance" element={<Finance currentUser={currentUser} />} />
              <Route path="/team" element={<Team currentUser={currentUser} />} />
              <Route path="/settings" element={<SettingsView currentUser={currentUser} theme={theme} setTheme={setTheme} />} />
            </Routes>
          </div>
        </div>
      </div>
      <MobileTabBar currentUser={currentUser} />
    </div>
  );
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [theme, setTheme] = useState('system');
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleSession = async (session) => {
      if (session?.user) {
        try {
          const { data: userData, error } = await supabase.from('users').select('id, name, role').eq('id', session.user.id).single();
          if (error) console.warn("Error fetching user data:", error);
          let role = userData?.role || 'client';
          let name = userData?.name || 'User';
          
          // Force CEO role for the specific account
          if (session.user.email === 'asrbekshokirovich@gmail.com') {
            role = 'ceo';
            if (name === 'User') name = 'Admin User';
          }

          setCurrentUser({
            id: session.user.id,
            email: session.user.email,
            name: name,
            role: role
          });
        } catch (err) {
          console.error("Error fetching profile:", err);
          let role = session.user.email === 'asrbekshokirovich@gmail.com' ? 'ceo' : 'client';
          setCurrentUser({ id: session.user.id, email: session.user.email, name: 'User', role: role });
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(dark);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    };
    updateTheme();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [theme]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center w-full h-full" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>Loading...</div>;
  }

  if (!currentUser) {
    return <Login isDark={isDark} />;
  }

  return <AppLayout currentUser={currentUser} onLogout={handleLogout} theme={theme} setTheme={setTheme} isDark={isDark} />;
}

export default App;
