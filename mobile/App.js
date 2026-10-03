import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, View, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api, setToken } from './src/api';
import { AppCtx, DARK, LIGHT, makeT } from './src/ctx';
import { Attendance, Delivery, Home, Login, Sync } from './src/screens';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; // client-side id so retries never duplicate
const save = (k, v) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});

export default function App() {
  const system = useColorScheme();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [screen, setScreen] = useState('home');
  const [lang, setLangState] = useState('en');
  const [themePref, setThemePref] = useState(null);
  const [forceOffline, setForceOffline] = useState(false);
  const [netOnline, setNetOnline] = useState(true);
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const queueRef = useRef([]); queueRef.current = queue;
  const syncingRef = useRef(false);

  const dark = (themePref || system) === 'dark';
  const C = dark ? DARK : LIGHT;
  const t = useMemo(() => makeT(lang), [lang]);
  const online = netOnline && !forceOffline;
  const setLang = (l) => { setLangState(l); AsyncStorage.setItem('c360_lang', l).catch(() => {}); };
  const toggleTheme = () => { const n = dark ? 'light' : 'dark'; setThemePref(n); AsyncStorage.setItem('c360_theme', n).catch(() => {}); };

  useEffect(() => { (async () => {
    try {
      const [s, q, h, o, l, th] = await Promise.all(['c360_session', 'c360_queue', 'c360_history', 'c360_orders', 'c360_lang', 'c360_theme'].map((k) => AsyncStorage.getItem(k)));
      if (s) { const p = JSON.parse(s); setToken(p.token); setSession(p); }
      if (q) setQueue(JSON.parse(q)); if (h) setHistory(JSON.parse(h)); if (o) setOrders(JSON.parse(o));
      setLangState(l || (Intl.DateTimeFormat().resolvedOptions().locale.startsWith('fr') ? 'fr' : 'en'));
      if (th) setThemePref(th);
    } catch {}
    setReady(true);
  })(); }, []);
  useEffect(() => { if (ready) save('c360_queue', queue); }, [queue, ready]);
  useEffect(() => { if (ready) save('c360_history', history); }, [history, ready]);
  useEffect(() => NetInfo.addEventListener((s) => setNetOnline(!!s.isConnected && s.isInternetReachable !== false)), []);

  const logout = useCallback(() => { setToken(''); setSession(null); AsyncStorage.removeItem('c360_session').catch(() => {}); setScreen('home'); }, []);

  const doLogin = async (email, password) => {
    setBusy(true); setLoginError('');
    try {
      const { token, user } = await api.login(email, password);
      if (user.role !== 'foreman') { setLoginError('hq'); setBusy(false); return; }
      setToken(token); const s = { token, user }; setSession(s); save('c360_session', s);
    } catch (e) { setLoginError(e.network ? 'network' : e.message); }
    setBusy(false);
  };

  const loadOrders = useCallback(async () => {
    try { const o = await api.orders(); setOrders(o); save('c360_orders', o); } catch (e) { if (e.status === 401) logout(); }
  }, [logout]);
  useEffect(() => { if (session && online) loadOrders(); }, [session, online, loadOrders]);

  // Uploads photos, then sends everything that is waiting. Safe to retry: every record has a clientId.
  const syncNow = useCallback(async () => {
    if (syncingRef.current || !online || !session || queueRef.current.length === 0) return;
    syncingRef.current = true; setSyncing(true);
    try {
      const work = [];
      for (const item of queueRef.current.filter((q) => !q.error)) {
        let it = item;
        if (it.photoUri && !it.photoUrl) {
          const { url } = await api.upload(it.photoUri);
          it = { ...it, photoUrl: url };
          setQueue((p) => p.map((x) => (x.clientId === it.clientId ? it : x)));
        }
        work.push(it);
      }
      if (work.length) {
        const res = await api.sync({
          materialLogs: work.filter((w) => w.type === 'delivery').map((w) => ({ clientId: w.clientId, orderId: w.orderId, quantityReceived: w.quantityReceived, deliveryNotePhotoUrl: w.photoUrl, createdAt: w.createdAt })),
          attendanceLogs: work.filter((w) => w.type === 'attendance').map((w) => ({ clientId: w.clientId, totalWorkersPresent: w.totalWorkersPresent, siteGroupPhotoUrl: w.photoUrl, createdAt: w.createdAt })),
        });
        const results = Object.fromEntries([...res.materialLogs, ...res.attendanceLogs].map((r) => [r.clientId, r]));
        const sent = [], failed = {};
        work.forEach((w) => {
          const r = results[w.clientId];
          if (r && (r.result === 'created' || r.result === 'duplicate')) sent.push({ ...w, flagged: r.flagged ?? w.flagged, syncedAt: new Date().toISOString() });
          else if (r) failed[w.clientId] = r.error || 'error';
        });
        setHistory((h) => [...sent, ...h].slice(0, 50));
        setQueue((p) => p.filter((x) => !sent.some((s) => s.clientId === x.clientId)).map((x) => (failed[x.clientId] ? { ...x, error: failed[x.clientId] } : x)));
        if (sent.length) loadOrders();
      }
    } catch (e) {
      if (e.status === 401) { Alert.alert('Session expired'); logout(); } // otherwise: network trouble, records stay queued and retry
    }
    syncingRef.current = false; setSyncing(false);
  }, [online, session, loadOrders, logout]);

  const pendingCount = queue.filter((q) => !q.error).length;
  useEffect(() => { if (online && pendingCount > 0) syncNow(); }, [online, pendingCount, syncNow]);
  useEffect(() => { if (!online || pendingCount === 0) return; const id = setInterval(syncNow, 30000); return () => clearInterval(id); }, [online, pendingCount, syncNow]);

  const saveRecord = (item) => {
    setQueue((q) => [{ clientId: uid(), createdAt: new Date().toISOString(), ...item }, ...q]);
    setScreen('home');
    Alert.alert(t('saved.title'), online ? t('saved.online') : t('saved.offline'));
  };
  const availableOrders = orders.filter((o) => !queue.some((q) => q.orderId === o._id));

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#0F1E38' }} />;
  const back = () => setScreen('home');
  return (
    <AppCtx.Provider value={{ C, t, lang, setLang, toggleTheme }}>
      <StatusBar style="light" />
      {!session ? <Login onLogin={doLogin} busy={busy} error={loginError} /> : (
        <View style={{ flex: 1 }}>
          {screen === 'home' && <Home user={session.user} online={online} forceOffline={forceOffline} setForceOffline={setForceOffline} pending={pendingCount} syncing={syncing} history={history} go={setScreen} onLogout={logout} />}
          {screen === 'attendance' && <Attendance user={session.user} back={back} save={saveRecord} />}
          {screen === 'delivery' && <Delivery orders={availableOrders} back={back} save={saveRecord} />}
          {screen === 'sync' && <Sync back={back} queue={queue} history={history} online={online} syncing={syncing} syncNow={syncNow} remove={(id) => setQueue((p) => p.filter((x) => x.clientId !== id))} />}
        </View>
      )}
    </AppCtx.Provider>
  );
}
