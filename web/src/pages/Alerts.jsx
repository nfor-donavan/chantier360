import React from 'react';
import { useStore } from '../store.jsx';
import { fmtDate, siteName } from '../data.js';

export default function Alerts() {
  const { alerts, acknowledge } = useStore();
  return (
    <section className="panel">
      <h3>Alert history <small>{alerts.filter((a) => !a.acknowledged).length} open</small></h3>
      {alerts.map((a) => (
        <div key={a.id} className={'feed row ' + a.severity.toLowerCase() + (a.acknowledged ? ' done' : '')}>
          <div><b>{a.kind} · {siteName(a.siteId)}</b><p>{a.text}</p><span>{fmtDate(a.date)} · {a.severity} priority</span></div>
          {a.acknowledged ? <span className="tag neutral">Acknowledged</span> : <button className="btn ok" onClick={() => acknowledge(a.id)}>Acknowledge</button>}
        </div>
      ))}
    </section>
  );
}
