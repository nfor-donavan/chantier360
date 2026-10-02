import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Attendance, Delivery, Home, Login, Sync } from './src/screens';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; // client-side id so retries never duplicate

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('home');
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { (async () => {
    try {
      const q = await AsyncStorage.getItem('c360_queue'); const h = await AsyncStorage.getItem('c360_history');
      if (q) setQueue(JSON.parse(q)); if (h) setHistory(JSON.parse(h));
    } catch {}
  })(); }, []);
  useEffect(() => { AsyncStorage.setItem('c360_queue', JSON.stringify(queue)).catch(() => {}); }, [queue]);
  useEffect(() => { AsyncStorage.setItem('c360_history', JSON.stringify(history)).catch(() => {}); }, [history]);

  // Automatic flush when the network is back (simulated for the demo; production posts to the Express API).
  useEffect(() => {
    if (!online || queue.length === 0 || syncing) return;
    setSyncing(true);
    const t = setTimeout(() => {
      setHistory((h) => [...queue.map((q) => ({ ...q, syncedAt: new Date().toISOString() })), ...h]);
      setQueue([]); setSyncing(false);
    }, 1800);
    return () => { clearTimeout(t); setSyncing(false); };
  }, [online, queue]);

  const save = useCallback((item) => {
    setQueue((q) => [{ id: uid(), createdAt: new Date().toISOString(), ...item }, ...q]);
    setScreen('home');
    Alert.alert('Saved on this phone', online ? 'Sending to HQ now.' : 'No network. It will be sent automatically when you are back online.');
  }, [online]);

  if (!user) return <><StatusBar style="light" /><Login onLogin={setUser} /></>;
  const back = () => setScreen('home');
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      {screen === 'home' && <Home user={user} online={online} setOnline={setOnline} pending={queue.length} syncing={syncing} history={history} go={setScreen} onLogout={() => setUser(null)} />}
      {screen === 'attendance' && <Attendance user={user} back={back} save={save} />}
      {screen === 'delivery' && <Delivery back={back} save={save} />}
      {screen === 'sync' && <Sync back={back} queue={queue} history={history} online={online} syncing={syncing} />}
    </View>
  );
}
