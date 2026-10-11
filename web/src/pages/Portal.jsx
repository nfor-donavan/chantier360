import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Clock } from 'lucide-react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { Bar, Lightbox } from '../components/bits.jsx';
import { fmtDate, num } from '../utils.js';

// What the client sees: only what the Director has released. The server decides what is included.
export function PortalHome() {
  const { t, lang, user } = useStore();
  const list = useApi(api.portalProjects, { every: 60000 });
  return (
    <Gate states={[list]}>{() => (
      <>
        <h2 className="portal-h">{t('po.welcome')}, {user.name}</h2>
        <h3 className="portal-sub">{t('po.yourProjects')}</h3>
        {list.data.length === 0 && <p className="muted">{t('po.empty')}</p>}
        <div className="site-cards">
          {list.data.map((p) => (
            <Link to={`/p/${p._id}`} className="panel site card-link" key={p._id}>
              <div className="site-top"><h4>{p.siteName}</h4><span className="tag ok">{t('status.' + p.status)}</span></div>
              <p className="muted">{p.locationCity}{p.endDate ? ` · ${t('po.expected')}: ${fmtDate(p.endDate, lang)}` : ''}</p>
              {p.progressPct != null && <><div className="big-pct sm">{Math.round(p.progressPct)}<small>%</small></div><Bar value={p.progressPct} /></>}
              {p.currentPhase && <p className="muted small">{p.currentPhase}</p>}
              <span className="btn ok inline">{t('po.view')}</span>
            </Link>
          ))}
        </div>
      </>
    )}</Gate>
  );
}

export function PortalProject() { const { id } = useParams(); return <Detail key={id} id={id} />; }

const Ms = ({ s }) => (s === 'Completed' ? <CheckCircle2 className="ms done" size={22} /> : s === 'InProgress' ? <Clock className="ms now" size={22} /> : <Circle className="ms" size={22} />);

function Detail({ id }) {
  const { t, lang } = useStore();
  const d = useApi(() => api.portalProject(id), { every: 60000 });
  const [view, setView] = useState(null);
  return (
    <Gate states={[d]}>{() => {
      const { project: p, sections: on, categories = [], milestones = [], photos = [], videos = [], updates = [], stats, dailyReports = [], weeklyReports = [] } = d.data;
      const nothing = !on.progress && !on.timeline && !on.photos && !on.videos && !on.reports && !on.statistics;
      return (
        <>
          <Link to="/" className="back"><ArrowLeft size={16} /> {t('po.yourProjects')}</Link>
          <div className="proj-head"><div><h2>{p.name}</h2><p className="muted">{p.location}{p.client ? ` · ${p.client}` : ''}</p></div><span className="tag ok">{t('status.' + p.status)}</span></div>
          {(nothing && updates.length === 0) && <section className="panel"><p className="muted">{t('po.limited')}</p></section>}
          {(on.progress || on.statistics) && (
            <div className="grid2 wide-left">
              {on.progress && (
                <section className="panel">
                  <h3>{t('po.progress')}</h3>
                  <div className="big-pct">{Math.round(p.progressPct)}<small>%</small></div>
                  <Bar value={p.progressPct} />
                  {on.timeline && <p className="muted" style={{ marginTop: 8 }}>{t('ov.phase')}: <b>{p.currentPhase || '-'}</b> · {t('po.expected')}: <b>{fmtDate(p.endDate, lang)}</b></p>}
                  <div style={{ marginTop: 16 }}>{categories.map((c) => <div className="cat" key={c.category}><span>{c.category}</span><Bar value={c.progressPct} /><b>{Math.round(c.progressPct)}%</b></div>)}</div>
                </section>
              )}
              {on.statistics && stats && (
                <section className="panel">
                  <h3>{t('po.stats')}</h3>
                  <div className="stats">
                    <div><b>{stats.completed}</b><span>{t('ov.completed')}</span></div><div><b>{stats.inProgress}</b><span>{t('ov.inprogress')}</span></div>
                    <div><b>{stats.notStarted}</b><span>{t('ov.notstarted')}</span></div><div><b>{stats.milestonesDone}/{stats.milestonesTotal}</b><span>{t('ov.milestones')}</span></div>
                  </div>
                </section>
              )}
            </div>
          )}
          {(on.timeline || updates.length > 0) && (
            <div className="grid2">
              {on.timeline && <section className="panel"><h3>{t('po.timeline')}</h3><ol className="tline">{milestones.map((m, i) => <li key={i} className={m.status}><Ms s={m.status} /><div><b>{m.name}</b><span>{fmtDate(m.plannedDate, lang)}</span></div></li>)}</ol></section>}
              <section className="panel"><h3>{t('po.updates')}</h3>{updates.length === 0 && <p className="muted">{t('po.noUpdates')}</p>}{updates.map((u, i) => <div className="feed" key={i}><p>{u.message}</p><span>{fmtDate(u.date, lang)}</span></div>)}</section>
            </div>
          )}
          {on.photos && <section className="panel"><h3>{t('po.photos')}</h3>{photos.length === 0 ? <p className="muted">{t('po.noPhotos')}</p> : <div className="gallery">{photos.map((ph, i) => <figure key={i}><img src={ph.url} alt={ph.caption || ''} onClick={() => setView(ph)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setView(ph)} /><figcaption><b>{ph.caption}</b><span>{fmtDate(ph.takenAt, lang)}</span></figcaption></figure>)}</div>}</section>}
          {on.videos && videos.length > 0 && <section className="panel"><h3>{t('po.videos')}</h3><div className="gallery">{videos.map((v, i) => <figure key={i}><video src={v.url} controls preload="metadata" /><figcaption><b>{v.caption}</b><span>{fmtDate(v.takenAt, lang)}</span></figcaption></figure>)}</div></section>}
          {on.reports && (
            <>
              {weeklyReports.length > 0 && <section className="panel"><h3>{t('po.weekly')}</h3>{weeklyReports.map((w, i) => (
                <div key={i} className="task-group"><h4>{fmtDate(w.weekStart, lang)} {t('to')} {fmtDate(w.weekEnd, lang)}</h4>
                  <table><thead><tr><th>{t('tk.task')}</th><th>{t('tk.unit')}</th><th className="r">{t('tk.total')}</th><th className="r">{t('rt.cum')}</th><th className="r">{t('rt.week.qty')}</th><th className="r">{t('tk.rate')}</th></tr></thead>
                    <tbody>{w.rows.map((r, j) => <tr key={j}><td>{r.name}</td><td>{r.unit}</td><td className="r">{num(r.totalQty)}</td><td className="r">{num(r.cumulativeQty)}</td><td className="r">{num(r.weeklyQty)}</td><td className="r"><b>{Math.round(r.progressPct)}%</b></td></tr>)}</tbody></table></div>))}</section>}
              {dailyReports.length > 0 && <section className="panel"><h3>{t('po.daily')}</h3>{dailyReports.map((r, i) => (
                <div key={i} className="task-group"><h4>{fmtDate(r.date, lang)}</h4>
                  {r.work.length > 0 && <table><thead><tr><th>{t('tk.task')}</th><th className="r">{t('qty')}</th><th>{t('tk.unit')}</th><th className="r">{t('tk.rate')}</th></tr></thead><tbody>{r.work.map((w, j) => <tr key={j}><td>{w.name}</td><td className="r">{num(w.quantity)}</td><td>{w.unit}</td><td className="r">{w.progressPct != null ? `${w.progressPct}%` : ''}</td></tr>)}</tbody></table>}
                  {r.tomorrowPlan && <p className="muted"><b>{t('po.tomorrow')}:</b> {r.tomorrowPlan}</p>}
                  {r.media.length > 0 && <div className="photo-row">{r.media.map((m, j) => (m.kind === 'video' ? <video key={j} src={m.url} controls preload="metadata" /> : <img key={j} src={m.url} alt={m.caption || ''} onClick={() => setView(m)} />))}</div>}
                </div>))}</section>}
            </>
          )}
          <Lightbox photo={view} onClose={() => setView(null)} label={t('close')} />
        </>
      );
    }}</Gate>
  );
}
