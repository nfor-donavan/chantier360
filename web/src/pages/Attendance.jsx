import React from 'react';
import { Check, X, Camera } from 'lucide-react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { fmtDate } from '../utils.js';

// Attendance records who was on site. Pay is deliberately not part of this screen.
export default function Attendance() {
  const { t, lang, notify, bump, can } = useStore();
  const list = useApi(api.attendance);
  const decide = async (id, status) => { try { await api.decideAttendance(id, status); notify(t(status)); list.reload(); bump(); } catch (e) { notify(e.message); } };
  return (
    <Gate states={[list]}>{() => (
      <section className="panel">
        <h3>{t('att.title')} <small>{t('att.sub')}</small></h3>
        <table>
          <thead><tr><th>{t('col.date')}</th><th>{t('col.site')}</th><th>{t('col.foreman')}</th><th className="r">{t('col.present')}</th><th className="r">{t('col.planned')}</th><th>{t('col.breakdown')}</th><th>{t('col.photo')}</th><th>{t('col.status')}</th></tr></thead>
          <tbody>
            {list.data.map((a) => (
              <tr key={a._id} className={a.flagged ? 'flag' : ''}>
                <td>{fmtDate(a.date, lang)}</td><td>{a.siteId?.siteName}</td><td>{a.loggedBy?.name}</td>
                <td className="r">{a.totalWorkersPresent} {a.flagged && <span className="tag bad">+{a.totalWorkersPresent - a.expectedWorkers}</span>}</td>
                <td className="r">{a.expectedWorkers}</td>
                <td>{a.breakdown?.length ? <div className="chips">{a.breakdown.filter((b) => b.count > 0).map((b) => <span className="chip" key={b.category}>{b.count} {b.category}</span>)}</div> : <span className="muted">-</span>}</td>
                <td>{a.siteGroupPhotoUrl ? <a className="photo" href={a.siteGroupPhotoUrl} target="_blank" rel="noreferrer"><Camera size={14} /> {t('photo.view')}</a> : <span className="muted">{t('photo.none')}</span>}</td>
                <td>{a.status === 'Pending_HQ_Approval' ? (can('APPROVE_ATTENDANCE') ? (
                  <div className="actions"><button className="btn ok" onClick={() => decide(a._id, 'Approved')}><Check size={15} /> {t('approve')}</button><button className="btn no" aria-label={t('reject')} onClick={() => decide(a._id, 'Rejected')}><X size={15} /></button></div>
                ) : <span className="tag neutral">{t('Pending')}</span>) : <span className={'tag ' + (a.status === 'Approved' ? 'ok' : 'bad')}>{t(a.status)}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    )}</Gate>
  );
}
