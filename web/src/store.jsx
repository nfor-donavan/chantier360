import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setToken } from './api.js';
import { makeT } from './i18n.js';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

export function StoreProvider({ children }) {
  const [user, setUser] = useState(() => read('c360_user', null));
  const [lang, setLang] = useState(() => localStorage.getItem('c360_lang') || (navigator.language?.startsWith('fr') ? 'fr' : 'en'));
  const [theme, setTheme] = useState(() => localStorage.getItem('c360_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [toast, setToast] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('c360_theme', theme); }, [theme]);
  useEffect(() => { document.documentElement.lang = lang; localStorage.setItem('c360_lang', lang); }, [lang]);

  const logout = useCallback(() => { setToken(''); localStorage.removeItem('c360_user'); setUser(null); }, []);
  useEffect(() => { window.addEventListener('c360:logout', logout); return () => window.removeEventListener('c360:logout', logout); }, [logout]);

  const persist = (u) => { localStorage.setItem('c360_user', JSON.stringify(u)); setUser(u); };
  // Refresh permissions on load so role changes made by the General Director apply without signing in again.
  useEffect(() => { if (user) api.me().then((r) => persist(r.user)).catch(() => {}); }, []); // eslint-disable-line

  const login = async (email, password) => {
    const { token, user: u } = await api.login(email, password);
    const web = u.permissions.includes('VIEW_DASHBOARD') || u.permissions.includes('VIEW_CLIENT_PORTAL');
    if (!web) throw Object.assign(new Error('nohq'), { status: 403 });
    setToken(token); persist(u);
  };
  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };
  const t = useMemo(() => makeT(lang), [lang]);
  const can = (p) => !!user?.permissions?.includes(p);

  return (
    <Ctx.Provider value={{ user, login, logout, can, lang, setLang, theme, setTheme, t, toast, notify, tick, bump: () => setTick((x) => x + 1) }}>
      {children}
    </Ctx.Provider>
  );
}
