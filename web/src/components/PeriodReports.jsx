import React, { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from './Gate.jsx';
import PrintHeader from './PrintHeader.jsx';
import { Tbl, Sec } from './bits.jsx';
import { fmtDate, fmtFull, num } from '../utils.js';

const monthName = (m, lang, style = 'long') => new Date(Date.UTC(2000, m - 1, 1)).toLocaleString(lang === 'fr' ? 'fr' : 'en', { month: style, timeZone: 'UTC' });

// Monthly report and annual overview. Every figure is recalculated from the stored records each time the report is opened.
export default function PeriodReports({ type, fixedSite, projects }) {
  const { t, lang } = useStore();
  const now = new Date();
  const [site, setSite] = useState(fixedSite || ''), [year, setYear] = useState(now.getUTCFullYear()), [month, setMonth] = useState(now.getUTCMonth() + 1);
  const data = useApi(() => (type === 'monthly' ? api.monthlyReport({ siteId: site, year, month }) : api.annualReport({ siteId: site, year })), { every: 60000 });
  useEffect(() => { data.reload(); }, [type, site, year, month]); // eslint-disable-line
  const projectName = site ? (projects.find((p) => p._id === site)?.siteName || '') : t('rt.allprojects');
  return (
    <>
      <section className="panel noprint">
        <div className="inline-form filters">
          {!fixedSite && <label className="mini">{t('rt.project')}<select value={site} onChange={(e) => setSite(e.target.value)}><option value="">{t('rt.allprojects')}</option>{projects.map((p) => <option key={p._id} value={p._id}>{p.siteName}</option>)}</select></label>}
          {type === 'monthly' && <label className="mini">{t('mo.month')}<select value={month} onChange={(e) => setMonth(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{monthName(i + 1, lang)}</option>)}</select></label>}
          <label className="mini">{t('mo.year')}<input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(Math.min(2100, Math.max(2000, Number(e.target.value) || year)))} /></label>
          <button className="btn no" onClick={() => window.print()}><Printer size={15} /> {t('rt.print')}</button>
        </div>
      </section>
      <Gate states={[data]}>{() => (
        <section className="panel print-area report-detail">
          <PrintHeader title={type === 'monthly' ? `${t('rt.monthly')} · ${monthName(month, lang)} ${year}` : `${t('rt.annual')} · ${year}`} project={projectName} />
          <h3 className="noprint">{type === 'monthly' ? `${t('rt.monthly')} · ${monthName(month, lang)} ${year}` : `${t('rt.annual')} · ${year}`} <small>{projectName}</small></h3>
          {type === 'monthly' ? <Monthly d={data.data} lang={lang} t={t} /> : <Annual d={data.data} lang={lang} t={t} />}
        </section>
      )}</Gate>
    </>
  );
}

function Monthly({ d, lang, t }) {
  const e = d.expenses, wf = d.workforce;
  return (
    <>
      {d.limitations.length > 0 && <div className="notice"><b>{t('mo.limits')}</b><ul>{d.limitations.map((l) => <li key={l}>{t('lim.' + l)}</li>)}</ul></div>}
      <div className="kpis compact">
        {e && <div className="kpi"><span>{t('mo.expenses')} · {t('mo.thisMonth')}</span><b>{e.monthCount ? fmtFull(e.monthTotal) : '—'}</b><small>{e.monthCount} {t('mo.records')}</small></div>}
        {e && <div className="kpi"><span>{t('mo.expenses')} · {t('mo.ytd')}</span><b>{e.ytdCount ? fmtFull(e.ytdTotal) : '—'}</b><small>{e.ytdCount} {t('mo.records')}</small></div>}
        <div className="kpi"><span>{t('mo.reports')}</span><b>{d.work.reportsCount}</b></div>
        <div className="kpi"><span>{t('mo.avg')}</span><b>{wf.averagePerDay ?? '—'}</b><small>{t('mo.peak')}: {wf.peak ?? '—'} · {t('mo.days')}: {wf.daysRecorded}</small></div>
        <div className="kpi"><span>{t('mo.deliveries')}</span><b>{d.deliveries.count}</b><small>{d.deliveries.flagged} {t('rt.flagged')}</small></div>
      </div>
      {e && e.byCategory.length > 0 && <Sec title={t('mo.byCategory')}><Tbl head={[t('ex.category'), { t: t('mo.thisMonth'), r: 1 }, { t: t('mo.ytd'), r: 1 }]}>
        {e.byCategory.map((c) => <tr key={c.category}><td>{t('ex.cat.' + c.category)}</td><td className="r">{c.month ? fmtFull(c.month) : '—'}</td><td className="r">{fmtFull(c.ytd)}</td></tr>)}
        <tr className="total"><td>{t('mo.total')}</td><td className="r">{fmtFull(e.monthTotal)}</td><td className="r">{fmtFull(e.ytdTotal)}</td></tr></Tbl></Sec>}
      {e && e.byProject.length > 1 && <Sec title={t('mo.byProject')}><Tbl head={[t('col.site'), { t: t('mo.thisMonth'), r: 1 }, { t: t('mo.ytd'), r: 1 }]}>{e.byProject.map((p) => <tr key={p.siteId}><td>{p.siteName}</td><td className="r">{p.month ? fmtFull(p.month) : '—'}</td><td className="r">{fmtFull(p.ytd)}</td></tr>)}</Tbl></Sec>}
      {d.work.tasks.length > 0 && <Sec title={t('mo.work')}><Tbl head={[t('tk.task'), t('tk.unit'), { t: t('mo.qty'), r: 1 }, { t: t('mo.progNow'), r: 1 }]}>{d.work.tasks.map((w, i) => <tr key={i}><td>{w.name}</td><td>{w.unit}</td><td className="r">{num(w.quantity)}</td><td className="r">{w.progressNow != null ? `${Math.round(w.progressNow)}%` : ''}</td></tr>)}</Tbl></Sec>}
      {d.progressAtMonthEnd && <Sec title={`${t('mo.progEnd')} · ${fmtDate(d.progressAtMonthEnd.weekStart, lang)}`}><Tbl head={[t('tk.task'), t('tk.unit'), { t: t('tk.rate'), r: 1 }]}>{d.progressAtMonthEnd.rows.map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.unit}</td><td className="r">{Math.round(r.progressPct)}%</td></tr>)}</Tbl></Sec>}
      {wf.personDaysByCategory.length > 0 && <Sec title={`${t('mo.workforce')} · ${t('mo.personDays')}`}><Tbl head={[t('wf.category'), { t: t('mo.personDays'), r: 1 }]}>{wf.personDaysByCategory.map((c) => <tr key={c.category}><td>{c.category}</td><td className="r">{c.count}</td></tr>)}</Tbl></Sec>}
      {d.deliveries.byMaterial.length > 0 && <Sec title={t('mo.deliveries')}><Tbl head={[t('rt.item'), { t: t('mo.received'), r: 1 }, { t: t('mo.count'), r: 1 }]}>{d.deliveries.byMaterial.map((m) => <tr key={m.materialType}><td>{m.materialType}</td><td className="r">{num(m.received)} {m.unit}</td><td className="r">{m.deliveries}</td></tr>)}</Tbl></Sec>}
      {d.stockMovements.length > 0 && <Sec title={t('mo.stock')}><Tbl head={[t('rt.item'), { t: t('st.in'), r: 1 }, { t: t('st.out'), r: 1 }, { t: t('mo.tin'), r: 1 }, { t: t('mo.tout'), r: 1 }]}>{d.stockMovements.map((m) => <tr key={m.materialType}><td>{m.materialType}</td><td className="r">{num(m.in)}</td><td className="r">{num(m.out)}</td><td className="r">{num(m.transferIn)}</td><td className="r">{num(m.transferOut)}</td></tr>)}</Tbl></Sec>}
      {d.materialsUsed.length > 0 && <Sec title={t('mo.used')}><Tbl head={[t('rt.item'), { t: t('qty'), r: 1 }]}>{d.materialsUsed.map((m) => <tr key={m.materialType}><td>{m.materialType}</td><td className="r">{num(m.quantity)}</td></tr>)}</Tbl></Sec>}
      {d.difficulties.length > 0 && <Sec title={t('mo.issues')}><Tbl head={[t('col.date'), t('rp.issue'), t('rp.solution')]}>{d.difficulties.map((x, i) => <tr key={i}><td>{fmtDate(x.date, lang)}</td><td>{x.issue}</td><td>{x.solution}</td></tr>)}</Tbl></Sec>}
    </>
  );
}

function Annual({ d, lang, t }) {
  const fin = d.financial;
  return (
    <>
      {fin ? (d.totals.reconciled ? <p className="ok-note">✓ {t('mo.recon')}</p> : <p className="err" role="alert">{t('mo.reconFail')}</p>) : <div className="notice"><ul><li>{t('lim.financial_hidden')}</li></ul></div>}
      <Tbl head={[t('mo.month'), ...(fin ? [{ t: t('mo.expenses'), r: 1 }, { t: t('mo.cum'), r: 1 }, { t: `${t('mo.records')}`, r: 1 }] : []), { t: t('mo.reports'), r: 1 }, { t: t('mo.workers'), r: 1 }, { t: t('mo.deliveries'), r: 1 }, { t: t('mo.flagged'), r: 1 }, { t: t('mo.progressEnd'), r: 1 }]}>
        {d.months.map((m) => (
          <tr key={m.month}>
            <td>{monthName(m.month, lang)}</td>
            {fin && <><td className="r">{m.expenses != null ? fmtFull(m.expenses) : <span className="muted" title={t('lim.no_expense_records')}>—</span>}</td><td className="r">{m.ytdExpenses ? fmtFull(m.ytdExpenses) : <span className="muted">—</span>}</td><td className="r">{m.expenseRecords}</td></>}
            <td className="r">{m.dailyReports}</td><td className="r">{m.averageWorkforce ?? '—'}</td><td className="r">{m.deliveries}</td><td className="r">{m.flaggedDeliveries}</td><td className="r">{m.progressAtMonthEnd != null ? `${m.progressAtMonthEnd}%` : <span className="muted" title={t('lim.no_progress_snapshot')}>—</span>}</td>
          </tr>
        ))}
        <tr className="total"><td>{t('mo.total')}</td>{fin && <><td className="r">{fmtFull(d.totals.expenses)}</td><td className="r" /><td className="r">{d.months.reduce((a, m) => a + m.expenseRecords, 0)}</td></>}<td className="r">{d.totals.dailyReports}</td><td className="r" /><td className="r">{d.totals.deliveries}</td><td className="r">{d.months.reduce((a, m) => a + m.flaggedDeliveries, 0)}</td><td className="r" /></tr>
      </Tbl>
      <p className="muted small">— {t('lim.no_expense_records')} {t('lim.no_progress_snapshot')}</p>
    </>
  );
}
