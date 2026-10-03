import React from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { fmtDate, fmtXAF, pct } from '../utils.js';

export default function Dashboard() {
  const { t, lang, theme } = useStore();
  const sites = useApi(api.sites), dash = useApi(api.dashboard), logs = useApi(api.logs), alerts = useApi(() => api.alerts(true));
  const c = theme === 'dark'
    ? { grid: '#243656', budget: '#3F5681', mute: '#93A3C0', card: '#121F38', ink: '#E8EEF9' }
    : { grid: '#E3E7EC', budget: '#C9D2DE', mute: '#66728A', card: '#FFFFFF', ink: '#14213A' };
  const tip = { contentStyle: { background: c.card, border: `1px solid ${c.grid}`, borderRadius: 8, color: c.ink }, cursor: { fill: 'transparent' } };
  const tick = { fill: c.mute, fontSize: 12 };
  return (
    <Gate states={[sites, dash, logs, alerts]}>{() => {
      const d = dash.data;
      const chart = sites.data.map((s) => ({ name: s.locationCity, [t('budget')]: Math.round(s.budgetXAF / 1e6), [t('spent')]: Math.round(s.spentXAF / 1e6) }));
      const weekly = d.weeklyShortfall.map((w) => ({ week: w.week.slice(5), [t('short.units')]: w.shortUnits }));
      return (
        <>
          <div className="kpis">
            <div className="kpi"><span>{t('kpi.active')}</span><b>{d.sites.active}<small> {t('of')} {d.sites.total}</small></b></div>
            <div className="kpi"><span>{t('kpi.spent')}</span><b>{fmtXAF(d.spentXAF)}</b><small>{d.budgetXAF ? Math.round((d.spentXAF / d.budgetXAF) * 100) : 0}% {t('kpi.ofbudget')} {fmtXAF(d.budgetXAF)}</small></div>
            <div className={'kpi ' + (d.openAlerts ? 'warn' : '')}><span>{t('kpi.alerts')}</span><b>{d.openAlerts}</b><small>{d.highAlerts} {t('kpi.high')}</small></div>
            <div className="kpi"><span>{t('kpi.pending')}</span><b>{d.pendingApprovals}</b><small>{t('kpi.pending.sub')}</small></div>
          </div>

          <div className="grid2">
            <section className="panel">
              <h3>{t('chart.budget')} <small>{t('chart.munit')}</small></h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chart} barGap={4}>
                  <CartesianGrid vertical={false} stroke={c.grid} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={tick} />
                  <YAxis tickLine={false} axisLine={false} width={50} tick={tick} />
                  <Tooltip {...tip} />
                  <Bar dataKey={t('budget')} fill={c.budget} radius={[3, 3, 0, 0]} />
                  <Bar dataKey={t('spent')} fill="#F5B800" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
            <section className="panel">
              <h3>{t('chart.short')} <small>{t('chart.week')}</small></h3>
              {weekly.length === 0 ? <p className="muted">{t('chart.empty')}</p> : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={weekly}>
                    <CartesianGrid vertical={false} stroke={c.grid} />
                    <XAxis dataKey="week" tickLine={false} axisLine={false} tick={tick} />
                    <YAxis tickLine={false} axisLine={false} width={40} tick={tick} allowDecimals={false} />
                    <Tooltip {...tip} />
                    <Line type="monotone" dataKey={t('short.units')} stroke="#E25555" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </section>
          </div>

          <div className="grid2 wide-left">
            <section className="panel">
              <h3>{t('latest')} <Link to="/materials">{t('viewall')}</Link></h3>
              <table>
                <thead><tr><th>{t('col.material')}</th><th>{t('col.site')}</th><th className="r">{t('col.ordered')}</th><th className="r">{t('col.received')}</th><th>{t('col.check')}</th></tr></thead>
                <tbody>
                  {logs.data.slice(0, 6).map((l) => {
                    const p = pct(l.quantityOrdered, l.quantityReceived);
                    return (
                      <tr key={l._id}><td>{l.materialType}</td><td>{sites.data.find((s) => s._id === l.siteId)?.siteName}</td><td className="r">{l.quantityOrdered}</td><td className="r">{l.quantityReceived}</td>
                        <td>{p > 0 ? <span className="tag bad">{p.toFixed(1)}% {t('short')}</span> : <span className="tag ok">{t('complete')}</span>}</td></tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
            <section className="panel">
              <h3>{t('attention')} <Link to="/alerts">{t('allalerts')}</Link></h3>
              {alerts.data.slice(0, 4).map((a) => (
                <div key={a._id} className={'feed ' + a.severity.toLowerCase()}>
                  <b>{t('kind.' + a.kind)} · {a.siteId?.siteName}</b><p>{lang === 'fr' && a.messageFr ? a.messageFr : a.message}</p><span>{fmtDate(a.createdAt, lang)}</span>
                </div>
              ))}
              {alerts.data.length === 0 && <p className="muted">{t('attention.none')}</p>}
            </section>
          </div>
        </>
      );
    }}</Gate>
  );
}
