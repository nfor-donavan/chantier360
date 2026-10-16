import React, { useRef, useState } from 'react';
import { NavLink, Link, Route, Routes, Navigate } from 'react-router-dom';
import { Home, Users, PackageCheck, FileText, CalendarDays, Camera, LogOut, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store.jsx';
import { api, uploadMedia } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { Toggles } from '../components/Layout.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import NexusFooter from '../nexus/NexusFooter.jsx';
import { fmtDate } from '../utils.js';

// The foreman's web interface. Same account and same permissions as the phone app; every request is checked by the server.
// It needs an internet connection. The phone app is the one that works offline.
const toNum = (x) => { const n = parseFloat(String(x ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const today = () => new Date().toISOString().slice(0, 10);

function useAction() {
  const { t } = useStore();
  const [st, setSt] = useState({ busy: false, err: '', ok: '' });
  const run = async (fn, ok) => { setSt({ busy: true, err: '', ok: '' }); try { const r = await fn(); setSt({ busy: false, err: '', ok: ok || t('f.saved') }); return r; } catch (e) { setSt({ busy: false, err: e.status === 0 ? t('err.network') : e.message, ok: '' }); return undefined; } };
  return [st, run, () => setSt({ busy: false, err: '', ok: '' })];
}
const Msg = ({ st }) => (<>{st.err && <p className="err" role="alert">{st.err}</p>}{st.ok && <p className="ok-note" role="status">✓ {st.ok}</p>}</>);

function Upload({ onDone, accept = 'image/*,video/*', label, multiple = false }) {
  const { t } = useStore();
  const [prog, setProg] = useState(null), [err, setErr] = useState('');
  const pick = async (e) => {
    const files = [...e.target.files]; e.target.value = '';
    for (const file of files) {
      setErr(''); setProg(0);
      try { const up = await uploadMedia(file, setProg); onDone({ url: up.url, kind: up.kind, name: file.name }); } catch (x) { setErr(x.status === 0 ? t('err.network') : x.message); }
    }
    setProg(null);
  };
  return (<div className="stack tight"><label className={'btn no file' + (prog != null ? ' off' : '')}><Camera size={15} /> {prog != null ? `${t('ph.uploading')} ${prog}%` : label}<input type="file" accept={accept} multiple={multiple} hidden onChange={pick} disabled={prog != null} /></label>{err && <p className="err" role="alert">{err}</p>}</div>);
}

export default function Field() {
  const { t, user, logout, toast } = useStore();
  const boot = useApi(api.bootstrap, { every: 180000 });
  const nav = [['/', 'home', Home], ['/attendance', 'attendance', Users], ['/deliveries', 'deliveries', PackageCheck], ['/report', 'report', FileText], ['/weekly', 'weekly', CalendarDays]];
  return (
    <div className="field">
      <header className="field-top">
        <div className="field-brand">{user.tenant?.logoUrl && <img src={user.tenant.logoUrl} alt="" />}<div><b>{user.tenant?.companyName}</b><span>{boot.data?.project?.siteName || user.site?.siteName}</span></div></div>
        <div className="field-tools"><Toggles /><button className="signout dark" onClick={logout} title={t('signout')}><LogOut size={16} /> <span>{t('signout')}</span></button></div>
      </header>
      <main className="field-main">
        <Gate states={[boot]}>{() => (
          <Routes>
            <Route path="/" element={<FieldHome boot={boot.data} />} />
            <Route path="/attendance" element={<Attendance boot={boot.data} reload={boot.reload} />} />
            <Route path="/deliveries" element={<Deliveries boot={boot.data} reload={boot.reload} />} />
            <Route path="/report" element={<Report boot={boot.data} />} />
            <Route path="/weekly" element={<Weekly />} />
            <Route path="/photo" element={<PhotoPage boot={boot.data} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}</Gate>
        <NexusFooter tenantName={user.tenant?.companyName} />
      </main>
      <nav className="field-nav" aria-label="Main">{nav.map(([to, k, Icon]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'on' : '')}><Icon size={20} /><span>{t('f.' + k)}</span></NavLink>)}</nav>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function FieldHome({ boot }) {
  const { t, user, lang } = useStore();
  const tiles = [['/attendance', Users, 'f.attendance'], ['/deliveries', PackageCheck, 'f.deliveries'], ['/report', FileText, 'f.report'], ['/weekly', CalendarDays, 'f.weekly'], ['/photo', Camera, 'f.photo']];
  return (
    <>
      <section className="panel"><h2>{boot.project?.siteName}</h2><p className="muted">{t('f.hello')}, {user.name.split(' ')[0]} · {new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <div className="chips"><span className="chip">{boot.workers.length} {t('f.attendance').toLowerCase()}</span><span className="chip">{boot.orders.length} {t('f.deliveries').toLowerCase()}</span><span className="chip">{boot.tasks.length} {t('tk.task').toLowerCase()}</span></div></section>
      <div className="tiles">{tiles.map(([to, Icon, k]) => <Link key={to} to={to} className="tile"><Icon size={26} /><b>{t(k)}</b></Link>)}</div>
      <p className="muted small">{t('f.needInternet')}</p>
    </>
  );
}

function Attendance({ boot, reload }) {
  const { t } = useStore();
  const [sel, setSel] = useState([]), [photo, setPhoto] = useState(''), [manage, setManage] = useState(boot.workers.length === 0), [nw, setNw] = useState({ name: '', category: '' }), [newCat, setNewCat] = useState(''), [rm, setRm] = useState(null);
  const [st, run] = useAction(), [ws, runW] = useAction();
  const toggle = (u) => setSel((s) => (s.includes(u) ? s.filter((x) => x !== u) : [...s, u]));
  const groups = boot.categories.map((c) => [c.name, boot.workers.filter((w) => w.category === c.name)]).filter(([, l]) => l.length);
  const save = async () => { const r = await run(() => api.submitAttendance({ workers: sel, siteGroupPhotoUrl: photo })); if (r) { setSel([]); setPhoto(''); } };
  return (
    <>
      <section className="panel">
        <h3>{t('f.select')}</h3>
        {boot.workers.length === 0 && <p className="muted">{t('f.noWorkers')}</p>}
        <div className="actions"><button className="btn no slim" onClick={() => setSel(boot.workers.map((w) => w.uid))}>{t('f.selectAll')}</button><button className="btn no slim" onClick={() => setSel([])}>{t('f.clear')}</button></div>
        {groups.map(([cat, list]) => (
          <div key={cat}><h4 className="grp">{cat} ({list.filter((w) => sel.includes(w.uid)).length}/{list.length})</h4>
            {list.map((w) => <div className="check-row" key={w.uid}><label className="grow"><input type="checkbox" checked={sel.includes(w.uid)} onChange={() => toggle(w.uid)} /> {w.name}</label>{manage && <button className="btn no slim" onClick={() => setRm(w)}><Trash2 size={13} /> {t('f.remove')}</button>}</div>)}
          </div>
        ))}
        <p className="total-line"><b>{sel.length}</b> {t('f.present')}{boot.project?.plannedWorkers ? ` / ${boot.project.plannedWorkers}` : ''}</p>
        <Upload accept="image/*" label={t('f.groupPhoto')} onDone={(m) => setPhoto(m.url)} />{photo && <span className="tag ok">✓</span>}
        <Msg st={st} />
        <button className="btn ok wide" disabled={!sel.length || !photo || st.busy} onClick={save}>{st.busy ? t('saving') : t('f.saveAtt')}</button>
      </section>
      <button className="btn no" onClick={() => setManage(!manage)}>{manage ? t('wk.done') : `＋ ${t('f.manage')}`}</button>
      {manage && (
        <section className="panel stack">
          <h3>{t('f.addWorker')}</h3>
          <label>{t('f.name')}<input value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} /></label>
          <label>{t('f.category')}<select value={nw.category} onChange={(e) => setNw({ ...nw, category: e.target.value })}><option value="">—</option>{boot.categories.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}</select></label>
          <div className="inline-form"><input placeholder={t('f.newCat')} value={newCat} onChange={(e) => setNewCat(e.target.value)} /><button className="btn no" onClick={async () => { const c = await runW(() => api.addCategory(newCat)); if (c) { setNw({ ...nw, category: c.name }); setNewCat(''); reload(); } }}>{t('f.addCat')}</button></div>
          <Msg st={ws} />
          <button className="btn ok" disabled={ws.busy} onClick={async () => { const w = await runW(() => api.createWorker(nw)); if (w) { setNw({ name: '', category: nw.category }); reload(); } }}>{t('f.register')}</button>
        </section>
      )}
      {rm && <ConfirmModal title={t('f.removeTitle')} confirmLabel={t('f.remove')} tone="danger" onCancel={() => setRm(null)} onConfirm={async () => { await api.removeWorker(rm._id); setSel((s) => s.filter((x) => x !== rm.uid)); setRm(null); reload(); }}><p><b>{rm.name}</b></p><p className="muted">{t('f.removeNote')}</p></ConfirmModal>}
    </>
  );
}

function Deliveries({ boot, reload }) {
  const { t, lang } = useStore();
  const [form, setForm] = useState(null), [del, setDel] = useState(null), [st, run] = useAction();
  const S = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const open = (d) => setForm(d ? { id: d._id, orderId: d.orderId || '', materialType: d.materialType, supplierName: d.supplierName, qty: String(d.quantityReceived), unit: d.unit || '', date: String(d.deliveryDate).slice(0, 10), notes: d.notes || '', photo: '', orderedQty: d.quantityOrdered }
    : { id: null, orderId: '', materialType: '', supplierName: '', qty: '', unit: '', date: today(), notes: '', photo: '', orderedQty: null });
  const pickOrder = (id) => { const o = boot.orders.find((x) => x._id === id); setForm({ ...form, orderId: id, materialType: o ? o.materialType : '', supplierName: form.supplierName || o?.supplierName || '', orderedQty: o ? o.quantityOrdered : null }); };
  const submit = async () => {
    const body = { materialType: form.materialType, supplierName: form.supplierName, quantityReceived: toNum(form.qty), unit: form.unit, deliveryDate: form.date, notes: form.notes, ...(form.photo && { deliveryNotePhotoUrl: form.photo }) };
    const r = await run(() => (form.id ? api.updateDelivery(form.id, body) : api.createDelivery({ ...body, orderId: form.orderId || undefined })));
    if (r) { setForm(null); reload(); }
  };
  const short = form && form.orderedQty != null && form.qty !== '' && toNum(form.qty) < form.orderedQty;
  const valid = form && form.materialType.trim() && form.supplierName.trim() && form.qty !== '' && (form.id || form.photo);
  if (!form) return (
    <>
      <button className="btn ok wide" onClick={() => open(null)}><Plus size={16} /> {t('f.newDelivery')}</button>
      <section className="panel"><h3>{t('f.recorded')}</h3>
        {boot.deliveries.length === 0 && <p className="muted">{t('f.none')}</p>}
        {boot.deliveries.map((d) => (
          <div className="row-card" key={d._id}><b>{d.materialType}</b><p className="muted">{d.quantityReceived} {d.unit} · {d.supplierName} · {fmtDate(d.deliveryDate, lang)}</p>{d.flagged && <span className="tag bad">{t('f.short')}</span>}
            <div className="actions"><button className="btn no slim" onClick={() => open(d)}>{t('f.edit')}</button><button className="btn no slim" onClick={() => setDel(d)}>{t('f.delete')}</button></div></div>
        ))}
      </section>
      {del && <ConfirmModal title={t('f.deleteTitle')} confirmLabel={t('f.delete')} tone="danger" onCancel={() => setDel(null)} onConfirm={async () => { await api.deleteDelivery(del._id); setDel(null); reload(); }}><p><b>{del.materialType}</b> · {del.quantityReceived} {del.unit}</p><p className="muted">{t('f.deleteNote')}</p></ConfirmModal>}
    </>
  );
  return (
    <section className="panel stack">
      <h3>{form.id ? t('f.edit') : t('f.newDelivery')}</h3>
      {!form.id && boot.orders.length > 0 && <label>{t('f.fromOrder')}<select value={form.orderId} onChange={(e) => pickOrder(e.target.value)}><option value="">{t('f.noOrder')}</option>{boot.orders.map((o) => <option key={o._id} value={o._id}>{o.materialType} · {o.supplierName} · {o.quantityOrdered}</option>)}</select></label>}
      <label>{t('f.material')}<input value={form.materialType} onChange={S('materialType')} disabled={!!form.orderId} /></label>
      <label>{t('f.supplier')}<input value={form.supplierName} onChange={S('supplierName')} /></label>
      <label>{t('f.qtyRecv')}<input type="number" min="0" step="any" value={form.qty} onChange={S('qty')} placeholder={form.orderedQty != null ? String(form.orderedQty) : ''} /></label>
      {short && <p className="err">{form.orderedQty - toNum(form.qty)} {t('f.short')}</p>}
      <label>{t('f.unit')}<input value={form.unit} onChange={S('unit')} /></label>
      <label>{t('f.date')}<input type="date" value={form.date} onChange={S('date')} /></label>
      <label>{t('f.notes')}<textarea rows={2} value={form.notes} onChange={S('notes')} /></label>
      <Upload accept="image/*" label={t('f.notePhoto')} onDone={(m) => setForm((x) => ({ ...x, photo: m.url }))} />{form.photo && <span className="tag ok">✓</span>}
      <Msg st={st} />
      <div className="actions"><button className="btn ok" disabled={!valid || st.busy} onClick={submit}>{st.busy ? t('saving') : form.id ? t('f.update') : t('f.saveReport')}</button><button className="btn no" onClick={() => setForm(null)}>{t('cancel')}</button></div>
    </section>
  );
}

function Rows({ rows, setRows, cols, blank, addLabel }) {
  const { t } = useStore();
  const upd = (i, k, v) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (<div className="stack tight">{rows.map((r, i) => <div className="row-inputs" key={i}>{cols.map(([k, ph, kind]) => kind === 'select' ? <select key={k} value={r[k]} onChange={(e) => upd(i, k, e.target.value)}><option value="in">{t('f.in')}</option><option value="out">{t('f.out')}</option></select> : <input key={k} placeholder={ph} value={r[k]} type={kind || 'text'} step={kind === 'number' ? 'any' : undefined} list={k === 'materialType' ? 'stock-items' : undefined} onChange={(e) => upd(i, k, e.target.value)} />)}<button className="btn no slim" aria-label={t('f.remove')} onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 size={13} /></button></div>)}
    <button className="btn no slim" onClick={() => setRows([...rows, blank])}><Plus size={13} /> {addLabel}</button></div>);
}

function Report({ boot }) {
  const { t } = useStore();
  const [work, setWork] = useState([]), [crew, setCrew] = useState({}), [equip, setEquip] = useState([]), [moves, setMoves] = useState([]), [diffs, setDiffs] = useState([]), [media, setMedia] = useState([]);
  const [f, setF] = useState({ objectives: '', tomorrowPlan: '', ordersNote: '', cashOpen: '', cashExp: '' });
  const [st, run] = useAction();
  const S = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const addTask = (id) => { const k = boot.tasks.find((x) => x._id === id); if (k && !work.some((w) => w.taskId === id)) setWork([...work, { taskId: id, taskName: k.name, unit: k.unit, quantity: '', pct: '', current: k.progressPct }]); };
  const submit = async () => {
    if (work.some((w) => w.pct !== '' && !(toNum(w.pct) >= 0 && toNum(w.pct) <= 100))) return run(() => Promise.reject(new Error(t('rep.pcterr'))));
    const payload = { date: new Date().toISOString(), objectives: f.objectives, tomorrowPlan: f.tomorrowPlan, ordersNote: f.ordersNote,
      workPerformed: work.filter((w) => toNum(w.quantity) > 0 || w.pct !== '').map((w) => ({ taskId: w.taskId, taskName: w.taskName, unit: w.unit, quantity: toNum(w.quantity), progressPct: w.pct === '' ? undefined : toNum(w.pct) })),
      workforce: boot.categories.map((c) => ({ category: c.name, count: toNum(crew[c.name]) })).filter((w) => w.count > 0),
      materialsUsed: equip.filter((e) => e.materialType.trim() && toNum(e.quantity) > 0).map((e) => ({ materialType: e.materialType.trim(), quantity: toNum(e.quantity) })),
      stockMovements: moves.filter((m) => m.materialType.trim() && toNum(m.quantity) > 0).map((m) => ({ materialType: m.materialType.trim(), kind: m.kind, quantity: toNum(m.quantity), party: m.party })),
      difficulties: diffs.filter((d) => d.issue.trim()), media: media.map((m) => ({ url: m.url, kind: m.kind })),
      siteCash: f.cashOpen !== '' || f.cashExp !== '' ? { opening: toNum(f.cashOpen), expenses: toNum(f.cashExp) } : undefined };
    const r = await run(() => api.submitDaily(payload));
    if (r) { setWork([]); setCrew({}); setEquip([]); setMoves([]); setDiffs([]); setMedia([]); setF({ objectives: '', tomorrowPlan: '', ordersNote: '', cashOpen: '', cashExp: '' }); }
  };
  return (
    <>
      <section className="panel stack"><h3>{t('f.work')}</h3>
        {work.map((w, i) => (<div className="row-card" key={w.taskId}><b>{w.taskName}</b> <span className="muted small">{t('f.now')}: {Math.round(w.current)}%</span>
          <div className="row-inputs"><input type="number" step="any" min="0" placeholder={`${t('f.qtyDone')} (${w.unit})`} value={w.quantity} onChange={(e) => setWork(work.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} /><input type="number" step="any" min="0" max="100" placeholder="%" aria-label={t('f.pct')} value={w.pct} onChange={(e) => setWork(work.map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)))} /><button className="btn no slim" aria-label={t('f.remove')} onClick={() => setWork(work.filter((_, j) => j !== i))}><Trash2 size={13} /></button></div></div>))}
        <select value="" onChange={(e) => addTask(e.target.value)} aria-label={t('f.addTask')}><option value="">＋ {t('f.addTask')}</option>{boot.tasks.filter((k) => !work.some((w) => w.taskId === k._id)).map((k) => <option key={k._id} value={k._id}>{k.name} · {Math.round(k.progressPct)}%</option>)}</select>
        {work.length > 0 && <p className="muted small">{t('f.pctHint')}</p>}
        <label>{t('f.objectives')}<textarea rows={2} value={f.objectives} onChange={S('objectives')} /></label></section>
      <section className="panel"><h3>{t('f.crew')}</h3><div className="crew">{boot.categories.map((c) => <label key={c._id}>{c.name}<input type="number" min="0" value={crew[c.name] || ''} onChange={(e) => setCrew({ ...crew, [c.name]: e.target.value })} /></label>)}</div></section>
      <datalist id="stock-items">{boot.stock.map((s) => <option key={s.materialType} value={s.materialType} />)}</datalist>
      <section className="panel"><h3>{t('f.equipment')}</h3><Rows rows={equip} setRows={setEquip} cols={[['materialType', t('f.item')], ['quantity', '0', 'number']]} blank={{ materialType: '', quantity: '' }} addLabel={t('f.addItem')} /></section>
      <section className="panel"><h3>{t('f.stockMoves')}</h3><Rows rows={moves} setRows={setMoves} cols={[['kind', '', 'select'], ['materialType', t('f.item')], ['quantity', '0', 'number'], ['party', t('f.party')]]} blank={{ kind: 'out', materialType: '', quantity: '', party: '' }} addLabel={t('f.addItem')} /></section>
      <section className="panel"><h3>{t('f.difficulties')}</h3><Rows rows={diffs} setRows={setDiffs} cols={[['issue', t('f.issue')], ['solution', t('f.solution')]]} blank={{ issue: '', solution: '' }} addLabel={t('f.addItem')} /></section>
      <section className="panel stack"><label>{t('f.tomorrow')}<textarea rows={2} value={f.tomorrowPlan} onChange={S('tomorrowPlan')} /></label><label>{t('f.orders')}<input value={f.ordersNote} onChange={S('ordersNote')} /></label>
        <div className="row-inputs"><label>{t('f.cashOpen')}<input type="number" value={f.cashOpen} onChange={S('cashOpen')} /></label><label>{t('f.cashExp')}<input type="number" value={f.cashExp} onChange={S('cashExp')} /></label></div></section>
      <section className="panel stack"><h3>{t('f.media')}</h3><Upload multiple label={t('rt.addmedia')} onDone={(m) => setMedia((x) => [...x, m])} />{media.map((m, i) => <div key={i} className="row-inputs"><span className="grow">{m.kind === 'video' ? '🎬' : '📷'} {m.name}</span><button className="btn no slim" onClick={() => setMedia(media.filter((_, j) => j !== i))}><Trash2 size={13} /></button></div>)}</section>
      <Msg st={st} />
      <button className="btn ok wide" disabled={st.busy} onClick={submit}>{st.busy ? t('saving') : t('f.saveReport')}</button>
    </>
  );
}

function Weekly() {
  const { t, lang } = useStore();
  const w = useApi(api.weeklyCurrent);
  const [edits, setEdits] = useState({}), [meta, setMeta] = useState(null), [confirm, setConfirm] = useState(false), [st, run] = useAction();
  const d = w.data;
  if (d && !meta) setMeta({ objectives: d.objectives || '', notes: d.notes || '' });
  const editable = d && d.status === 'draft' && !d.submittedAt;
  const val = (r, k) => (edits[r.taskId]?.[k] !== undefined ? edits[r.taskId][k] : r[k] != null ? String(r[k]) : '');
  const set = (id, k, v) => setEdits((e) => ({ ...e, [id]: { ...e[id], [k]: v } }));
  const save = () => api.updateWeekly(d._id, { rows: Object.entries(edits).map(([taskId, v]) => ({ taskId, ...v })), objectives: meta.objectives, notes: meta.notes });
  const end = d && new Date(+new Date(d.weekStart) + 5 * 864e5);
  return (
    <Gate states={[w]}>{() => (
      <>
        <section className="panel"><h3>{fmtDate(d.weekStart, lang)} – {fmtDate(end, lang)}</h3><p className="muted">{t('f.weekAuto')}</p>
          {d.status === 'locked' && <p className="ok-note">{t('f.lockedWeek')}</p>}{d.status !== 'locked' && d.submittedAt && <p className="ok-note">{t('f.sent')}</p>}</section>
        {d.rows.map((r) => (
          <section className="panel stack" key={r.taskId}><b>{r.name}</b>{r.subcontractor && <span className="muted small">{r.subcontractor}</span>}
            <p className="muted">{t('f.executed')}: <b>{r.weeklyQty} {r.unit}</b> · {t('tk.rate')}: <b>{Math.round(r.progressPct)}%</b></p>
            <div className="row-inputs"><label>{t('f.planned')}<input type="number" min="0" max="100" disabled={!editable} value={val(r, 'plannedPct')} onChange={(e) => set(r.taskId, 'plannedPct', e.target.value)} /></label><label className="grow">{t('f.reason')}<input disabled={!editable} value={val(r, 'delayReason')} onChange={(e) => set(r.taskId, 'delayReason', e.target.value)} /></label></div>
            <label>{t('f.obs')}<input disabled={!editable} value={val(r, 'observation')} onChange={(e) => set(r.taskId, 'observation', e.target.value)} /></label></section>
        ))}
        <section className="panel stack"><label>{t('rt.objectives')}<textarea rows={2} disabled={!editable} value={meta?.objectives || ''} onChange={(e) => setMeta({ ...meta, objectives: e.target.value })} /></label><label>{t('rt.notes')}<textarea rows={2} disabled={!editable} value={meta?.notes || ''} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} /></label></section>
        <Msg st={st} />
        {editable && <div className="actions"><button className="btn no" disabled={st.busy} onClick={async () => { const r = await run(save); if (r) w.reload(); }}>{t('save')}</button><button className="btn ok" disabled={st.busy} onClick={() => setConfirm(true)}>{t('f.send')}</button></div>}
        {confirm && <ConfirmModal title={t('f.send')} confirmLabel={t('f.send')} onCancel={() => setConfirm(false)} onConfirm={async () => { await save(); await api.submitWeekly(d._id); setConfirm(false); setEdits({}); w.reload(); }}><p>{t('f.sendConfirm')}</p></ConfirmModal>}
      </>
    )}</Gate>
  );
}

function PhotoPage({ boot }) {
  const { t } = useStore();
  const [url, setUrl] = useState(''), [caption, setCaption] = useState(''), [task, setTask] = useState(''), [st, run] = useAction();
  return (
    <section className="panel stack"><h3>{t('f.photo')}</h3>
      <Upload accept="image/*" label={t('f.photo')} onDone={(m) => setUrl(m.url)} />{url && <img className="preview" src={url} alt="" />}
      <label>{t('f.caption')}<input value={caption} onChange={(e) => setCaption(e.target.value)} /></label>
      <label>{t('f.task')}<select value={task} onChange={(e) => setTask(e.target.value)}><option value="">—</option>{boot.tasks.map((k) => <option key={k._id} value={k._id}>{k.name}</option>)}</select></label>
      <Msg st={st} />
      <button className="btn ok" disabled={!url || st.busy} onClick={async () => { const r = await run(() => api.addPhoto(boot.project._id, { url, caption, taskId: task || undefined, takenAt: new Date().toISOString() })); if (r) { setUrl(''); setCaption(''); setTask(''); } }}>{t('f.savePhoto')}</button>
    </section>
  );
}
