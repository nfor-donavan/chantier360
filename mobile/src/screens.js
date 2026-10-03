import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Image, Switch, Alert, ActivityIndicator } from 'react-native';
import { Button, Card, Label, PhotoBox, takePhoto } from './ui';
import { useApp, fmt, demoForemen } from './ctx';

const Screen = ({ children }) => {
  const { C } = useApp();
  return <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>;
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
  const [email, setEmail] = useState(demoForemen[0].email);
  const [pw, setPw] = useState('demo1234');
  const inp = { borderWidth: 1, borderColor: C.inputline, borderRadius: 10, padding: 12, fontSize: 16, color: C.ink, backgroundColor: C.input };
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
    <Card style={{ marginBottom: 10, borderLeftWidth: 4, borderLeftColor: item.error ? C.red : item.flagged ? C.red : pending ? C.yellow : C.green }}>
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
          <Tile icon="👷" title={t('tile.att')} sub={t('tile.att.sub')} to="attendance" />
          <Tile icon="📦" title={t('tile.del')} sub={t('tile.del.sub')} to="delivery" />
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

export function Attendance({ user, back, save }) {
  const { C, t } = useApp();
  const rate = user.site?.dailyRateXAF || 5000;
  const [n, setN] = useState(user.site?.plannedWorkers || 10);
  const [photo, setPhoto] = useState(null);
  const step = { width: 56, height: 56, borderRadius: 28, backgroundColor: C.step, alignItems: 'center', justifyContent: 'center' };
  const snap = async () => { const r = await takePhoto(); if (r?.denied) Alert.alert(t('cam.denied')); else if (r) setPhoto(r.uri); };
  return (
    <View style={{ flex: 1 }}>
      <Back onPress={back} title={t('att.title')} />
      <Screen>
        <Card>
          <Label>{t('att.present')}</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
            <Pressable onPress={() => setN(Math.max(0, n - 1))} style={step} accessibilityLabel="-"><Text style={{ fontSize: 30, color: C.stepfg, fontWeight: '700' }}>−</Text></Pressable>
            <Text style={{ fontSize: 56, fontWeight: '800', color: C.ink }}>{n}</Text>
            <Pressable onPress={() => setN(n + 1)} style={step} accessibilityLabel="+"><Text style={{ fontSize: 30, color: C.stepfg, fontWeight: '700' }}>+</Text></Pressable>
          </View>
          <Label>{t('att.rate')}</Label><Text style={{ fontSize: 16, color: C.ink }}>{fmt(rate)}</Text>
          <Label>{t('att.total')}</Label><Text style={{ fontSize: 22, fontWeight: '800', color: C.dark ? C.yellow : '#0F1E38' }}>{fmt(n * rate)}</Text>
          <Label>{t('att.photo')}</Label>
          <PhotoBox uri={photo} label={t('att.take')} onPress={snap} />
        </Card>
        <View style={{ height: 16 }} />
        <Button title={t('att.save')} disabled={!photo || n === 0} onPress={() => save({ type: 'attendance', totalWorkersPresent: n, photoUri: photo, title: `${t('att.item')}: ${n} ${t('workers')}`, detail: `${fmt(n * rate)} ${t('wages')}` })} />
      </Screen>
    </View>
  );
}

export function Delivery({ orders, back, save }) {
  const { C, t } = useApp();
  const [order, setOrder] = useState(null);
  const [qty, setQty] = useState('');
  const [photo, setPhoto] = useState(null);
  const sel = order && orders.find((o) => o._id === order) ;
  const got = parseInt(qty || '0', 10);
  const short = sel && qty !== '' && got < sel.quantityOrdered;
  const snap = async () => { const r = await takePhoto(); if (r?.denied) Alert.alert(t('cam.denied')); else if (r) setPhoto(r.uri); };
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
          <TextInput value={qty} onChangeText={(x) => setQty(x.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder={`${sel.quantityOrdered}`} placeholderTextColor={C.mute}
            style={{ borderWidth: 1, borderColor: C.inputline, borderRadius: 10, padding: 12, fontSize: 22, color: C.ink, backgroundColor: C.input }} />
          {short && (
            <View style={{ backgroundColor: C.badbg, borderRadius: 10, padding: 12, marginTop: 10 }}>
              <Text style={{ color: C.badfg, fontWeight: '700' }}>{sel.quantityOrdered - got} {t('del.short')}</Text>
              <Text style={{ color: C.badfg }}>{t('del.warn')}</Text>
            </View>
          )}
          <Label>{t('del.photo')}</Label>
          <PhotoBox uri={photo} label={t('del.take')} onPress={snap} />
          <View style={{ height: 16 }} />
          <Button title={t('del.save')} disabled={!photo || qty === ''} onPress={() => save({ type: 'delivery', orderId: sel._id, quantityReceived: got, photoUri: photo, flagged: short, title: sel.materialType, detail: `${got} ${t('del.detail')} ${sel.quantityOrdered} · ${sel.supplierName}` })} />
        </>)}
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
