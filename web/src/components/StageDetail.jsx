import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from './Gate.jsx';
import { Modal } from './Modal.jsx';
import { Bar, Lightbox, Tbl, Sec } from './bits.jsx';
import { fmtDate, num } from '../utils.js';

// Everything recorded about one construction stage, read from the tasks linked to it. Reports and media stay where they were recorded.
export default function StageDetail({ projectId, stageId, onClose, onChanged }) {
  const { t, lang, can, notify } = useStore();
  const d = useApi(() => api.stageDetail(projectId, stageId));
  const [edit, setEdit] = useState(null), [view, setView] = useState(null), [busy, setBusy] = useState(false);
  const day = (v) => (v ? String(v).slice(0, 10) : '');
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.updateMilestone(projectId, stageId, { name: edit.name, description: edit.description, plannedStart: edit.plannedStart, plannedDate: edit.plannedDate, actualStart: edit.actualStart, actualEnd: edit.actualEnd, status: edit.status }); notify(t('toast.saved')); setEdit(null); d.reload(); onChanged(); }
    catch (err) { notify(err.message); }
    setBusy(false);
  };
  const S = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });
  return (
    <Modal title={t('sd.title')} onClose={onClose} wide>
      <Gate states={[d]}>{() => {
        const x = d.data, st = x.stage;
        return (
          <div className="stage">
            <div className="proj-head"><div><h2>{st.name}</h2><p className="muted">{st.description || ''}</p></div><span className={'tag ' + (st.status === 'Completed' ? 'ok' : st.status === 'InProgress' ? 'neutral' : 'neutral')}>{t('ms.' + st.status)}</span></div>
            {x.delays.stageLate && <p className="err" role="alert">{t('sd.late')}</p>}
            <div className="grid2">
              <Sec title={t('sd.completion')}>
                {x.completionPct != null ? <><div className="big-pct sm">{Math.round(x.completionPct)}<small>%</small></div><Bar value={x.completionPct} /></> : <p className="muted">{t('sd.noTasks')}</p>}
                <div className="stats" style={{ marginTop: 10 }}><div><b>{x.stats.completed}</b><span>{t('ov.completed')}</span></div><div><b>{x.stats.inProgress}</b><span>{t('ov.inprogress')}</span></div><div><b>{x.stats.notStarted}</b><span>{t('ov.notstarted')}</span></div></div>
              </Sec>
              <Sec title={`${t('sd.planned')} / ${t('sd.actual')}`}>
                <Tbl head={['', t('sd.start'), t('sd.end')]}>
                  <tr><td><b>{t('sd.planned')}</b></td><td>{fmtDate(st.plannedStart, lang) || '—'}</td><td>{fmtDate(st.plannedEnd, lang) || '—'}</td></tr>
                  <tr><td><b>{t('sd.actual')}</b></td><td>{fmtDate(st.actualStart, lang) || '—'}</td><td>{fmtDate(st.actualEnd, lang) || '—'}</td></tr>
                </Tbl>
                {can('MANAGE_PROJECTS') && !edit && <button className="btn no" style={{ marginTop: 10 }} onClick={() => setEdit({ name: st.name, description: st.description || '', plannedStart: day(st.plannedStart), plannedDate: day(st.plannedDate), actualStart: day(st.actualStart), actualEnd: day(st.actualEnd), status: st.status })}>{t('sd.edit')}</button>}
              </Sec>
            </div>
            {edit && (
              <form className="form-grid panel" onSubmit={save}>
                <label className="full">{t('sd.name')}<input required value={edit.name} onChange={S('name')} /></label>
                <label className="full">{t('sd.description')}<textarea rows={2} value={edit.description} onChange={S('description')} /></label>
                <label>{t('sd.planned')} · {t('sd.start')}<input type="date" value={edit.plannedStart} onChange={S('plannedStart')} /></label>
                <label>{t('sd.planned')} · {t('sd.end')}<input type="date" value={edit.plannedDate} onChange={S('plannedDate')} /></label>
                <label>{t('sd.actual')} · {t('sd.start')}<input type="date" value={edit.actualStart} onChange={S('actualStart')} /></label>
                <label>{t('sd.actual')} · {t('sd.end')}<input type="date" value={edit.actualEnd} onChange={S('actualEnd')} /></label>
                <label>{t('se.status')}<select value={edit.status} onChange={S('status')}>{['Upcoming', 'InProgress', 'Completed'].map((s) => <option key={s} value={s}>{t('ms.' + s)}</option>)}</select></label>
                <div className="full actions"><button className="btn ok" type="submit" disabled={busy}>{busy ? t('saving') : t('save')}</button><button type="button" className="btn no" onClick={() => setEdit(null)}>{t('cancel')}</button></div>
              </form>
            )}
            <Sec title={t('sd.tasks')}>
              {x.tasks.length === 0 ? <p className="muted">{t('sd.noTasks')}</p> : (
                <Tbl head={[t('tk.sub'), t('tk.task'), t('tk.unit'), { t: t('tk.total'), r: 1 }, { t: t('rt.cum'), r: 1 }, { t: t('sd.remaining'), r: 1 }, t('tk.rate')]}>
                  {x.tasks.map((k) => <tr key={k._id}><td>{k.subcontractor}</td><td>{k.name}</td><td>{k.unit}</td><td className="r">{num(k.totalQty)}</td><td className="r">{num(k.cumulativeQty)}</td><td className="r">{num(Math.max(0, k.totalQty - k.cumulativeQty))}</td><td><div className="cat tight"><Bar value={k.progressPct} /><b>{Math.round(k.progressPct)}%</b></div></td></tr>)}
                </Tbl>
              )}
            </Sec>
            {x.delays.tasksBehindTarget.length > 0 && <Sec title={t('sd.delays')}><Tbl head={[t('tk.task'), { t: t('tk.rate'), r: 1 }, { t: t('tk.target'), r: 1 }, t('rt.reason')]}>{x.delays.tasksBehindTarget.map((r, i) => <tr key={i} className="flag"><td>{r.name}</td><td className="r">{Math.round(r.progressPct)}%</td><td className="r">{r.target}%</td><td>{r.reason}</td></tr>)}</Tbl></Sec>}
            {x.outstanding.length > 0 && <Sec title={t('sd.outstanding')}><Tbl head={[t('tk.task'), t('tk.unit'), { t: t('sd.remaining'), r: 1 }, { t: t('tk.rate'), r: 1 }]}>{x.outstanding.map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.unit}</td><td className="r">{num(r.remaining)}</td><td className="r">{Math.round(r.progressPct)}%</td></tr>)}</Tbl></Sec>}
            {x.reports.length > 0 && <Sec title={t('sd.reports')}><Tbl head={[t('col.date'), t('rp.by'), t('tk.task'), { t: t('qty'), r: 1 }, { t: t('rt.reportedPct'), r: 1 }]}>{x.reports.flatMap((r) => r.work.map((w, i) => <tr key={`${r._id}-${i}`}><td>{fmtDate(r.date, lang)}</td><td>{r.submittedBy?.name}</td><td>{w.taskName}</td><td className="r">{num(w.quantity)} {w.unit}</td><td className="r">{w.progressPct != null ? `${w.progressPct}%` : ''}</td></tr>))}</Tbl></Sec>}
            {x.weeklyReports.length > 0 && <Sec title={t('sd.weekly')}><Tbl head={[t('rt.week'), t('rt.status'), { t: t('tk.task'), r: 1 }]}>{x.weeklyReports.map((w) => <tr key={w._id}><td>{fmtDate(w.weekStart, lang)}</td><td><span className={'tag ' + (w.status === 'locked' ? 'ok' : 'neutral')}>{t('rt.' + w.status)}</span></td><td className="r">{w.rows.length}</td></tr>)}</Tbl></Sec>}
            {x.materialsUsed.length > 0 && <Sec title={t('sd.materials')}><Tbl head={[t('rt.item'), { t: t('qty'), r: 1 }]}>{x.materialsUsed.map((m) => <tr key={m.materialType}><td>{m.materialType}</td><td className="r">{num(m.quantity)}</td></tr>)}</Tbl></Sec>}
            {x.difficulties.length > 0 && <Sec title={t('sd.difficulties')}><Tbl head={[t('col.date'), t('rp.issue'), t('rp.solution')]}>{x.difficulties.map((r, i) => <tr key={i}><td>{fmtDate(r.date, lang)}</td><td>{r.issue}</td><td>{r.solution}</td></tr>)}</Tbl></Sec>}
            <Sec title={t('sd.media')}>
              {x.media.length === 0 ? <p className="muted">{t('sd.none')}</p> : <div className="gallery">{x.media.map((m) => <figure key={m._id}>{m.kind === 'video' ? <video src={m.url} controls preload="metadata" /> : <img src={m.url} alt={m.caption || ''} onClick={() => setView(m)} />}<figcaption><b>{m.caption}</b><span>{fmtDate(m.date, lang)}</span></figcaption></figure>)}</div>}
            </Sec>
            <Lightbox photo={view} onClose={() => setView(null)} label={t('close')} />
          </div>
        );
      }}</Gate>
    </Modal>
  );
}
