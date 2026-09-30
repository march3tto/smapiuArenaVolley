import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

export const HEADER_HEIGHT = 60;

type Props = {
  // presente solo nelle schermate di dettaglio (Diretta, Rosa)
  onBack?: () => void;
};

// header unico per tutte le schermate: stessa altezza e stesso contenuto ovunque
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
            <Ionicons name="chevron-back" size={26} color={colors.onBrand} />
          </Pressable>
        ) : null}
        <Image
          source={require('../../assets/brand/logo-arena.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          Smapiù <Text style={styles.titleAccent}>ArenaVolleyTeam</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.brand },
  row: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  back: { marginLeft: -6 },
  logo: { width: 44, height: 44 },
  title: { flexShrink: 1, color: colors.onBrand, fontFamily: fonts.display, fontSize: 19 },
  titleAccent: { color: colors.accent },
});
