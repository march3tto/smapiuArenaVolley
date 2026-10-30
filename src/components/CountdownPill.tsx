import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Volleyball } from 'lucide-react-native';
import { Txt } from './Txt';
import { palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/** Finestra dell'anello: si parte a riempirlo 7 giorni prima della partita */
const RING_WINDOW = 7 * 86400 * 1000;
const SIZE = 29;
const STROKE = 2.5;
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
 * Conto alla rovescia all'inizio della partita: pallone e caselle giorni / ore / minuti (giorni sempre visibili, anche a 0).
 * L'anello attorno al pallone si riempie man mano che la partita si avvicina:
 * progresso = 1 - rimanente / 7 giorni, limitato tra 0 e 1 (vuoto oltre la settimana, pieno al fischio d'inizio).
 * Sparisce a partita iniziata.
 */
export function CountdownPill({ date }: { date: string }) {
  const { mode } = useTheme();
  const now = useMinuteClock();
  // anello, pallone e testo gialli sul tema scuro, blu notte sul tema chiaro (il giallo lì non si legge)
  const ink = mode === 'dark' ? palette.gold : palette.onGold;
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
      style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.sm }}
      accessibilityLabel={`Mancano ${d} giorni, ${h} ore, ${min} minuti`}
    >
      <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        {/* anello di avvicinamento: parte da ore 12 e gira in senso orario */}
        <Svg width={SIZE} height={SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={ink} strokeOpacity={0.2} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={ink}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${CIRC} ${CIRC}`}
            strokeDashoffset={CIRC * (1 - progress)}
            fill="none"
          />
        </Svg>
        <Volleyball size={13} color={ink} strokeWidth={2.2} />
      </View>
      <Txt w={400} size={15} color={ink} style={{ opacity: 0.55, transform: [{ skewX: '-8deg' }] }}>/</Txt>
      <View style={{ flexDirection: 'row', gap: space.xs }}>
        <TimeBox value={String(d)} label="Giorni" ink={ink} />
        <TimeBox value={pad(h)} label="Ore" ink={ink} />
        <TimeBox value={pad(min)} label="Minuti" ink={ink} />
      </View>
    </View>
  );
}

/** Casella del countdown: numero grande e unità in maiuscoletto sotto */
function TimeBox({ value, label, ink }: { value: string; label: string; ink: string }) {
  const { c } = useTheme();
  return (
    <View style={{ minWidth: 35, alignItems: 'center', paddingVertical: space.xs, paddingHorizontal: space.xs, borderRadius: 7.5, backgroundColor: c.fill2 }}>
      <Txt w={800} size={11.5} display={false} color={ink} tnum style={{ lineHeight: 13.5 }}>{value}</Txt>
      <Txt w={700} size={6.75} color="muted" style={{ letterSpacing: 0.45, lineHeight: 8.5 }}>{label.toUpperCase()}</Txt>
    </View>
  );
}
