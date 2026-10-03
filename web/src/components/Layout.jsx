import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, HardHat, PackageCheck, Users, BellRing, LogOut, Sun, Moon } from 'lucide-react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';

const nav = [
  ['/', 'overview', LayoutDashboard], ['/projects', 'projects', HardHat], ['/materials', 'materials', PackageCheck],
  ['/attendance', 'attendance', Users], ['/alerts', 'alerts', BellRing],
];
const keyFor = { '/': 'overview', '/projects': 'projects', '/materials': 'materials', '/attendance': 'attendance', '/alerts': 'alerts' };

export function Toggles() {
  const { lang, setLang, theme, setTheme, t } = useStore();
  return (
    <div className="toggles">
      <div className="seg" role="group" aria-label="Language">
        {['en', 'fr'].map((l) => <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}
      </div>
      <button className="seg-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? t('light') : t('dark')} title={theme === 'dark' ? t('light') : t('dark')}>
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout, toast, t, tick } = useStore();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(0);
  useEffect(() => { api.dashboard().then((d) => setOpen(d.openAlerts)).catch(() => {}); }, [pathname, tick]);
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><img src="/logo.png" alt="" /><div><b>Chantier360</b><span>HQ</span></div></div>
        <nav>
          {nav.map(([to, k, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => 'nav' + (isActive ? ' on' : '')}>
              <Icon size={18} /> <span>{t('nav.' + k)}</span>
              {k === 'alerts' && open > 0 && <em className="badge">{open}</em>}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <Toggles />
          <div className="who"><div className="avatar">{user.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div><div><b>{user.name}</b><span>{t('role.' + user.role)}</span></div></div>
          <button className="ghost" onClick={logout}><LogOut size={16} /> {t('signout')}</button>
        </div>
      </aside>
      <main className="main">
        <header className="top">
          <h1>{t('title.' + (keyFor[pathname] || 'overview'))}</h1>
          <div className="tenant"><span className="dot" /> {user.tenant?.companyName} · Cameroon</div>
        </header>
        <div className="content">{children}</div>
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
