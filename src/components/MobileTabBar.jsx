import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, CreditCard, Users, Settings } from 'lucide-react';

export const MobileTabBar = ({ currentUser }) => {
  const location = useLocation();

  // SYSTEM RULE: Same isActive logic as Sidebar — prefix matching for nested routes.
  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const navItems = [
    { name: 'Home', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Projects', path: '/projects', icon: <FolderKanban size={20} /> },
    ...(currentUser.role !== 'worker' ? [{ name: 'Finance', path: '/finance', icon: <CreditCard size={20} /> }] : []),
    ...(currentUser.role === 'ceo' ? [{ name: 'Team', path: '/team', icon: <Users size={20} /> }] : []),
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> }
  ];

  return (
    <div className="mobile-tab-bar">
      {navItems.map(item => (
        <Link
          key={item.path}
          to={item.path}
          className={`mobile-tab-item ${isActive(item.path) ? 'active' : ''}`}
        >
          {item.icon}
          <span>{item.name}</span>
        </Link>
      ))}
    </div>
  );
};
