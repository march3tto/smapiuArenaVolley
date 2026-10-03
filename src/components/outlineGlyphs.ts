/**
 * Cifre "da maglia" per OutlineNumber: linea centrale di ogni carattere in un box 60×100.
 * Il tratto (spesso STROKE) viene svuotato all'interno: resta solo il contorno,
 * aperto alle estremità dei tratti.
 */
export const GLYPH_W = 60;
export const GLYPH_H = 100;
export const STROKE = 15;

export const GLYPHS: Record<string, string> = {
  '0': 'M8,20 Q8,8 20,8 L40,8 Q52,8 52,20 L52,80 Q52,92 40,92 L20,92 Q8,92 8,80 Z',
  '1': 'M16,22 L34,8 L34,92',
  '2': 'M8,22 L8,20 Q8,8 20,8 L40,8 Q52,8 52,20 L52,38 Q52,50 40,50 L20,50 Q8,50 8,62 L8,92 L52,92',
  '3': 'M8,8 L40,8 Q52,8 52,20 L52,80 Q52,92 40,92 L8,92 M22,50 L52,50',
  '4': 'M40,92 L40,8 L8,64 L52,64',
  '5': 'M52,8 L8,8 L8,48 L40,48 Q52,48 52,60 L52,80 Q52,92 40,92 L8,92',
  '6': 'M50,8 L20,8 Q8,8 8,20 L8,80 Q8,92 20,92 L40,92 Q52,92 52,80 L52,62 Q52,50 40,50 L8,50',
  '7': 'M8,8 L52,8 L24,92',
  '8': 'M8,20 Q8,8 20,8 L40,8 Q52,8 52,20 L52,80 Q52,92 40,92 L20,92 Q8,92 8,80 Z M8,50 L52,50',
  '9': 'M10,92 L40,92 Q52,92 52,80 L52,20 Q52,8 40,8 L20,8 Q8,8 8,20 L8,38 Q8,50 20,50 L52,50',
  '#': 'M20,30 L16,92 M42,30 L38,92 M6,50 L52,50 M4,74 L50,74',
};

/** Larghezza dei caratteri più stretti del box standard */
export const GLYPH_ADVANCE: Record<string, number> = { '#': 54 };
