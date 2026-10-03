import { useCallback, useEffect, useRef, useState } from 'react';

// Loads data from the API and lets a page reload it after an action.
export function useApi(loader) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const ref = useRef(loader); ref.current = loader;
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    ref.current().then((data) => setState({ data, loading: false, error: '' }))
      .catch((e) => setState((s) => ({ ...s, loading: false, error: e.status === 0 ? 'network' : e.message })));
  }, []);
  useEffect(load, [load]);
  return { ...state, reload: load };
}
