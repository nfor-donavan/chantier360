import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useStore } from '../store.jsx';
import { demoAccounts } from '../data.js';

export default function Login() {
  const { login } = useStore();
  const [email, setEmail] = useState(demoAccounts[0].email);
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const submit = (e) => { e.preventDefault(); if (!login(email.trim(), password)) setError('Email or password is incorrect. Use one of the demo accounts.'); };
  return (
    <div className="login">
      <section className="login-hero">
        <img src="/logo.png" alt="Chantier360" className="login-logo" />
        <h1>Chantier360</h1>
        <p>Every bag, every worker, every franc on every site, accounted for.</p>
        <ul>
          <li><ShieldCheck size={18} /> Delivery shortfalls flagged the moment a foreman logs them</li>
          <li><ShieldCheck size={18} /> Daily headcount verified against a site photo</li>
          <li><ShieldCheck size={18} /> Works on site foremen's phones, even without network</li>
        </ul>
      </section>
      <section className="login-form">
        <form onSubmit={submit}>
          <h2>Sign in to the HQ portal</h2>
          <p className="muted">MAC Construction Co. · demo workspace</p>
          <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
          <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
          {error && <div className="err">{error}</div>}
          <button className="primary" type="submit">Sign in</button>
        </form>
        <div className="demo">
          <p className="muted">Or open the dashboard directly as:</p>
          {demoAccounts.map((a) => (
            <button key={a.id} className="demo-card" onClick={() => login(a.email, a.password)}>
              <div className="avatar">{a.initials}</div><div><b>{a.name}</b><span>{a.role}</span></div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
