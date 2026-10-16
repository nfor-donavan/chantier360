import React from 'react';
import { useStore } from '../store.jsx';
import { fmtDate } from '../utils.js';

export default function PrintHeader({ title, project, period }) {
  const { user, t, lang } = useStore();
  return <div className="print-header">{user.tenant?.logoUrl && <img className="print-logo" src={user.tenant.logoUrl} alt="" />}<h2>{user.tenant?.companyName}</h2><h3>{title}</h3><p>{project}{period ? ` · ${period}` : ''}</p><p className="small">{t('rt.printedOn')} {fmtDate(new Date(), lang)}</p></div>;
}
