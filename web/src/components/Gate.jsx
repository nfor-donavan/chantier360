import React, { useEffect, useState } from 'react';
import { useStore } from '../store.jsx';

// Shows loading and error states until every request has data, then renders the page.
export default function Gate({ states, children }) {
  const { t } = useStore();
  const [slow, setSlow] = useState(false);
  const loading = states.some((s) => !s.data && s.loading);
  const error = states.find((s) => s.error)?.error;
  useEffect(() => { if (!loading) return setSlow(false); const id = setTimeout(() => setSlow(true), 4000); return () => clearTimeout(id); }, [loading]);
  if (error) return <div className="state"><p>{error === 'network' ? t('err.network') : error}</p><button className="btn ok" onClick={() => states.forEach((s) => s.reload())}>{t('retry')}</button></div>;
  if (loading || states.some((s) => !s.data)) return <div className="state"><div className="spin" /><p>{slow ? t('wake') : t('loading')}</p></div>;
  return children();
}
