import React from 'react';
import { useStore } from '../store.jsx';
import { api } from '../api.js';
import { useApi } from '../hooks.js';
import Gate from '../components/Gate.jsx';
import ReportCard from '../components/ReportCard.jsx';

export default function Reports() {
  const { t } = useStore();
  const rp = useApi(() => api.reports());
  return <Gate states={[rp]}>{() => <section className="panel"><h3>{t('title.reports')}</h3>{rp.data.length === 0 && <p className="muted">{t('rp.none')}</p>}{rp.data.map((r) => <ReportCard key={r._id} r={r} showSite />)}</section>}</Gate>;
}
