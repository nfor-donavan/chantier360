import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { Bar } from '../components/bits.jsx';
import { fmtDate, fmtXAF } from '../utils.js';

export default function Projects() {
  const { t, lang, can, notify } = useStore();
  const nav = useNavigate();
  const list = useApi(api.projects);
  const [form, setForm] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const create = async (e) => {
    e.preventDefault();
    try { const p = await api.createProject({ ...form, status: 'Planning' }); notify(t('toast.saved')); nav(`/projects/${p._id}`); } catch (err) { notify(err.message); }
  };
  return (
    <Gate states={[list]}>{() => <Body list={list.data} t={t} lang={lang} can={can} form={form} setForm={setForm} set={set} create={create} nav={nav} />}</Gate>
  );
}

function Body({ list, t, lang, can, form, setForm, set, create, nav }) {
  const { months, t0, t1 } = useMemo(() => {
    const starts = list.map((p) => +new Date(p.startDate)).filter(Boolean), ends = list.map((p) => +new Date(p.endDate || p.startDate)).filter(Boolean);
    const a = new Date(Math.min(...starts, Date.now())); a.setUTCDate(1);
    const b = new Date(Math.max(...ends, Date.now())); b.setUTCMonth(b.getUTCMonth() + 2, 1);
    const ms = []; for (const d = new Date(a); d < b; d.setUTCMonth(d.getUTCMonth() + 1)) ms.push(new Date(d));
    return { months: ms, t0: +a, t1: +b };
  }, [list]);
  const pos = (d) => Math.min(100, Math.max(0, ((+new Date(d) - t0) / (t1 - t0)) * 100));
  return (
    <>
      {can('MANAGE_PROJECTS') && (
        <div className="toolbar">
          {!form ? <button className="btn ok" onClick={() => setForm({ siteName: '', locationCity: '', startDate: '', endDate: '' })}><Plus size={15} /> {t('proj.new')}</button> : (
            <form className="inline-form" onSubmit={create}>
              <input required placeholder={t('proj.name')} value={form.siteName} onChange={set('siteName')} />
              <input required placeholder={t('proj.city')} value={form.locationCity} onChange={set('locationCity')} />
              <label className="mini">{t('proj.start')}<input required type="date" value={form.startDate} onChange={set('startDate')} /></label>
              <label className="mini">{t('proj.end')}<input type="date" value={form.endDate} onChange={set('endDate')} /></label>
              <button className="btn ok" type="submit">{t('proj.create')}</button><button type="button" className="btn no" onClick={() => setForm(null)}>{t('cancel')}</button>
            </form>
          )}
        </div>
      )}
      <section className="panel">
        <h3>{t('gantt.title')}</h3>
        <div className="gantt">
          <div className="g-head"><div className="g-label" /><div className="g-track months">
            {months.map((m, i) => (i % 2 === 0 || months.length < 14) && <span key={i} style={{ left: `${pos(m)}%` }}>{m.toLocaleString(lang === 'fr' ? 'fr' : 'en', { month: 'short', timeZone: 'UTC' })}{m.getUTCMonth() === 0 || i === 0 ? ` ${m.getUTCFullYear()}` : ''}</span>)}
          </div></div>
          {list.map((s) => {
            const l = pos(s.startDate), w = Math.max(2, pos(s.endDate || s.startDate) - l);
            return (
              <div className="g-row" key={s._id}>
                <div className="g-label"><Link to={`/projects/${s._id}`}><b>{s.siteName}</b></Link><span>{s.locationCity}</span></div>
                <div className="g-track">
                  <div className={'bar clickable ' + s.status.toLowerCase()} style={{ left: `${l}%`, width: `${w}%` }} onClick={() => nav(`/projects/${s._id}`)} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && nav(`/projects/${s._id}`)}>
                    <i style={{ width: `${s.progressPct}%` }} /><em>{Math.round(s.progressPct)}%</em>
                  </div>
                  <div className="today" style={{ left: `${pos(Date.now())}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="muted legend">{t('gantt.legend')}</p>
      </section>
      <div className="site-cards">
        {list.map((s) => {
          const hasFin = s.budgetXAF != null;
          return (
            <Link to={`/projects/${s._id}`} className="panel site card-link" key={s._id}>
              <div className="site-top"><h4>{s.siteName}</h4><span className={'tag ' + (s.status === 'Active' ? 'ok' : s.status === 'Suspended' ? 'bad' : 'neutral')}>{t('status.' + s.status)}</span></div>
              <p className="muted">{s.locationCity}{s.client?.name ? ` · ${s.client.name}` : ''} · {fmtDate(s.startDate, lang)} {t('to')} {fmtDate(s.endDate, lang)}</p>
              <div className="split big"><span>{t('progress')}</span><b>{Math.round(s.progressPct)}%</b></div>
              <Bar value={s.progressPct} />
              {hasFin && <div className="split"><span>{fmtXAF(s.spentXAF)} {t('spent.word')}</span><span>{fmtXAF(s.budgetXAF)} {t('budget.word')}</span></div>}
              <div className="split"><span>{s.currentPhase}</span><span>{s.plannedWorkers} {t('planned.workers')}</span></div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
