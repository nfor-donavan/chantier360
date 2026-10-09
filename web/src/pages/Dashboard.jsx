import React from 'react';
import { Link } from 'react-router-dom';
import { Bar as RBar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { fmtDate, fmtXAF, pct } from '../utils.js';

export default function Dashboard() {
  const { t, lang, theme } = useStore();
  const dash = useApi(api.dashboard);
  const c = theme === 'dark'
    ? { grid: '#243656', budget: '#3F5681', mute: '#93A3C0', card: '#121F38', ink: '#E8EEF9', prog: '#4C7BD9' }
    : { grid: '#E3E7EC', budget: '#C9D2DE', mute: '#66728A', card: '#FFFFFF', ink: '#14213A', prog: '#0F1E38' };
  const tip = { contentStyle: { background: c.card, border: `1px solid ${c.grid}`, borderRadius: 8, color: c.ink }, cursor: { fill: 'transparent' } };
  const tick = { fill: c.mute, fontSize: 12 };
  return (
    <Gate states={[dash]}>{() => {
      const d = dash.data;
      const pending = d.pending.attendance + d.pending.requests;
      const prog = d.projects.map((p) => ({ name: p.siteName.length > 14 ? p.siteName.slice(0, 13) + '…' : p.siteName, [t('chart.pct')]: Math.round(p.progressPct) }));
      const fin = d.financials ? d.projects.map((p) => ({ name: p.locationCity, [t('budget')]: Math.round((p.budgetXAF || 0) / 1e6), [t('spent')]: Math.round((p.spentXAF || 0) / 1e6) })) : null;
      const weekly = (d.weeklyShortfall || []).map((w) => ({ week: w.week.slice(5), [t('short.units')]: w.shortUnits }));
      return (
        <>
          <div className="kpis">
            <div className="kpi"><span>{t('kpi.projects')}</span><b>{d.counts.active}<small> {t('of')} {d.counts.total}</small></b><small>{d.counts.completed} {t('kpi.completed')}</small></div>
            {d.financials && <div className="kpi"><span>{t('kpi.spent')}</span><b>{fmtXAF(d.financials.spentXAF)}</b><small>{d.financials.budgetXAF ? Math.round((d.financials.spentXAF / d.financials.budgetXAF) * 100) : 0}% {t('kpi.ofbudget')} {fmtXAF(d.financials.budgetXAF)}</small></div>}
            {d.alerts && <div className={'kpi ' + (d.alerts.open ? 'warn' : '')}><span>{t('kpi.alerts')}</span><b>{d.alerts.open}</b><small>{d.alerts.high} {t('kpi.high')}</small></div>}
            {(d.pending.attendance > 0 || d.pending.requests > 0 || pending === 0) && <div className="kpi"><span>{t('kpi.pending')}</span><b>{pending}</b><small>{t('kpi.pending.sub')}</small></div>}
            {d.workforce && <div className="kpi"><span>{t('kpi.workers')}</span><b>{d.workforce.latestTotal}</b><small>{t('kpi.workers.sub')}</small></div>}
            {d.deliveries && <div className={'kpi ' + (d.deliveries.flaggedThisWeek ? 'warn' : '')}><span>{t('kpi.flagged')}</span><b>{d.deliveries.flaggedThisWeek}</b><small>{t('kpi.flagged.sub')} {d.deliveries.thisWeek}</small></div>}
          </div>

          <div className="grid2">
            <section className="panel">
              <h3>{t('chart.progress')}</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={prog}>
                  <CartesianGrid vertical={false} stroke={c.grid} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={tick} interval={0} />
                  <YAxis tickLine={false} axisLine={false} width={40} tick={tick} domain={[0, 100]} />
                  <Tooltip {...tip} />
                  <RBar dataKey={t('chart.pct')} fill={c.prog} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
            {fin ? (
              <section className="panel">
                <h3>{t('chart.budget')} <small>{t('chart.munit')}</small></h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={fin} barGap={4}>
                    <CartesianGrid vertical={false} stroke={c.grid} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={tick} />
                    <YAxis tickLine={false} axisLine={false} width={50} tick={tick} />
                    <Tooltip {...tip} />
                    <RBar dataKey={t('budget')} fill={c.budget} radius={[3, 3, 0, 0]} />
                    <RBar dataKey={t('spent')} fill="#F5B800" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </section>
            ) : d.weeklyShortfall && (
              <section className="panel">
                <h3>{t('chart.short')} <small>{t('chart.week')}</small></h3>
                {weekly.length === 0 ? <p className="muted">{t('chart.empty')}</p> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={weekly}><CartesianGrid vertical={false} stroke={c.grid} /><XAxis dataKey="week" tickLine={false} axisLine={false} tick={tick} /><YAxis tickLine={false} axisLine={false} width={40} tick={tick} allowDecimals={false} /><Tooltip {...tip} />
                      <Line type="monotone" dataKey={t('short.units')} stroke="#E25555" strokeWidth={3} dot={{ r: 4 }} /></LineChart>
                  </ResponsiveContainer>
                )}
              </section>
            )}
          </div>

          <div className="grid2">
            <section className="panel">
              <h3>{t('dash.delayed')}</h3>
              {d.delayed.length === 0 && <p className="muted">{t('dash.none')}</p>}
              {d.delayed.map((p) => <Link key={p.id} to={`/projects/${p.id}`} className="row-link"><b>{p.siteName}</b><span className="tag bad">{Math.round(p.progressPct)}% / {p.expectedPct}% {t('dash.expected')}</span></Link>)}
              <h3 className="sub">{t('dash.upcoming')}</h3>
              {d.upcoming.length === 0 && <p className="muted">{t('dash.none')}</p>}
              {d.upcoming.map((p) => <Link key={p.id} to={`/projects/${p.id}`} className="row-link"><b>{p.siteName}</b><span className="muted">{fmtDate(p.endDate, lang)} · {Math.round(p.progressPct)}%</span></Link>)}
            </section>
            {d.alerts && (
              <section className="panel">
                <h3>{t('attention')} <Link to="/alerts">{t('allalerts')}</Link></h3>
                {d.alerts.top.map((a) => (
                  <div key={a._id} className={'feed ' + a.severity.toLowerCase()}>
                    <b>{t('kind.' + a.kind)} · {a.siteId?.siteName}</b><p>{lang === 'fr' && a.messageFr ? a.messageFr : a.message}</p><span>{fmtDate(a.createdAt, lang)}</span>
                  </div>
                ))}
                {d.alerts.top.length === 0 && <p className="muted">{t('attention.none')}</p>}
              </section>
            )}
          </div>

          {d.deliveries && (
            <section className="panel">
              <h3>{t('latest')} <Link to="/materials">{t('viewall')}</Link></h3>
              <table>
                <thead><tr><th>{t('col.material')}</th><th>{t('col.site')}</th><th className="r">{t('col.ordered')}</th><th className="r">{t('col.received')}</th><th>{t('col.check')}</th></tr></thead>
                <tbody>{d.deliveries.latest.map((l) => { const p = pct(l.quantityOrdered, l.quantityReceived); return (
                  <tr key={l._id}><td>{l.materialType}</td><td>{l.siteName}</td><td className="r">{l.quantityOrdered}</td><td className="r">{l.quantityReceived}</td>
                    <td>{p > 0 ? <span className="tag bad">{p.toFixed(1)}% {t('short')}</span> : <span className="tag ok">{t('complete')}</span>}</td></tr>); })}</tbody>
              </table>
            </section>
          )}

          <div className="grid2">
            {d.recentReports && (
              <section className="panel">
                <h3>{t('dash.reports')} <Link to="/reports">{t('viewall')}</Link></h3>
                {d.recentReports.length === 0 && <p className="muted">{t('rp.none')}</p>}
                {d.recentReports.map((r) => <Link key={r._id} to={`/projects/${r.siteId?._id}`} className="row-link"><b>{r.siteId?.siteName}</b><span className="muted">{fmtDate(r.date, lang)} · {r.submittedBy?.name}</span></Link>)}
              </section>
            )}
            {d.recentPhotos && (
              <section className="panel">
                <h3>{t('dash.photos')}</h3>
                {d.recentPhotos.length === 0 ? <p className="muted">{t('ph.empty')}</p> : <div className="photo-row">{d.recentPhotos.map((p) => <Link key={p._id} to={`/projects/${p.siteId}`} title={p.siteName}><img src={p.url} alt={p.caption || ''} /></Link>)}</div>}
              </section>
            )}
          </div>
        </>
      );
    }}</Gate>
  );
}
