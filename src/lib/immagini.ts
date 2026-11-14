import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Immagine pronta da caricare: JPEG in base64 con le dimensioni reali (pixel) */
export interface ImmaginePronta {
  uri: string;
  base64: string;
  width: number;
  height: number;
}

/** Riquadro in pixel dell'immagine (x1,y1 in alto a sinistra) */
export interface Riquadro {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Ridimensiona (lato lungo ≤ maxLato, mai ingrandita), ritaglia se serve e salva in JPEG.
 * crop è in pixel dell'immagine sorgente, prima del ridimensionamento.
 */
export async function preparaImmagine(uri: string, opts: { maxLato?: number; qualita?: number; crop?: Riquadro } = {}): Promise<ImmaginePronta> {
  const { maxLato = 2000, qualita = 0.8, crop } = opts;
  const ctx = ImageManipulator.manipulate(uri);
  let w: number;
  let h: number;
  if (crop) {
    w = Math.max(1, Math.round(crop.x2 - crop.x1));
    h = Math.max(1, Math.round(crop.y2 - crop.y1));
    ctx.crop({ originX: Math.round(crop.x1), originY: Math.round(crop.y1), width: w, height: h });
  } else {
    // dimensioni della sorgente: servono per sapere quale lato ridurre
    const orig = await ImageManipulator.manipulate(uri).renderAsync();
    w = orig.width;
    h = orig.height;
  }
  if (Math.max(w, h) > maxLato) ctx.resize(w >= h ? { width: maxLato } : { height: maxLato });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: qualita, base64: true });
  if (!out.base64) throw new Error('Immagine non convertita');
  return { uri: out.uri, base64: out.base64, width: out.width, height: out.height };
}

/** base64 → byte, per l'upload nello Storage (fetch di un file locale non è affidabile ovunque) */
export function daBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
