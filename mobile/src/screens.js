import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Image, Switch } from 'react-native';
import { Button, Card, Label, PhotoBox, takePhoto } from './ui';
import { C, demoForemen, fmt, openOrders } from './theme';

const Screen = ({ children }) => <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>;
const Back = ({ onPress, title }) => (
  <View style={{ backgroundColor: C.navy, paddingTop: 48, paddingBottom: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center' }}>
    <Pressable onPress={onPress} hitSlop={12}><Text style={{ color: '#fff', fontSize: 26, marginRight: 14 }}>‹</Text></Pressable>
    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{title}</Text>
  </View>
);

export function Login({ onLogin }) {
  const [email, setEmail] = useState(demoForemen[0].email);
  const [pw, setPw] = useState('demo1234');
  const [err, setErr] = useState('');
  const go = (e, p) => { const u = demoForemen.find((x) => x.email === e && x.password === p); u ? onLogin(u) : setErr('Wrong email or password. Use a demo account.'); };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.navy }} contentContainerStyle={{ padding: 24, paddingTop: 80 }} keyboardShouldPersistTaps="handled">
      <Image source={require('../assets/logo.png')} style={{ width: 96, height: 96 }} />
      <Text style={{ color: '#fff', fontSize: 38, fontWeight: '800', marginTop: 12 }}>Chantier360</Text>
      <Text style={{ color: '#C5D0E4', fontSize: 16, marginTop: 4 }}>Site foreman app. Log work even without network.</Text>
      <Card style={{ marginTop: 28 }}>
        <Label>Email</Label>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={inp} />
        <Label>Password</Label>
        <TextInput value={pw} onChangeText={setPw} secureTextEntry style={inp} />
        {!!err && <Text style={{ color: C.red, marginTop: 10 }}>{err}</Text>}
        <View style={{ height: 16 }} />
        <Button title="Sign in" onPress={() => go(email.trim(), pw)} />
      </Card>
      <Text style={{ color: '#9FB0CC', marginTop: 22, marginBottom: 8 }}>Open directly as</Text>
      {demoForemen.map((f) => (
        <Pressable key={f.id} onPress={() => onLogin(f)} style={{ backgroundColor: '#ffffff14', borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{f.name}</Text>
          <Text style={{ color: '#9FB0CC' }}>{f.site} · {f.city}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
const inp = { borderWidth: 1, borderColor: '#CBD3DF', borderRadius: 10, padding: 12, fontSize: 16, color: C.ink };

export function Home({ user, online, setOnline, pending, syncing, history, go, onLogout }) {
  const Tile = ({ icon, title, sub, to, badge }) => (
    <Pressable onPress={() => go(to)} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.line, minHeight: 124 }}>
      <Text style={{ fontSize: 30 }}>{icon}</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 8 }}>{title}</Text>
      <Text style={{ color: C.mute, fontSize: 12.5, marginTop: 2 }}>{sub}</Text>
      {!!badge && <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: C.yellow, borderRadius: 10, paddingHorizontal: 8 }}><Text style={{ fontWeight: '800', color: C.navy }}>{badge}</Text></View>}
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.navy, paddingTop: 52, paddingBottom: 22, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#9FB0CC' }}>Good day, {user.name.split(' ')[0]}</Text>
          <Pressable onPress={onLogout}><Text style={{ color: '#9FB0CC' }}>Sign out</Text></Pressable>
        </View>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 }}>{user.site}</Text>
        <Text style={{ color: '#C5D0E4' }}>{user.city} · {new Date('2026-10-01').toDateString()}</Text>
      </View>
      <Screen>
        <Card style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: online ? '#E3F6EC' : '#FFF3D6', borderColor: online ? '#BFE8D2' : '#F3DC9B' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: C.ink }}>{syncing ? 'Syncing to HQ…' : online ? 'Connected' : 'No network: saving on this phone'}</Text>
            <Text style={{ color: C.mute, fontSize: 12.5 }}>{pending} record{pending === 1 ? '' : 's'} waiting to sync · demo switch</Text>
          </View>
          <Switch value={online} onValueChange={setOnline} trackColor={{ true: C.green }} />
        </Card>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <Tile icon="👷" title="Check in workers" sub="Daily headcount and photo" to="attendance" />
          <Tile icon="📦" title="Log a delivery" sub="Compare with the order" to="delivery" />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <Tile icon="🔄" title="Sync status" sub="Pending and sent records" to="sync" badge={pending || null} />
          <View style={{ flex: 1 }} />
        </View>
        <Label>Recently sent to HQ</Label>
        {history.length === 0 && <Text style={{ color: C.mute }}>Nothing sent yet. Your first log will appear here.</Text>}
        {history.slice(0, 4).map((h) => <Row key={h.id} item={h} />)}
      </Screen>
    </View>
  );
}

const Row = ({ item, pending }) => (
  <Card style={{ marginBottom: 10, borderLeftWidth: 4, borderLeftColor: item.flagged ? C.red : pending ? C.yellow : C.green }}>
    <Text style={{ fontWeight: '700', color: C.ink }}>{item.title}</Text>
    <Text style={{ color: C.mute, marginTop: 2 }}>{item.detail}</Text>
    {item.flagged && <Text style={{ color: C.red, marginTop: 4, fontWeight: '600' }}>Flagged to HQ: short delivery</Text>}
  </Card>
);

export function Attendance({ user, back, save }) {
  const [n, setN] = useState(46);
  const [photo, setPhoto] = useState(null);
  return (
    <View style={{ flex: 1 }}>
      <Back onPress={back} title="Check in workers" />
      <Screen>
        <Card>
          <Label>Workers present today</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
            <Pressable onPress={() => setN(Math.max(0, n - 1))} style={step}><Text style={stepT}>−</Text></Pressable>
            <Text style={{ fontSize: 56, fontWeight: '800', color: C.ink }}>{n}</Text>
            <Pressable onPress={() => setN(n + 1)} style={step}><Text style={stepT}>+</Text></Pressable>
          </View>
          <Label>Wage per worker</Label><Text style={{ fontSize: 16, color: C.ink }}>{fmt(user.rate)}</Text>
          <Label>Total wages for today</Label><Text style={{ fontSize: 22, fontWeight: '800', color: C.navy }}>{fmt(n * user.rate)}</Text>
          <Label>Group photo of the workers on site (required)</Label>
          <PhotoBox uri={photo} label="Take group photo" onPress={async () => { const p = await takePhoto(); if (p) setPhoto(p); }} />
        </Card>
        <View style={{ height: 16 }} />
        <Button title="Save attendance" disabled={!photo || n === 0} onPress={() => save({ title: `Attendance: ${n} workers`, detail: `${fmt(n * user.rate)} wages · photo attached`, type: 'attendance', payload: { n, rate: user.rate } })} />
      </Screen>
    </View>
  );
}
const step = { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8ECF2', alignItems: 'center', justifyContent: 'center' };
const stepT = { fontSize: 30, color: C.navy, fontWeight: '700' };

export function Delivery({ back, save }) {
  const [order, setOrder] = useState(openOrders[0]);
  const [qty, setQty] = useState('');
  const [photo, setPhoto] = useState(null);
  const got = parseInt(qty || '0', 10);
  const short = qty !== '' && got < order.ordered;
  return (
    <View style={{ flex: 1 }}>
      <Back onPress={back} title="Log a delivery" />
      <Screen>
        <Label>Open order</Label>
        {openOrders.map((o) => (
          <Pressable key={o.id} onPress={() => setOrder(o)} style={{ padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: '#fff', borderWidth: 2, borderColor: order.id === o.id ? C.yellow : C.line }}>
            <Text style={{ fontWeight: '700', color: C.ink }}>{o.material}</Text>
            <Text style={{ color: C.mute }}>{o.supplier} · ordered {o.ordered}</Text>
          </Pressable>
        ))}
        <Label>Quantity actually received</Label>
        <TextInput value={qty} onChangeText={(t) => setQty(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder={`Ordered: ${order.ordered}`} style={[inp, { backgroundColor: '#fff', fontSize: 22 }]} />
        {short && (
          <View style={{ backgroundColor: '#FBE5E5', borderRadius: 10, padding: 12, marginTop: 10 }}>
            <Text style={{ color: '#B02A2A', fontWeight: '700' }}>{order.ordered - got} short of the order</Text>
            <Text style={{ color: '#B02A2A' }}>HQ will be alerted as soon as this syncs. Photograph the delivery note as proof.</Text>
          </View>
        )}
        <Label>Photo of the delivery note (required)</Label>
        <PhotoBox uri={photo} label="Photograph delivery note" onPress={async () => { const p = await takePhoto(); if (p) setPhoto(p); }} />
        <View style={{ height: 16 }} />
        <Button title="Save delivery" disabled={!photo || qty === ''} onPress={() => save({ title: `${order.material}`, detail: `${got} received of ${order.ordered} ordered · ${order.supplier}`, type: 'delivery', flagged: short, payload: { order: order.id, got } })} />
      </Screen>
    </View>
  );
}

export function Sync({ back, queue, history, online, syncing }) {
  return (
    <View style={{ flex: 1 }}>
      <Back onPress={back} title="Sync status" />
      <Screen>
        <Card style={{ backgroundColor: online ? '#E3F6EC' : '#FFF3D6' }}>
          <Text style={{ fontWeight: '700', color: C.ink }}>{syncing ? 'Sending records to HQ…' : online ? 'Everything is up to date' : 'Waiting for network'}</Text>
          <Text style={{ color: C.mute }}>Records are stored safely on this phone and sent automatically when a signal returns.</Text>
        </Card>
        <Label>Waiting to send ({queue.length})</Label>
        {queue.length === 0 && <Text style={{ color: C.mute }}>No records are waiting.</Text>}
        {queue.map((q) => <Row key={q.id} item={q} pending />)}
        <Label>Sent ({history.length})</Label>
        {history.map((h) => <Row key={h.id} item={h} />)}
      </Screen>
    </View>
  );
}
