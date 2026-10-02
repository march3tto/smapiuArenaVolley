import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

export const HEADER_HEIGHT = 60;

type Props = {
  // presente solo nelle schermate di dettaglio (Media, Giovanili)
  onBack?: () => void;
};

// header unico per tutte le schermate: stemma Arena + badge Smapiù B1
export default function AppHeader({ onBack }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Indietro"
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
        ) : null}
        <View style={styles.emblem}>
          <Image
            source={require('../../assets/brand/logo-arena.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
        <View style={styles.sponsor}>
          <View style={styles.sponsorRow}>
            <Text style={styles.sponsorName}>SMAPIÙ</Text>
            <Text style={styles.league}>B1</Text>
          </View>
          <Text style={styles.team} numberOfLines={1}>
            Arena Volley Team
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(242,184,0,0.3)',
  },
  row: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  back: { marginLeft: -6 },
  emblem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.yellow,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 40, height: 40, borderRadius: 20 },
  sponsor: { flexShrink: 1, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sponsorName: { color: colors.amber, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1.2 },
  league: {
    backgroundColor: colors.yellow,
    color: colors.navy,
    fontFamily: fonts.display,
    fontSize: 9,
    paddingHorizontal: 4,
    borderRadius: 3,
    overflow: 'hidden',
  },
  team: { color: colors.textSoft, fontFamily: fonts.bodySemi, fontSize: 11 },
});
