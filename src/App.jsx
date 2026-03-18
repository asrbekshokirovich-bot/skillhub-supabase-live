import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, CreditCard, MessageSquare, Settings, LogOut, Hexagon, Users, Loader2 } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import Login from './pages/Login';
import Discussions from './pages/Discussions';
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
    ...(currentUser.role !== 'developer' ? [{ name: 'Finance', path: '/finance', icon: <CreditCard size={20} /> }] : []),
    ...(currentUser.role === 'admin' ? [{ name: 'Team', path: '/team', icon: <Users size={20} /> }] : []),
  ];

  return (
    <div className="sidebar">
      <div className="flex items-center gap-2" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <img src={isDark ? logoDark : logoLight} alt="Skillhub Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
        <span className="font-bold text-xl tracking-tight">Skillhub</span>
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
      <h1 className="text-xl font-bold">{title}</h1>
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

// --- Page Components (Placeholders) ---
const Dashboard = ({ currentUser }) => {
  const [stats, setStats] = useState({ activeProjects: 0, openTasks: 0, pendingInvoices: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // 1. Fetch Active Projects
        const projectsSnap = await getDocs(collection(db, 'projects'));
        const allProjects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Filter based on role (similar to Projects.jsx)
        let relevantProjects = allProjects;
        if (currentUser.role === 'developer') {
          relevantProjects = allProjects.filter(p => p.assignee === currentUser.name);
        } else if (currentUser.role === 'client') {
          relevantProjects = allProjects.filter(p => p.client === currentUser.name);
        }
        
        const activeProjects = relevantProjects.filter(p => p.status !== 'Done' && p.status !== 'Completed');
        
        // 2. Fetch Open Tasks for relevant projects
        let openTasksCount = 0;
        await Promise.all(activeProjects.map(async (proj) => {
          try {
            const tasksSnap = await getDocs(collection(db, 'projects', proj.id, 'tasks'));
            const openTasks = tasksSnap.docs.filter(t => t.data().status !== 'Done' && t.data().status !== 'Completed');
            openTasksCount += openTasks.length;
          } catch (e) {
            console.error(e);
          }
        }));

        setStats({
          activeProjects: activeProjects.length,
          openTasks: openTasksCount,
          pendingInvoices: 0 // Mocked for now until Finance is connected
        });
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [currentUser]);

  return (
    <div className="flex-col gap-6 w-full">
      <div className="flex gap-6 w-full flex-wrap">
        <div className="card flex-1 min-w-[300px] hover-elevate animate-slide-up delay-100">
          <div className="card-body flex justify-between items-center">
            <span className="text-secondary font-medium">Active Projects</span>
            {loading ? <Loader2 size={24} className="animate-spin text-secondary" /> : <span className="text-3xl font-bold">{stats.activeProjects}</span>}
          </div>
        </div>
        <div className="card flex-1 min-w-[300px] hover-elevate animate-slide-up delay-200">
          <div className="card-body flex justify-between items-center">
            <span className="text-secondary font-medium">Open Tasks</span>
            {loading ? <Loader2 size={24} className="animate-spin text-secondary" /> : <span className="text-3xl font-bold">{stats.openTasks}</span>}
          </div>
        </div>
        {currentUser.role !== 'developer' && (
          <div className="card flex-1 min-w-[300px] hover-elevate animate-slide-up delay-300">
            <div className="card-body flex justify-between items-center">
              <span className="text-secondary font-medium">Pending Invoices</span>
              {loading ? <Loader2 size={24} className="animate-spin text-secondary" /> : <span className="text-3xl font-bold">{stats.pendingInvoices}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

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
    </div>
  );
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [theme, setTheme] = useState('system');
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, 'profiles', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setCurrentUser({
              id: user.uid,
              email: user.email,
              name: userData.name || 'User',
              role: userData.role || 'client'
            });
          } else {
            // Fallback
            setCurrentUser({ id: user.uid, email: user.email, name: 'User', role: 'client' });
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
          setCurrentUser({ id: user.uid, email: user.email, name: 'User', role: 'client' });
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
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
    await signOut(auth);
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
