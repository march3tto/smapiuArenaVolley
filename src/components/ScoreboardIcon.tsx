import Svg, { G, Line, Rect, Text } from 'react-native-svg';

/** Cartellini del punteggio appena segnato: azzurro pieno con le cifre bianche */
const HIGHLIGHT = '#5DB4F0';

/**
 * Icona "Risultati": tabellone a cartellini 25-23 (anelli in alto, quattro cartellini, trattino), con i due di destra
 * evidenziati in azzurro e la matita che li segna. Stesse proprietà delle icone lucide della barra (size, color, strokeWidth),
 * su una griglia 24×24.
 */
export function ScoreboardIcon({ size = 24, color = 'currentColor', strokeWidth = 2 }: { size?: number; color?: string; strokeWidth?: number }) {
  // dettagli interni più sottili del contorno, altrimenti a dimensione di icona si impastano
  const frame = strokeWidth * 0.75;
  const inner = strokeWidth * 0.5;
  const tile = { y: 9.6, width: 3.4, height: 7.6, rx: 0.7 };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={1.5} y={6.2} width={21} height={13.6} rx={2} strokeWidth={frame} />
      {/* anelli */}
      <G strokeWidth={inner}>
        <Rect x={4.4} y={3.6} width={1.6} height={4.4} rx={0.8} />
        <Rect x={7.7} y={3.6} width={1.6} height={4.4} rx={0.8} />
        <Rect x={14.7} y={3.6} width={1.6} height={4.4} rx={0.8} />
        <Rect x={18} y={3.6} width={1.6} height={4.4} rx={0.8} />
      </G>
      {/* cartellini: 25 a sinistra, 23 a destra in azzurro */}
      <G strokeWidth={inner}>
        <Rect x={3.4} {...tile} />
        <Rect x={6.9} {...tile} />
        <Rect x={13.7} {...tile} fill={HIGHLIGHT} />
        <Rect x={17.2} {...tile} fill={HIGHLIGHT} />
        <Line x1={11.5} y1={13.4} x2={12.5} y2={13.4} />
      </G>
      <G stroke="none" fontSize={5.6} fontWeight="600" textAnchor="middle">
        <Text x={5.1} y={15.4} fill={color}>2</Text>
        <Text x={8.6} y={15.4} fill={color}>5</Text>
        <Text x={15.4} y={15.4} fill="#fff">2</Text>
        <Text x={18.9} y={15.4} fill="#fff">3</Text>
      </G>
      {/* matita */}
      <Line x1={14.6} y1={9.3} x2={17} y2={6.9} strokeWidth={frame} />
    </Svg>
  );
}
