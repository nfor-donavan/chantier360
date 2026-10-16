import React, { useState } from 'react';
import { Check, X, Undo2 } from 'lucide-react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { fmtDate, fmtXAF, pct } from '../utils.js';
import { ConfirmModal } from '../components/Modal.jsx';

export default function Materials() {
  const { t, lang, notify, bump, can } = useStore();
  const [tab, setTab] = useState('deliveries');
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const logs = useApi(api.logs, { every: 30000 }), reqs = useApi(api.requests, { every: 30000 });
  const [dlg, setDlg] = useState(null);
  const desc = (r) => t('ap.reqDesc').replace('{qty}', r.quantity).replace('{material}', r.materialType).replace('{site}', r.siteId?.siteName || '').replace('{who}', r.requestedBy?.name || '');
  const run = async (reason) => {
    const { action, r } = dlg;
    try { await api.requestAction(r._id, action, { expectedStatus: r.status, reason }); notify(t('ap.act.' + action)); setDlg(null); reqs.reload(); bump(); }
    catch (e) { if (e.status === 409) reqs.reload(); throw e; }
  };
  const titles = { approve: ['ap.approveTitle', 'ap.confirmApprove'], reject: ['ap.rejectTitle', 'ap.confirmReject'], revoke: ['ap.revokeTitle', 'ap.confirmRevoke'] };
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
              <thead><tr><th>{t('col.deliveryDate')}</th><th>{t('col.material')}</th><th>{t('col.site')}</th><th>{t('col.supplier')}</th><th>{t('col.unit')}</th><th className="r">{t('col.ordered')}</th><th className="r">{t('col.received')}</th><th>{t('col.check')}</th><th>{t('col.by')}</th></tr></thead>
              <tbody>
                {logs.data.filter((l) => !onlyFlagged || l.flagged).map((l) => { const p = pct(l.quantityOrdered, l.quantityReceived); return (
                  <tr key={l._id} className={p > 0 ? 'flag' : ''}>
                    <td>{fmtDate(l.deliveryDate || l.createdAt, lang)}</td><td>{l.materialType}{l.notes && <div className="muted small">{l.notes}</div>}</td><td>{l.siteId?.siteName}</td><td>{l.supplierName}</td><td>{l.unit}</td>
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
                    <td>
                      {r.status === 'Pending' ? (can('APPROVE_REQUESTS') ? (
                        <div className="actions"><button className="btn ok" onClick={() => setDlg({ action: 'approve', r })}><Check size={15} /> {t('approve')}</button><button className="btn no" onClick={() => setDlg({ action: 'reject', r })}><X size={15} /> {t('reject')}</button></div>
                      ) : <span className="tag neutral">{t('Pending')}</span>) : (
                        <div className="stack tight">
                          <span className={'tag ' + (r.status === 'Approved' ? 'ok' : 'bad')}>{t(r.status)}{r.decidedBy?.name ? ` · ${r.decidedBy.name}` : ''}{r.decidedAt ? `, ${fmtDate(r.decidedAt, lang)}` : ''}</span>
                          {r.status === 'Approved' && can('APPROVE_REQUESTS') && <button className="btn no slim" onClick={() => setDlg({ action: 'revoke', r })}><Undo2 size={13} /> {t('ap.revoke')}</button>}
                        </div>
                      )}
                      {r.approvalHistory?.length > 0 && <details className="names"><summary>{t('ap.history')}</summary><ul>{r.approvalHistory.map((h, i) => <li key={i}><b>{t('ap.act.' + h.action)}</b> {t('ap.by')} {h.byName} · {fmtDate(h.at, lang)}{h.reason ? ` · “${h.reason}”` : ''}</li>)}</ul></details>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        {dlg && (
          <ConfirmModal title={t(titles[dlg.action][0])} confirmLabel={t(titles[dlg.action][1])} tone={dlg.action === 'approve' ? 'ok' : 'danger'} reasonLabel={dlg.action === 'revoke' ? t('ap.reason') : dlg.action === 'reject' ? t('ap.reasonOpt') : null} reasonRequired={dlg.action === 'revoke'} onConfirm={run} onCancel={() => setDlg(null)}>
            <p>{desc(dlg.r)}</p>{dlg.action === 'revoke' && <p className="muted">{t('ap.revokeNote')}</p>}
          </ConfirmModal>
        )}
        </section>
      );
    }}</Gate>
  );
}
