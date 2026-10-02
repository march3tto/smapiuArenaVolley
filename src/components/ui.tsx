// Mattoncini grafici condivisi: pannelli, chip filtro, badge squadra, pallino live
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  type ViewProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

// pannello "vetro" blu con bordo oro
export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

type ChipProps = { label: string; active: boolean; onPress: () => void };

export function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

type ChipRowProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
};

export function ChipRow<T extends string>({ options, value, onChange }: ChipRowProps<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} active={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </ScrollView>
  );
}

// titolo di schermata con sottotitolo opzionale e linea di separazione
export function ScreenTitle({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.screenTitle}>
      <View style={styles.screenTitleRow}>
        {icon ? <Ionicons name={icon} size={20} color={colors.yellow} /> : null}
        <Text style={styles.screenTitleText}>{title}</Text>
      </View>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
    </View>
  );
}

// intestazione piccola in giallo maiuscolo dentro i pannelli
export function PanelLabel({ icon, children }: { icon?: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View style={styles.panelLabelRow}>
      {icon ? <Ionicons name={icon} size={13} color={colors.amber} /> : null}
      <Text style={styles.panelLabel}>{children}</Text>
    </View>
  );
}

type TeamBadgeProps = { label: string; ours?: boolean; size?: number; logoUrl?: string | null };

// riquadro con la sigla della squadra (AVT, VIC, ...)
export function TeamBadge({ label, ours = false, size = 64, logoUrl }: TeamBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size * 0.25, borderWidth: size > 40 ? 2 : 1 },
        ours ? styles.badgeOurs : styles.badgeTheirs,
      ]}
    >
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.badgeLogo} resizeMode="contain" accessibilityLabel={label} />
      ) : (
        <Text style={[styles.badgeText, { fontSize: size * 0.3 }, { color: ours ? colors.yellow : colors.textSoft }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

// pallino giallo pulsante degli elementi in diretta
export function LiveDot({ size = 8 }: { size?: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const dot = { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.yellow };
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={[
          dot,
          StyleSheet.absoluteFill,
          {
            opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
          },
        ]}
      />
      <View style={dot} />
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.yellow} />
    </View>
  );
}

export function Message({ error, empty }: { error?: string | null; empty: string }) {
  return (
    <Text style={error ? styles.error : styles.muted}>
      {error ? `Errore nel caricamento: ${error}` : empty}
    </Text>
  );
}

export const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy },
  muted: { color: colors.muted, fontSize: 12, fontFamily: fonts.body },
  error: { color: colors.loss, fontSize: 13, fontFamily: fonts.body },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
    padding: 16,
  },
  chipRow: { gap: 6 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.chip },
  chipActive: { backgroundColor: colors.yellow },
  chipText: { color: colors.textSoft, fontSize: 12, fontFamily: fonts.bodySemi },
  chipTextActive: { color: colors.navy, fontFamily: fonts.display },
  screenTitle: { gap: 2, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  screenTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  screenTitleText: { color: colors.text, fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.3 },
  panelLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  panelLabel: {
    color: colors.amber,
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  badge: { alignItems: 'center', justifyContent: 'center' },
  badgeOurs: { backgroundColor: colors.darkblue, borderColor: colors.yellow },
  badgeTheirs: { backgroundColor: colors.opponent, borderColor: colors.opponentBorder },
  badgeText: { fontFamily: fonts.display },
  badgeLogo: { width: '80%', height: '80%' },
});
