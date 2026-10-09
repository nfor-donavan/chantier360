import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { fmtDate, fmtXAF, pct } from '../utils.js';

export default function Materials() {
  const { t, lang, notify, bump, can } = useStore();
  const [tab, setTab] = useState('deliveries');
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const logs = useApi(api.logs), reqs = useApi(api.requests);
  const decide = async (id, status) => { try { await api.decideRequest(id, status); notify(t(status)); reqs.reload(); bump(); } catch (e) { notify(e.message); } };
  return (
    <Gate states={[logs, reqs]}>{() => {
      const showEst = reqs.data.some((r) => r.estimateXAF != null);
      return (
        <section className="panel">
          <div className="tabs">
            <button className={tab === 'deliveries' ? 'on' : ''} onClick={() => setTab('deliveries')}>{t('tab.deliveries')}</button>
            <button className={tab === 'requests' ? 'on' : ''} onClick={() => setTab('requests')}>{t('tab.requests')} <em className="badge">{reqs.data.filter((r) => r.status === 'Pending').length}</em></button>
            {tab === 'deliveries' && <label className="check"><input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} /> {t('flaggedonly')}</label>}
          </div>
          {tab === 'deliveries' ? (
            <table>
              <thead><tr><th>{t('col.date')}</th><th>{t('col.material')}</th><th>{t('col.site')}</th><th>{t('col.supplier')}</th><th className="r">{t('col.ordered')}</th><th className="r">{t('col.received')}</th><th>{t('col.check')}</th><th>{t('col.by')}</th></tr></thead>
              <tbody>
                {logs.data.filter((l) => !onlyFlagged || l.flagged).map((l) => { const p = pct(l.quantityOrdered, l.quantityReceived); return (
                  <tr key={l._id} className={p > 0 ? 'flag' : ''}>
                    <td>{fmtDate(l.createdAt, lang)}</td><td>{l.materialType}</td><td>{l.siteId?.siteName}</td><td>{l.supplierName}</td>
                    <td className="r">{l.quantityOrdered}</td><td className="r">{l.quantityReceived}</td>
                    <td>{p > 0 ? <span className="tag bad">{l.shortfall} {t('short')} ({p.toFixed(1)}%)</span> : <span className="tag ok">{t('matches')}</span>}</td>
                    <td>{l.loggedBy?.name}</td>
                  </tr>); })}
              </tbody>
            </table>
          ) : (
            <table>
              <thead><tr><th>{t('col.requested')}</th><th>{t('col.material')}</th><th>{t('col.site')}</th><th className="r">{t('col.qty')}</th>{showEst && <th className="r">{t('col.estimate')}</th>}<th>{t('col.by')}</th><th>{t('col.decision')}</th></tr></thead>
              <tbody>
                {reqs.data.map((r) => (
                  <tr key={r._id}>
                    <td>{fmtDate(r.createdAt, lang)}</td><td>{r.materialType}</td><td>{r.siteId?.siteName}</td><td className="r">{r.quantity}</td>{showEst && <td className="r">{fmtXAF(r.estimateXAF)}</td>}<td>{r.requestedBy?.name}</td>
                    <td>{r.status === 'Pending' ? (can('APPROVE_REQUESTS') ? (
                      <div className="actions"><button className="btn ok" onClick={() => decide(r._id, 'Approved')}><Check size={15} /> {t('approve')}</button><button className="btn no" onClick={() => decide(r._id, 'Rejected')}><X size={15} /> {t('reject')}</button></div>
                    ) : <span className="tag neutral">{t('Pending')}</span>) : <span className={'tag ' + (r.status === 'Approved' ? 'ok' : 'bad')}>{t(r.status)}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      );
    }}</Gate>
  );
}
