import React, { createContext, useContext, useMemo, useState } from 'react';
import { attendance as a0, deliveries as d0, requests as r0, demoAccounts, shortfallPct } from './data.js';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('c360_user')); } catch { return null; }
  });
  const [attendance, setAttendance] = useState(a0);
  const [requests, setRequests] = useState(r0);
  const [deliveries] = useState(d0);
  const [ack, setAck] = useState({});
  const [toast, setToast] = useState(null);

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const login = (email, password) => {
    const u = demoAccounts.find((x) => x.email === email && x.password === password);
    if (!u) return false;
    localStorage.setItem('c360_user', JSON.stringify(u)); setUser(u); return true;
  };
  const logout = () => { localStorage.removeItem('c360_user'); setUser(null); };

  const approveAttendance = (id) => { setAttendance((l) => l.map((x) => (x.id === id ? { ...x, status: 'Approved' } : x))); notify('Attendance approved'); };
  const decideRequest = (id, status) => { setRequests((l) => l.map((x) => (x.id === id ? { ...x, status } : x))); notify(`Request ${status.toLowerCase()}`); };
  const acknowledge = (id) => { setAck((a) => ({ ...a, [id]: true })); notify('Alert acknowledged'); };

  // Alerts are derived from the same data the foremen submit.
  const alerts = useMemo(() => {
    const out = [];
    deliveries.forEach((d) => {
      const p = shortfallPct(d);
      if (p > 0) out.push({ id: `al-${d.id}`, kind: 'Short delivery', severity: p >= 8 ? 'High' : 'Medium', siteId: d.siteId, date: d.date,
        text: `${d.material}: ${d.received} of ${d.ordered} received (${p.toFixed(1)}% short) from ${d.supplier}.` });
    });
    attendance.forEach((a) => {
      if (a.present > a.expected * 1.1) out.push({ id: `al-${a.id}`, kind: 'Headcount anomaly', severity: 'High', siteId: a.siteId, date: a.date,
        text: `${a.present} workers logged against ${a.expected} planned. Check the site photo before approving payroll.` });
    });
    out.push({ id: 'al-b1', kind: 'Budget watch', severity: 'Medium', siteId: 's3', date: '2026-09-30',
      text: 'Spending has reached 84% of budget with 83% of the work complete.' });
    return out.map((a) => ({ ...a, acknowledged: !!ack[a.id] })).sort((x, y) => y.date.localeCompare(x.date));
  }, [deliveries, attendance, ack]);

  return (
    <Ctx.Provider value={{ user, login, logout, attendance, requests, deliveries, alerts, approveAttendance, decideRequest, acknowledge, toast }}>
      {children}
    </Ctx.Provider>
  );
}
