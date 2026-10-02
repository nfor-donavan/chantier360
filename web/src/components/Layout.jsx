import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, HardHat, PackageCheck, Users, BellRing, LogOut } from 'lucide-react';
import { useStore } from '../store.jsx';
import { tenant } from '../data.js';

const nav = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/projects', label: 'Sites & timeline', icon: HardHat },
  { to: '/materials', label: 'Materials', icon: PackageCheck },
  { to: '/attendance', label: 'Labour attendance', icon: Users },
  { to: '/alerts', label: 'Alerts', icon: BellRing },
];
const titles = { '/': 'Operations overview', '/projects': 'Sites & timeline', '/materials': 'Materials & requests', '/attendance': 'Labour attendance', '/alerts': 'Alerts' };

export default function Layout({ children }) {
  const { user, logout, alerts, toast } = useStore();
  const { pathname } = useLocation();
  const open = alerts.filter((a) => !a.acknowledged).length;
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><img src="/logo.png" alt="" /><div><b>Chantier360</b><span>HQ Operations</span></div></div>
        <nav>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => 'nav' + (isActive ? ' on' : '')}>
              <Icon size={18} /> <span>{label}</span>
              {to === '/alerts' && open > 0 && <em className="badge">{open}</em>}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <div className="who"><div className="avatar">{user.initials}</div><div><b>{user.name}</b><span>{user.role}</span></div></div>
          <button className="ghost" onClick={logout}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
      <main className="main">
        <header className="top">
          <h1>{titles[pathname] ?? 'Chantier360'}</h1>
          <div className="tenant"><span className="dot" /> {tenant.companyName} · Cameroon</div>
        </header>
        <div className="content">{children}</div>
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
