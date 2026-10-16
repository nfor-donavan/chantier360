import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Image, Switch, Alert, ActivityIndicator } from 'react-native';
import { Button, Card, Label, PhotoBox, PhotoStrip, takePhoto, takeVideo } from './ui';
import { useApp, demoForemen } from './ctx';
import { api } from './api';
import { PRODUCT, WATERMARK, brandStyles } from './brand';

const Screen = ({ children }) => {
  const { C } = useApp();
  return <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>;
};
const Back = ({ onPress, title }) => {
  const { C } = useApp();
  return (
    <View style={{ backgroundColor: C.header, paddingTop: 48, paddingBottom: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center' }}>
      <Pressable onPress={onPress} hitSlop={12} accessibilityLabel="Back"><Text style={{ color: '#fff', fontSize: 26, marginRight: 14 }}>‹</Text></Pressable>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{title}</Text>
    </View>
  );
};
const Hint = ({ children }) => { const { C } = useApp(); return <Text style={{ color: C.mute, textAlign: 'center', marginTop: 10, fontSize: 13 }}>{children}</Text>; };
const useInput = () => { const { C } = useApp(); return { borderWidth: 1, borderColor: C.inputline, borderRadius: 10, padding: 11, fontSize: 15, color: C.ink, backgroundColor: C.input }; };
const toNum = (x) => { const n = parseFloat(String(x ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };

function Counter({ label, value, onChange }) {
  const { C } = useApp();
  const btn = { width: 40, height: 40, borderRadius: 20, backgroundColor: C.step, alignItems: 'center', justifyContent: 'center' };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: C.ink, flex: 1, fontSize: 15 }}>{label}</Text>
      <Pressable onPress={() => onChange(Math.max(0, value - 1))} style={btn} accessibilityLabel={`${label} -`}><Text style={{ fontSize: 22, color: C.stepfg }}>−</Text></Pressable>
      <Text style={{ width: 44, textAlign: 'center', fontSize: 20, fontWeight: '800', color: C.ink }}>{value}</Text>
      <Pressable onPress={() => onChange(value + 1)} style={btn} accessibilityLabel={`${label} +`}><Text style={{ fontSize: 22, color: C.stepfg }}>+</Text></Pressable>
    </View>
  );
}
function Chip({ text, onPress, on }) {
  const { C } = useApp();
  return <Pressable onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: on ? C.yellow : C.line, backgroundColor: on ? C.yellow : C.card, marginRight: 8, marginBottom: 8 }}><Text style={{ color: on ? '#0F1E38' : C.ink, fontWeight: '600', fontSize: 13 }}>{text}</Text></Pressable>;
}
function Section({ title, children }) { const { C } = useApp(); return <Card style={{ marginTop: 14 }}><Text style={{ color: C.ink, fontWeight: '800', fontSize: 16, marginBottom: 4 }}>{title}</Text>{children}</Card>; }
function Remove({ onPress }) { const { C } = useApp(); return <Pressable onPress={onPress} hitSlop={10} accessibilityLabel="Remove" style={{ padding: 6 }}><Text style={{ color: C.badfg, fontSize: 16 }}>✕</Text></Pressable>; }

export function Toggles({ dark }) {
  const { C, lang, setLang, toggleTheme, t } = useApp();
  const fg = dark ? '#C5D0E4' : C.mute;
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      {['en', 'fr'].map((l) => (
        <Pressable key={l} onPress={() => setLang(l)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: lang === l ? C.yellow : 'transparent', borderWidth: 1, borderColor: lang === l ? C.yellow : '#ffffff40' }}>
          <Text style={{ color: lang === l ? '#0F1E38' : fg, fontWeight: '700', fontSize: 12 }}>{l.toUpperCase()}</Text>
        </Pressable>
      ))}
      <Pressable onPress={toggleTheme} accessibilityLabel={C.dark ? t('light') : t('dark')} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#ffffff40' }}>
        <Text style={{ fontSize: 15 }}>{C.dark ? '☀️' : '🌙'}</Text>
      </Pressable>
    </View>
  );
}

export function Login({ onLogin, busy, error }) {
  const { C, t } = useApp();
  const inp = useInput();
  const [email, setEmail] = useState(demoForemen[0].email);
  const [pw, setPw] = useState('demo1234');
  return (
    <View style={{ flex: 1, backgroundColor: C.header }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'flex-end' }}><Toggles dark /></View>
      <Image source={require('../assets/logo.png')} style={{ width: 96, height: 96, marginTop: 12 }} />
      <Text style={{ color: '#fff', fontSize: 38, fontWeight: '800', marginTop: 12 }}>{PRODUCT.name}</Text>
      <Text style={{ color: '#C5D0E4', fontSize: 16, marginTop: 4 }}>{t('tagline')}</Text>
      <Card style={{ marginTop: 28 }}>
        <Label>{t('email')}</Label>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={inp} />
        <Label>{t('password')}</Label>
        <TextInput value={pw} onChangeText={setPw} secureTextEntry style={inp} />
        {busy && <Text style={{ color: C.mute, marginTop: 10 }}>{t('connecting')}</Text>}
        {!!error && <Text style={{ color: C.badfg, marginTop: 10 }}>{error === 'network' ? t('err.network') : error === 'hq' ? t('err.hq') : error}</Text>}
        <View style={{ height: 16 }} />
        {busy ? <ActivityIndicator color={C.yellow} /> : <Button title={t('signin')} onPress={() => onLogin(email.trim(), pw)} />}
      </Card>
      <Text style={{ color: '#9FB0CC', marginTop: 22, marginBottom: 8 }}>{t('openas')}</Text>
      {demoForemen.map((f) => (
        <Pressable key={f.email} disabled={busy} onPress={() => onLogin(f.email, f.password)} style={{ backgroundColor: '#ffffff14', borderRadius: 12, padding: 14, marginBottom: 10, opacity: busy ? 0.5 : 1 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{f.name}</Text>
          <Text style={{ color: '#9FB0CC' }}>{f.site}</Text>
        </Pressable>
      ))}
    </ScrollView>
    <View pointerEvents="none" style={brandStyles.bottomBrandWrapper}><Text style={brandStyles.brandText}>{WATERMARK}</Text></View>
    </View>
  );
}

const Row = ({ item, pending }) => {
  const { C, t } = useApp();
  return (
    <Card style={{ marginBottom: 10, borderLeftWidth: 4, borderLeftColor: item.error || item.flagged ? C.red : pending ? C.yellow : C.green }}>
      <Text style={{ fontWeight: '700', color: C.ink }}>{item.title}</Text>
      <Text style={{ color: C.mute, marginTop: 2 }}>{item.detail}</Text>
      {item.flagged && !item.error && <Text style={{ color: C.badfg, marginTop: 4, fontWeight: '600' }}>{t('flag.short')}</Text>}
      {!!item.error && <Text style={{ color: C.badfg, marginTop: 4, fontWeight: '600' }}>{t('sync.failed')}: {item.error}</Text>}
    </Card>
  );
};

export function Home({ user, company, online, forceOffline, setForceOffline, pending, syncing, history, go, onLogout }) {
  const { C, t, lang } = useApp();
  const Tile = ({ icon, title, sub, to, badge }) => (
    <Pressable onPress={() => go(to)} accessibilityRole="button" style={{ flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.line, minHeight: 124 }}>
      <Text style={{ fontSize: 30 }}>{icon}</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 8 }}>{title}</Text>
      <Text style={{ color: C.mute, fontSize: 12.5, marginTop: 2 }}>{sub}</Text>
      {!!badge && <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: C.yellow, borderRadius: 10, paddingHorizontal: 8 }}><Text style={{ fontWeight: '800', color: '#0F1E38' }}>{badge}</Text></View>}
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.header, paddingTop: 52, paddingBottom: 22, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Toggles dark />
          <Pressable onPress={onLogout} hitSlop={10}><Text style={{ color: '#9FB0CC' }}>{t('signout')}</Text></Pressable>
        </View>
        {!!company?.companyName && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
            {!!company.logoUrl && <Image source={{ uri: company.logoUrl }} style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#fff', marginRight: 10 }} resizeMode="contain" />}
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{company.companyName}</Text>
          </View>
        )}
        <Text style={{ color: '#9FB0CC', marginTop: 10 }}>{t('hello')} {user.name.split(' ')[0]}</Text>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 2 }}>{user.site?.siteName}</Text>
        <Text style={{ color: '#C5D0E4' }}>{user.site?.locationCity} · {new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      </View>
      <Screen>
        <Card style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: online ? C.okbg : C.warnbg, borderColor: online ? C.okline : C.warnline }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: C.ink }}>{syncing ? t('st.syncing') : online ? t('st.online') : t('st.offline')}</Text>
            <Text style={{ color: C.mute, fontSize: 12.5 }}>{pending} {t('waiting')} · {t('offline_switch')}</Text>
          </View>
          <Switch value={forceOffline} onValueChange={setForceOffline} trackColor={{ true: C.yellow }} />
        </Card>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <Tile icon="📝" title={t('tile.rep')} sub={t('tile.rep.sub')} to="report" />
          <Tile icon="👷" title={t('tile.att')} sub={t('tile.att.sub')} to="attendance" />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <Tile icon="📦" title={t('tile.del')} sub={t('tile.del.sub')} to="delivery" />
          <Tile icon="📷" title={t('tile.photo')} sub={t('tile.photo.sub')} to="photo" />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <Tile icon="🔄" title={t('tile.sync')} sub={t('tile.sync.sub')} to="sync" badge={pending || null} />
          <Tile icon="📅" title={t('tile.week')} sub={t('tile.week.sub')} to="weekly" />
        </View>
        <Label>{t('recent')}</Label>
        {history.length === 0 && <Text style={{ color: C.mute }}>{t('recent.none')}</Text>}
        {history.slice(0, 4).map((h) => <Row key={h.clientId} item={h} />)}
      </Screen>
    </View>
  );
}

const snapInto = async (t, add) => { const r = await takePhoto(); if (r?.denied) Alert.alert(t('cam.denied')); else if (r?.error) Alert.alert(t('cam.error'), r.error); else if (r) add(r.uri); };

// Attendance: pick the registered workers who are present. Registering a worker is a separate step, done here or by the Director.
export function Attendance({ boot, back, save, addWorker, removeWorker, addCategory }) {
  const { C, t } = useApp();
  const inp = useInput();
  const cats = boot.categories || [], workers = boot.workers || [];
  const planned = boot.project?.plannedWorkers ?? 0;
  const [sel, setSel] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [manage, setManage] = useState(workers.length === 0);
  const [nw, setNw] = useState({ name: '', category: null });
  const [newCat, setNewCat] = useState('');
  const createCat = () => { const r = addCategory(newCat); if (r.error) return Alert.alert(t(r.error)); setNw((x) => ({ ...x, category: r.name })); setNewCat(''); };
  const toggle = (uid) => setSel((s) => (s.includes(uid) ? s.filter((x) => x !== uid) : [...s, uid]));
  const register = () => {
    const r = addWorker(nw.name, nw.category);
    if (r.error) return Alert.alert(t(r.error));
    setNw({ name: nw.name.slice(0, 0), category: nw.category });
  };
  const confirmRemove = (w) => Alert.alert(t('wk.removeTitle'), `${w.name}\n${t('wk.removeNote')}`, [
    { text: t('cancel') || 'Cancel', style: 'cancel' },
    { text: t('wk.remove'), style: 'destructive', onPress: () => { const r = removeWorker(w.uid); if (r?.error) Alert.alert(t(r.error)); else setSel((s) => s.filter((x) => x !== w.uid)); } },
  ]);
  const groups = cats.map((c) => [c.name, workers.filter((w) => w.category === c.name)]).filter(([, l]) => l.length);
  return (
    <View style={{ flex: 1 }}>
      <Back onPress={back} title={t('att.title')} />
      <Screen>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16 }}>{t('att.select')}</Text>
          </View>
          {workers.length === 0 && <Text style={{ color: C.mute, marginTop: 8 }}>{t('att.noworkers')}</Text>}
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
            <Pressable onPress={() => setSel(workers.map((w) => w.uid))}><Text style={{ color: C.dark ? C.yellow : '#0F1E38', fontWeight: '700' }}>{t('att.selectAll')}</Text></Pressable>
            <Pressable onPress={() => setSel([])}><Text style={{ color: C.mute, fontWeight: '700' }}>{t('att.clear')}</Text></Pressable>
          </View>
          {groups.map(([cat, list]) => (
            <View key={cat} style={{ marginTop: 14 }}>
              <Text style={{ color: C.mute, fontWeight: '700', fontSize: 12.5, marginBottom: 4 }}>{cat} ({list.filter((w) => sel.includes(w.uid)).length}/{list.length})</Text>
              {list.map((w) => {
                const on = sel.includes(w.uid);
                return (
                  <View key={w.uid} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.line }}>
                    <Pressable onPress={() => toggle(w.uid)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 11 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: on ? C.green : C.inputline, backgroundColor: on ? C.green : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>{on && <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text>}</View>
                      <Text style={{ color: C.ink, fontSize: 15, flex: 1 }}>{w.name}{w.pending ? <Text style={{ color: C.mute, fontSize: 12 }}>  · {t('wk.pending')}</Text> : null}</Text>
                    </Pressable>
                    {manage && <Pressable onPress={() => confirmRemove(w)} hitSlop={8}><Text style={{ color: C.badfg, fontWeight: '700' }}>{t('wk.remove')}</Text></Pressable>}
                  </View>
                );
              })}
            </View>
          ))}
          <View style={{ borderTopWidth: 1, borderTopColor: C.line, marginTop: 12, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: C.ink, fontWeight: '700' }}>{t('att.totalp')}</Text>
            <Text style={{ color: C.ink, fontWeight: '800', fontSize: 20 }}>{sel.length}{planned ? <Text style={{ color: C.mute, fontSize: 13, fontWeight: '400' }}> / {planned} {t('att.planned')}</Text> : null}</Text>
          </View>
          {planned > 0 && sel.length > planned * 1.1 && <Text style={{ color: C.badfg, marginTop: 8 }}>{t('att.above')}</Text>}
        </Card>

        <Pressable onPress={() => setManage(!manage)} style={{ marginTop: 14 }}><Text style={{ color: C.dark ? C.yellow : '#0F1E38', fontWeight: '700' }}>{manage ? t('wk.done') : `＋ ${t('wk.manage')}`}</Text></Pressable>
        {manage && (
          <Card style={{ marginTop: 10 }}>
            <Text style={{ color: C.ink, fontWeight: '800' }}>{t('wk.add')}</Text>
            <Label>{t('wk.name')}</Label>
            <TextInput value={nw.name} onChangeText={(x) => setNw({ ...nw, name: x })} style={inp} autoCapitalize="words" />
            <Label>{t('wk.category')}</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{cats.map((c) => <Chip key={c._id} text={c.name} on={nw.category === c.name} onPress={() => setNw({ ...nw, category: c.name })} />)}</View>
            {cats.length === 0 && <Text style={{ color: C.mute }}>{t('cats.none')}</Text>}
            <Text style={{ color: C.mute, fontSize: 12.5, fontWeight: '600', marginTop: 10 }}>{t('cat.new')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <TextInput value={newCat} onChangeText={setNewCat} placeholder={t('cat.name')} placeholderTextColor={C.mute} style={[inp, { flex: 1 }]} autoCapitalize="sentences" />
              <Pressable onPress={createCat} style={{ paddingHorizontal: 14, justifyContent: 'center', borderRadius: 10, backgroundColor: C.yellow }}><Text style={{ color: '#0F1E38', fontWeight: '700' }}>＋</Text></Pressable>
            </View>
            <View style={{ height: 14 }} />
            <Button title={t('wk.save')} kind="ghost" onPress={register} />
          </Card>
        )}

        <Card style={{ marginTop: 14 }}>
          <Label>{t('att.photo')}</Label>
          <PhotoBox uri={photo} label={t('att.take')} onPress={() => snapInto(t, setPhoto)} />
        </Card>
        <View style={{ height: 16 }} />
        <Button title={t('att.save')} disabled={!photo || sel.length === 0} onPress={() => {
          const picked = workers.filter((w) => sel.includes(w.uid));
          const counts = {}; picked.forEach((w) => { counts[w.category] = (counts[w.category] || 0) + 1; });
          save({ type: 'attendance', workers: picked.map((w) => w.uid), totalWorkersPresent: picked.length, photos: [photo], title: `${t('att.item')}: ${picked.length} ${t('workers')}`, detail: Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ') });
        }} />
        {(!photo || sel.length === 0) && <Hint>{t('hint.photo')}</Hint>}
      </Screen>
    </View>
  );
}

const today = () => new Date().toISOString().slice(0, 10);
const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(+new Date(s));

// Deliveries: record, correct and delete. Each delivery keeps who delivered it, the unit and the date.
export function Delivery({ boot, orders, queue, back, saveDelivery, deleteDelivery }) {
  const { C, t } = useApp();
  const inp = useInput();
  const [form, setForm] = useState(null);
  const queued = queue.filter((q) => q.type === 'delivery');
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const blank = { mode: 'new', source: orders.length ? 'order' : 'none', orderId: null, orderedQty: null, materialType: '', supplierName: '', qty: '', unit: '', date: today(), notes: '', photo: null };
  const editQueued = (q) => setForm({ mode: 'editQueued', ref: q.clientId, source: q.orderId ? 'order' : 'none', orderId: q.orderId, orderedQty: q.orderedQty, materialType: q.materialType, supplierName: q.supplierName, qty: String(q.quantityReceived), unit: q.unit || '', date: (q.deliveryDate || today()).slice(0, 10), notes: q.notes || '', photo: q.photos?.[0] || null });
  const editSynced = (d) => setForm({ mode: 'editSynced', ref: d._id, source: d.orderId ? 'order' : 'none', orderId: d.orderId, orderedQty: d.quantityOrdered, materialType: d.materialType, supplierName: d.supplierName, qty: String(d.quantityReceived), unit: d.unit || '', date: (d.deliveryDate || today()).slice(0, 10), notes: d.notes || '', photo: null });
  const confirmDelete = (target, label) => Alert.alert(t('dl.deleteTitle'), `${label}\n${t('dl.deleteNote')}`, [{ text: t('cancel') || 'Cancel', style: 'cancel' }, { text: t('dl.delete'), style: 'destructive', onPress: () => deleteDelivery(target) }]);
  const pickOrder = (o) => setForm((f) => ({ ...f, orderId: o._id, orderedQty: o.quantityOrdered, materialType: o.materialType, supplierName: f.supplierName || o.supplierName }));
  const qty = parseFloat(String(form?.qty || '').replace(',', '.'));
  const short = form && form.source === 'order' && form.orderedQty != null && form.qty !== '' && qty < form.orderedQty;
  const valid = form && form.materialType.trim() && form.supplierName.trim() && Number.isFinite(qty) && qty >= 0 && validDate(form.date) && (form.source !== 'order' || form.orderId || form.mode !== 'new');
  const needsPhoto = form && form.mode === 'new' && !form.photo;
  const submit = () => {
    if (!valid) return Alert.alert(t('dl.required'));
    saveDelivery({ ...form, qty, flagged: !!short });
    setForm(null);
  };

  if (!form) {
    const synced = boot.deliveries || [];
    const Card2 = ({ title, sub, pending, onEdit, onDelete, flagged }) => (
      <Card style={{ marginBottom: 10, borderLeftWidth: 4, borderLeftColor: flagged ? C.red : pending ? C.yellow : C.green }}>
        <Text style={{ fontWeight: '700', color: C.ink }}>{title}</Text>
        <Text style={{ color: C.mute, marginTop: 2 }}>{sub}</Text>
        {pending && <Text style={{ color: C.mute, fontSize: 12, marginTop: 2 }}>{t('dl.pending')}</Text>}
        {flagged && <Text style={{ color: C.badfg, marginTop: 4, fontWeight: '600' }}>{t('flag.short')}</Text>}
        <View style={{ flexDirection: 'row', gap: 20, marginTop: 10 }}>
          <Pressable onPress={onEdit} hitSlop={8}><Text style={{ color: C.dark ? C.yellow : '#0F1E38', fontWeight: '700' }}>{t('dl.edit')}</Text></Pressable>
          <Pressable onPress={onDelete} hitSlop={8}><Text style={{ color: C.badfg, fontWeight: '700' }}>{t('dl.delete')}</Text></Pressable>
        </View>
      </Card>
    );
    return (
      <View style={{ flex: 1 }}>
        <Back onPress={back} title={t('dl.title')} />
        <Screen>
          <Button title={t('dl.new')} onPress={() => setForm(blank)} />
          <Label>{t('dl.list')}</Label>
          {queued.length + synced.length === 0 && <Text style={{ color: C.mute }}>{t('dl.none')}</Text>}
          {queued.map((q) => <Card2 key={q.clientId} pending flagged={q.flagged} title={q.materialType} sub={`${q.quantityReceived} ${q.unit || ''} · ${q.supplierName} · ${(q.deliveryDate || '').slice(0, 10)}`} onEdit={() => editQueued(q)} onDelete={() => confirmDelete({ kind: 'queued', id: q.clientId }, q.materialType)} />)}
          {synced.map((d) => <Card2 key={d._id} pending={d.pending} flagged={d.flagged} title={d.materialType} sub={`${d.quantityReceived} ${d.unit || ''} · ${d.supplierName} · ${String(d.deliveryDate).slice(0, 10)}`} onEdit={() => editSynced(d)} onDelete={() => confirmDelete({ kind: 'synced', id: d._id }, d.materialType)} />)}
        </Screen>
      </View>
    );
  }
  const editing = form.mode !== 'new';
  return (
    <View style={{ flex: 1 }}>
      <Back onPress={() => setForm(null)} title={editing ? t('dl.editing') : t('dl.new')} />
      <Screen>
        {!editing && orders.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip text={t('dl.fromOrder')} on={form.source === 'order'} onPress={() => setForm({ ...form, source: 'order' })} />
            <Chip text={t('dl.noOrder')} on={form.source === 'none'} onPress={() => setForm({ ...form, source: 'none', orderId: null, orderedQty: null })} />
          </View>
        )}
        {form.source === 'order' && !editing && (<>
          <Label>{t('del.order')}</Label>
          {orders.map((o) => (
            <Pressable key={o._id} onPress={() => pickOrder(o)} style={{ padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: C.card, borderWidth: 2, borderColor: form.orderId === o._id ? C.yellow : C.line }}>
              <Text style={{ fontWeight: '700', color: C.ink }}>{o.materialType}</Text>
              <Text style={{ color: C.mute }}>{o.supplierName} · {t('del.ordered')} {o.quantityOrdered}</Text>
            </Pressable>))}
        </>)}
        {(form.source === 'none' || editing) && (<>
          <Label>{t('dl.material')}</Label>
          <TextInput value={form.materialType} onChangeText={set('materialType')} editable={!(editing && form.orderId)} style={[inp, editing && form.orderId && { opacity: 0.6 }]} />
        </>)}
        <Label>{t('dl.supplier')}</Label>
        <TextInput value={form.supplierName} onChangeText={set('supplierName')} style={inp} />
        <Label>{t('del.qty')}</Label>
        <TextInput value={form.qty} onChangeText={(x) => set('qty')(x.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" placeholder={form.orderedQty != null ? `${form.orderedQty}` : '0'} placeholderTextColor={C.mute} style={[inp, { fontSize: 20 }]} />
        {short && (
          <View style={{ backgroundColor: C.badbg, borderRadius: 10, padding: 12, marginTop: 10 }}>
            <Text style={{ color: C.badfg, fontWeight: '700' }}>{form.orderedQty - qty} {t('del.short')}</Text>
            <Text style={{ color: C.badfg }}>{t('del.warn')}</Text>
          </View>
        )}
        <Label>{t('dl.unit')}</Label>
        <TextInput value={form.unit} onChangeText={set('unit')} style={inp} />
        <Label>{t('dl.date')}</Label>
        <TextInput value={form.date} onChangeText={set('date')} keyboardType="numbers-and-punctuation" style={inp} />
        <Label>{t('dl.notes')}</Label>
        <TextInput value={form.notes} onChangeText={set('notes')} multiline style={[inp, { minHeight: 56 }]} />
        <Label>{t('dl.photoReq')}</Label>
        <PhotoBox uri={form.photo} label={t('del.take')} onPress={() => snapInto(t, set('photo'))} />
        <View style={{ height: 16 }} />
        <Button title={editing ? t('dl.update') : t('del.save')} disabled={!valid || needsPhoto} onPress={submit} />
        {(!valid || needsPhoto) && <Hint>{t('dl.required')}</Hint>}
        <View style={{ height: 8 }} /><Button title={t('dl.back')} kind="ghost" onPress={() => setForm(null)} />
      </Screen>
    </View>
  );
}

// Daily report: follows the structure of the company's own paper report.
export function Report({ boot, back, save }) {
  const { C, t } = useApp();
  const inp = useInput();
  const cats = boot.categories || [], tasks = boot.tasks || [], stock = boot.stock || [];
  const [work, setWork] = useState([]);
  const [objectives, setObjectives] = useState('');
  const [crew, setCrew] = useState({});
  const [equip, setEquip] = useState([]);
  const [moves, setMoves] = useState([]);
  const [diffs, setDiffs] = useState([]);
  const [tomorrow, setTomorrow] = useState('');
  const [orders, setOrders] = useState('');
  const [cash, setCash] = useState({ open: '', exp: '' });
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [pick, setPick] = useState(null);
  const upd = (set, i, patch) => set((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const del = (set, i) => set((l) => l.filter((_, j) => j !== i));
  const workers = Object.values(crew).reduce((a, b) => a + b, 0);

  const Picker = ({ kind, children }) => (
    <Pressable onPress={() => setPick(pick === kind ? null : kind)} style={{ marginTop: 8 }}><Text style={{ color: C.dark ? C.yellow : '#0F1E38', fontWeight: '700' }}>＋ {children}</Text></Pressable>
  );
  const itemChips = (onAdd) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
      {stock.map((s) => <Chip key={s.materialType} text={s.materialType} onPress={() => { onAdd(s.materialType); setPick(null); }} />)}
      <Chip text={t('rep.newitem')} on onPress={() => { onAdd(''); setPick(null); }} />
    </View>
  );
  const addVideo = async () => {
    const r = await takeVideo();
    if (r?.denied) Alert.alert(t('cam.denied')); else if (r?.tooBig) Alert.alert(t('rep.videobig')); else if (r?.error) Alert.alert(t('cam.error'), r.error); else if (r) setVideos((v) => [...v, r.uri]);
  };

  const submit = () => {
    const bad = work.find((w) => w.pct !== '' && !(parseFloat(String(w.pct).replace(',', '.')) >= 0 && parseFloat(String(w.pct).replace(',', '.')) <= 100));
    if (bad) return Alert.alert(t('rep.pcterr'));
    const payload = {
      date: new Date().toISOString(), objectives, tomorrowPlan: tomorrow, ordersNote: orders,
      workPerformed: work.filter((w) => toNum(w.quantity) > 0 || w.pct !== '').map((w) => ({ taskId: w.taskId, taskName: w.taskName, unit: w.unit, quantity: toNum(w.quantity), progressPct: w.pct === '' ? undefined : toNum(w.pct) })),
      workforce: cats.map((c) => ({ category: c.name, count: crew[c.name] || 0 })).filter((w) => w.count > 0),
      materialsUsed: equip.filter((e) => e.materialType.trim() && toNum(e.quantity) > 0).map((e) => ({ materialType: e.materialType.trim(), quantity: toNum(e.quantity) })),
      stockMovements: moves.filter((m) => m.materialType.trim() && toNum(m.quantity) > 0).map((m) => ({ materialType: m.materialType.trim(), kind: m.kind, quantity: toNum(m.quantity), party: m.party })),
      difficulties: diffs.filter((d) => d.issue.trim()),
      siteCash: cash.open !== '' || cash.exp !== '' ? { opening: toNum(cash.open), expenses: toNum(cash.exp) } : undefined,
    };
    save({ type: 'report', payload, photos, videos, title: `${t('rep.item.report')} ${new Date().toLocaleDateString()}`, detail: `${payload.workPerformed.length} ${t('rep.tasks')} · ${workers} ${t('workers')}` });
  };
  const empty = work.length === 0 && !objectives && !tomorrow && diffs.length === 0 && moves.length === 0;

  return (
    <View style={{ flex: 1 }}>
      <Back onPress={back} title={t('rep.title')} />
      <Screen>
        <Section title={t('rep.work')}>
          {tasks.length === 0 && <Text style={{ color: C.mute }}>{t('rep.none.tasks')}</Text>}
          {work.map((w, i) => (
            <View key={w.taskId} style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, color: C.ink, fontWeight: '600' }}>{w.taskName}</Text><Remove onPress={() => del(setWork, i)} /></View>
              <Text style={{ color: C.mute, fontSize: 12 }}>{t('rep.now')}: {Math.round(w.current)}%</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <TextInput value={w.quantity} onChangeText={(x) => upd(setWork, i, { quantity: x })} keyboardType="decimal-pad" placeholder={`${t('rep.qty')} (${w.unit})`} placeholderTextColor={C.mute} style={[inp, { flex: 1 }]} />
                <TextInput value={w.pct} onChangeText={(x) => upd(setWork, i, { pct: x.replace(/[^0-9.,]/g, '') })} keyboardType="decimal-pad" placeholder="%" placeholderTextColor={C.mute} style={[inp, { width: 78 }]} accessibilityLabel={t('rep.pct')} />
              </View>
            </View>
          ))}
          {work.length > 0 && <Text style={{ color: C.mute, fontSize: 12, marginTop: 8 }}>{t('rep.pcthint')}</Text>}
          {tasks.length > 0 && <Picker kind="task">{t('rep.addtask')}</Picker>}
          {pick === 'task' && <View style={{ marginTop: 8 }}>{tasks.filter((x) => !work.some((w) => w.taskId === x._id)).map((x) => (
            <Pressable key={x._id} onPress={() => { setWork([...work, { taskId: x._id, taskName: x.name, unit: x.unit, quantity: '', pct: '', current: x.progressPct }]); setPick(null); }} style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line }}>
              <Text style={{ color: C.ink }}>{x.name}</Text><Text style={{ color: C.mute, fontSize: 12 }}>{x.category} · {Math.round(x.progressPct)}%{x.reportedPct != null ? ` (${t('rep.now')}: ${Math.round(x.calculatedPct)}% calc.)` : ''}</Text>
            </Pressable>))}</View>}
          <Label>{t('rep.obj')}</Label>
          <TextInput value={objectives} onChangeText={setObjectives} multiline style={[inp, { minHeight: 60 }]} />
        </Section>

        <Section title={t('rep.crew')}>
          {cats.length === 0 && <Text style={{ color: C.mute }}>{t('cats.none')}</Text>}
          {cats.map((c) => <Counter key={c._id} label={c.name} value={crew[c.name] || 0} onChange={(v) => setCrew({ ...crew, [c.name]: v })} />)}
        </Section>

        <Section title={t('rep.equip')}>
          {equip.map((e, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <TextInput value={e.materialType} onChangeText={(x) => upd(setEquip, i, { materialType: x })} placeholder={t('rep.item')} placeholderTextColor={C.mute} style={[inp, { flex: 1 }]} />
              <TextInput value={e.quantity} onChangeText={(x) => upd(setEquip, i, { quantity: x })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.mute} style={[inp, { width: 64 }]} />
              <Remove onPress={() => del(setEquip, i)} />
            </View>
          ))}
          <Picker kind="equip">{t('rep.additem')}</Picker>
          {pick === 'equip' && itemChips((name) => setEquip([...equip, { materialType: name, quantity: '' }]))}
        </Section>

        <Section title={t('rep.stock')}>
          {moves.map((m, i) => (
            <View key={i} style={{ marginTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.line }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Pressable onPress={() => upd(setMoves, i, { kind: m.kind === 'in' ? 'out' : 'in' })} style={{ paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, backgroundColor: m.kind === 'in' ? C.okbg : C.badbg }}><Text style={{ color: m.kind === 'in' ? C.green : C.badfg, fontWeight: '800' }}>{m.kind === 'in' ? t('rep.in') : t('rep.out')}</Text></Pressable>
                <TextInput value={m.materialType} onChangeText={(x) => upd(setMoves, i, { materialType: x })} placeholder={t('rep.item')} placeholderTextColor={C.mute} style={[inp, { flex: 1 }]} />
                <TextInput value={m.quantity} onChangeText={(x) => upd(setMoves, i, { quantity: x })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.mute} style={[inp, { width: 64 }]} />
                <Remove onPress={() => del(setMoves, i)} />
              </View>
              <TextInput value={m.party} onChangeText={(x) => upd(setMoves, i, { party: x })} placeholder={t('rep.party')} placeholderTextColor={C.mute} style={[inp, { marginTop: 6 }]} />
            </View>
          ))}
          <Picker kind="move">{t('rep.addmove')}</Picker>
          {pick === 'move' && itemChips((name) => setMoves([...moves, { materialType: name, kind: 'out', quantity: '', party: '' }]))}
        </Section>

        <Section title={t('rep.diff')}>
          {diffs.map((d, i) => (
            <View key={i} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput value={d.issue} onChangeText={(x) => upd(setDiffs, i, { issue: x })} placeholder={t('rep.issue')} placeholderTextColor={C.mute} style={[inp, { flex: 1 }]} />
                <Remove onPress={() => del(setDiffs, i)} />
              </View>
              <TextInput value={d.solution} onChangeText={(x) => upd(setDiffs, i, { solution: x })} placeholder={t('rep.sol')} placeholderTextColor={C.mute} style={[inp, { marginTop: 6 }]} />
            </View>
          ))}
          <Pressable onPress={() => setDiffs([...diffs, { issue: '', solution: '' }])} style={{ marginTop: 8 }}><Text style={{ color: C.dark ? C.yellow : '#0F1E38', fontWeight: '700' }}>＋ {t('rep.adddiff')}</Text></Pressable>
        </Section>

        <Section title={t('rep.tomorrow')}><TextInput value={tomorrow} onChangeText={setTomorrow} multiline style={[inp, { minHeight: 60, marginTop: 6 }]} />
          <Label>{t('rep.orders')}</Label><TextInput value={orders} onChangeText={setOrders} style={inp} /></Section>

        <Section title={t('rep.cash')}>
          <Label>{t('rep.cash.open')}</Label><TextInput value={cash.open} onChangeText={(x) => setCash({ ...cash, open: x })} keyboardType="number-pad" style={inp} />
          <Label>{t('rep.cash.exp')}</Label><TextInput value={cash.exp} onChangeText={(x) => setCash({ ...cash, exp: x })} keyboardType="number-pad" style={inp} />
        </Section>

        <Section title={t('rep.photos')}>
          <View style={{ marginTop: 8 }}><PhotoStrip uris={photos} label={t('rep.addphoto')} onAdd={() => snapInto(t, (u) => setPhotos((p) => [...p, u]))} onRemove={(i) => setPhotos((p) => p.filter((_, j) => j !== i))} /></View>
        </Section>
        <Section title={t('rep.video')}>
          {videos.map((v, i) => <View key={v} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}><Text style={{ flex: 1, color: C.ink }}>🎬 {t('rep.ok')} ({i + 1})</Text><Remove onPress={() => setVideos((l) => l.filter((_, j) => j !== i))} /></View>)}
          {videos.length < 2 && <Pressable onPress={addVideo} style={{ marginTop: 10 }}><Text style={{ color: C.dark ? C.yellow : '#0F1E38', fontWeight: '700' }}>＋ {t('rep.addvideo')}</Text></Pressable>}
        </Section>
        <View style={{ height: 16 }} />
        <Button title={t('rep.save')} disabled={empty} onPress={submit} />
      </Screen>
    </View>
  );
}

export function PhotoScreen({ boot, back, save }) {
  const { C, t } = useApp();
  const inp = useInput();
  const [photo, setPhoto] = useState(null), [caption, setCaption] = useState(''), [task, setTask] = useState(null);
  const tasks = boot.tasks || [];
  return (
    <View style={{ flex: 1 }}>
      <Back onPress={back} title={t('ph.title')} />
      <Screen>
        <PhotoBox uri={photo} label={t('ph.take')} onPress={() => snapInto(t, setPhoto)} />
        <Label>{t('ph.caption')}</Label>
        <TextInput value={caption} onChangeText={setCaption} style={inp} />
        {tasks.length > 0 && (<>
          <Label>{t('ph.task')}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{tasks.map((x) => <Chip key={x._id} text={x.name.length > 28 ? x.name.slice(0, 27) + '…' : x.name} on={task === x._id} onPress={() => setTask(task === x._id ? null : x._id)} />)}</View>
        </>)}
        <View style={{ height: 16 }} />
        <Button title={t('ph.save')} disabled={!photo} onPress={() => save({ type: 'photo', photos: [photo], caption, taskId: task || undefined, title: t('ph.item'), detail: caption || '-' })} />
      </Screen>
    </View>
  );
}

export function Sync({ back, queue, history, online, syncing, syncNow, remove }) {
  const { C, t } = useApp();
  return (
    <View style={{ flex: 1 }}>
      <Back onPress={back} title={t('sync.title')} />
      <Screen>
        <Card style={{ backgroundColor: online ? C.okbg : C.warnbg, borderColor: online ? C.okline : C.warnline }}>
          <Text style={{ fontWeight: '700', color: C.ink }}>{syncing ? t('sync.sending') : online ? (queue.length ? t('st.online') : t('sync.ok')) : t('sync.wait')}</Text>
          <Text style={{ color: C.mute }}>{t('sync.note')}</Text>
        </Card>
        {queue.length > 0 && online && !syncing && <View style={{ marginTop: 12 }}><Button title={t('sync.now')} onPress={syncNow} /></View>}
        <Label>{t('sync.pending')} ({queue.length})</Label>
        {queue.length === 0 && <Text style={{ color: C.mute }}>{t('sync.none')}</Text>}
        {queue.map((q) => (
          <View key={q.clientId}>
            <Row item={q} pending />
            {!!q.error && <Pressable onPress={() => remove(q.clientId)} style={{ marginTop: -4, marginBottom: 10 }}><Text style={{ color: C.badfg, fontWeight: '700' }}>{t('remove')}</Text></Pressable>}
          </View>
        ))}
        <Label>{t('sync.sent')} ({history.length})</Label>
        {history.map((h) => <Row key={h.clientId} item={h} />)}
      </Screen>
    </View>
  );
}

// The weekly report builds itself from the daily reports. The foreman adds planned percentages and reasons, then sends it to the office.
export function Weekly({ back, online }) {
  const { C, t, lang } = useApp();
  const inp = useInput();
  const [st, setSt] = useState({ loading: true, data: null, error: '' });
  const [edits, setEdits] = useState({}), [meta, setMeta] = useState({ objectives: '', notes: '' }), [busy, setBusy] = useState(false);
  const load = async () => {
    setSt((s) => ({ ...s, loading: true, error: '' }));
    try { const w = await api.weeklyCurrent(); setSt({ loading: false, data: w, error: '' }); setMeta({ objectives: w.objectives || '', notes: w.notes || '' }); setEdits({}); }
    catch (e) { setSt({ loading: false, data: null, error: e.network ? 'network' : e.message }); }
  };
  useEffect(() => { if (online) load(); else setSt({ loading: false, data: null, error: 'offline' }); }, [online]); // eslint-disable-line
  const w = st.data;
  const editable = w && w.status === 'draft' && !w.submittedAt;
  const val = (r, k) => (edits[r.taskId]?.[k] !== undefined ? edits[r.taskId][k] : r[k] != null ? String(r[k]) : '');
  const set = (taskId, k, v) => setEdits((e) => ({ ...e, [taskId]: { ...e[taskId], [k]: v } }));
  const pctOk = () => Object.values(edits).every((e) => e.plannedPct === undefined || e.plannedPct === '' || (Number(e.plannedPct) >= 0 && Number(e.plannedPct) <= 100));
  const save = async (then) => {
    if (!pctOk()) return Alert.alert(t('wr.pcterr'));
    setBusy(true);
    try { await api.updateWeekly(w._id, { rows: Object.entries(edits).map(([taskId, v]) => ({ taskId, ...v })), objectives: meta.objectives, notes: meta.notes }); if (then) await then(); else Alert.alert(t('wr.saved')); await load(); }
    catch (e) { Alert.alert(e.network ? t('err.network') : e.message); }
    setBusy(false);
  };
  const submit = () => Alert.alert(t('wr.submit'), t('wr.confirm'), [{ text: t('cancel'), style: 'cancel' }, { text: t('wr.submit'), onPress: () => save(() => api.submitWeekly(w._id)) }]);
  const end = w && new Date(+new Date(w.weekStart) + 5 * 864e5);
  const fmtD = (d) => new Date(d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' });
  return (
    <View style={{ flex: 1 }}>
      <Back onPress={back} title={t('wr.title')} />
      <Screen>
        {st.loading && <ActivityIndicator color={C.yellow} style={{ marginTop: 30 }} />}
        {!st.loading && st.error === 'offline' && <Text style={{ color: C.mute }}>{t('wr.offline')}</Text>}
        {!st.loading && !!st.error && st.error !== 'offline' && <View><Text style={{ color: C.badfg }}>{st.error === 'network' ? t('err.network') : st.error}</Text><View style={{ height: 10 }} /><Button title={t('wr.reload')} kind="ghost" onPress={load} /></View>}
        {w && (<>
          <Card>
            <Text style={{ color: C.ink, fontWeight: '800', fontSize: 17 }}>{fmtD(w.weekStart)} – {fmtD(end)}</Text>
            <Text style={{ color: C.mute }}>{t('wr.period')}</Text>
            <Text style={{ color: C.mute, marginTop: 8, fontSize: 13 }}>{t('wr.auto')}</Text>
            {w.status === 'locked' && <Text style={{ color: C.green, fontWeight: '700', marginTop: 8 }}>{t('wr.locked')}</Text>}
            {w.status !== 'locked' && w.submittedAt && <Text style={{ color: C.green, fontWeight: '700', marginTop: 8 }}>{t('wr.submitted')}</Text>}
          </Card>
          {w.rows.map((r) => (
            <Card key={r.taskId} style={{ marginTop: 12 }}>
              <Text style={{ color: C.ink, fontWeight: '700' }}>{r.name}</Text>
              {!!r.subcontractor && <Text style={{ color: C.mute, fontSize: 12 }}>{r.subcontractor}</Text>}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ color: C.mute }}>{t('wr.executed')}: <Text style={{ color: C.ink, fontWeight: '700' }}>{r.weeklyQty} {r.unit}</Text></Text>
                <Text style={{ color: C.mute }}>{t('wr.progress')}: <Text style={{ color: C.ink, fontWeight: '700' }}>{Math.round(r.progressPct)}%</Text></Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <View style={{ width: 90 }}><Text style={{ color: C.mute, fontSize: 12 }}>{t('wr.planned')}</Text><TextInput editable={editable} value={val(r, 'plannedPct')} onChangeText={(x) => set(r.taskId, 'plannedPct', x.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" style={[inp, !editable && { opacity: 0.6 }]} /></View>
                <View style={{ flex: 1 }}><Text style={{ color: C.mute, fontSize: 12 }}>{t('wr.reason')}</Text><TextInput editable={editable} value={val(r, 'delayReason')} onChangeText={(x) => set(r.taskId, 'delayReason', x)} style={[inp, !editable && { opacity: 0.6 }]} /></View>
              </View>
              <Text style={{ color: C.mute, fontSize: 12, marginTop: 8 }}>{t('wr.obs')}</Text>
              <TextInput editable={editable} value={val(r, 'observation')} onChangeText={(x) => set(r.taskId, 'observation', x)} style={[inp, !editable && { opacity: 0.6 }]} />
            </Card>
          ))}
          <Card style={{ marginTop: 12 }}>
            <Text style={{ color: C.mute, fontSize: 12 }}>{t('wr.objectives')}</Text>
            <TextInput editable={editable} value={meta.objectives} onChangeText={(x) => setMeta({ ...meta, objectives: x })} multiline style={[inp, { minHeight: 56 }, !editable && { opacity: 0.6 }]} />
            <Text style={{ color: C.mute, fontSize: 12, marginTop: 10 }}>{t('wr.notes')}</Text>
            <TextInput editable={editable} value={meta.notes} onChangeText={(x) => setMeta({ ...meta, notes: x })} multiline style={[inp, { minHeight: 56 }, !editable && { opacity: 0.6 }]} />
          </Card>
          {editable && (<><View style={{ height: 14 }} /><Button title={t('wr.save')} kind="ghost" disabled={busy} onPress={() => save()} /><View style={{ height: 10 }} /><Button title={t('wr.submit')} disabled={busy} onPress={submit} /></>)}
        </>)}
      </Screen>
    </View>
  );
}
