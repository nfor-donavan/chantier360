import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useStore } from '../store.jsx';
import { Toggles } from '../components/Layout.jsx';

const accounts = [
  { name: 'Mballa Armand', role: 'director', email: 'ceo@mac-construction.cm', initials: 'MA' },
  { name: 'Ngo Biyong Estelle', role: 'engineer', email: 'engineer@mac-construction.cm', initials: 'NE' },
  { name: 'Me Abena Claire', role: 'client', email: 'client@ordre-avocats.cm', initials: 'AC' },
];

export default function Login() {
  const { login, t } = useStore();
  const [email, setEmail] = useState(accounts[0].email);
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async (e, p) => {
    setBusy(true); setError('');
    try { await login(e.trim(), p); } catch (err) { setError(err.status === 0 || err.message === 'network' ? t('err.network') : err.message === 'nohq' ? t('nohq') : err.message); }
    setBusy(false);
  };
  return (
    <div className="login">
      <section className="login-hero">
        <img src="/logo.png" alt="Chantier360" className="login-logo" />
        <h1>Chantier360</h1>
        <p>{t('hero.tag')}</p>
        <ul>{['1', '2', '3'].map((n) => <li key={n}><ShieldCheck size={18} /> {t('hero.' + n)}</li>)}</ul>
      </section>
      <section className="login-form">
        <div className="login-tools"><Toggles /></div>
        <form onSubmit={(e) => { e.preventDefault(); go(email, password); }}>
          <h2>{t('login.title')}</h2>
          <p className="muted">{t('login.sub')}</p>
          <label>{t('email')}<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
          <label>{t('password')}<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
          {busy && <div className="note">{t('wake')}</div>}
          {error && <div className="err" role="alert">{error}</div>}
          <button className="primary" type="submit" disabled={busy}>{busy ? t('signingin') : t('signin')}</button>
        </form>
        <div className="demo">
          <p className="muted">{t('login.direct')}</p>
          {accounts.map((a) => (
            <button key={a.email} className="demo-card" disabled={busy} onClick={() => go(a.email, 'demo1234')}>
              <div className="avatar">{a.initials}</div><div><b>{a.name}</b><span>{t('role.' + a.role)}</span></div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
