import { View } from 'react-native';
import { Txt } from './Txt';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { PlayerRole } from '@/types';

type Zone = 1 | 2 | 3 | 4 | 5 | 6;

/** Giallo chiaro pieno: un giallo trasparente sul campo blu verrebbe verdastro */
const SOFT = '#FBE3A0';

/** Zone della propria metà campo viste da dietro: rete in alto, prima linea 4-3-2, seconda linea 5-6-1 */
const ROWS: Zone[][] = [[4, 3, 2], [5, 6, 1]];

/** Zone principali (piene) e secondarie (tenui) per ruolo, con una riga di spiegazione */
const ROLE_ZONES: Record<PlayerRole, { main: Zone[]; also: Zone[]; text: string }> = {
  palleggiatrice: { main: [2], also: [1], text: 'Alza a rete tra zona 2 e 3, entrando anche dalla seconda linea.' },
  opposto: { main: [2, 1], also: [], text: 'Attacca dalla destra, in prima linea (zona 2) e da dietro (zona 1).' },
  schiacciatrice: { main: [4], also: [5, 6], text: 'Attacca da posto 4 e riceve in seconda linea.' },
  centrale: { main: [3], also: [], text: 'Attacca al centro della rete e guida il muro.' },
  libero: { main: [5, 6], also: [1], text: 'Gioca solo in seconda linea: ricezione e difesa.' },
};

/** Metà campo stilizzata con le zone del ruolo evidenziate */
export function CourtPosition({ role, size = 168 }: { role: PlayerRole; size?: number }) {
  const { c } = useTheme();
  const { main, also, text } = ROLE_ZONES[role];
  const court = palette.blueDeep;
  const lineColor = 'rgba(255,255,255,0.9)';
  // il campo è 9x9 m: la linea dei 3 metri divide prima linea (1/3) e seconda linea (2/3)
  const front = size / 3;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <View accessibilityLabel={`Zone in campo: ${[...main, ...also].join(', ')}`}>
        {/* rete */}
        <View style={{ height: 6, marginHorizontal: -6, borderRadius: 3, backgroundColor: c.text, opacity: 0.85 }} />
        <View style={{ width: size, height: size, backgroundColor: court, borderWidth: 2, borderTopWidth: 0, borderColor: lineColor }}>
          {ROWS.map((row, r) => (
            <View key={r} style={{ flexDirection: 'row', height: r === 0 ? front : size - front, borderTopWidth: r ? 2 : 0, borderTopColor: lineColor }}>
              {row.map((z) => {
                const on = main.includes(z);
                const soft = also.includes(z);
                return (
                  <View key={z} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? palette.gold : soft ? SOFT : 'transparent' }}>
                    <Txt w={800} size={on ? 18 : 14} color={on || soft ? palette.onGold : 'rgba(255,255,255,0.85)'}>{z}</Txt>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Txt w={600} size={14} style={{ lineHeight: 20 }}>{text}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: palette.gold }} />
          <Txt size={12} color="muted">Zona principale</Txt>
        </View>
        {also.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: SOFT }} />
            <Txt size={12} color="muted">Zona secondaria</Txt>
          </View>
        ) : null}
      </View>
    </View>
  );
}
