import { useCallback, useEffect, useRef, useState } from 'react';

// Loads data from the API. With { every }, it also refreshes quietly on a timer and when the tab regains focus,
// so dashboards and tables follow what foremen and colleagues save. A failed quiet refresh never replaces a page that is already showing data.
export function useApi(loader, { every } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const ref = useRef(loader); ref.current = loader;
  const has = useRef(false);
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: has.current ? s.error : '' }));
    ref.current().then((data) => { has.current = true; setState({ data, loading: false, error: '' }); })
      .catch((e) => setState((s) => (has.current ? { ...s, loading: false } : { ...s, loading: false, error: e.status === 0 ? 'network' : e.message })));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    if (!every) return undefined;
    const tick = () => document.visibilityState === 'visible' && load();
    const id = setInterval(tick, every);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [load, every]);
  return { ...state, reload: load };
}
