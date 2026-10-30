import { useId } from 'react';
import Svg, { Circle, Defs, G, Path, Pattern } from 'react-native-svg';
import { blue, palette } from '@/theme/colors';

/** Pallone da pallavolo a pannelli nei colori del brand (blu e oro), con trama a nido d'ape; colori pieni, senza ombre */
export function VolleyBall({ size }: { size: number }) {
  const hex = useId();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <Pattern id={hex} width={6} height={10.392} patternUnits="userSpaceOnUse">
          <Path d="M3 0L6 1.732L6 5.196L3 6.928L0 5.196L0 1.732Z" fill="none" stroke="#000" strokeWidth={0.15} strokeOpacity={0.15} />
        </Pattern>
      </Defs>
      <Circle cx={50} cy={50} r={48} fill={palette.white} />
      {/* pannelli blu */}
      <Path d="M50,2A48,48 0 0,1 90,26C70,35 45,30 30,50C20,35 25,15 50,2Z" fill={palette.blue} />
      <Path d="M10,74A48,48 0 0,1 2,50C20,40 40,55 50,70C35,85 18,85 10,74Z" fill={palette.blue} />
      {/* pannelli oro */}
      <Path d="M98,50A48,48 0 0,1 74,90C65,70 70,45 50,30C70,25 90,30 98,50Z" fill={palette.gold} />
      <Path d="M26,10A48,48 0 0,1 50,2C40,20 55,40 70,50C55,65 30,55 26,10Z" fill={palette.gold} />
      {/* pannelli bianchi */}
      <Path d="M50,50C65,35 85,35 90,26C96,38 98,50 98,50C80,50 65,65 50,50Z" fill={palette.white} />
      <Path d="M50,50C35,65 35,85 26,90C38,96 50,98 50,98C50,80 65,65 50,50Z" fill={palette.white} />
      <Circle cx={50} cy={50} r={48} fill={`url(#${hex})`} />
      {/* cuciture tra i pannelli */}
      <G stroke={blue[900]} strokeWidth={1.6} fill="none" opacity={0.45}>
        <Circle cx={50} cy={50} r={48} />
        <Path d="M50,2C25,15 20,35 30,50C45,30 70,35 90,26" />
        <Path d="M98,50C90,30 70,25 50,30C70,45 65,70 74,90" />
        <Path d="M50,98C30,90 25,70 30,50C50,65 65,50 98,50" />
        <Path d="M2,50C10,30 30,25 50,30C35,50 50,70 50,98" />
      </G>
    </Svg>
  );
}
