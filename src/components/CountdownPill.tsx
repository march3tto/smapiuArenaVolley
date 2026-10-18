import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Volleyball } from 'lucide-react-native';
import { Txt } from './Txt';
import { palette } from '@/theme/colors';

/** Finestra dell'anello: si parte a riempirlo 7 giorni prima della partita */
const RING_WINDOW = 7 * 86400 * 1000;
const SIZE = 34;
const STROKE = 3;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

/** Ora corrente aggiornata allo scoccare di ogni minuto */
function useMinuteClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const t = setTimeout(() => {
      setNow(Date.now());
      id = setInterval(() => setNow(Date.now()), 60000);
    }, 60000 - (Date.now() % 60000));
    return () => {
      clearTimeout(t);
      if (id) clearInterval(id);
    };
  }, []);
  return now;
}

/**
 * Conto alla rovescia all'inizio della partita: pillola gialla con pallone e tempo "1g 08h 32m".
 * L'anello attorno al pallone si riempie man mano che la partita si avvicina:
 * progresso = 1 - rimanente / 7 giorni, limitato tra 0 e 1 (vuoto oltre la settimana, pieno al fischio d'inizio).
 * Sparisce a partita iniziata.
 */
export function CountdownPill({ date }: { date: string }) {
  const now = useMinuteClock();
  const leftMs = new Date(date).getTime() - now;
  if (leftMs <= 0) return null;
  const left = Math.floor(leftMs / 1000);
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const min = Math.floor((left % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  const progress = Math.min(1, Math.max(0, 1 - leftMs / RING_WINDOW));

  return (
    <View
      style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 3, paddingRight: 14, borderRadius: 999, backgroundColor: palette.gold }}
      accessibilityLabel={`Mancano ${d} giorni, ${h} ore, ${min} minuti`}
    >
      <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        {/* anello di avvicinamento: parte da ore 12 e gira in senso orario */}
        <Svg width={SIZE} height={SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={palette.onGold} strokeOpacity={0.18} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={palette.onGold}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${CIRC} ${CIRC}`}
            strokeDashoffset={CIRC * (1 - progress)}
            fill="none"
          />
        </Svg>
        <View style={{ width: SIZE - STROKE * 2 - 3, height: SIZE - STROKE * 2 - 3, borderRadius: 999, backgroundColor: palette.onGold, alignItems: 'center', justifyContent: 'center' }}>
          <Volleyball size={15} color={palette.gold} strokeWidth={2.2} />
        </View>
      </View>
      <Txt w={400} size={18} color={palette.onGold} style={{ opacity: 0.55, transform: [{ skewX: '-8deg' }] }}>/</Txt>
      <Txt w={800} size={15} display={false} color={palette.onGold} tnum numberOfLines={1}>
        {d > 0 ? `${d}g ` : ''}{pad(h)}h {pad(min)}m
      </Txt>
    </View>
  );
}
