import Svg, { G, Line, Path, Rect } from 'react-native-svg';

/** Cartellini: larghezza, altezza e posizione verticale (griglia 24×24) */
const TILE = { y: 9.4, width: 4.2, height: 8.2, rx: 0.6 };
/** Bordo sinistro dei quattro cartellini: due coppie affiancate, staccate dal trattino */
const TILES_X = [2.4, 6.6, 13.2, 17.4];
/** Anelli in alto, centrati sopra i cartellini */
const RINGS_X = TILES_X.map((x) => x + TILE.width / 2 - 0.8);
/** Ingombro delle cifre dentro ogni cartellino */
const DIGIT = { w: 2.2, h: 5.6, y: 10.7 };

/**
 * Cifre disegnate a tratto su un riquadro 1×1 (x verso destra, y verso il basso): niente testo, così hanno la stessa
 * forma su iOS, Android e web e riempiono il cartellino invece di dipendere dalla metrica del carattere.
 */
const GLYPHS = {
  '2': 'M 0 0.22 C 0 0.08 0.2 0 0.5 0 C 0.8 0 1 0.1 1 0.27 C 1 0.42 0.85 0.5 0.6 0.62 L 0 1 H 1',
  '3': 'M 0 0.12 C 0.1 0.04 0.3 0 0.5 0 C 0.8 0 1 0.1 1 0.25 C 1 0.4 0.8 0.47 0.45 0.47 C 0.8 0.47 1 0.56 1 0.73 C 1 0.9 0.8 1 0.5 1 C 0.25 1 0.08 0.95 0 0.86',
  '5': 'M 1 0 H 0.1 L 0 0.45 C 0.2 0.4 0.4 0.38 0.55 0.38 C 0.85 0.38 1 0.52 1 0.7 C 1 0.88 0.8 1 0.5 1 C 0.25 1 0.05 0.92 0 0.82',
} as const;
const SCORE = ['2', '5', '2', '3'] as const;

/** Porta una cifra dal riquadro 1×1 al rettangolo (x, y, w, h): le coordinate si alternano x/y, H ne ha solo una x */
function glyph(d: keyof typeof GLYPHS, x: number, y: number, w: number, h: number) {
  let isX = true;
  return GLYPHS[d].split(' ').map((t) => {
    if (/^[A-Z]$/.test(t)) {
      isX = t !== 'V';
      return t;
    }
    const v = Number(t);
    const out = (isX ? x + v * w : y + v * h).toFixed(2);
    isX = !isX;
    return out;
  }).join(' ');
}

const DIGITS_PATH = TILES_X.map((x, i) => glyph(SCORE[i], x + (TILE.width - DIGIT.w) / 2, DIGIT.y, DIGIT.w, DIGIT.h)).join(' ');

/**
 * Icona "Risultati": tabellone a cartellini 25-23, con gli anelli in alto come un calendario da tavolo.
 * Monocromatica e senza riempimenti, con le stesse proprietà delle icone lucide della barra (size, color, strokeWidth),
 * su una griglia 24×24.
 */
export function ScoreboardIcon({ size = 24, color = 'currentColor', strokeWidth = 2 }: { size?: number; color?: string; strokeWidth?: number }) {
  // cornice spessa, cartellini sottili, cifre in mezzo: devono spiccare senza toccare i bordi
  const frame = strokeWidth * 0.75;
  const rings = strokeWidth * 0.5;
  const tiles = strokeWidth * 0.35;
  const digits = strokeWidth * 0.45;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      {/* cornice */}
      <Rect x={1} y={6} width={22} height={13.4} rx={2} strokeWidth={frame} />
      {/* anelli */}
      <G strokeWidth={rings}>
        {RINGS_X.map((x) => <Rect key={x} x={x} y={3.4} width={1.6} height={4.4} rx={0.8} />)}
      </G>
      {/* cartellini */}
      <G strokeWidth={tiles}>
        {TILES_X.map((x) => <Rect key={x} x={x} {...TILE} />)}
      </G>
      {/* trattino: estremi tagliati, altrimenti con lo spessore pieno tocca i cartellini */}
      <Line x1={11.5} y1={13.5} x2={12.5} y2={13.5} strokeWidth={frame} strokeLinecap="butt" />
      {/* 25 - 23 */}
      <Path d={DIGITS_PATH} strokeWidth={digits} />
    </Svg>
  );
}
