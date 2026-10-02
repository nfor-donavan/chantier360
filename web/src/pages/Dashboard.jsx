import React from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../store.jsx';
import { fmtDate, fmtXAF, shortfallPct, siteName, sites, weeklyLoss } from '../data.js';

export default function Dashboard() {
  const { alerts, attendance, requests, deliveries } = useStore();
  const budget = sites.reduce((s, x) => s + x.budget, 0);
  const spent = sites.reduce((s, x) => s + x.spent, 0);
  const pending = attendance.filter((a) => a.status === 'Pending').length + requests.filter((r) => r.status === 'Pending').length;
  const open = alerts.filter((a) => !a.acknowledged);
  const chart = sites.map((s) => ({ name: s.city, Budget: +(s.budget / 1e6).toFixed(0), Spent: +(s.spent / 1e6).toFixed(0) }));
  return (
    <>
      <div className="kpis">
        <div className="kpi"><span>Active sites</span><b>{sites.filter((s) => s.status === 'Active').length}<small> of {sites.length}</small></b></div>
        <div className="kpi"><span>Spent to date</span><b>{fmtXAF(spent)}</b><small>{Math.round((spent / budget) * 100)}% of {fmtXAF(budget)}</small></div>
        <div className={'kpi ' + (open.length ? 'warn' : '')}><span>Open alerts</span><b>{open.length}</b><small>{open.filter((a) => a.severity === 'High').length} high priority</small></div>
        <div className="kpi"><span>Awaiting your approval</span><b>{pending}</b><small>attendance and material requests</small></div>
      </div>

      <div className="grid2">
        <section className="panel">
          <h3>Budget against spend by site <small>millions FCFA</small></h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chart} barGap={4}>
              <CartesianGrid vertical={false} stroke="#E3E7EC" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={50} />
              <Tooltip />
              <Bar dataKey="Budget" fill="#C9D2DE" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Spent" fill="#F5B800" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="panel">
          <h3>Materials lost to short deliveries <small>millions FCFA per week</small></h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weeklyLoss}>
              <CartesianGrid vertical={false} stroke="#E3E7EC" />
              <XAxis dataKey="week" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={40} />
              <Tooltip />
              <Line type="monotone" dataKey="loss" name="Loss" stroke="#D64545" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className="grid2 wide-left">
        <section className="panel">
          <h3>Latest deliveries <Link to="/materials">View all</Link></h3>
          <table>
            <thead><tr><th>Material</th><th>Site</th><th className="r">Ordered</th><th className="r">Received</th><th>Check</th></tr></thead>
            <tbody>
              {deliveries.slice(0, 6).map((d) => {
                const p = shortfallPct(d);
                return (
                  <tr key={d.id}><td>{d.material}</td><td>{siteName(d.siteId)}</td><td className="r">{d.ordered}</td><td className="r">{d.received}</td>
                    <td>{p > 0 ? <span className="tag bad">{p.toFixed(1)}% short</span> : <span className="tag ok">Complete</span>}</td></tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h3>Needs attention <Link to="/alerts">All alerts</Link></h3>
          {open.slice(0, 4).map((a) => (
            <div key={a.id} className={'feed ' + a.severity.toLowerCase()}>
              <b>{a.kind} · {siteName(a.siteId)}</b><p>{a.text}</p><span>{fmtDate(a.date)}</span>
            </div>
          ))}
          {open.length === 0 && <p className="muted">Nothing needs attention. New flags appear here as foremen sync.</p>}
        </section>
      </div>
    </>
  );
}
