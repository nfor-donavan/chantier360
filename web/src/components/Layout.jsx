import React, { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, HardHat, PackageCheck, Users, BellRing, LogOut, Sun, Moon, FileText, ShieldCheck } from 'lucide-react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { roleName } from '../utils.js';

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

const nav = [
  ['/', 'overview', LayoutDashboard, () => true], ['/projects', 'projects', HardHat, (c) => c('VIEW_PROGRESS')], ['/materials', 'materials', PackageCheck, (c) => c('VIEW_MATERIALS')],
  ['/attendance', 'attendance', Users, (c) => c('VIEW_ATTENDANCE') || c('APPROVE_ATTENDANCE')], ['/reports', 'reports', FileText, (c) => c('VIEW_REPORTS')],
  ['/alerts', 'alerts', BellRing, (c) => c('VIEW_ALERTS')], ['/access', 'access', ShieldCheck, (c) => c('MANAGE_USERS')],
];

export default function Layout({ children }) {
  const { user, logout, toast, t, tick, can } = useStore();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(0);
  useEffect(() => { if (can('VIEW_ALERTS')) api.alerts(true).then((a) => setOpen(a.length)).catch(() => {}); }, [pathname, tick]); // eslint-disable-line
  const key = pathname === '/' ? 'overview' : pathname.startsWith('/projects/') ? 'project' : pathname.slice(1);
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><img src="/logo.png" alt="" /><div><b>Chantier360</b><span>{roleName(t, user.role, user.roleLabel)}</span></div></div>
        <nav>
          {nav.filter(([, , , ok]) => ok(can)).map(([to, k, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => 'nav' + (isActive ? ' on' : '')}>
              <Icon size={18} /> <span>{t('nav.' + k)}</span>
              {k === 'alerts' && open > 0 && <em className="badge">{open}</em>}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <Toggles />
          <div className="who"><div className="avatar">{user.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div><div><b>{user.name}</b><span>{roleName(t, user.role, user.roleLabel)}</span></div></div>
          <button className="ghost" onClick={logout}><LogOut size={16} /> {t('signout')}</button>
        </div>
      </aside>
      <main className="main">
        <header className="top">
          <h1>{t('title.' + key) === 'title.' + key ? 'Chantier360' : t('title.' + key)}</h1>
          <div className="tenant"><span className="dot" /> {user.tenant?.companyName} · Cameroon</div>
        </header>
        <div className="content">{children}</div>
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

export function PortalLayout({ children }) {
  const { user, logout, toast, t } = useStore();
  return (
    <div className="portal">
      <header className="portal-top">
        <Link to="/" className="portal-brand"><img src="/logo.png" alt="" /><div><b>Chantier360</b><span>{user.tenant?.companyName}</span></div></Link>
        <div className="portal-tools"><Toggles /><span className="portal-user">{user.name}</span><button className="ghost slim" onClick={logout}><LogOut size={15} /> {t('signout')}</button></div>
      </header>
      <div className="portal-body">{children}</div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
