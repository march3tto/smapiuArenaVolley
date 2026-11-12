import Svg, { G, Line, Path, Text } from 'react-native-svg';

/**
 * Icona "Classifica": podio a tre gradini (2, 1, 3) con i numeri. Stesse proprietà delle icone lucide
 * (size, color, strokeWidth), su una griglia 24×24.
 */
export function PodiumIcon({ size = 24, color = 'currentColor', strokeWidth = 2 }: { size?: number; color?: string; strokeWidth?: number }) {
  // contorno un po' più sottile delle icone lucide, altrimenti i numeri si impastano
  const frame = strokeWidth * 0.8;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 20.5V11h6.5V4.5h7V13.5H22v7Z" strokeWidth={frame} />
      <Line x1={8.5} y1={11} x2={8.5} y2={20.5} strokeWidth={frame} />
      <Line x1={15.5} y1={13.5} x2={15.5} y2={20.5} strokeWidth={frame} />
      <G stroke="none" fill={color} fontWeight="700" textAnchor="middle">
        <Text x={12} y={14.6} fontSize={7}>1</Text>
        <Text x={5.25} y={17.9} fontSize={5.6}>2</Text>
        <Text x={18.75} y={19.2} fontSize={5}>3</Text>
      </G>
    </Svg>
  );
}
