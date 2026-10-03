import React from 'react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { fmtDate, fmtXAF } from '../utils.js';

const MONTHS = Array.from({ length: 24 }, (_, i) => new Date(2025, 8 + i, 1));
const T0 = MONTHS[0].getTime(), T1 = new Date(2027, 8, 1).getTime();
const pos = (d) => Math.min(100, Math.max(0, ((new Date(d).getTime() - T0) / (T1 - T0)) * 100));

export default function Projects() {
  const { t, lang } = useStore();
  const sites = useApi(api.sites);
  return (
    <Gate states={[sites]}>{() => (
      <>
        <section className="panel">
          <h3>{t('gantt.title')} <small>{t('gantt.range')}</small></h3>
          <div className="gantt">
            <div className="g-head">
              <div className="g-label" />
              <div className="g-track months">
                {MONTHS.map((m, i) => <span key={i} style={{ left: `${pos(m)}%` }}>{m.getMonth() === 0 || i === 0 ? m.getFullYear() + ' ' : ''}{m.toLocaleString(lang === 'fr' ? 'fr' : 'en', { month: 'narrow' })}</span>)}
              </div>
            </div>
            {sites.data.map((s) => {
              const l = pos(s.startDate), w = Math.max(2, pos(s.endDate || s.startDate) - l);
              return (
                <div className="g-row" key={s._id}>
                  <div className="g-label"><b>{s.siteName}</b><span>{s.locationCity}</span></div>
                  <div className="g-track">
                    <div className={'bar ' + s.status.toLowerCase()} style={{ left: `${l}%`, width: `${w}%` }}>
                      <i style={{ width: `${s.progressPct}%` }} /><em>{s.progressPct}%</em>
                    </div>
                    <div className="today" style={{ left: `${pos(new Date())}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="muted legend">{t('gantt.legend')}</p>
        </section>
        <div className="site-cards">
          {sites.data.map((s) => {
            const burn = s.budgetXAF ? Math.round((s.spentXAF / s.budgetXAF) * 100) : 0;
            return (
              <article className="panel site" key={s._id}>
                <div className="site-top"><h4>{s.siteName}</h4><span className={'tag ' + (s.status === 'Active' ? 'ok' : s.status === 'Suspended' ? 'bad' : 'neutral')}>{t('status.' + s.status)}</span></div>
                <p className="muted">{s.locationCity} · {fmtDate(s.startDate, lang)} {t('to')} {fmtDate(s.endDate, lang)}</p>
                <div className="meter"><i style={{ width: `${Math.min(burn, 100)}%` }} className={burn > s.progressPct + 5 ? 'over' : ''} /></div>
                <div className="split"><span>{fmtXAF(s.spentXAF)} {t('spent.word')}</span><span>{fmtXAF(s.budgetXAF)} {t('budget.word')}</span></div>
                <div className="split"><span>{t('progress')} {s.progressPct}%</span><span>{s.plannedWorkers} {t('planned.workers')}</span></div>
              </article>
            );
          })}
        </div>
      </>
    )}</Gate>
  );
}
