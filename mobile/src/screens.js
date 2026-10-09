import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Image, Switch, Alert, ActivityIndicator } from 'react-native';
import { Button, Card, Label, PhotoBox, PhotoStrip, takePhoto } from './ui';
import { useApp, demoForemen } from './ctx';

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
    <ScrollView style={{ flex: 1, backgroundColor: C.header }} contentContainerStyle={{ padding: 24, paddingTop: 60 }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'flex-end' }}><Toggles dark /></View>
      <Image source={require('../assets/logo.png')} style={{ width: 96, height: 96, marginTop: 12 }} />
      <Text style={{ color: '#fff', fontSize: 38, fontWeight: '800', marginTop: 12 }}>Chantier360</Text>
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

export function Home({ user, online, forceOffline, setForceOffline, pending, syncing, history, go, onLogout }) {
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
        <Text style={{ color: '#9FB0CC', marginTop: 14 }}>{t('hello')} {user.name.split(' ')[0]}</Text>
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
          <View style={{ flex: 1 }} />
        </View>
        <Label>{t('recent')}</Label>
        {history.length === 0 && <Text style={{ color: C.mute }}>{t('recent.none')}</Text>}
        {history.slice(0, 4).map((h) => <Row key={h.clientId} item={h} />)}
      </Screen>
    </View>
  );
}

const snapInto = async (t, add) => { const r = await takePhoto(); if (r?.denied) Alert.alert(t('cam.denied')); else if (r?.error) Alert.alert(t('cam.error'), r.error); else if (r) add(r.uri); };

// Attendance: who was on site, by category. No wages here.
export function Attendance({ boot, user, back, save }) {
  const { C, t } = useApp();
  const cats = boot.categories || [];
  const planned = boot.project?.plannedWorkers ?? user.site?.plannedWorkers ?? 0;
  const [counts, setCounts] = useState({});
  const [photo, setPhoto] = useState(null);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <View style={{ flex: 1 }}>
      <Back onPress={back} title={t('att.title')} />
      <Screen>
        <Card>
          <Label>{t('att.cats')}</Label>
          {cats.length === 0 && <Text style={{ color: C.mute }}>{t('cats.none')}</Text>}
          {cats.map((c) => <Counter key={c._id} label={c.name} value={counts[c.name] || 0} onChange={(v) => setCounts({ ...counts, [c.name]: v })} />)}
          <View style={{ borderTopWidth: 1, borderTopColor: C.line, marginTop: 10, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: C.ink, fontWeight: '700' }}>{t('att.totalp')}</Text>
            <Text style={{ color: C.ink, fontWeight: '800', fontSize: 20 }}>{total}{planned ? <Text style={{ color: C.mute, fontSize: 13, fontWeight: '400' }}> / {planned} {t('att.planned')}</Text> : null}</Text>
          </View>
          {planned > 0 && total > planned * 1.1 && <Text style={{ color: C.badfg, marginTop: 8 }}>{t('att.above')}</Text>}
          <Label>{t('att.photo')}</Label>
          <PhotoBox uri={photo} label={t('att.take')} onPress={() => snapInto(t, setPhoto)} />
        </Card>
        <View style={{ height: 16 }} />
        <Button title={t('att.save')} disabled={!photo || total === 0} onPress={() => save({ type: 'attendance', totalWorkersPresent: total, breakdown: cats.map((c) => ({ category: c.name, count: counts[c.name] || 0 })).filter((b) => b.count > 0), photos: [photo], title: `${t('att.item')}: ${total} ${t('workers')}`, detail: Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(', ') })} />
        {(!photo || total === 0) && <Hint>{t('hint.photo')}</Hint>}
      </Screen>
    </View>
  );
}

export function Delivery({ orders, back, save }) {
  const { C, t } = useApp();
  const inp = useInput();
  const [order, setOrder] = useState(null);
  const [qty, setQty] = useState('');
  const [photo, setPhoto] = useState(null);
  const sel = order && orders.find((o) => o._id === order);
  const got = parseInt(qty || '0', 10);
  const short = sel && qty !== '' && got < sel.quantityOrdered;
  return (
    <View style={{ flex: 1 }}>
      <Back onPress={back} title={t('del.title')} />
      <Screen>
        <Label>{t('del.order')}</Label>
        {orders.length === 0 && <Text style={{ color: C.mute }}>{t('del.none')}</Text>}
        {orders.map((o) => (
          <Pressable key={o._id} onPress={() => setOrder(o._id)} style={{ padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: C.card, borderWidth: 2, borderColor: order === o._id ? C.yellow : C.line }}>
            <Text style={{ fontWeight: '700', color: C.ink }}>{o.materialType}</Text>
            <Text style={{ color: C.mute }}>{o.supplierName} · {t('del.ordered')} {o.quantityOrdered}</Text>
          </Pressable>
        ))}
        {!!sel && (<>
          <Label>{t('del.qty')}</Label>
          <TextInput value={qty} onChangeText={(x) => setQty(x.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder={`${sel.quantityOrdered}`} placeholderTextColor={C.mute} style={[inp, { fontSize: 22 }]} />
          {short && (
            <View style={{ backgroundColor: C.badbg, borderRadius: 10, padding: 12, marginTop: 10 }}>
              <Text style={{ color: C.badfg, fontWeight: '700' }}>{sel.quantityOrdered - got} {t('del.short')}</Text>
              <Text style={{ color: C.badfg }}>{t('del.warn')}</Text>
            </View>
          )}
          <Label>{t('del.photo')}</Label>
          <PhotoBox uri={photo} label={t('del.take')} onPress={() => snapInto(t, setPhoto)} />
          <View style={{ height: 16 }} />
          <Button title={t('del.save')} disabled={!photo || qty === ''} onPress={() => save({ type: 'delivery', orderId: sel._id, quantityReceived: got, photos: [photo], flagged: short, title: sel.materialType, detail: `${got} ${t('del.detail')} ${sel.quantityOrdered} · ${sel.supplierName}` })} />
          {(!photo || qty === '') && <Hint>{t('hint.delivery')}</Hint>}
        </>)}
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
  const [pick, setPick] = useState(null);
  const upd = (set, i, patch) => set((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const del = (set, i) => set((l) => l.filter((_, j) => j !== i));
  const workers = Object.values(crew).reduce((a, b) => a + b, 0);

  const Picker = ({ kind, children }) => (
    <View>
      <Pressable onPress={() => setPick(pick === kind ? null : kind)} style={{ marginTop: 8 }}><Text style={{ color: C.dark ? C.yellow : '#0F1E38', fontWeight: '700' }}>＋ {children}</Text></Pressable>
    </View>
  );
  const itemChips = (onAdd) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
      {stock.map((s) => <Chip key={s.materialType} text={s.materialType} onPress={() => { onAdd(s.materialType); setPick(null); }} />)}
      <Chip text={t('rep.newitem')} on onPress={() => { onAdd(''); setPick(null); }} />
    </View>
  );

  const submit = () => {
    const payload = {
      date: new Date().toISOString(), objectives, tomorrowPlan: tomorrow, ordersNote: orders,
      workPerformed: work.filter((w) => toNum(w.quantity) > 0).map((w) => ({ taskId: w.taskId, taskName: w.taskName, unit: w.unit, quantity: toNum(w.quantity) })),
      workforce: cats.map((c) => ({ category: c.name, count: crew[c.name] || 0 })).filter((w) => w.count > 0),
      materialsUsed: equip.filter((e) => e.materialType.trim() && toNum(e.quantity) > 0).map((e) => ({ materialType: e.materialType.trim(), quantity: toNum(e.quantity) })),
      stockMovements: moves.filter((m) => m.materialType.trim() && toNum(m.quantity) > 0).map((m) => ({ materialType: m.materialType.trim(), kind: m.kind, quantity: toNum(m.quantity), party: m.party })),
      difficulties: diffs.filter((d) => d.issue.trim()),
      siteCash: cash.open !== '' || cash.exp !== '' ? { opening: toNum(cash.open), expenses: toNum(cash.exp) } : undefined,
    };
    save({ type: 'report', payload, photos, title: `${t('rep.item.report')} ${new Date().toLocaleDateString()}`, detail: `${payload.workPerformed.length} ${t('rep.tasks')} · ${workers} ${t('workers')}` });
  };
  const empty = work.length === 0 && !objectives && !tomorrow && diffs.length === 0 && moves.length === 0;

  return (
    <View style={{ flex: 1 }}>
      <Back onPress={back} title={t('rep.title')} />
      <Screen>
        <Section title={t('rep.work')}>
          {tasks.length === 0 && <Text style={{ color: C.mute }}>{t('rep.none.tasks')}</Text>}
          {work.map((w, i) => (
            <View key={w.taskId} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, color: C.ink, fontWeight: '600' }}>{w.taskName}</Text><Remove onPress={() => del(setWork, i)} /></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <TextInput value={w.quantity} onChangeText={(x) => upd(setWork, i, { quantity: x })} keyboardType="decimal-pad" placeholder={t('rep.qty')} placeholderTextColor={C.mute} style={[inp, { flex: 1 }]} />
                <Text style={{ color: C.mute, width: 60 }}>{w.unit}</Text>
              </View>
            </View>
          ))}
          {tasks.length > 0 && <Picker kind="task">{t('rep.addtask')}</Picker>}
          {pick === 'task' && <View style={{ marginTop: 8 }}>{tasks.filter((x) => !work.some((w) => w.taskId === x._id)).map((x) => (
            <Pressable key={x._id} onPress={() => { setWork([...work, { taskId: x._id, taskName: x.name, unit: x.unit, quantity: '' }]); setPick(null); }} style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line }}>
              <Text style={{ color: C.ink }}>{x.name}</Text><Text style={{ color: C.mute, fontSize: 12 }}>{x.category} · {Math.round(x.progressPct)}%</Text>
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
