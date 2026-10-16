import React, { useState } from 'react';
import { Plus, Wrench } from 'lucide-react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { Modal, ConfirmModal } from '../components/Modal.jsx';
import { fmtDate } from '../utils.js';

const tone = (s) => (s === 'Operational' ? 'ok' : s === 'Retired' || s === 'Out of service' ? 'bad' : 'neutral');
const blank = { name: '', category: 'Vehicle', identifier: '', quantity: 1, status: 'Operational', condition: 'Good', locationRef: '', locationNote: '', assignedSiteId: '', ownership: '', acquiredOn: '', notes: '' };

// The company assets register. Anyone allowed to view it sees it read-only; only a role with the edit permission can change it.
export default function Assets() {
  const { t, lang, notify, can } = useStore();
  const [f, setF] = useState({ category: '', status: '' });
  const data = useApi(() => api.assets(f), { every: 60000 });
  const locs = useApi(() => (can('MANAGE_ASSETS') ? api.locations() : Promise.resolve({ locations: [] })));
  const projects = useApi(() => (can('MANAGE_ASSETS') ? api.projects() : Promise.resolve([])));
  const [form, setForm] = useState(null), [sel, setSel] = useState(null), [del, setDel] = useState(null), [busy, setBusy] = useState(false), [note, setNote] = useState('');
  React.useEffect(() => { data.reload(); }, [f.category, f.status]); // eslint-disable-line
  const S = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toBody = (x) => {
    const L = (locs.data?.locations || []).find((l) => l.ref === x.locationRef);
    return { name: x.name, category: x.category, identifier: x.identifier, quantity: Number(x.quantity), status: x.status, condition: x.condition, locationNote: x.locationNote, assignedSiteId: x.assignedSiteId, ownership: x.ownership, acquiredOn: x.acquiredOn, notes: x.notes,
      location: L ? { kind: L.ref.split(':')[0], id: L.ref.split(':')[1], name: L.name } : null };
  };
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { form._id ? await api.updateAsset(form._id, toBody(form)) : await api.createAsset(toBody(form)); notify(t('toast.saved')); setForm(null); setSel(null); data.reload(); }
    catch (err) { notify(err.message); }
    setBusy(false);
  };
  const edit = (a) => setForm({ ...blank, ...a, locationRef: a.location ? `${a.location.kind}:${a.location.id}` : '', assignedSiteId: a.assignedSiteId?._id || '', acquiredOn: a.acquiredOn ? String(a.acquiredOn).slice(0, 10) : '' });
  const addMaint = async (e) => { e.preventDefault(); try { await api.addMaintenance(sel._id, { note }); setNote(''); notify(t('toast.saved')); await data.reload(); setSel(null); } catch (err) { notify(err.message); } };
  return (
    <Gate states={[data]}>{() => {
      const d = data.data;
      return (
        <>
          <section className="panel">
            <div className="toolbar between"><h3>{t('as.summary')}</h3>{d.canEdit && <button className="btn ok" onClick={() => setForm({ ...blank })}><Plus size={15} /> {t('as.add')}</button>}</div>
            <div className="chips big">{d.summary.map((s) => <span className="chip" key={s.category}><b>{s.quantity}</b> {t('as.cat.' + s.category)}</span>)}</div>
            {!d.canEdit && <p className="muted small">{t('as.viewOnly')}</p>}
            <div className="inline-form filters">
              <label className="mini">{t('as.category')}<select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="">{t('all')}</option>{d.categories.map((c) => <option key={c} value={c}>{t('as.cat.' + c)}</option>)}</select></label>
              <label className="mini">{t('as.status')}<select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">{t('all')}</option>{['Operational', 'In maintenance', 'Out of service', 'Retired'].map((s) => <option key={s} value={s}>{t('as.st.' + s)}</option>)}</select></label>
            </div>
            {d.items.length === 0 ? <p className="muted">{t('as.none')}</p> : (
              <table className="selectable">
                <thead><tr><th>{t('as.name')}</th><th>{t('as.category')}</th><th>{t('as.id')}</th><th className="r">{t('as.qty')}</th><th>{t('as.status')}</th><th>{t('as.condition')}</th><th>{t('as.location')}</th><th>{t('as.project')}</th></tr></thead>
                <tbody>{d.items.map((a) => (
                  <tr key={a._id} onClick={() => setSel(a)}>
                    <td><b>{a.name}</b></td><td>{t('as.cat.' + a.category)}</td><td>{a.identifier}</td><td className="r">{a.quantity}</td>
                    <td><span className={'tag ' + tone(a.status)}>{t('as.st.' + a.status)}</span></td><td>{t('as.cd.' + a.condition)}</td><td>{a.location?.name || a.locationNote || <span className="muted">{t('as.noLocation')}</span>}</td><td>{a.assignedSiteId?.siteName}</td>
                  </tr>))}</tbody>
              </table>
            )}
          </section>

          {sel && !form && (
            <Modal title={sel.name} onClose={() => setSel(null)} wide>
              <div className="grid2">
                <div className="stack tight">
                  <p><b>{t('as.category')}:</b> {t('as.cat.' + sel.category)}</p><p><b>{t('as.id')}:</b> {sel.identifier || '—'}</p><p><b>{t('as.qty')}:</b> {sel.quantity}</p>
                  <p><b>{t('as.status')}:</b> <span className={'tag ' + tone(sel.status)}>{t('as.st.' + sel.status)}</span> · <b>{t('as.condition')}:</b> {t('as.cd.' + sel.condition)}</p>
                  <p><b>{t('as.location')}:</b> {sel.location?.name || '—'}{sel.locationNote ? ` · ${sel.locationNote}` : ''}</p>
                  <p><b>{t('as.project')}:</b> {sel.assignedSiteId?.siteName || '—'}</p>
                  {(sel.ownership || sel.acquiredOn) && <p><b>{t('as.ownership')}:</b> {sel.ownership || '—'}{sel.acquiredOn ? ` · ${t('as.acquired')} ${fmtDate(sel.acquiredOn, lang)}` : ''}</p>}
                  {sel.notes && <p><b>{t('as.notes')}:</b> {sel.notes}</p>}
                </div>
                <div>
                  <h4><Wrench size={15} /> {t('as.maintenance')}</h4>
                  {sel.maintenance?.length ? <ul className="plain">{sel.maintenance.map((m, i) => <li key={i}><b>{fmtDate(m.date, lang)}</b> · {m.note}</li>)}</ul> : <p className="muted">{t('sd.none')}</p>}
                  {d.canEdit && <form className="stack" onSubmit={addMaint}><textarea required rows={2} placeholder={t('as.maintNote')} value={note} onChange={(e) => setNote(e.target.value)} /><button className="btn ok" type="submit">{t('as.addMaint')}</button></form>}
                </div>
              </div>
              {d.canEdit && <div className="modal-actions"><button className="btn no" onClick={() => setDel(sel)}>{t('delete')}</button><button className="btn ok" onClick={() => edit(sel)}>{t('edit')}</button></div>}
            </Modal>
          )}
          {form && (
            <Modal title={form._id ? t('edit') : t('as.add')} onClose={() => setForm(null)} wide busy={busy}>
              <form className="form-grid" onSubmit={save}>
                <label className="full">{t('as.name')}<input required value={form.name} onChange={S('name')} /></label>
                <label>{t('as.category')}<select value={form.category} onChange={S('category')}>{d.categories.map((c) => <option key={c} value={c}>{t('as.cat.' + c)}</option>)}</select></label>
                <label>{t('as.id')}<input value={form.identifier || ''} onChange={S('identifier')} /></label>
                <label>{t('as.qty')}<input type="number" min="0" value={form.quantity} onChange={S('quantity')} /></label>
                <label>{t('as.status')}<select value={form.status} onChange={S('status')}>{['Operational', 'In maintenance', 'Out of service', 'Retired'].map((s) => <option key={s} value={s}>{t('as.st.' + s)}</option>)}</select></label>
                <label>{t('as.condition')}<select value={form.condition} onChange={S('condition')}>{['Good', 'Fair', 'Poor'].map((s) => <option key={s} value={s}>{t('as.cd.' + s)}</option>)}</select></label>
                <label>{t('as.location')}<select value={form.locationRef} onChange={S('locationRef')}><option value="">{t('as.noLocation')}</option>{(locs.data?.locations || []).map((l) => <option key={l.ref} value={l.ref}>{l.name}</option>)}</select></label>
                <label>{t('as.locationNote')}<input value={form.locationNote || ''} onChange={S('locationNote')} /></label>
                <label>{t('as.project')}<select value={form.assignedSiteId} onChange={S('assignedSiteId')}><option value="">{t('none')}</option>{(projects.data || []).map((p) => <option key={p._id} value={p._id}>{p.siteName}</option>)}</select></label>
                <label>{t('as.ownership')}<input value={form.ownership || ''} onChange={S('ownership')} /></label>
                <label>{t('as.acquired')}<input type="date" value={form.acquiredOn} onChange={S('acquiredOn')} /></label>
                <label className="full">{t('as.notes')}<textarea rows={2} value={form.notes || ''} onChange={S('notes')} /></label>
                <div className="full actions"><button className="btn ok" type="submit" disabled={busy}>{busy ? t('saving') : t('save')}</button><button type="button" className="btn no" onClick={() => setForm(null)}>{t('cancel')}</button></div>
              </form>
            </Modal>
          )}
          {del && <ConfirmModal title={t('delete')} confirmLabel={t('delete')} tone="danger" onCancel={() => setDel(null)} onConfirm={async () => { await api.deleteAsset(del._id); notify(t('toast.saved')); setDel(null); setSel(null); data.reload(); }}><p><b>{del.name}</b></p><p className="muted">{t('as.deleteConfirm')}</p></ConfirmModal>}
        </>
      );
    }}</Gate>
  );
}
