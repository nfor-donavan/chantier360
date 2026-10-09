import React from 'react';
import { Pressable, Text, View, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from './ctx';

export const Button = ({ title, onPress, kind = 'primary', disabled }) => {
  const { C } = useApp();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => ({ backgroundColor: kind === 'ghost' ? C.card : C.yellow, borderWidth: kind === 'ghost' ? 1 : 0, borderColor: C.line, borderRadius: 12, paddingVertical: 15, alignItems: 'center', opacity: disabled ? 0.45 : pressed ? 0.8 : 1 })}>
      <Text style={{ color: kind === 'ghost' ? C.ink : '#0F1E38', fontWeight: '700', fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
};
export const Card = ({ children, style }) => {
  const { C } = useApp();
  return <View style={[{ backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.line }, style]}>{children}</View>;
};
export const Label = ({ children }) => {
  const { C } = useApp();
  return <Text style={{ color: C.mute, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 }}>{children}</Text>;
};

// Returns { uri }, { denied }, { error } or null when cancelled.
export async function takePhoto() {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { denied: true };
    const r = await ImagePicker.launchCameraAsync({ quality: 0.4 }); // compressed for weak networks
    return r.canceled ? null : { uri: r.assets[0].uri };
  } catch (e) {
    // The camera app could not open: let the foreman pick a photo from the gallery instead.
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.4 });
      return r.canceled ? null : { uri: r.assets[0].uri };
    } catch { return { error: String((e && e.message) || e) }; }
  }
}
export const PhotoBox = ({ uri, onPress, label }) => {
  const { C, t } = useApp();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ height: 120, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.dash, alignItems: 'center', justifyContent: 'center', backgroundColor: C.soft }}>
      {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%', borderRadius: 10 }} /> : <Text style={{ color: C.mute, fontWeight: '600' }}>📷  {label}</Text>}
    </Pressable>
  );
};

// Several photos in a row, with an add button.
export const PhotoStrip = ({ uris, onAdd, onRemove, max = 3, label }) => {
  const { C } = useApp();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {uris.map((u, i) => (
        <Pressable key={u + i} onPress={() => onRemove(i)} accessibilityLabel="Remove photo">
          <Image source={{ uri: u }} style={{ width: 84, height: 84, borderRadius: 10 }} />
          <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#000a', borderRadius: 10, paddingHorizontal: 6 }}><Text style={{ color: '#fff', fontSize: 12 }}>✕</Text></View>
        </Pressable>
      ))}
      {uris.length < max && (
        <Pressable onPress={onAdd} style={{ width: 84, height: 84, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.dash, alignItems: 'center', justifyContent: 'center', backgroundColor: C.soft }}>
          <Text style={{ fontSize: 22 }}>📷</Text><Text style={{ color: C.mute, fontSize: 11, textAlign: 'center' }}>{label}</Text>
        </Pressable>
      )}
    </View>
  );
};
