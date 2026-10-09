/*
 * Contenuti della tab Giovanili, dal sito ufficiale:
 * arenavolley.mginteraction.com/giovanili/ e /serie-c-d/
 */

import { storageUrl } from '@/lib/supabase';
import type { ImgSrc } from '@/types';

/** Foto nel bucket pubblico "giovanili" dello Storage Supabase (nomi file come sul sito) */
const foto = (file: string): ImgSrc => storageUrl(`giovanili/${file}`);

const SERIE_C_PHOTO = foto('6d831334e3efd610407b8be462fcb5b2_2400x1600_fit.webp');
const SERIE_D_PHOTO = foto('99ad0c3b23ca2666a73b8523144df218_2400x1600_fit.webp');

export const MOVIMENTO = {
  intro: 'La struttura di Arena Volley Team è forte e professionale, sono presenti:',
  facts: [
    { value: '1', label: 'Direttore Tecnico' },
    { value: '1', label: 'Direttore Sportivo prime squadre' },
    { value: '1', label: 'Direttore Sportivo settore giovanile' },
    { value: '35', label: 'Allenatori qualificati' },
    { value: '18', label: 'Impianti sportivi utilizzati' },
    { value: '500', label: 'Atlete, dai 5 anni alle prime squadre' },
  ],
};

export interface SquadraRegionale {
  key: 'seriec' | 'seried';
  name: string;
  photo: ImgSrc;
  description: string;
  /** Elenchi vuoti = sezione non mostrata */
  players: { name: string; number: number }[];
  staff: { name: string; role: string }[];
}

export const SQUADRE: SquadraRegionale[] = [
  {
    key: 'seriec',
    name: 'Serie C',
    photo: SERIE_C_PHOTO,
    description: 'Il team di Serie C unisce talento e determinazione per competere ai massimi livelli regionali. Un vero e proprio trampolino di lancio dove le nostre giovani atlete scendono in campo con la grinta e l’orgoglio dei colori di Arena Volley.',
    // giocatrici e tecnici: da inserire quando la società comunicherà i dati corretti
    players: [],
    staff: [],
  },
  {
    key: 'seried',
    name: 'Serie D',
    photo: SERIE_D_PHOTO,
    description: 'Il team di Serie D unisce crescita e passione, rappresentando il primo vero banco di prova nel volley che conta. Una squadra determinata, dove le nostre giovani atlete coltivano il talento e costruiscono il futuro di Arena Volley.',
    // giocatrici e tecnici: da inserire quando la società comunicherà i dati corretti
    players: [],
    staff: [],
  },
];

/** Galleria del movimento giovanile, nell'ordine del sito (didascalia solo dove presente) */
export const GALLERIA: { photo: ImgSrc; ratio: number; title?: string }[] = [
  { photo: foto('ba2b909df7c69b91cfb84c400baca3a9_580x386_fill.webp'), ratio: 580 / 386, title: 'Squadra A · Stagione 2024/25' },
  { photo: foto('81701f1b4a9298cd42566832f24fdf59_580x436_fill.webp'), ratio: 580 / 435, title: 'Squadra B · Stagione 2024/25' },
  { photo: foto('43959aeb2e788673568ae033b811ef8c_580x386_fill.webp'), ratio: 580 / 386, title: 'Squadra C · Stagione 2024/25' },
  { photo: foto('9825b18f73e3e6b0f5220a5f48b245da_580x386_fill.webp'), ratio: 580 / 386, title: 'Squadra A · Stagione 2023/24' },
  { photo: foto('7453b7861f6cfb9d344e4130e0b968c7_580x386_fill.webp'), ratio: 580 / 386 },
  { photo: foto('6481c59d70fdfaeee13f869dff3b1f48_580x386_fill.webp'), ratio: 580 / 386 },
  { photo: foto('496ac5f8eff2380c4503a673fb3a99f2_580x436_fill.webp'), ratio: 580 / 435 },
  { photo: foto('413b54d7865ab2b64e24394269e68fac_580x386_fill.webp'), ratio: 580 / 386 },
  { photo: foto('360ed77be4bb36ef3a1e8c4c39bacd07_580x386_fill.webp'), ratio: 580 / 386 },
  { photo: SERIE_D_PHOTO, ratio: 3 / 2 },
  { photo: foto('78b07add9481b22d2811cf01c522fadd_580x386_fill.webp'), ratio: 580 / 386 },
  { photo: foto('24e0397c8f4ffa69ee527b40a4adab16_580x386_fill.webp'), ratio: 580 / 386 },
  { photo: foto('9ec4098a9e61fa0ffa65bc0f78fa4160_580x436_fill.webp'), ratio: 580 / 435 },
  { photo: foto('8f288ae707eb664def81886feaa486d1_580x436_fill.webp'), ratio: 580 / 435 },
  { photo: SERIE_C_PHOTO, ratio: 3 / 2 },
  { photo: foto('3f5ff0a3089eae01a02da4caab629101_580x436_fill.webp'), ratio: 580 / 435 },
  { photo: foto('3d0ba996e8401d2fc08e7fce3021a76d_580x436_fill.webp'), ratio: 580 / 435 },
  { photo: foto('1ee22c9c1aff32054c68f4d2f8733912_580x386_fill.webp'), ratio: 580 / 386 },
];
