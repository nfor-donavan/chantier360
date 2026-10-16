import React, { useEffect, useState } from 'react';
import { Check, X, Camera, Undo2 } from 'lucide-react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { fmtDate } from '../utils.js';
import { ConfirmModal } from '../components/Modal.jsx';

// Attendance records who was on site. Pay is deliberately not part of this screen.
export default function Attendance() {
  const { t } = useStore();
  const [tab, setTab] = useState('attendance');
  return (
    <>
      <div className="tabs wide" role="tablist">{['attendance', 'workforce'].map((k) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{k === 'workforce' ? t('wf.title') : t('tab.attendance')}</button>)}</div>
      {tab === 'attendance' ? <Log /> : <Register />}
    </>
  );
}

function Log() {
  const { t, lang, notify, bump, can } = useStore();
  const list = useApi(api.attendance, { every: 30000 });
  const [dlg, setDlg] = useState(null); // { action, a }
  const desc = (a) => t('ap.attDesc').replace('{site}', a.siteId?.siteName || '').replace('{date}', fmtDate(a.date, lang)).replace('{n}', a.totalWorkersPresent).replace('{who}', a.loggedBy?.name || '');
  const run = async (reason) => {
    const { action, a } = dlg;
    try { await api.attendanceAction(a._id, action, { expectedStatus: a.status, reason }); notify(t('ap.act.' + action)); setDlg(null); list.reload(); bump(); }
    catch (e) { if (e.status === 409) list.reload(); throw e; } // a stale record is refreshed behind the dialog and the reason is shown inside it
  };
  const titles = { approve: ['ap.approveTitle', 'ap.confirmApprove'], reject: ['ap.rejectTitle', 'ap.confirmReject'], revoke: ['ap.revokeTitle', 'ap.confirmRevoke'] };
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
                <td>{a.breakdown?.length ? <div className="chips">{a.breakdown.filter((b) => b.count > 0).map((b) => <span className="chip" key={b.category}>{b.count} {b.category}</span>)}</div> : <span className="muted">-</span>}
                  {a.workers?.length > 0 && <details className="names"><summary>{t('att.names')}</summary><ul>{a.workers.map((w) => <li key={w.uid}>{w.name} <span className="muted">· {w.category}</span></li>)}</ul></details>}</td>
                <td>{a.siteGroupPhotoUrl ? <a className="photo" href={a.siteGroupPhotoUrl} target="_blank" rel="noreferrer"><Camera size={14} /> {t('photo.view')}</a> : <span className="muted">{t('photo.none')}</span>}</td>
                <td>
                  {a.status === 'Pending_HQ_Approval' ? (can('APPROVE_ATTENDANCE') ? (
                    <div className="actions"><button className="btn ok" onClick={() => setDlg({ action: 'approve', a })}><Check size={15} /> {t('approve')}</button><button className="btn no" aria-label={t('reject')} onClick={() => setDlg({ action: 'reject', a })}><X size={15} /></button></div>
                  ) : <span className="tag neutral">{t('Pending')}</span>) : (
                    <div className="stack tight">
                      <span className={'tag ' + (a.status === 'Approved' ? 'ok' : 'bad')}>{t(a.status)}{a.decidedBy?.name ? ` · ${a.decidedBy.name}` : ''}{a.decidedAt ? `, ${fmtDate(a.decidedAt, lang)}` : ''}</span>
                      {a.status === 'Approved' && can('APPROVE_ATTENDANCE') && <button className="btn no slim" onClick={() => setDlg({ action: 'revoke', a })}><Undo2 size={13} /> {t('ap.revoke')}</button>}
                    </div>
                  )}
                  {a.approvalHistory?.length > 0 && <details className="names"><summary>{t('ap.history')}</summary><ul>{a.approvalHistory.map((h, i) => <li key={i}><b>{t('ap.act.' + h.action)}</b> {t('ap.by')} {h.byName} · {fmtDate(h.at, lang)}{h.reason ? ` · “${h.reason}”` : ''}</li>)}</ul></details>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {dlg && (
          <ConfirmModal title={t(titles[dlg.action][0])} confirmLabel={t(titles[dlg.action][1])} tone={dlg.action === 'revoke' || dlg.action === 'reject' ? 'danger' : 'ok'}
            reasonLabel={dlg.action === 'revoke' ? t('ap.reason') : dlg.action === 'reject' ? t('ap.reasonOpt') : null} reasonRequired={dlg.action === 'revoke'} onConfirm={run} onCancel={() => setDlg(null)}>
            <p>{desc(dlg.a)}</p>{dlg.action === 'revoke' && <p className="muted">{t('ap.revokeNote')}</p>}
          </ConfirmModal>
        )}
      </section>
    )}</Gate>
  );
}

// Read-only view of the register the foremen maintain. Removed workers stay listed so past attendance still makes sense.
function Register() {
  const { t, lang } = useStore();
  const [site, setSite] = useState(''), [removed, setRemoved] = useState(false);
  const projects = useApi(api.projects);
  const list = useApi(() => api.workers({ siteId: site, includeInactive: removed ? 'true' : '' }), { every: 30000 });
  useEffect(() => { list.reload(); }, [site, removed]); // eslint-disable-line
  return (
    <Gate states={[projects, list]}>{() => (
      <section className="panel">
        <h3>{t('wf.title')} <small>{list.data.filter((w) => w.active).length} {t('wf.active').toLowerCase()}</small></h3>
        <div className="inline-form">
          <label className="mini">{t('col.site')}<select value={site} onChange={(e) => setSite(e.target.value)}><option value="">{t('rt.allprojects')}</option>{projects.data.map((p) => <option key={p._id} value={p._id}>{p.siteName}</option>)}</select></label>
          <label className="check"><input type="checkbox" checked={removed} onChange={(e) => setRemoved(e.target.checked)} /> {t('wf.showRemoved')}</label>
        </div>
        <table>
          <thead><tr><th>{t('wf.name')}</th><th>{t('wf.category')}</th><th>{t('col.site')}</th><th>{t('wf.since')}</th><th>{t('wf.status')}</th></tr></thead>
          <tbody>{list.data.map((w) => (
            <tr key={w._id} className={w.active ? '' : 'flag'}><td><b>{w.name}</b></td><td>{w.category}</td><td>{w.siteId?.siteName}</td><td>{fmtDate(w.createdAt, lang)}</td>
              <td>{w.active ? <span className="tag ok">{t('wf.active')}</span> : <span className="tag bad">{t('wf.removed')} · {fmtDate(w.removedAt, lang)}</span>}</td></tr>))}</tbody>
        </table>
      </section>
    )}</Gate>
  );
}
