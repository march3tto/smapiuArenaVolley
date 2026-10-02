// Tabellone: noi a sinistra, avversario a destra, set vinti al centro
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { TeamBadge } from './ui';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { NOSTRA_SIGLA, NOSTRA_SQUADRA, sigla } from '../lib/format';
import type { Partita } from '../lib/types';
import type { Battuta } from '../lib/useLivePartita';

type Props = {
  partita: Partita;
  punteggio: { set: number | null; nostri: number; avversario: number };
  // true nel tab Live: punteggio del set in grande, set vinti sotto
  grande?: boolean;
  // chi è al servizio, mostrato solo nel tabellone grande
  battuta?: Battuta | null;
};

export default function Scoreboard({ partita, punteggio, grande = false, battuta = null }: Props) {
  const inCasa = partita.casa_trasferta === 'casa';
  const setNostri = partita.nostri_set_vinti ?? 0;
  const setLoro = partita.set_vinti_avversario ?? 0;

  return (
    <View style={styles.row}>
      <Team
        nome={NOSTRA_SQUADRA}
        siglaSquadra={NOSTRA_SIGLA}
        logoUrl={partita.logo_smapiuarenavolley_url}
        ours
        sottotitolo={inCasa ? 'Casa' : 'Ospite'}
        inBattuta={grande && battuta === 'noi'}
      />

      {grande ? (
        <View style={styles.center}>
          {punteggio.set ? (
            <Text style={styles.setLabel}>
              SET {punteggio.set} ({setNostri}-{setLoro})
            </Text>
          ) : null}
          <Text style={styles.bigScore}>
            {punteggio.nostri}
            <Text style={styles.colon}> : </Text>
            {punteggio.avversario}
          </Text>
          <Text style={styles.setsLine}>
            Set: <Text style={styles.setsOurs}>{setNostri}</Text> - {setLoro}
          </Text>
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={styles.setsScore}>
            {setNostri}
            <Text style={styles.colon}> : </Text>
            {setLoro}
          </Text>
          {punteggio.set ? (
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                Set {punteggio.set}: {punteggio.nostri} - {punteggio.avversario}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      <Team
        nome={partita.avversario}
        siglaSquadra={sigla(partita.avversario)}
        logoUrl={partita.logo_avversario_url}
        sottotitolo={inCasa ? 'Ospite' : 'Casa'}
        inBattuta={grande && battuta === 'avversario'}
      />
    </View>
  );
}

type TeamProps = {
  nome: string;
  siglaSquadra: string;
  sottotitolo: string;
  ours?: boolean;
  logoUrl?: string | null;
  inBattuta?: boolean;
};

function Team({ nome, siglaSquadra, sottotitolo, ours = false, logoUrl, inBattuta = false }: TeamProps) {
  return (
    <View style={styles.team}>
      <TeamBadge label={siglaSquadra} ours={ours} logoUrl={logoUrl} />
      <Text style={styles.teamName} numberOfLines={2}>
        {nome}
      </Text>
      {inBattuta ? (
        <Text style={[styles.serving, { color: ours ? colors.yellow : colors.muted }]}>
          <MaterialCommunityIcons name="volleyball" size={10} /> In Battuta
        </Text>
      ) : (
        <Text style={styles.teamSub}>{sottotitolo}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  team: { flex: 1, alignItems: 'center', gap: 6 },
  teamName: { color: colors.text, fontFamily: fonts.display, fontSize: 12, textAlign: 'center' },
  teamSub: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
  serving: { fontFamily: fonts.display, fontSize: 10 },
  center: { flex: 1, alignItems: 'center', gap: 4 },
  setsScore: { color: colors.text, fontFamily: fonts.display, fontSize: 34 },
  bigScore: { color: colors.text, fontFamily: fonts.display, fontSize: 44, fontVariant: ['tabular-nums'] },
  colon: { color: colors.yellow, fontFamily: fonts.displaySemi },
  pill: {
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(242,184,0,0.3)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { color: colors.yellow, fontFamily: fonts.display, fontSize: 11, fontVariant: ['tabular-nums'] },
  setLabel: { color: colors.muted, fontFamily: fonts.display, fontSize: 10, letterSpacing: 1.5 },
  setsLine: { color: colors.textSoft, fontFamily: fonts.body, fontSize: 11 },
  setsOurs: { color: colors.amber, fontFamily: fonts.display },
});
