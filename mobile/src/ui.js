import React from 'react';
import { Pressable, Text, View, StyleSheet, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { C } from './theme';

export const Button = ({ title, onPress, kind = 'primary', disabled, icon }) => (
  <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [s.btn, kind === 'ghost' && s.btnGhost, disabled && { opacity: 0.45 }, pressed && { opacity: 0.8 }]}>
    <Text style={[s.btnText, kind === 'ghost' && { color: C.navy }]}>{icon ? icon + '  ' : ''}{title}</Text>
  </Pressable>
);
export const Card = ({ children, style }) => <View style={[s.card, style]}>{children}</View>;
export const Label = ({ children }) => <Text style={s.label}>{children}</Text>;

export async function takePhoto() {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return 'demo://photo';
    const r = await ImagePicker.launchCameraAsync({ quality: 0.4 }); // compressed for weak networks
    return r.canceled ? null : r.assets[0].uri;
  } catch { return 'demo://photo'; }
}
export const PhotoBox = ({ uri, onPress, label }) => (
  <Pressable onPress={onPress} style={s.photo}>
    {uri && !uri.startsWith('demo://') ? <Image source={{ uri }} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
      : <Text style={{ color: uri ? C.green : C.mute, fontWeight: '600' }}>{uri ? '✓ Photo captured' : '📷  ' + label}</Text>}
  </Pressable>
);

export const s = StyleSheet.create({
  btn: { backgroundColor: C.yellow, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line },
  btnText: { color: C.navy, fontWeight: '700', fontSize: 16 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.line },
  label: { color: C.mute, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  photo: { height: 120, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B9C3D3', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F9FC' },
});
