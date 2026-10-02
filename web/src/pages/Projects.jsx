import React from 'react';
import { TODAY, fmtDate, fmtXAF, sites } from '../data.js';

const MONTHS = Array.from({ length: 24 }, (_, i) => new Date(2025, 8 + i, 1));
const T0 = MONTHS[0].getTime();
const T1 = new Date(2027, 8, 1).getTime();
const pos = (d) => ((new Date(d).getTime() - T0) / (T1 - T0)) * 100;

export default function Projects() {
  return (
    <>
      <section className="panel">
        <h3>Multi-site timeline <small>September 2025 to August 2027</small></h3>
        <div className="gantt">
          <div className="g-head">
            <div className="g-label" />
            <div className="g-track months">
              {MONTHS.map((m, i) => <span key={i} style={{ left: `${pos(m)}%` }}>{m.getMonth() === 0 || i === 0 ? m.getFullYear() : ''}{' '}{m.toLocaleString('en', { month: 'narrow' })}</span>)}
            </div>
          </div>
          {sites.map((s) => {
            const l = pos(s.start), w = pos(s.end) - l;
            return (
              <div className="g-row" key={s.id}>
                <div className="g-label"><b>{s.name}</b><span>{s.city} · {s.foreman}</span></div>
                <div className="g-track">
                  <div className={'bar ' + s.status.toLowerCase()} style={{ left: `${l}%`, width: `${w}%` }}>
                    <i style={{ width: `${s.progress}%` }} /><em>{s.progress}%</em>
                  </div>
                  <div className="today" style={{ left: `${pos(TODAY)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="muted legend">The vertical line marks today, 1 October 2026. Darker fill shows work completed.</p>
      </section>

      <div className="site-cards">
        {sites.map((s) => {
          const burn = Math.round((s.spent / s.budget) * 100);
          return (
            <article className="panel site" key={s.id}>
              <div className="site-top"><h4>{s.name}</h4><span className={'tag ' + (s.status === 'Active' ? 'ok' : s.status === 'Suspended' ? 'bad' : 'neutral')}>{s.status}</span></div>
              <p className="muted">{s.city} · {fmtDate(s.start)} to {fmtDate(s.end)}</p>
              <div className="meter"><i style={{ width: `${burn}%` }} className={burn > s.progress + 5 ? 'over' : ''} /></div>
              <div className="split"><span>{fmtXAF(s.spent)} spent</span><span>{fmtXAF(s.budget)} budget</span></div>
              <div className="split"><span>Progress {s.progress}%</span><span>{s.workers} workers on site</span></div>
            </article>
          );
        })}
      </div>
    </>
  );
}
