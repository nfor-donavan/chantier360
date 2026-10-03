import React from 'react';
import { Check, X, Camera } from 'lucide-react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { fmtDate, fmtXAF } from '../utils.js';

export default function Attendance() {
  const { t, lang, notify, bump } = useStore();
  const sites = useApi(api.sites), list = useApi(api.attendance);
  const decide = async (id, status) => {
    try { await api.decideAttendance(id, status); notify(t(status)); list.reload(); bump(); } catch (e) { notify(e.message); }
  };
  return (
    <Gate states={[sites, list]}>{() => (
      <section className="panel">
        <h3>{t('att.title')} <small>{t('att.sub')}</small></h3>
        <table>
          <thead><tr><th>{t('col.date')}</th><th>{t('col.site')}</th><th>{t('col.foreman')}</th><th className="r">{t('col.present')}</th><th className="r">{t('col.planned')}</th><th className="r">{t('col.wages')}</th><th>{t('col.photo')}</th><th>{t('col.status')}</th></tr></thead>
          <tbody>
            {list.data.map((a) => (
              <tr key={a._id} className={a.flagged ? 'flag' : ''}>
                <td>{fmtDate(a.date, lang)}</td><td>{sites.data.find((s) => s._id === a.siteId)?.siteName}</td><td>{a.loggedBy?.name}</td>
                <td className="r">{a.totalWorkersPresent} {a.flagged && <span className="tag bad">+{a.totalWorkersPresent - a.expectedWorkers}</span>}</td>
                <td className="r">{a.expectedWorkers}</td><td className="r">{fmtXAF(a.totalPayoutXAF)}</td>
                <td>{a.siteGroupPhotoUrl ? <a className="photo" href={a.siteGroupPhotoUrl} target="_blank" rel="noreferrer"><Camera size={14} /> {t('photo.view')}</a> : <span className="muted">{t('photo.none')}</span>}</td>
                <td>{a.status === 'Pending_HQ_Approval' ? (
                  <div className="actions"><button className="btn ok" onClick={() => decide(a._id, 'Approved')}><Check size={15} /> {t('approve')}</button><button className="btn no" onClick={() => decide(a._id, 'Rejected')}><X size={15} /></button></div>
                ) : <span className={'tag ' + (a.status === 'Approved' ? 'ok' : 'bad')}>{t(a.status)}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    )}</Gate>
  );
}
