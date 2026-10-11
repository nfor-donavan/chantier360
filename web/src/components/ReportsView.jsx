import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, Camera, Lock, Unlock, RefreshCw, Trash2, ArrowLeft } from 'lucide-react';
import { useStore } from '../store.jsx';
import { api, uploadMedia } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from './Gate.jsx';
import { Bar, Lightbox } from './bits.jsx';
import { fmtDate, fmtXAF, num } from '../utils.js';

const PHOTO = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'], VIDEO = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'];

// One Reports area for both report types. The tables are views of the saved reports, not separate copies.
export default function ReportsView({ fixedSite }) {
  const { t, lang, can, user, notify } = useStore();
  const [params, setParams] = useSearchParams();
  const [type, setType] = useState(!fixedSite && params.get('type') === 'weekly' ? 'weekly' : 'daily');
  const [site, setSite] = useState(fixedSite || '');
  const [from, setFrom] = useState(''), [to, setTo] = useState('');
  const [open, setOpen] = useState(!fixedSite ? params.get('open') : null);
  const [genDate, setGenDate] = useState(new Date().toISOString().slice(0, 10));
  const projects = useApi(() => (fixedSite ? Promise.resolve([]) : api.projects()));
  const list = useApi(() => (type === 'daily' ? api.dailyReports({ siteId: site, from, to }) : api.weeklyReports({ siteId: site, from, to })), { every: 30000 });
  useEffect(() => { list.reload(); }, [type, site, from, to]); // eslint-disable-line
  const choose = (k) => { setType(k); setOpen(null); if (!fixedSite) setParams({}); };
  const generate = async () => {
    const siteId = fixedSite || site;
    if (!siteId) return notify(t('rt.allprojects') + ' ?');
    try { const w = await api.generateWeekly(siteId, genDate); notify(t('toast.saved')); list.reload(); setOpen(w._id); } catch (e) { notify(e.message); }
  };
  const sum = (a, k) => (a || []).reduce((x, y) => x + (y[k] || 0), 0);
  return (
    <>
      <section className="panel noprint">
        <div className="tabs wide" role="tablist">
          {['daily', 'weekly'].map((k) => <button key={k} role="tab" aria-selected={type === k} className={type === k ? 'on' : ''} onClick={() => choose(k)}>{t('rt.' + k)}</button>)}
        </div>
        <div className="inline-form filters">
          {!fixedSite && <label className="mini">{t('rt.project')}<select value={site} onChange={(e) => { setSite(e.target.value); setOpen(null); }}><option value="">{t('rt.allprojects')}</option>{(projects.data || []).map((p) => <option key={p._id} value={p._id}>{p.siteName}</option>)}</select></label>}
          <label className="mini">{t('rt.from')}<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="mini">{t('rt.to')}<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          {type === 'weekly' && can('MANAGE_WEEKLY_REPORTS') && (
            <><label className="mini">{t('rt.week')}<input type="date" value={genDate} onChange={(e) => setGenDate(e.target.value)} /></label><button className="btn ok" onClick={generate}>{t('rt.generate')}</button></>
          )}
        </div>
        <Gate states={[list]}>{() => list.data.length === 0 ? <p className="muted">{t('rp.none')}</p> : (
          <table className="selectable">
            {type === 'daily' ? (<>
              <thead><tr><th>{t('col.date')}</th>{!fixedSite && <th>{t('col.site')}</th>}<th>{t('rp.by')}</th><th className="r">{t('rt.tasks')}</th><th className="r">{t('rt.workers')}</th><th className="r">{t('rt.issues')}</th><th className="r">{t('rt.media')}</th><th /></tr></thead>
              <tbody>{list.data.map((r) => (
                <tr key={r._id} className={open === r._id ? 'sel' : ''} onClick={() => setOpen(r._id)}>
                  <td>{fmtDate(r.date, lang)}</td>{!fixedSite && <td>{r.siteId?.siteName}</td>}<td>{r.submittedBy?.name}</td><td className="r">{(r.workPerformed || []).length}</td>
                  <td className="r">{sum(r.workforce, 'count')}</td><td className="r">{(r.difficulties || []).length > 0 ? <span className="tag bad">{r.difficulties.length}</span> : 0}</td><td className="r">{(r.media || []).length}</td>
                  <td><button className="btn no" onClick={() => setOpen(r._id)}>{t('rt.open')}</button></td>
                </tr>))}</tbody>
            </>) : (<>
              <thead><tr><th>{t('rt.week')}</th>{!fixedSite && <th>{t('col.site')}</th>}<th>{t('rt.status')}</th><th className="r">{t('rt.tasks')}</th><th className="r">{t('rt.progress')}</th><th>{t('rt.release')}</th><th /></tr></thead>
              <tbody>{list.data.map((w) => (
                <tr key={w._id} className={open === w._id ? 'sel' : ''} onClick={() => setOpen(w._id)}>
                  <td>{fmtDate(w.weekStart, lang)} {t('to')} {fmtDate(new Date(+new Date(w.weekStart) + 6 * 864e5), lang)}</td>{!fixedSite && <td>{w.siteId?.siteName}</td>}
                  <td><span className={'tag ' + (w.status === 'locked' ? 'ok' : 'neutral')}>{t('rt.' + w.status)}</span></td><td className="r">{w.tasks}</td><td className="r">{w.avgProgress}%</td>
                  <td>{w.clientVisible ? <span className="tag ok">✓</span> : <span className="muted">-</span>}</td><td><button className="btn no" onClick={() => setOpen(w._id)}>{t('rt.open')}</button></td>
                </tr>))}</tbody>
            </>)}
          </table>
        )}</Gate>
      </section>
      {open && (type === 'daily' ? <DailyDetail key={open} id={open} onClose={() => setOpen(null)} onChanged={list.reload} /> : <WeeklyDetail key={open} id={open} onClose={() => setOpen(null)} onChanged={list.reload} />)}
    </>
  );
}

function PrintHeader({ title, project, period }) {
  const { user, t, lang } = useStore();
  return <div className="print-header">{user.tenant?.logoUrl && <img className="print-logo" src={user.tenant.logoUrl} alt="" />}<h2>{user.tenant?.companyName}</h2><h3>{title}</h3><p>{project}{period ? ` · ${period}` : ''}</p><p className="small">{t('rt.printedOn')} {fmtDate(new Date(), lang)}</p></div>;
}
const Tbl = ({ head, children }) => <table className="rep-table"><thead><tr>{head.map((h, i) => <th key={i} className={h.r ? 'r' : ''}>{h.t ?? h}</th>)}</tr></thead><tbody>{children}</tbody></table>;
const Sec = ({ title, children }) => <div className="rp-sec"><h4>{title}</h4>{children}</div>;

function MediaUploader({ attach, onDone }) {
  const { t } = useStore();
  const [file, setFile] = useState(null), [prog, setProg] = useState(0), [state, setState] = useState('idle'), [err, setErr] = useState('');
  const start = async (f) => {
    setState('up'); setProg(0); setErr('');
    try { const up = await uploadMedia(f, setProg); await attach({ url: up.url, kind: up.kind, mime: up.mime, size: up.size }); setState('idle'); setFile(null); onDone(); }
    catch (e) { setState('err'); setErr(e.status === 0 ? t('err.network') : e.message); }
  };
  const choose = (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const photo = PHOTO.includes(f.type), video = VIDEO.includes(f.type);
    if (!photo && !video) return setErr(t('rt.fileerr.type'));
    if (f.size > (video ? 60 : 8) * 1024 * 1024) return setErr(t('rt.fileerr.size'));
    setFile(f); start(f);
  };
  return (
    <div className="uploader noprint">
      <label className={'btn ok file' + (state === 'up' ? ' off' : '')}><Camera size={15} /> {state === 'up' ? `${t('ph.uploading')} ${prog}%` : t('rt.addmedia')}<input type="file" accept={[...PHOTO, ...VIDEO].join(',')} hidden onChange={choose} disabled={state === 'up'} /></label>
      {state === 'up' && <Bar value={prog} />}
      {err && <p className="err" role="alert">{err} {state === 'err' && file && <button className="btn no" onClick={() => start(file)}>{t('rt.retry')}</button>}</p>}
    </div>
  );
}

function DailyDetail({ id, onClose, onChanged }) {
  const { t, lang, can, user, notify } = useStore();
  const r = useApi(() => api.dailyReport(id));
  const [view, setView] = useState(null);
  const done = () => { r.reload(); onChanged(); };
  const act = async (fn) => { try { await fn(); done(); } catch (e) { notify(e.message); } };
  return (
    <Gate states={[r]}>{() => {
      const d = r.data, media = d.media || [];
      return (
        <section className="panel print-area report-detail">
          <PrintHeader title={t('rt.daily')} project={d.siteId?.siteName} period={fmtDate(d.date, lang)} />
          <div className="toolbar between noprint">
            <h3>{t('rt.daily')} · {d.siteId?.siteName} · {fmtDate(d.date, lang)}</h3>
            <div className="actions">
              {can('MANAGE_CLIENT_PORTAL') && <label className="check"><input type="checkbox" checked={!!d.clientVisible} onChange={(e) => act(() => api.releaseDaily(id, e.target.checked))} /> {t('rt.release')}</label>}
              <button className="btn no" onClick={() => window.print()}><Printer size={15} /> {t('rt.print')}</button>
              <button className="btn no" onClick={onClose}><ArrowLeft size={15} /> {t('rt.back')}</button>
            </div>
          </div>
          <p className="muted">{t('rp.by')} {d.submittedBy?.name}</p>
          {d.workPerformed?.length > 0 && <Sec title={t('rp.work')}><Tbl head={[t('tk.task'), { t: t('qty'), r: 1 }, t('tk.unit'), { t: t('rt.reportedPct'), r: 1 }, t('tk.notes')]}>{d.workPerformed.map((w, i) => <tr key={i}><td>{w.taskName}</td><td className="r">{num(w.quantity)}</td><td>{w.unit}</td><td className="r">{w.progressPct != null ? `${w.progressPct}%` : ''}</td><td>{w.note}</td></tr>)}</Tbl></Sec>}
          {d.objectives && <Sec title={t('rp.objectives')}><p>{d.objectives}</p></Sec>}
          {d.workforce?.length > 0 && <Sec title={t('rp.workforce')}><Tbl head={[t('wf.category'), { t: t('qty'), r: 1 }]}>{d.workforce.map((w, i) => <tr key={i}><td>{w.category}</td><td className="r">{w.count}</td></tr>)}<tr className="total"><td>{t('rt.total')}</td><td className="r">{d.workforce.reduce((a, w) => a + w.count, 0)}</td></tr></Tbl></Sec>}
          {d.materialsUsed?.length > 0 && <Sec title={t('rp.materials')}><Tbl head={[t('rt.item'), { t: t('qty'), r: 1 }]}>{d.materialsUsed.map((m, i) => <tr key={i}><td>{m.materialType}</td><td className="r">{num(m.quantity)}</td></tr>)}</Tbl></Sec>}
          {d.stockMovements?.length > 0 && <Sec title={t('rp.stock')}><Tbl head={[t('st.kind'), t('rt.item'), { t: t('qty'), r: 1 }, t('rt.supplier')]}>{d.stockMovements.map((m, i) => <tr key={i}><td>{t('kind.' + m.kind)}</td><td>{m.materialType}</td><td className="r">{num(m.quantity)}</td><td>{m.party}</td></tr>)}</Tbl></Sec>}
          {d.difficulties?.length > 0 && <Sec title={t('rp.difficulties')}><Tbl head={[t('rp.issue'), t('rp.solution')]}>{d.difficulties.map((x, i) => <tr key={i}><td>{x.issue}</td><td>{x.solution}</td></tr>)}</Tbl></Sec>}
          {d.tomorrowPlan && <Sec title={t('rp.tomorrow')}><p>{d.tomorrowPlan}</p></Sec>}
          {(d.ordersNote || d.observations) && <Sec title={t('rp.orders')}><p>{d.ordersNote} {d.observations}</p></Sec>}
          {d.siteCash && <Sec title={t('rp.cash')}><Tbl head={[t('rp.opening'), t('rp.expenses'), t('rp.closing')]}><tr><td>{fmtXAF(d.siteCash.opening)}</td><td>{fmtXAF(d.siteCash.expenses)}</td><td><b>{fmtXAF((d.siteCash.opening || 0) - (d.siteCash.expenses || 0))}</b></td></tr></Tbl></Sec>}
          <Sec title={t('rt.media')}>
            {media.length === 0 && <p className="muted">{t('rt.media.none')}</p>}
            <div className="gallery">
              {media.map((m) => (
                <figure key={m._id}>
                  {m.kind === 'video' ? <video src={m.url} controls preload="metadata" /> : <img src={m.url} alt={m.caption || ''} onClick={() => setView(m)} />}
                  <figcaption><b>{m.caption}</b><span>{m.kind === 'video' ? t('rt.videoRef') : t('tab.photos')}{m.uploadedBy?.name ? ` · ${t('ph.by')} ${m.uploadedBy.name}` : ''}</span>
                    <span className="noprint">
                      {can('MANAGE_CLIENT_PORTAL') && <label className="check left"><input type="checkbox" checked={!!m.clientVisible} onChange={(e) => act(() => api.updateReportMedia(id, m._id, { clientVisible: e.target.checked }))} /> {t('ph.visible')}</label>}
                      {(String(m.uploadedBy?._id) === user.id || can('MANAGE_CLIENT_PORTAL')) && <button className="btn no slim" onClick={() => window.confirm(t('rt.removeConfirm')) && act(() => api.deleteReportMedia(id, m._id))}><Trash2 size={13} /> {t('rt.remove')}</button>}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
            {media.some((m) => m.kind === 'video') && <ul className="print-only">{media.filter((m) => m.kind === 'video').map((m) => <li key={m._id}>{t('rt.videoRef')}: {m.caption || ''} {m.url.split('?')[0]}</li>)}</ul>}
            {can('UPLOAD_EVIDENCE') && <MediaUploader attach={(b) => api.addReportMedia(id, b)} onDone={done} />}
          </Sec>
          <Lightbox photo={view} onClose={() => setView(null)} label={t('close')} />
        </section>
      );
    }}</Gate>
  );
}

function WeeklyDetail({ id, onClose, onChanged }) {
  const { t, lang, can, notify } = useStore();
  const w = useApi(() => api.weeklyReport(id));
  const [edits, setEdits] = useState({}), [notes, setNotes] = useState({});
  useEffect(() => { if (w.data) { setEdits({}); setNotes({ objectives: w.data.objectives || '', notes: w.data.notes || '' }); } }, [w.data?._id, w.data?.updatedAt]); // eslint-disable-line
  const done = () => { w.reload(); onChanged(); };
  const act = async (fn) => { try { await fn(); notify(t('toast.saved')); done(); } catch (e) { notify(e.message); } };
  return (
    <Gate states={[w]}>{() => {
      const d = w.data, locked = d.status === 'locked', editable = !locked && can('MANAGE_WEEKLY_REPORTS'), s = d.summary || {};
      const period = `${fmtDate(d.weekStart, lang)} ${t('to')} ${fmtDate(d.weekEnd, lang)}`;
      const set = (taskId, k, v) => setEdits({ ...edits, [taskId]: { ...edits[taskId], [k]: v } });
      const val = (r, k) => (edits[r.taskId]?.[k] !== undefined ? edits[r.taskId][k] : r[k] ?? '');
      const save = () => act(() => api.updateWeekly(id, { rows: Object.entries(edits).map(([taskId, v]) => ({ taskId, ...v })), objectives: notes.objectives, notes: notes.notes }));
      return (
        <section className="panel print-area report-detail">
          <PrintHeader title={t('rt.weekly')} project={d.siteId?.siteName} period={period} />
          <div className="toolbar between noprint">
            <h3>{t('rt.weekly')} · {d.siteId?.siteName} · {period} <span className={'tag ' + (locked ? 'ok' : 'neutral')}>{t('rt.' + d.status)}</span></h3>
            <div className="actions">
              {locked && can('MANAGE_CLIENT_PORTAL') && <label className="check"><input type="checkbox" checked={!!d.clientVisible} onChange={(e) => act(() => api.releaseWeekly(id, e.target.checked))} /> {t('rt.release')}</label>}
              {editable && <button className="btn ok" onClick={save}>{t('save')}</button>}
              {editable && <button className="btn no" onClick={() => act(() => api.generateWeekly(d.siteId._id, d.weekStart))}><RefreshCw size={14} /> {t('rt.refresh')}</button>}
              {editable && <button className="btn no" onClick={() => window.confirm(t('rt.lock') + ' ?') && act(() => api.lockWeekly(id))}><Lock size={14} /> {t('rt.lock')}</button>}
              {locked && can('MANAGE_PROJECTS') && <button className="btn no" onClick={() => act(() => api.unlockWeekly(id))}><Unlock size={14} /> {t('rt.unlock')}</button>}
              <button className="btn no" onClick={() => window.print()}><Printer size={15} /> {t('rt.print')}</button>
              <button className="btn no" onClick={onClose}><ArrowLeft size={15} /> {t('rt.back')}</button>
            </div>
          </div>
          {locked && <p className="muted noprint">{t('rt.locked.note')}</p>}
          <Sec title={t('rt.statusTable')}>
            <Tbl head={[t('tk.sub'), t('tk.task'), t('tk.unit'), { t: t('tk.total'), r: 1 }, { t: t('rt.cum'), r: 1 }, { t: t('rt.week.qty'), r: 1 }, { t: t('tk.rate'), r: 1 }, t('tk.notes')]}>
              {d.rows.map((r) => <tr key={r.taskId}><td>{r.subcontractor}</td><td>{r.name}</td><td>{r.unit}</td><td className="r">{num(r.totalQty)}</td><td className="r">{num(r.cumulativeQty)}</td><td className="r">{num(r.weeklyQty)}</td><td className="r"><b>{Math.round(r.progressPct)}%</b></td>
                <td>{editable ? <input value={val(r, 'observation')} onChange={(e) => set(r.taskId, 'observation', e.target.value)} /> : r.observation}</td></tr>)}
            </Tbl>
          </Sec>
          <Sec title={t('rt.eval')}>
            <Tbl head={[t('tk.task'), { t: t('rt.realised'), r: 1 }, { t: t('rt.planned'), r: 1 }, t('rt.reason')]}>
              {d.rows.map((r) => { const planned = val(r, 'plannedPct'); const behind = planned !== '' && r.progressPct < Number(planned); return (
                <tr key={r.taskId} className={behind ? 'flag' : ''}><td>{r.name}</td><td className="r"><b>{Math.round(r.progressPct)}%</b></td>
                  <td className="r">{editable ? <input className="s" type="number" min="0" max="100" value={planned} onChange={(e) => set(r.taskId, 'plannedPct', e.target.value)} /> : planned !== '' ? `${planned}%` : ''}</td>
                  <td>{editable ? <input value={val(r, 'delayReason')} onChange={(e) => set(r.taskId, 'delayReason', e.target.value)} /> : r.delayReason}</td></tr>); })}
            </Tbl>
          </Sec>
          <Sec title={t('rt.summary')}>
            <Tbl head={[t('rt.avgwork'), t('rt.peak'), t('rt.deliveries'), t('rt.flagged'), t('rt.media'), t('rt.daily')]}><tr><td>{s.workforce?.averagePerDay ?? 0}</td><td>{s.workforce?.peak ?? 0}</td><td>{s.deliveries?.count ?? 0}</td><td>{s.deliveries?.flagged ?? 0}</td><td>{s.mediaCount ?? 0}</td><td>{s.reportsCount ?? 0}</td></tr></Tbl>
          </Sec>
          {s.deliveries?.items?.length > 0 && <Sec title={t('rt.deliveries')}><Tbl head={[t('rt.item'), t('rt.supplier'), { t: t('rt.ordered'), r: 1 }, { t: t('rt.received'), r: 1 }]}>{s.deliveries.items.map((x, i) => <tr key={i}><td>{x.material}</td><td>{x.supplier}</td><td className="r">{x.ordered}</td><td className="r">{x.received} {x.unit}</td></tr>)}</Tbl></Sec>}
          {s.stockMovements?.length > 0 && <Sec title={t('rt.stock')}><Tbl head={[t('rt.item'), { t: t('st.opening'), r: 1 }, { t: t('st.in'), r: 1 }, { t: t('st.out'), r: 1 }]}>{s.stockMovements.map((x, i) => <tr key={i}><td>{x.materialType}</td><td className="r">{num(x.opening)}</td><td className="r">{num(x.in)}</td><td className="r">{num(x.out)}</td></tr>)}</Tbl></Sec>}
          {s.difficulties?.length > 0 && <Sec title={t('rp.difficulties')}><Tbl head={[t('col.date'), t('rp.issue'), t('rp.solution')]}>{s.difficulties.map((x, i) => <tr key={i}><td>{fmtDate(x.date, lang)}</td><td>{x.issue}</td><td>{x.solution}</td></tr>)}</Tbl></Sec>}
          <Sec title={t('rt.objectives')}>{editable ? <textarea rows={2} value={notes.objectives || ''} onChange={(e) => setNotes({ ...notes, objectives: e.target.value })} /> : <p>{d.objectives || '-'}</p>}</Sec>
          <Sec title={t('rt.notes')}>{editable ? <textarea rows={2} value={notes.notes || ''} onChange={(e) => setNotes({ ...notes, notes: e.target.value })} /> : <p>{d.notes || '-'}</p>}</Sec>
        </section>
      );
    }}</Gate>
  );
}
