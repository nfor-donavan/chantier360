import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Clock, Printer, Plus, Camera } from 'lucide-react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import ReportCard from '../components/ReportCard.jsx';
import { Bar, Lightbox } from '../components/bits.jsx';
import { fmtDate, fmtXAF, num } from '../utils.js';

export default function ProjectRoute() { const { id } = useParams(); return <ProjectDetail key={id} id={id} />; }

function ProjectDetail({ id }) {
  const { t, can, lang } = useStore();
  const ov = useApi(() => api.project(id));
  const [tab, setTab] = useState('overview');
  const tabs = ['overview', 'tasks', 'timeline', 'photos', can('VIEW_STOCK') && 'stock', can('VIEW_REPORTS') && 'reports', (can('MANAGE_PROJECTS') || can('MANAGE_PROJECT_FINANCIALS')) && 'settings'].filter(Boolean);
  return (
    <Gate states={[ov]}>{() => {
      const o = ov.data, p = o.project, props = { o, id, reload: ov.reload };
      return (
        <>
          <Link to="/projects" className="back"><ArrowLeft size={16} /> {t('back')}</Link>
          <div className="proj-head">
            <div><h2>{p.siteName}</h2><p className="muted">{p.client?.name ? `${p.client.name} · ` : ''}{p.locationCity} · {fmtDate(p.startDate, lang)} {t('to')} {fmtDate(p.endDate, lang)}</p></div>
            <span className={'tag ' + (p.status === 'Active' ? 'ok' : p.status === 'Suspended' ? 'bad' : 'neutral')}>{t('status.' + p.status)}</span>
          </div>
          <div className="tabs wide" role="tablist">{tabs.map((k) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t('tab.' + k)}</button>)}</div>
          {tab === 'overview' && <Overview {...props} />}
          {tab === 'tasks' && <Tasks {...props} />}
          {tab === 'timeline' && <Timeline {...props} />}
          {tab === 'photos' && <Photos {...props} />}
          {tab === 'stock' && <Stock {...props} />}
          {tab === 'reports' && <ProjectReports {...props} />}
          {tab === 'settings' && <Settings {...props} />}
        </>
      );
    }}</Gate>
  );
}

const MsIcon = ({ s }) => (s === 'Completed' ? <CheckCircle2 className="ms done" size={22} /> : s === 'InProgress' ? <Clock className="ms now" size={22} /> : <Circle className="ms" size={22} />);

function Overview({ o, id, reload }) {
  const { t, can, lang, notify } = useStore();
  const p = o.project, [msg, setMsg] = useState('');
  const post = async (e) => { e.preventDefault(); try { await api.addUpdate(id, msg); setMsg(''); notify(t('toast.saved')); reload(); } catch (err) { notify(err.message); } };
  return (
    <>
      <div className="grid2 wide-left">
        <section className="panel">
          <h3>{t('ov.progress')}</h3>
          <div className="big-pct">{Math.round(p.progressPct)}<small>%</small></div>
          <Bar value={p.progressPct} />
          <p className="muted" style={{ marginTop: 8 }}>{t('ov.phase')}: <b>{p.currentPhase || '-'}</b></p>
          <h3 className="sub">{t('ov.byCategory')}</h3>
          {o.categories.length === 0 && <p className="muted">{t('ov.notasks')}</p>}
          {o.categories.map((c) => <div className="cat" key={c.category}><span>{c.category}</span><Bar value={c.progressPct} /><b>{Math.round(c.progressPct)}%</b></div>)}
        </section>
        <section className="panel">
          <h3>{t('ov.stats')}</h3>
          <div className="stats">
            <div><b>{o.stats.completed}</b><span>{t('ov.completed')}</span></div><div><b>{o.stats.inProgress}</b><span>{t('ov.inprogress')}</span></div>
            <div><b>{o.stats.notStarted}</b><span>{t('ov.notstarted')}</span></div><div><b>{o.stats.milestonesDone}/{o.stats.milestonesTotal}</b><span>{t('ov.milestones')}</span></div>
          </div>
          {p.budgetXAF != null && (
            <>
              <h3 className="sub">{t('ov.finance')}</h3>
              <div className="split big"><span>{t('ov.budget')}</span><b>{fmtXAF(p.budgetXAF)}</b></div>
              <div className="split big"><span>{t('ov.spent')}</span><b>{fmtXAF(p.spentXAF)}</b></div>
              <Bar value={p.budgetXAF ? (p.spentXAF / p.budgetXAF) * 100 : 0} tone={p.budgetXAF && p.spentXAF / p.budgetXAF > p.progressPct / 100 + 0.05 ? 'warn' : ''} />
              <p className="muted small">{p.budgetXAF ? Math.round((p.spentXAF / p.budgetXAF) * 100) : 0}% {t('ov.used')}{p.financialsUpdatedBy ? ` · ${t('ov.enteredBy')} ${p.financialsUpdatedBy.name}, ${fmtDate(p.financialsUpdatedAt, lang)}` : ''}</p>
            </>
          )}
        </section>
      </div>
      <div className="grid2">
        <section className="panel">
          <h3>{t('tab.timeline')}</h3>
          <ol className="tline">{o.milestones.map((m) => <li key={m._id} className={m.status}><MsIcon s={m.status} /><div><b>{m.name}</b><span>{fmtDate(m.plannedDate, lang)}</span></div></li>)}</ol>
        </section>
        <section className="panel">
          <h3>{t('ov.updates')}</h3>
          {can('MANAGE_CLIENT_PORTAL') && <form onSubmit={post} className="stack"><textarea required rows={2} placeholder={t('ov.updatePh')} value={msg} onChange={(e) => setMsg(e.target.value)} /><button className="btn ok" type="submit">{t('ov.postUpdate')}</button></form>}
          {o.updates.map((u) => <div className="feed" key={u._id}><p>{u.message}</p><span>{fmtDate(u.createdAt, lang)}</span></div>)}
        </section>
      </div>
      {o.photos.length > 0 && <section className="panel"><h3>{t('ov.recentPhotos')}</h3><div className="photo-row">{o.photos.slice(0, 6).map((ph) => <img key={ph._id} src={ph.url} alt={ph.caption || ''} />)}</div></section>}
    </>
  );
}

function Tasks({ o, id, reload }) {
  const { t, can, notify, bump } = useStore();
  const [edit, setEdit] = useState(null), [draft, setDraft] = useState({}), [adding, setAdding] = useState(false), [nt, setNt] = useState({ unit: 'm²' });
  const groups = o.tasks.reduce((a, x) => { (a[x.category || 'General'] ||= []).push(x); return a; }, {});
  const act = async (fn) => { try { await fn(); reload(); bump(); notify(t('toast.saved')); } catch (e) { notify(e.message); } };
  const save = (task) => act(async () => { await api.updateTask(id, task._id, { cumulativeQty: Number(draft.cumulativeQty), weeklyQty: Number(draft.weeklyQty), weeklyTargetPct: draft.weeklyTargetPct === '' ? '' : Number(draft.weeklyTargetPct), delayReason: draft.delayReason, observation: draft.observation }); setEdit(null); });
  const add = (e) => { e.preventDefault(); act(async () => { await api.addTask(id, { ...nt, totalQty: Number(nt.totalQty), cumulativeQty: Number(nt.cumulativeQty || 0) }); setAdding(false); setNt({ unit: 'm²' }); }); };
  const D = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
  return (
    <section className="panel print-area">
      <div className="toolbar between">
        <h3>{t('tab.tasks')}</h3>
        <div className="actions noprint">
          <button className="btn no" onClick={() => window.print()}><Printer size={15} /> {t('tk.print')}</button>
          {can('MANAGE_TASKS') && <button className="btn ok" onClick={() => setAdding(!adding)}><Plus size={15} /> {t('tk.add')}</button>}
        </div>
      </div>
      {adding && (
        <form className="inline-form noprint" onSubmit={add}>
          <input required placeholder={t('tk.task')} value={nt.name || ''} onChange={(e) => setNt({ ...nt, name: e.target.value })} />
          <input required placeholder={t('tk.category')} value={nt.category || ''} onChange={(e) => setNt({ ...nt, category: e.target.value })} />
          <input placeholder={t('tk.sub')} value={nt.subcontractor || ''} onChange={(e) => setNt({ ...nt, subcontractor: e.target.value })} />
          <input className="s" placeholder={t('tk.unit')} value={nt.unit} onChange={(e) => setNt({ ...nt, unit: e.target.value })} />
          <input required className="s" type="number" step="any" placeholder={t('tk.total')} value={nt.totalQty || ''} onChange={(e) => setNt({ ...nt, totalQty: e.target.value })} />
          <button className="btn ok" type="submit">{t('save')}</button>
        </form>
      )}
      {o.tasks.length === 0 && <p className="muted">{t('ov.notasks')}</p>}
      {Object.entries(groups).map(([cat, list]) => (
        <div key={cat} className="task-group">
          <h4>{cat}</h4>
          <table>
            <thead><tr><th>{t('tk.sub')}</th><th>{t('tk.task')}</th><th>{t('tk.unit')}</th><th className="r">{t('tk.total')}</th><th className="r">{t('tk.cum')}</th><th className="r">{t('tk.week')}</th><th style={{ minWidth: 130 }}>{t('tk.rate')}</th><th className="r">{t('tk.target')}</th><th>{t('tk.notes')}</th>{can('MANAGE_CLIENT_PORTAL') && <th className="noprint">{t('tk.client')}</th>}{can('MANAGE_TASKS') && <th className="noprint" />}</tr></thead>
            <tbody>
              {list.map((k) => {
                const behind = k.weeklyTargetPct != null && k.progressPct < k.weeklyTargetPct;
                return edit === k._id ? (
                  <tr key={k._id} className="editing">
                    <td>{k.subcontractor}</td><td>{k.name}</td><td>{k.unit}</td><td className="r">{num(k.totalQty)}</td>
                    <td className="r"><input className="s" type="number" step="any" value={draft.cumulativeQty} onChange={D('cumulativeQty')} /></td>
                    <td className="r"><input className="s" type="number" step="any" value={draft.weeklyQty} onChange={D('weeklyQty')} /></td>
                    <td />
                    <td className="r"><input className="s" type="number" value={draft.weeklyTargetPct ?? ''} onChange={D('weeklyTargetPct')} /></td>
                    <td><input placeholder={t('tk.notes')} value={draft.observation || ''} onChange={D('observation')} /><input placeholder={t('tk.reason')} value={draft.delayReason || ''} onChange={D('delayReason')} /></td>
                    {can('MANAGE_CLIENT_PORTAL') && <td />}
                    <td><button className="btn ok" onClick={() => save(k)}>{t('save')}</button> <button className="btn no" onClick={() => setEdit(null)}>{t('cancel')}</button></td>
                  </tr>
                ) : (
                  <tr key={k._id} className={behind ? 'flag' : ''}>
                    <td>{k.subcontractor}</td><td>{k.name}</td><td>{k.unit}</td><td className="r">{num(k.totalQty)}</td><td className="r">{num(k.cumulativeQty)}</td><td className="r">{num(k.weeklyQty)}</td>
                    <td><div className="cat tight"><Bar value={k.progressPct} /><b>{Math.round(k.progressPct)}%</b></div></td>
                    <td className="r">{k.weeklyTargetPct != null ? `${k.weeklyTargetPct}%` : ''}</td>
                    <td>{behind && <span className="tag bad">{t('tk.behind')}</span>} {k.delayReason ? <span className="muted">{k.delayReason}</span> : k.observation}</td>
                    {can('MANAGE_CLIENT_PORTAL') && <td className="noprint"><input type="checkbox" aria-label={t('tk.client')} checked={!!k.clientVisible} onChange={(e) => act(() => api.updateTask(id, k._id, { clientVisible: e.target.checked }))} /></td>}
                    {can('MANAGE_TASKS') && <td className="noprint"><button className="btn no" onClick={() => { setEdit(k._id); setDraft({ cumulativeQty: k.cumulativeQty, weeklyQty: k.weeklyQty, weeklyTargetPct: k.weeklyTargetPct ?? '', observation: k.observation || '', delayReason: k.delayReason || '' }); }}>{t('tk.edit')}</button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}

function Timeline({ o, id, reload }) {
  const { t, can, lang, notify } = useStore();
  const [f, setF] = useState({ name: '', plannedDate: '' });
  const act = async (fn) => { try { await fn(); reload(); } catch (e) { notify(e.message); } };
  return (
    <section className="panel">
      <h3>{t('tab.timeline')}</h3>
      <ol className="tline big">
        {o.milestones.map((m) => (
          <li key={m._id} className={m.status}><MsIcon s={m.status} />
            <div><b>{m.name}</b><span>{fmtDate(m.plannedDate, lang)}</span></div>
            {can('MANAGE_PROJECTS') && <select value={m.status} aria-label={t('se.status')} onChange={(e) => act(() => api.updateMilestone(id, m._id, { status: e.target.value }))}>{['Completed', 'InProgress', 'Upcoming'].map((s) => <option key={s} value={s}>{t('ms.' + s)}</option>)}</select>}
          </li>
        ))}
      </ol>
      {can('MANAGE_PROJECTS') && (
        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); act(async () => { await api.addMilestone(id, { ...f, order: o.milestones.length }); setF({ name: '', plannedDate: '' }); }); }}>
          <input required placeholder={t('tl.name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input type="date" aria-label={t('tl.date')} value={f.plannedDate} onChange={(e) => setF({ ...f, plannedDate: e.target.value })} />
          <button className="btn ok" type="submit"><Plus size={15} /> {t('tl.add')}</button>
        </form>
      )}
    </section>
  );
}

function Photos({ id }) {
  const { t, can, lang, notify } = useStore();
  const ph = useApi(() => api.photos(id));
  const [busy, setBusy] = useState(false), [caption, setCaption] = useState(''), [view, setView] = useState(null);
  const upload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setBusy(true);
    try { const { url } = await api.upload(file); await api.addPhoto(id, { url, caption, takenAt: new Date().toISOString() }); setCaption(''); ph.reload(); notify(t('toast.saved')); } catch (err) { notify(err.message); }
    setBusy(false); e.target.value = '';
  };
  return (
    <section className="panel">
      <div className="toolbar between">
        <h3>{t('tab.photos')}</h3>
        {can('UPLOAD_EVIDENCE') && (
          <div className="actions">
            <input placeholder={t('ph.caption')} value={caption} onChange={(e) => setCaption(e.target.value)} />
            <label className={'btn ok file' + (busy ? ' off' : '')}><Camera size={15} /> {busy ? t('ph.uploading') : t('ph.upload')}<input type="file" accept="image/*" hidden onChange={upload} disabled={busy} /></label>
          </div>
        )}
      </div>
      <Gate states={[ph]}>{() => ph.data.length === 0 ? <p className="muted">{t('ph.empty')}</p> : (
        <div className="gallery">
          {ph.data.map((p) => (
            <figure key={p._id}>
              <img src={p.url} alt={p.caption || ''} onClick={() => setView(p)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setView(p)} />
              <figcaption><b>{p.caption}</b><span>{fmtDate(p.takenAt, lang)}{p.uploadedBy?.name ? ` · ${t('ph.by')} ${p.uploadedBy.name}` : ''}</span>
                {can('MANAGE_CLIENT_PORTAL') && <label className="check left"><input type="checkbox" checked={!!p.clientVisible} onChange={async (e) => { try { await api.updatePhoto(id, p._id, { clientVisible: e.target.checked }); ph.reload(); } catch (err) { notify(err.message); } }} /> {t('ph.visible')}</label>}
              </figcaption>
            </figure>
          ))}
        </div>
      )}</Gate>
      <Lightbox photo={view} onClose={() => setView(null)} label={t('close')} />
    </section>
  );
}

function Stock({ id }) {
  const { t, can, lang, notify } = useStore();
  const st = useApi(() => api.stock(id));
  const [f, setF] = useState({ materialType: '', kind: 'in', quantity: '', party: '' });
  const add = async (e) => { e.preventDefault(); try { await api.addStock(id, { ...f, quantity: Number(f.quantity) }); setF({ materialType: '', kind: 'in', quantity: '', party: '' }); st.reload(); notify(t('toast.saved')); } catch (err) { notify(err.message); } };
  return (
    <Gate states={[st]}>{() => (
      <div className="grid2 wide-left">
        <section className="panel">
          <h3>{t('tab.stock')}</h3>
          <table>
            <thead><tr><th>{t('st.material')}</th><th className="r">{t('st.opening')}</th><th className="r">{t('st.in')}</th><th className="r">{t('st.out')}</th><th className="r">{t('st.closing')}</th></tr></thead>
            <tbody>{st.data.summary.map((s) => <tr key={s.materialType} className={s.closing <= 0 ? 'flag' : ''}><td>{s.materialType}</td><td className="r">{num(s.opening)}</td><td className="r">{num(s.incoming)}</td><td className="r">{num(s.outgoing)}</td><td className="r"><b>{num(s.closing)}</b></td></tr>)}</tbody>
          </table>
        </section>
        <section className="panel">
          {(can('MANAGE_PROJECTS') || can('MANAGE_DELIVERIES')) && (
            <form className="stack" onSubmit={add}>
              <h3>{t('st.add')}</h3>
              <input required placeholder={t('st.material')} value={f.materialType} onChange={(e) => setF({ ...f, materialType: e.target.value })} list="stock-items" />
              <datalist id="stock-items">{st.data.summary.map((s) => <option key={s.materialType} value={s.materialType} />)}</datalist>
              <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} aria-label={t('st.kind')}>{['opening', 'in', 'out'].map((k) => <option key={k} value={k}>{t('kind.' + k)}</option>)}</select>
              <input required type="number" step="any" min="0" placeholder={t('qty')} value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
              <input placeholder={t('st.party')} value={f.party} onChange={(e) => setF({ ...f, party: e.target.value })} />
              <button className="btn ok" type="submit">{t('save')}</button>
            </form>
          )}
          <h3 className="sub">{t('st.recent')}</h3>
          {st.data.recent.slice(0, 8).map((r) => <div className="row-link static" key={r._id}><span>{t('kind.' + r.kind)}: <b>{num(r.quantity)}</b> {r.materialType}</span><span className="muted">{fmtDate(r.date, lang)}{r.party ? ` · ${r.party}` : ''}</span></div>)}
        </section>
      </div>
    )}</Gate>
  );
}

function ProjectReports({ id }) {
  const { t } = useStore();
  const rp = useApi(() => api.reports(id));
  return <Gate states={[rp]}>{() => <section className="panel"><h3>{t('tab.reports')}</h3>{rp.data.length === 0 && <p className="muted">{t('rp.none')}</p>}{rp.data.map((r) => <ReportCard key={r._id} r={r} />)}</section>}</Gate>;
}

function Settings({ o, id, reload }) {
  const { t, can, lang, notify, bump } = useStore();
  const p = o.project;
  const clients = useApi(() => (can('MANAGE_PROJECTS') ? api.clients() : Promise.resolve([])));
  const [f, setF] = useState({ siteName: p.siteName, locationCity: p.locationCity, description: p.description || '', currentPhase: p.currentPhase || '', startDate: p.startDate?.slice(0, 10) || '', endDate: p.endDate?.slice(0, 10) || '', status: p.status, plannedWorkers: p.plannedWorkers || 0, client: p.client?._id || '', budgetXAF: p.budgetXAF ?? '', spentXAF: p.spentXAF ?? '' });
  const [busy, setBusy] = useState(false);
  const S = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    const body = {};
    if (can('MANAGE_PROJECTS')) Object.assign(body, { siteName: f.siteName, locationCity: f.locationCity, description: f.description, currentPhase: f.currentPhase, startDate: f.startDate, endDate: f.endDate, status: f.status, plannedWorkers: Number(f.plannedWorkers), client: f.client });
    if (can('MANAGE_PROJECT_FINANCIALS')) Object.assign(body, { budgetXAF: Number(f.budgetXAF || 0), spentXAF: Number(f.spentXAF || 0) });
    try { await api.updateProject(id, body); notify(t('toast.saved')); reload(); bump(); } catch (err) { notify(err.message); }
    setBusy(false);
  };
  return (
    <form className="panel form-grid" onSubmit={submit}>
      {can('MANAGE_PROJECTS') && (<>
        <h3>{t('se.title')}</h3>
        <label>{t('proj.name')}<input required value={f.siteName} onChange={S('siteName')} /></label>
        <label>{t('proj.city')}<input required value={f.locationCity} onChange={S('locationCity')} /></label>
        <label>{t('ov.phase')}<input value={f.currentPhase} onChange={S('currentPhase')} /></label>
        <label>{t('se.status')}<select value={f.status} onChange={S('status')}>{['Planning', 'Active', 'Suspended', 'Completed'].map((s) => <option key={s} value={s}>{t('status.' + s)}</option>)}</select></label>
        <label>{t('proj.start')}<input required type="date" value={f.startDate} onChange={S('startDate')} /></label>
        <label>{t('proj.end')}<input type="date" value={f.endDate} onChange={S('endDate')} /></label>
        <label>{t('se.planned')}<input type="number" min="0" value={f.plannedWorkers} onChange={S('plannedWorkers')} /></label>
        <label>{t('se.client')}<select value={f.client} onChange={S('client')}><option value="">{t('none')}</option>{(clients.data || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
        <label className="full">{t('se.desc')}<textarea rows={3} value={f.description} onChange={S('description')} /></label>
      </>)}
      {can('MANAGE_PROJECT_FINANCIALS') && (<>
        <h3 className="full">{t('se.finance')}</h3>
        <p className="muted full">{t('se.note')}</p>
        <label>{t('se.budget')}<input type="number" min="0" value={f.budgetXAF} onChange={S('budgetXAF')} /></label>
        <label>{t('se.spent')}<input type="number" min="0" value={f.spentXAF} onChange={S('spentXAF')} /></label>
        {p.financialsUpdatedAt && <p className="muted full">{t('se.lastBy')} {p.financialsUpdatedBy?.name || '-'} · {fmtDate(p.financialsUpdatedAt, lang)}</p>}
      </>)}
      <div className="full"><button className="btn ok" type="submit" disabled={busy}>{busy ? t('saving') : t('save')}</button></div>
    </form>
  );
}
