import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { LiveTicker, type TickerSegment } from './LiveTicker';
import { useAgentScores } from '@/hooks/useAgentScores';
import { useScoreHidden } from '@/store/PlayerProvider';

/**
 * Striscia BORDO CAMPO con i punteggi dell'agente livescore, coi nomi delle squadre
 * (es. "Zero5 Castellana Grotte 4-1 V&V Modena · 2° set (1-0)"): la nostra per prima e in grassetto,
 * poi il resto del girone; tra una partita e l'altra un pallino con spazio intorno.
 * Sta in cima alla home e compare solo mentre l'agente segue la giornata di campionato in corso.
 * Con il video della diretta aperto si nasconde, come il punteggio (niente spoiler).
 * Toccandola si apre la giornata con tutte le sue partite.
 */
export function AgentScoresTicker() {
  const hidden = useScoreHidden();
  const router = useRouter();
  const { scores } = useAgentScores();
  // giornata della striscia: quella della nostra gara se c'è (è la prima), altrimenti della prima con la giornata nota
  const day = scores.find((s) => s.giornata != null && s.girone);
  const segments = useMemo<TickerSegment[]>(() => scores.map((s) => ({ text: s.text, strong: s.ours })), [scores]);
  if (hidden || !segments.length) return null;
  // `text` serve alla lettura vocale (accessibilità)
  const open = day ? () => router.push({ pathname: '/giornata/[numero]', params: { numero: String(day.giornata), girone: day.girone ?? '' } }) : undefined;
  return <LiveTicker label="BORDO CAMPO" text={segments.map((s) => s.text).join('. ')} segments={segments}
    onPress={open} hint={day ? `Apre la ${day.giornata}ª giornata con tutte le partite` : undefined} />;
}
