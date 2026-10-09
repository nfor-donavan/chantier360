import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '../store.jsx';
import { fmtDate, fmtXAF, num } from '../utils.js';

export default function ReportCard({ r, showSite }) {
  const { t, lang } = useStore();
  const [open, setOpen] = useState(false);
  const Sec = ({ title, children }) => <div className="rp-sec"><h5>{title}</h5>{children}</div>;
  return (
    <article className="report">
      <button className="report-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <b>{fmtDate(r.date, lang)}</b>{showSite && <span>{r.siteId?.siteName}</span>}
        <span className="muted">{t('rp.by')} {r.submittedBy?.name}</span>
        {r.difficulties?.length > 0 && <span className="tag bad">{r.difficulties.length}</span>}
      </button>
      {open && (
        <div className="report-body">
          {r.workPerformed?.length > 0 && <Sec title={t('rp.work')}><ul>{r.workPerformed.map((w, i) => <li key={i}>{w.taskName}: <b>{num(w.quantity)} {w.unit}</b>{w.note && <span className="muted"> · {w.note}</span>}</li>)}</ul></Sec>}
          {r.objectives && <Sec title={t('rp.objectives')}><p>{r.objectives}</p></Sec>}
          {r.workforce?.length > 0 && <Sec title={t('rp.workforce')}><div className="chips">{r.workforce.map((w, i) => <span className="chip" key={i}>{w.count} {w.category}</span>)}</div></Sec>}
          {r.materialsUsed?.length > 0 && <Sec title={t('rp.materials')}><div className="chips">{r.materialsUsed.map((m, i) => <span className="chip" key={i}>{m.quantity} {m.materialType}</span>)}</div></Sec>}
          {r.stockMovements?.length > 0 && <Sec title={t('rp.stock')}><ul>{r.stockMovements.map((m, i) => <li key={i}>{t('kind.' + m.kind)}: {m.quantity} {m.materialType}{m.party ? ` (${m.party})` : ''}</li>)}</ul></Sec>}
          {r.difficulties?.length > 0 && <Sec title={t('rp.difficulties')}>{r.difficulties.map((d, i) => <p key={i}><b>{t('rp.issue')}:</b> {d.issue}<br /><b>{t('rp.solution')}:</b> {d.solution || '-'}</p>)}</Sec>}
          {r.tomorrowPlan && <Sec title={t('rp.tomorrow')}><p>{r.tomorrowPlan}</p></Sec>}
          {r.ordersNote && <Sec title={t('rp.orders')}><p>{r.ordersNote}</p></Sec>}
          {r.siteCash && <Sec title={t('rp.cash')}><p>{t('rp.opening')}: {fmtXAF(r.siteCash.opening)} · {t('rp.expenses')}: {fmtXAF(r.siteCash.expenses)} · {t('rp.closing')}: <b>{fmtXAF((r.siteCash.opening || 0) - (r.siteCash.expenses || 0))}</b></p></Sec>}
          {r.photoUrls?.length > 0 && <div className="photo-row">{r.photoUrls.map((u, i) => <img key={i} src={u} alt="" />)}</div>}
        </div>
      )}
    </article>
  );
}
