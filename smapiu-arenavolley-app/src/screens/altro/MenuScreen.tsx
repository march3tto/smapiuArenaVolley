import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors';
import type { AltroStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AltroStackParamList, 'Menu'>;

function Row({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={17} color={colors.navy} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

export default function MenuScreen() {
  const navigation = useNavigation<Nav>();

  // TODO: le voci "Società" e "Sponsor" restano da collegare a
  // schermate reali quando i relativi contenuti saranno pronti.
  const notReady = () =>
    Alert.alert('In arrivo', 'Questa sezione non è ancora collegata ai dati.');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, gap: 20 }}>
      <View>
        <Text style={styles.section}>SQUADRA</Text>
        <View style={styles.group}>
          <Row
            icon="people-outline"
            label="Rosa giocatrici"
            onPress={() => navigation.navigate('Rosa')}
          />
        </View>
      </View>

      <View>
        <Text style={styles.section}>SOCIETÀ</Text>
        <View style={styles.group}>
          <Row icon="home-outline" label="Chi siamo" onPress={notReady} />
          <Row icon="person-outline" label="Staff tecnico e dirigenziale" onPress={notReady} />
          <Row icon="location-outline" label="Contatti e sede di gioco" onPress={notReady} />
        </View>
      </View>

      <View>
        <Text style={styles.section}>SPONSOR</Text>
        <View style={styles.group}>
          <Row icon="ribbon-outline" label="I nostri sponsor" onPress={notReady} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  section: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 8, letterSpacing: 0.3 },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink },
});
