import { useMemo, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { Txt } from './Txt';
import { FONT } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { SetScore } from '@/types';

/** Colori delle due linee, validati per daltonismo e contrasto sullo sfondo della card (chiaro e scuro) */
export const SERIES = {
  dark: { us: '#FFD503', opp: '#5AA2F0' },
  light: { us: '#B8860B', opp: '#115BAB' },
} as const;

const H = 190;
const PAD = { l: 26, r: 34, t: 10, b: 22 };

/**
 * Andamento del punteggio di un set: punto dopo punto (asse x = punti giocati), una linea per squadra.
 * points[i] = punteggio dopo i punti giocati (points[0] = 0–0); i buchi nella cronaca restano interpolati.
 */
export function ScoreChart({ points, names, target }: { points: SetScore[]; names: { us: string; opp: string }; target: number }) {
  const { c, mode } = useTheme();
  const col = SERIES[mode === 'dark' ? 'dark' : 'light'];
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  const last = points[points.length - 1] ?? { our: 0, opp: 0 };
  const maxX = Math.max(points.length - 1, 1);
  const maxY = Math.max(target, last.our, last.opp);
  const plotW = Math.max(w - PAD.l - PAD.r, 1);
  const plotH = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (i / maxX) * plotW;
  const y = (v: number) => PAD.t + plotH - (v / maxY) * plotH;

  const lines = useMemo(() => ({
    us: points.map((p, i) => `${x(i)},${y(p.our)}`).join(' '),
    opp: points.map((p, i) => `${x(i)},${y(p.opp)}`).join(' '),
  }), [points, w, maxY]); // eslint-disable-line react-hooks/exhaustive-deps

  const ticks = Array.from({ length: Math.floor(maxY / 5) + 1 }, (_, i) => i * 5);
  const xTicks = Array.from({ length: Math.floor(maxX / 10) + 1 }, (_, i) => i * 10);

  // tocco o trascinamento: si legge il punteggio del punto più vicino
  const pick = (e: GestureResponderEvent) => {
    const i = Math.round(((e.nativeEvent.locationX - PAD.l) / plotW) * maxX);
    setHover(Math.min(Math.max(i, 0), points.length - 1));
  };
  const h = hover != null ? points[hover] : null;
  const label = (v: number, other: number) => (Math.abs(y(v) - y(other)) < 12 ? (v >= other ? -6 : 6) : 0);

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
        {(['us', 'opp'] as const).map((s) => (
          <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: col[s] }} />
            <Txt size={12} color="muted" numberOfLines={1} style={{ flexShrink: 1 }}>{names[s]}</Txt>
          </View>
        ))}
      </View>

      <View style={{ minHeight: 18, alignItems: 'center' }}>
        <Txt w={600} size={12} color={h ? 'text' : 'muted'} tnum>
          {h && hover != null ? `Punto ${hover}: ${h.our}–${h.opp}` : 'Tocca il grafico per leggere il punteggio'}
        </Txt>
      </View>

      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H }}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
        onResponderGrant={pick} onResponderMove={pick} onResponderRelease={() => setHover(null)} onResponderTerminate={() => setHover(null)}
        accessible accessibilityLabel={`Andamento del set: ${names.us} ${last.our}, ${names.opp} ${last.opp}`}>
        {w > 0 ? (
          <Svg width={w} height={H} pointerEvents="none">
            {ticks.map((t) => (
              <Line key={t} x1={PAD.l} x2={PAD.l + plotW} y1={y(t)} y2={y(t)} stroke={c.line} strokeWidth={1} />
            ))}
            {ticks.map((t) => (
              <SvgText key={`l${t}`} x={PAD.l - 6} y={y(t) + 3.5} fontSize={10} fontFamily={FONT[400]} fill={c.muted} textAnchor="end">{t}</SvgText>
            ))}
            {xTicks.map((t) => (
              <SvgText key={`x${t}`} x={x(t)} y={H - 6} fontSize={10} fontFamily={FONT[400]} fill={c.muted} textAnchor="middle">{t}</SvgText>
            ))}
            {h && hover != null ? <Line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + plotH} stroke={c.lineStrong} strokeWidth={1} /> : null}
            <Polyline points={lines.opp} fill="none" stroke={col.opp} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <Polyline points={lines.us} fill="none" stroke={col.us} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {h && hover != null ? (
              <>
                <Circle cx={x(hover)} cy={y(h.opp)} r={4.5} fill={col.opp} stroke={c.card} strokeWidth={2} />
                <Circle cx={x(hover)} cy={y(h.our)} r={4.5} fill={col.us} stroke={c.card} strokeWidth={2} />
              </>
            ) : null}
            {/* etichette dirette: punteggio finale in fondo a ogni linea */}
            <SvgText x={x(points.length - 1) + 6} y={y(last.our) + 4 + label(last.our, last.opp)} fontSize={11} fontFamily={FONT[700]} fill={c.text}>{last.our}</SvgText>
            <SvgText x={x(points.length - 1) + 6} y={y(last.opp) + 4 + label(last.opp, last.our)} fontSize={11} fontFamily={FONT[700]} fill={c.muted}>{last.opp}</SvgText>
          </Svg>
        ) : null}
      </View>
      <Txt size={11} color="muted" center>Punti giocati nel set</Txt>
    </View>
  );
}
