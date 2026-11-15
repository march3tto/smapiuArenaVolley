import { useMemo } from 'react';
import { LiveTicker, type TickerSegment } from './LiveTicker';
import { useAgentScores } from '@/hooks/useAgentScores';
import { useScoreHidden } from '@/store/PlayerProvider';

/**
 * Striscia BORDO CAMPO con i punteggi dell'agente livescore, coi nomi delle squadre
 * (es. "Zero5 Castellana Grotte 4-1 V&V Modena · 2° set (1-0)"): la nostra per prima e in grassetto,
 * poi il resto del girone; tra una partita e l'altra un pallino con spazio intorno.
 * Sta in cima alla home e compare solo mentre l'agente segue la giornata di campionato in corso.
 * Con il video della diretta aperto si nasconde, come il punteggio (niente spoiler).
 */
export function AgentScoresTicker() {
  const hidden = useScoreHidden();
  const { scores } = useAgentScores();
  const segments = useMemo<TickerSegment[]>(() => scores.map((s) => ({ text: s.text, strong: s.ours })), [scores]);
  if (hidden || !segments.length) return null;
  // `text` serve alla lettura vocale (accessibilità)
  return <LiveTicker label="BORDO CAMPO" text={segments.map((s) => s.text).join('. ')} segments={segments} />;
}
