import React, { useEffect, useState } from 'react';
import { Printer, Trash2, Pencil } from 'lucide-react';
import { useStore } from '../store.jsx';
import { api, uploadMedia } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { Bar } from '../components/bits.jsx';
import { fmtDate, fmtXAF } from '../utils.js';

const blank = (siteId = '') => ({ siteId, date: new Date().toISOString().slice(0, 10), category: 'Materials', description: '', amountXAF: '', payee: '', reference: '', receiptUrl: '' });

export default function Expenses() {
  const { t, lang, can, notify, bump } = useStore();
  const [f, setF] = useState({ siteId: '', category: '', from: '', to: '' });
  const [form, setForm] = useState(null), [busy, setBusy] = useState(false);
  const data = useApi(() => api.expenses(f), { every: 30000 });
  useEffect(() => { data.reload(); }, [f.siteId, f.category, f.from, f.to]); // eslint-disable-line
  const S = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const body = { ...form, amountXAF: Number(form.amountXAF) };
      if (form._id) await api.updateExpense(form._id, body); else await api.addExpense(body);
      notify(t('toast.saved')); setForm(null); data.reload(); bump();
    } catch (err) { notify(err.message); }
    setBusy(false);
  };
  const receipt = async (e) => { const file = e.target.files[0]; if (!file) return; try { const up = await uploadMedia(file); setForm((x) => ({ ...x, receiptUrl: up.url })); } catch (err) { notify(err.message); } };
  const remove = async (x) => { if (!window.confirm(t('ex.deleteConfirm'))) return; try { await api.deleteExpense(x._id); notify(t('toast.saved')); data.reload(); bump(); } catch (err) { notify(err.message); } };
  return (
    <Gate states={[data]}>{() => {
      const d = data.data;
      return (
        <>
          <section className="panel print-area">
            <h3>{t('ex.budget')}</h3>
            <table>
              <thead><tr><th>{t('col.site')}</th><th className="r">{t('ov.budget')}</th><th className="r">{t('ov.spent')}</th><th className="r">{t('ex.remaining')}</th><th style={{ minWidth: 140 }}>{t('ex.used')}</th><th /></tr></thead>
              <tbody>{d.projects.map((p) => { const used = p.budgetXAF ? (p.spentXAF / p.budgetXAF) * 100 : 0; return (
                <tr key={p._id}><td><b>{p.siteName}</b></td><td className="r">{fmtXAF(p.budgetXAF)}</td><td className="r">{fmtXAF(p.spentXAF)}</td><td className="r">{fmtXAF((p.budgetXAF || 0) - (p.spentXAF || 0))}</td>
                  <td><div className="cat tight"><Bar value={used} tone={used > 100 ? 'warn' : ''} /><b>{Math.round(used)}%</b></div></td><td><span className="tag neutral">{p.spentSource === 'expenses' ? t('ex.fromExpenses') : t('ex.manual')}</span></td></tr>); })}</tbody>
            </table>
          </section>

          {can('MANAGE_EXPENSES') && (
            <section className="panel noprint">
              {!form ? <button className="btn ok" onClick={() => setForm(blank(f.siteId))}>{t('ex.add')}</button> : (
                <form className="form-grid" onSubmit={submit}>
                  <h3 className="full">{t('ex.add')}</h3>
                  <label>{t('col.site')}<select required value={form.siteId} onChange={S('siteId')} disabled={!!form._id}><option value="">-</option>{d.projects.map((p) => <option key={p._id} value={p._id}>{p.siteName}</option>)}</select></label>
                  <label>{t('ex.date')}<input required type="date" value={String(form.date).slice(0, 10)} onChange={S('date')} /></label>
                  <label>{t('ex.category')}<select value={form.category} onChange={S('category')}>{d.categories.map((c) => <option key={c} value={c}>{t('ex.cat.' + c)}</option>)}</select></label>
                  <label>{t('ex.amount')}<input required type="number" min="0" value={form.amountXAF} onChange={S('amountXAF')} /></label>
                  <label className="full">{t('ex.desc')}<input required value={form.description} onChange={S('description')} /></label>
                  <label>{t('ex.payee')}<input value={form.payee || ''} onChange={S('payee')} /></label>
                  <label>{t('ex.ref')}<input value={form.reference || ''} onChange={S('reference')} /></label>
                  <label className="full">{t('ex.receipt')}<input type="file" accept="image/*" onChange={receipt} />{form.receiptUrl && <span className="tag ok">✓</span>}</label>
                  <div className="full actions"><button className="btn ok" type="submit" disabled={busy}>{busy ? t('saving') : t('ex.save')}</button><button type="button" className="btn no" onClick={() => setForm(null)}>{t('cancel')}</button></div>
                </form>
              )}
            </section>
          )}

          <section className="panel print-area">
            <div className="toolbar between"><h3>{t('nav.expenses')}</h3><button className="btn no noprint" onClick={() => window.print()}><Printer size={15} /> {t('rt.print')}</button></div>
            <div className="inline-form noprint">
              <label className="mini">{t('col.site')}<select value={f.siteId} onChange={(e) => setF({ ...f, siteId: e.target.value })}><option value="">{t('rt.allprojects')}</option>{d.projects.map((p) => <option key={p._id} value={p._id}>{p.siteName}</option>)}</select></label>
              <label className="mini">{t('ex.category')}<select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="">{t('all')}</option>{d.categories.map((c) => <option key={c} value={c}>{t('ex.cat.' + c)}</option>)}</select></label>
              <label className="mini">{t('rt.from')}<input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></label>
              <label className="mini">{t('rt.to')}<input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></label>
            </div>
            <div className="chips" style={{ marginBottom: 12 }}><span className="chip"><b>{t('ex.total')}: {fmtXAF(d.total)}</b></span>{d.byCategory.map((c) => <span className="chip" key={c.category}>{t('ex.cat.' + c.category)}: {fmtXAF(c.total)}</span>)}</div>
            {d.items.length === 0 ? <p className="muted">{t('ex.none')}</p> : (
              <table>
                <thead><tr><th>{t('ex.date')}</th><th>{t('col.site')}</th><th>{t('ex.category')}</th><th>{t('ex.desc')}</th><th>{t('ex.payee')}</th><th>{t('ex.ref')}</th><th className="r">{t('ex.amount')}</th><th className="noprint" /></tr></thead>
                <tbody>{d.items.map((x) => (
                  <tr key={x._id}><td>{fmtDate(x.date, lang)}</td><td>{x.siteId?.siteName}</td><td>{t('ex.cat.' + x.category)}</td><td>{x.description}{x.receiptUrl && <> · <a href={x.receiptUrl} target="_blank" rel="noreferrer">{t('ex.receipt')}</a></>}</td><td>{x.payee}</td><td>{x.reference}</td><td className="r"><b>{fmtXAF(x.amountXAF)}</b></td>
                    <td className="noprint"><div className="actions">
                      {can('MANAGE_EXPENSES') && <button className="btn no slim" aria-label={t('edit')} onClick={() => setForm({ ...x, siteId: x.siteId?._id, date: String(x.date).slice(0, 10) })}><Pencil size={13} /></button>}
                      {can('DELETE_EXPENSES') && <button className="btn no slim" aria-label={t('delete')} onClick={() => remove(x)}><Trash2 size={13} /></button>}
                    </div></td></tr>))}</tbody>
              </table>
            )}
          </section>
        </>
      );
    }}</Gate>
  );
}
