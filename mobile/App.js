import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Alert, View, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api, setToken } from './src/api';
import { AppCtx, DARK, LIGHT, makeT } from './src/ctx';
import { Attendance, Delivery, Home, Login, PhotoScreen, Report, Sync, Weekly } from './src/screens';

// Keep the Nexus splash on screen until the saved session, queue and cache have loaded.
SplashScreen.preventAutoHideAsync().catch(() => {});

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; // client-side id so retries never duplicate
const save = (k, v) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});
const EMPTY_BOOT = { orders: [], tasks: [], categories: [], stock: [], workers: [], deliveries: [], project: null, company: null };
const isFieldUser = (u) => ['MANAGE_ATTENDANCE', 'SUBMIT_REPORTS', 'MANAGE_DELIVERIES'].some((p) => u.permissions?.includes(p));
const nameKey = (n) => String(n).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const migrate = (i) => ({ ...i, photos: i.photos || (i.photoUri ? [i.photoUri] : []) }); // older builds stored a single photoUri

// What the server holds, plus the changes still waiting on this phone. The queue is the only place unsynced changes live,
// so a refresh from the server can never wipe them out.
function overlay(boot, queue) {
  let workers = [...boot.workers], deliveries = [...boot.deliveries], categories = [...boot.categories];
  [...queue].reverse().forEach((q) => { // oldest first
    if (q.type === 'category_add' && !categories.some((c) => nameKey(c.name) === nameKey(q.name))) categories.push({ _id: `pending-${q.clientId}`, name: q.name, pending: true });
    if (q.type === 'worker_add' && !workers.some((w) => w.uid === q.uid)) workers.push({ uid: q.uid, name: q.name, category: q.category, pending: true });
    if (q.type === 'worker_remove') workers = workers.filter((w) => w.uid !== q.uid);
    if (q.type === 'delivery_edit') deliveries = deliveries.map((d) => (d._id === q.logId ? { ...d, ...q.fields, pending: true } : d));
    if (q.type === 'delivery_delete') deliveries = deliveries.filter((d) => d._id !== q.logId);
  });
  const order = categories.map((c) => c.name);
  workers.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name));
  return { ...boot, workers, deliveries, categories };
}

// How each kind of record is sent to POST /api/sync.
const toPayload = (w) => {
  const base = { clientId: w.clientId, createdAt: w.createdAt };
  const url = w.photoUrls?.[0];
  switch (w.type) {
    case 'category_add': return ['categories', { ...base, name: w.name }];
    case 'worker_add': return ['workers', { clientId: w.uid, uid: w.uid, name: w.name, category: w.category }];
    case 'worker_remove': return ['workerRemovals', { ...base, uid: w.uid }];
    case 'delivery': return ['materialLogs', { ...base, orderId: w.orderId, materialType: w.materialType, supplierName: w.supplierName, quantityReceived: w.quantityReceived, unit: w.unit, deliveryDate: w.deliveryDate, notes: w.notes, deliveryNotePhotoUrl: url }];
    case 'delivery_edit': return ['deliveryEdits', { ...base, logId: w.logId, ...w.fields, ...(url && { deliveryNotePhotoUrl: url }) }];
    case 'delivery_delete': return ['deliveryDeletes', { ...base, logId: w.logId }];
    case 'attendance': return ['attendanceLogs', { ...base, workers: w.workers, totalWorkersPresent: w.totalWorkersPresent, breakdown: w.breakdown, siteGroupPhotoUrl: url }];
    case 'report': return ['reports', { ...base, ...w.payload, media: [...(w.photoUrls || []).map((u) => ({ url: u, kind: 'photo' })), ...(w.videoUrls || []).map((u) => ({ url: u, kind: 'video' }))] }];
    default: return ['photos', { ...base, photoUrl: url, caption: w.caption, taskId: w.taskId, takenAt: w.createdAt }];
  }
};

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
  const [boot, setBoot] = useState(EMPTY_BOOT);
  const [syncing, setSyncing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const queueRef = useRef([]); queueRef.current = queue;
  const syncingRef = useRef(false);

  const dark = (themePref || system) === 'dark';
  const C = dark ? DARK : LIGHT;
  const t = useMemo(() => makeT(lang), [lang]);
  const online = netOnline && !forceOffline;
  const view = useMemo(() => overlay(boot, queue), [boot, queue]);
  const setLang = (l) => { setLangState(l); AsyncStorage.setItem('c360_lang', l).catch(() => {}); };
  const toggleTheme = () => { const n = dark ? 'light' : 'dark'; setThemePref(n); AsyncStorage.setItem('c360_theme', n).catch(() => {}); };

  useEffect(() => { (async () => {
    try {
      const [s, q, h, b, l, th] = await Promise.all(['c360_session', 'c360_queue', 'c360_history', 'c360_boot', 'c360_lang', 'c360_theme'].map((k) => AsyncStorage.getItem(k)));
      if (s) { const p = JSON.parse(s); setToken(p.token); setSession(p); }
      if (q) setQueue(JSON.parse(q).map(migrate)); if (h) setHistory(JSON.parse(h)); if (b) setBoot({ ...EMPTY_BOOT, ...JSON.parse(b) });
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
      if (!isFieldUser(user)) { setLoginError('hq'); setBusy(false); return; }
      setToken(token); const s = { token, user }; setSession(s); save('c360_session', s);
    } catch (e) { setLoginError(e.network ? 'network' : e.message); }
    setBusy(false);
  };

  // Orders, tasks, stock list, workforce and recent deliveries are cached so every form works offline.
  const loadBoot = useCallback(async () => {
    try { const b = await api.bootstrap(); setBoot({ ...EMPTY_BOOT, ...b }); save('c360_boot', b); } catch (e) { if (e.status === 401) logout(); }
  }, [logout]);
  useEffect(() => { if (session && online) loadBoot(); }, [session, online, loadBoot]);

  // Uploads photos and videos first, then sends everything waiting. Safe to retry: every operation has its own clientId.
  const syncNow = useCallback(async () => {
    if (syncingRef.current || !online || !session || queueRef.current.length === 0) return;
    syncingRef.current = true; setSyncing(true);
    try {
      const work = [];
      for (const item of queueRef.current.filter((q) => !q.error)) {
        const it = { ...item, photoUrls: [...(item.photoUrls || [])], videoUrls: [...(item.videoUrls || [])] };
        for (let i = 0; i < (it.photos || []).length; i++) if (!it.photoUrls[i]) it.photoUrls[i] = (await api.upload(it.photos[i])).url;
        for (let i = 0; i < (it.videos || []).length; i++) if (!it.videoUrls[i]) it.videoUrls[i] = (await api.uploadVideo(it.videos[i])).url;
        setQueue((p) => p.map((x) => (x.clientId === it.clientId ? it : x)));
        work.push(it);
      }
      if (work.length) {
        const body = { categories: [], workers: [], materialLogs: [], deliveryEdits: [], deliveryDeletes: [], attendanceLogs: [], workerRemovals: [], reports: [], photos: [] };
        work.forEach((w) => { const [key, payload] = toPayload(w); body[key].push(payload); });
        const res = await api.sync(body);
        const results = Object.fromEntries(Object.values(res).flat().map((r) => [r.clientId, r]));
        const sent = [], failed = {};
        work.forEach((w) => {
          const r = results[w.type === 'worker_add' ? w.uid : w.clientId];
          if (r && (r.result === 'created' || r.result === 'duplicate')) sent.push({ ...w, flagged: r.flagged ?? w.flagged, syncedAt: new Date().toISOString() });
          else if (r) failed[w.clientId] = r.error || 'error';
        });
        setHistory((h) => [...sent.map(({ photos, photoUrls, videos, videoUrls, payload, ...rest }) => rest), ...h].slice(0, 50)); // history keeps the summary only
        setQueue((p) => p.filter((x) => !sent.some((s) => s.clientId === x.clientId)).map((x) => (failed[x.clientId] ? { ...x, error: failed[x.clientId] } : x)));
        if (sent.length) loadBoot();
      }
    } catch (e) {
      if (e.status === 401) { Alert.alert('Session expired'); logout(); } // otherwise: network trouble, records stay queued and retry
    }
    syncingRef.current = false; setSyncing(false);
  }, [online, session, loadBoot, logout]);

  const pendingCount = queue.filter((q) => !q.error).length;
  useEffect(() => { if (online && pendingCount > 0) syncNow(); }, [online, pendingCount, syncNow]);
  useEffect(() => { if (!online || pendingCount === 0) return; const id = setInterval(syncNow, 30000); return () => clearInterval(id); }, [online, pendingCount, syncNow]);

  const enqueue = (item) => setQueue((q) => [{ clientId: uid(), createdAt: new Date().toISOString(), ...item }, ...q]);
  const saveRecord = (item) => {
    enqueue(item);
    setScreen('home');
    Alert.alert(t('saved.title'), online ? t('saved.online') : t('saved.offline'));
  };

  // A category is shared by the whole company. It is queued like everything else and created before the workers that use it.
  const addCategory = (name) => {
    const n = String(name || '').trim().replace(/\s+/g, ' ');
    if (n.length < 2) return { error: 'cat.short' };
    if (view.categories.some((c) => nameKey(c.name) === nameKey(n))) return { error: 'cat.dupe' };
    enqueue({ type: 'category_add', name: n, title: n, detail: 'category' });
    return { ok: true, name: n };
  };

  // ----- Workforce: registering a worker is separate from attendance. Removing only marks them inactive on the server.
  const addWorker = (name, category) => {
    const n = String(name || '').trim().replace(/\s+/g, ' ');
    if (n.length < 2) return { error: 'wk.nameShort' };
    if (!category) return { error: 'wk.pickcat' };
    if (view.workers.some((w) => nameKey(w.name) === nameKey(n))) return { error: 'wk.dupe' };
    const id = uid();
    enqueue({ type: 'worker_add', clientId: id, uid: id, name: n, category, title: n, detail: category });
    return { ok: true };
  };
  const removeWorker = (workerUid) => {
    if (queueRef.current.some((q) => q.type === 'attendance' && (q.workers || []).includes(workerUid))) return { error: 'wk.inuse' };
    if (queueRef.current.some((q) => q.type === 'worker_add' && q.uid === workerUid)) { setQueue((p) => p.filter((q) => !(q.type === 'worker_add' && q.uid === workerUid))); return { ok: true }; } // never reached the server
    const w = view.workers.find((x) => x.uid === workerUid);
    enqueue({ type: 'worker_remove', uid: workerUid, title: w?.name || '', detail: 'removed' });
    return { ok: true };
  };

  // ----- Deliveries: create, edit and delete, online or offline.
  const saveDelivery = (f) => {
    const fields = { supplierName: f.supplierName.trim(), quantityReceived: f.qty, unit: f.unit.trim(), deliveryDate: f.date, notes: f.notes.trim(), ...(f.orderId ? {} : { materialType: f.materialType.trim() }) };
    const summary = { title: f.materialType.trim(), detail: `${f.qty} ${f.unit} · ${f.supplierName.trim()}`, flagged: f.flagged };
    if (f.mode === 'new') { enqueue({ type: 'delivery', orderId: f.orderId || undefined, orderedQty: f.orderedQty, materialType: f.materialType.trim(), ...fields, photos: f.photo ? [f.photo] : [], ...summary }); return Alert.alert(t('saved.title'), online ? t('saved.online') : t('saved.offline')); }
    if (f.mode === 'editQueued') { setQueue((p) => p.map((q) => (q.clientId === f.ref ? { ...q, ...fields, materialType: f.materialType.trim(), photos: f.photo ? [f.photo] : q.photos, photoUrls: f.photo !== q.photos?.[0] ? [] : q.photoUrls, ...summary } : q))); return Alert.alert(t('saved.title'), online ? t('saved.online') : t('saved.offline')); }
    // A correction to something already on the server: replaces any earlier waiting correction for the same delivery.
    setQueue((p) => [{ clientId: uid(), createdAt: new Date().toISOString(), type: 'delivery_edit', logId: f.ref, fields, photos: f.photo ? [f.photo] : [], ...summary }, ...p.filter((q) => !(q.type === 'delivery_edit' && q.logId === f.ref))]);
    Alert.alert(t('saved.title'), online ? t('saved.online') : t('saved.offline'));
  };
  const deleteDelivery = ({ kind, id }) => {
    if (kind === 'queued') return setQueue((p) => p.filter((q) => q.clientId !== id)); // never reached the server
    const d = view.deliveries.find((x) => x._id === id);
    setQueue((p) => [{ clientId: uid(), createdAt: new Date().toISOString(), type: 'delivery_delete', logId: id, title: d?.materialType || '', detail: 'deleted' }, ...p.filter((q) => !(q.type === 'delivery_edit' && q.logId === id))]);
  };
  const availableOrders = view.orders.filter((o) => !queue.some((q) => q.type === 'delivery' && q.orderId === o._id));

  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return null;
  const back = () => setScreen('home');
  return (
    <AppCtx.Provider value={{ C, t, lang, setLang, toggleTheme }}>
      <StatusBar style="light" />
      {!session ? <Login onLogin={doLogin} busy={busy} error={loginError} /> : (
        <View style={{ flex: 1 }}>
          {screen === 'home' && <Home user={session.user} company={view.company || session.user.tenant} online={online} forceOffline={forceOffline} setForceOffline={setForceOffline} pending={pendingCount} syncing={syncing} history={history} go={setScreen} onLogout={logout} />}
          {screen === 'attendance' && <Attendance boot={view} back={back} save={saveRecord} addWorker={addWorker} removeWorker={removeWorker} addCategory={addCategory} />}
          {screen === 'delivery' && <Delivery boot={view} orders={availableOrders} queue={queue} back={back} saveDelivery={saveDelivery} deleteDelivery={deleteDelivery} />}
          {screen === 'report' && <Report boot={view} back={back} save={saveRecord} />}
          {screen === 'weekly' && <Weekly back={back} online={online} />}
          {screen === 'photo' && <PhotoScreen boot={view} back={back} save={saveRecord} />}
          {screen === 'sync' && <Sync back={back} queue={queue} history={history} online={online} syncing={syncing} syncNow={syncNow} remove={(id) => setQueue((p) => p.filter((x) => x.clientId !== id))} />}
        </View>
      )}
    </AppCtx.Provider>
  );
}
