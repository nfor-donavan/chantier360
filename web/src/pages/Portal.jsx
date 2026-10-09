import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Clock } from 'lucide-react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { Bar, Lightbox } from '../components/bits.jsx';
import { fmtDate } from '../utils.js';

// What the client sees: approved information only. The server decides what is included.
export function PortalHome() {
  const { t, lang, user } = useStore();
  const list = useApi(api.portalProjects);
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
              <p className="muted">{p.locationCity} · {t('po.expected')}: {fmtDate(p.endDate, lang)}</p>
              <div className="big-pct sm">{Math.round(p.progressPct)}<small>%</small></div>
              <Bar value={p.progressPct} />
              <p className="muted small">{p.currentPhase}</p>
              <span className="btn ok inline">{t('po.view')}</span>
            </Link>
          ))}
        </div>
      </>
    )}</Gate>
  );
}

export function PortalProject() {
  const { id } = useParams();
  return <Detail key={id} id={id} />;
}
function Detail({ id }) {
  const { t, lang } = useStore();
  const d = useApi(() => api.portalProject(id));
  const [view, setView] = useState(null);
  return (
    <Gate states={[d]}>{() => {
      const { project: p, categories, milestones, photos, updates, stats } = d.data;
      return (
        <>
          <Link to="/" className="back"><ArrowLeft size={16} /> {t('po.yourProjects')}</Link>
          <div className="proj-head"><div><h2>{p.name}</h2><p className="muted">{p.location}{p.client ? ` · ${p.client}` : ''}</p></div><span className="tag ok">{t('status.' + p.status)}</span></div>
          <div className="grid2 wide-left">
            <section className="panel">
              <h3>{t('po.progress')}</h3>
              <div className="big-pct">{Math.round(p.progressPct)}<small>%</small></div>
              <Bar value={p.progressPct} />
              <p className="muted" style={{ marginTop: 8 }}>{t('ov.phase')}: <b>{p.currentPhase || '-'}</b> · {t('po.expected')}: <b>{fmtDate(p.endDate, lang)}</b></p>
              <div style={{ marginTop: 16 }}>{categories.map((c) => <div className="cat" key={c.category}><span>{c.category}</span><Bar value={c.progressPct} /><b>{Math.round(c.progressPct)}%</b></div>)}</div>
            </section>
            <section className="panel">
              <h3>{t('po.stats')}</h3>
              <div className="stats">
                <div><b>{stats.completed}</b><span>{t('ov.completed')}</span></div><div><b>{stats.inProgress}</b><span>{t('ov.inprogress')}</span></div>
                <div><b>{stats.notStarted}</b><span>{t('ov.notstarted')}</span></div><div><b>{stats.milestonesDone}/{stats.milestonesTotal}</b><span>{t('ov.milestones')}</span></div>
              </div>
            </section>
          </div>
          <div className="grid2">
            <section className="panel">
              <h3>{t('po.timeline')}</h3>
              <ol className="tline">{milestones.map((m, i) => <li key={i} className={m.status}>{m.status === 'Completed' ? <CheckCircle2 className="ms done" size={22} /> : m.status === 'InProgress' ? <Clock className="ms now" size={22} /> : <Circle className="ms" size={22} />}<div><b>{m.name}</b><span>{fmtDate(m.plannedDate, lang)}</span></div></li>)}</ol>
            </section>
            <section className="panel">
              <h3>{t('po.updates')}</h3>
              {updates.length === 0 && <p className="muted">{t('po.noUpdates')}</p>}
              {updates.map((u, i) => <div className="feed" key={i}><p>{u.message}</p><span>{fmtDate(u.date, lang)}</span></div>)}
            </section>
          </div>
          <section className="panel">
            <h3>{t('po.photos')}</h3>
            {photos.length === 0 ? <p className="muted">{t('po.noPhotos')}</p> : (
              <div className="gallery">{photos.map((ph, i) => <figure key={i}><img src={ph.url} alt={ph.caption || ''} onClick={() => setView(ph)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setView(ph)} /><figcaption><b>{ph.caption}</b><span>{fmtDate(ph.takenAt, lang)}</span></figcaption></figure>)}</div>
            )}
          </section>
          <Lightbox photo={view} onClose={() => setView(null)} label={t('close')} />
        </>
      );
    }}</Gate>
  );
}
