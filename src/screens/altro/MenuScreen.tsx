import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Card, ScreenTitle } from '../../components/ui';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { AltroStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AltroStackParamList, 'Menu'>;

const VOCI: {
  route: Exclude<keyof AltroStackParamList, 'Menu'>;
  titolo: string;
  sottotitolo: string;
  icona: keyof typeof Ionicons.glyphMap;
}[] = [
  { route: 'Media', titolo: 'Podcast & Video', sottotitolo: 'Highlights, interviste e dirette', icona: 'play-circle' },
  { route: 'Giovanili', titolo: 'Settore giovanile', sottotitolo: 'Categorie e allenatori', icona: 'people-circle' },
];

export default function MenuScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.screen}>
      <ScreenTitle title="ALTRO" />
      {VOCI.map((v) => (
        <Pressable key={v.route} onPress={() => navigation.navigate(v.route)} accessibilityRole="button">
          <Card style={styles.row}>
            <View style={styles.icon}>
              <Ionicons name={v.icona} size={22} color={colors.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{v.titolo}</Text>
              <Text style={styles.sub}>{v.sottotitolo}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 14 },
  sub: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
});
