import React from 'react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import { fmtDate } from '../utils.js';

export default function Alerts() {
  const { t, lang, notify, bump } = useStore();
  const list = useApi(() => api.alerts(false));
  const ack = async (id) => { try { await api.acknowledge(id); notify(t('toast.ack')); list.reload(); bump(); } catch (e) { notify(e.message); } };
  return (
    <Gate states={[list]}>{() => (
      <section className="panel">
        <h3>{t('alerts.title')} <small>{list.data.filter((a) => !a.acknowledged).length} {t('open')}</small></h3>
        {list.data.length === 0 && <p className="muted">{t('nodata')}</p>}
        {list.data.map((a) => (
          <div key={a._id} className={'feed row ' + a.severity.toLowerCase() + (a.acknowledged ? ' done' : '')}>
            <div><b>{t('kind.' + a.kind)} · {a.siteId?.siteName}</b><p>{lang === 'fr' && a.messageFr ? a.messageFr : a.message}</p><span>{fmtDate(a.createdAt, lang)} · {t('sev.' + a.severity)} {t('priority')}</span></div>
            {a.acknowledged ? <span className="tag neutral">{t('acked')}</span> : <button className="btn ok" onClick={() => ack(a._id)}>{t('ack')}</button>}
          </div>
        ))}
      </section>
    )}</Gate>
  );
}
