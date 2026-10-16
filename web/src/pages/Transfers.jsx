import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store.jsx';
import { api, uploadMedia } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { fmtDate, num } from '../utils.js';

// Moves company stock between warehouses, other locations and project sites. One exit and one entry are written together,
// and a transfer is never counted as a purchase or a delivery.
export default function Transfers() {
  const { t, lang, can, notify, bump } = useStore();
  const locs = useApi(api.locations);
  const history = useApi(() => api.transfers(), { every: 30000 });
  const blank = () => ({ from: '', to: '', materialType: '', quantity: '', unit: '', date: new Date().toISOString().slice(0, 10), reason: '', reference: '', evidenceUrl: '' });
  const [f, setF] = useState(blank()), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const clientId = useRef(crypto.randomUUID());
  const [avail, setAvail] = useState([]);
  const [viewRef, setViewRef] = useState(''), [viewRows, setViewRows] = useState([]);
  const [loc, setLoc] = useState({ name: '', type: 'warehouse' });
  const S = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { if (f.from) api.balance(f.from).then(setAvail).catch(() => setAvail([])); else setAvail([]); }, [f.from, history.data]);
  useEffect(() => { if (viewRef) api.balance(viewRef).then(setViewRows).catch(() => setViewRows([])); else setViewRows([]); }, [viewRef, history.data]);
  const available = avail.find((a) => a.materialType === f.materialType.trim())?.closing;
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.createTransfer({ ...f, quantity: Number(f.quantity), clientId: clientId.current }); notify(t('toast.saved')); setF(blank()); clientId.current = crypto.randomUUID(); history.reload(); bump(); }
    catch (x) { setErr(x.status === 0 ? t('err.network') : x.message); }
    setBusy(false);
  };
  const evidence = async (e) => { const file = e.target.files[0]; if (!file) return; try { const up = await uploadMedia(file); setF((x) => ({ ...x, evidenceUrl: up.url })); } catch (x) { notify(x.message); } };
  const addLoc = async (e) => { e.preventDefault(); try { await api.addLocation(loc); setLoc({ name: '', type: 'warehouse' }); locs.reload(); notify(t('toast.saved')); } catch (x) { notify(x.message); } };
  const label = (l) => `${l.name} (${t('tr.type.' + l.type)})`;
  return (
    <Gate states={[locs, history]}>{() => {
      const L = locs.data.locations;
      return (
        <>
          <p className="muted">{t('tr.note')}</p>
          {can('MANAGE_TRANSFERS') && (
            <form className="panel form-grid" onSubmit={submit}>
              <h3 className="full">{t('tr.new')}</h3>
              <label>{t('tr.from')}<select required value={f.from} onChange={S('from')}><option value="">{t('tr.choose')}</option>{L.map((l) => <option key={l.ref} value={l.ref}>{label(l)}</option>)}</select></label>
              <label>{t('tr.to')}<select required value={f.to} onChange={S('to')}><option value="">{t('tr.choose')}</option>{L.filter((l) => l.ref !== f.from).map((l) => <option key={l.ref} value={l.ref}>{label(l)}</option>)}</select></label>
              <label>{t('tr.material')}<input required list="tr-mats" value={f.materialType} onChange={S('materialType')} /><datalist id="tr-mats">{avail.map((a) => <option key={a.materialType} value={a.materialType} />)}</datalist></label>
              <label>{t('tr.qty')}<input required type="number" min="0" step="any" value={f.quantity} onChange={S('quantity')} />{available !== undefined && <span className={'small ' + (Number(f.quantity) > available ? 'bad-text' : 'muted')}>{t('tr.available')}: {num(available)}</span>}</label>
              <label>{t('tr.unit')}<input value={f.unit} onChange={S('unit')} /></label>
              <label>{t('tr.date')}<input type="date" required value={f.date} onChange={S('date')} /></label>
              <label>{t('tr.reference')}<input value={f.reference} onChange={S('reference')} /></label>
              <label>{t('tr.evidence')}<input type="file" accept="image/*" onChange={evidence} />{f.evidenceUrl && <span className="tag ok">✓</span>}</label>
              <label className="full">{t('tr.reason')}<input value={f.reason} onChange={S('reason')} /></label>
              {err && <p className="err full" role="alert">{err}</p>}
              <div className="full"><button className="btn ok" type="submit" disabled={busy}>{busy ? t('saving') : t('tr.save')}</button></div>
            </form>
          )}
          <div className="grid2">
            <section className="panel">
              <h3>{t('tr.balance')}</h3>
              <select value={viewRef} onChange={(e) => setViewRef(e.target.value)} aria-label={t('tr.balance')}><option value="">{t('tr.choose')}</option>{L.map((l) => <option key={l.ref} value={l.ref}>{label(l)}</option>)}</select>
              {viewRef && (viewRows.length === 0 ? <p className="muted">{t('tr.noStock')}</p> : (
                <table style={{ marginTop: 10 }}><thead><tr><th>{t('rt.item')}</th><th className="r">{t('st.opening')}</th><th className="r">{t('st.in')}</th><th className="r">{t('mo.tin')}</th><th className="r">{t('st.out')}</th><th className="r">{t('mo.tout')}</th><th className="r">{t('st.closing')}</th></tr></thead>
                  <tbody>{viewRows.map((r) => <tr key={r.materialType}><td>{r.materialType}</td><td className="r">{num(r.opening)}</td><td className="r">{num(r.incoming)}</td><td className="r">{num(r.transferIn)}</td><td className="r">{num(r.outgoing)}</td><td className="r">{num(r.transferOut)}</td><td className="r"><b>{num(r.closing)}</b></td></tr>)}</tbody></table>
              ))}
            </section>
            <section className="panel">
              <h3>{t('tr.locations')}</h3>
              <div className="chips">{L.map((l) => <span className="chip" key={l.ref}>{label(l)}</span>)}</div>
              {can('MANAGE_TRANSFERS') && (
                <form className="inline-form" onSubmit={addLoc}>
                  <input required placeholder={t('tr.locName')} value={loc.name} onChange={(e) => setLoc({ ...loc, name: e.target.value })} />
                  <select value={loc.type} onChange={(e) => setLoc({ ...loc, type: e.target.value })} aria-label={t('tr.type')}>{['warehouse', 'storage', 'other'].map((x) => <option key={x} value={x}>{t('tr.type.' + x)}</option>)}</select>
                  <button className="btn ok" type="submit">{t('tr.addLocation')}</button>
                </form>
              )}
            </section>
          </div>
          <section className="panel">
            <h3>{t('tr.history')}</h3>
            {history.data.length === 0 ? <p className="muted">{t('tr.none')}</p> : (
              <table><thead><tr><th>{t('col.date')}</th><th>{t('tr.material')}</th><th className="r">{t('tr.qty')}</th><th>{t('tr.from')}</th><th>{t('tr.to')}</th><th>{t('tr.reason')}</th><th>{t('tr.reference')}</th><th>{t('tr.by')}</th></tr></thead>
                <tbody>{history.data.map((m) => <tr key={m._id}><td>{fmtDate(m.date, lang)}</td><td>{m.materialType}</td><td className="r"><b>{num(m.quantity)}</b> {m.unit}</td><td>{m.from.name}</td><td>{m.to.name}</td><td>{m.reason}{m.evidenceUrl && <> · <a href={m.evidenceUrl} target="_blank" rel="noreferrer">{t('ex.receipt')}</a></>}</td><td>{m.reference}</td><td>{m.createdBy?.name}</td></tr>)}</tbody></table>
            )}
          </section>
        </>
      );
    }}</Gate>
  );
}
