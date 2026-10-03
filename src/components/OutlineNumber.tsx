import { useId } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, G, Mask, Path, Rect } from 'react-native-svg';
import { GLYPHS, GLYPH_ADVANCE, GLYPH_H, GLYPH_W, STROKE } from './outlineGlyphs';

const GAP = 8;

interface Props {
  /** Testo da disegnare: cifre e "#" */
  value: string;
  /** Altezza in px */
  height: number;
  color: string;
  /** Spessore del contorno in px */
  lineWidth?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Numero "da maglia" disegnato solo con il contorno, aperto alle estremità dei tratti.
 * Ogni carattere è un tratto spesso svuotato all'interno con una maschera
 * (il testo di React Native non supporta il contorno su iOS).
 */
export function OutlineNumber({ value, height, color, lineWidth = 1.5, style }: Props) {
  const maskId = `outline-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const chars = [...value].filter((ch) => GLYPHS[ch]);
  const pad = STROKE / 2;
  let x = pad;
  const glyphs = chars.map((ch, i) => {
    const tx = x;
    x += (GLYPH_ADVANCE[ch] ?? GLYPH_W) + GAP;
    return <Path key={i} transform={`translate(${tx},${pad})`} d={GLYPHS[ch]} />;
  });
  const vbW = x - GAP + pad;
  const vbH = GLYPH_H + STROKE;
  const scale = height / vbH;
  // spessore del contorno in unità del viewBox
  const t = Math.min(lineWidth / scale, STROKE / 2 - 1);

  return (
    <Svg width={vbW * scale} height={height} viewBox={`0 0 ${vbW} ${vbH}`} style={style} accessibilityLabel={value}>
      <Defs>
        <Mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={vbW} height={vbH}>
          <G fill="none" strokeLinejoin="miter" strokeLinecap="butt">
            <G stroke="#fff" strokeWidth={STROKE}>{glyphs}</G>
            <G stroke="#000" strokeWidth={STROKE - 2 * t}>{glyphs}</G>
          </G>
        </Mask>
      </Defs>
      <Rect x={0} y={0} width={vbW} height={vbH} fill={color} mask={`url(#${maskId})`} />
    </Svg>
  );
}
