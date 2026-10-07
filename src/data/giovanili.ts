/*
 * Contenuti della tab Giovanili, dal sito ufficiale:
 * arenavolley.mginteraction.com/giovanili/ e /serie-c-d/
 */

const SERIE_C_PHOTO: number = require('../../assets/giovanili/serie-c.jpg');
const SERIE_D_PHOTO: number = require('../../assets/giovanili/serie-d.jpg');

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
  photo: number;
  description: string;
  players: { name: string; number: number }[];
  staff: { name: string; role: string }[];
}

// Rosa e staff come pubblicati sul sito (al momento nomi segnaposto): da aggiornare quando la società li comunica
const ROSA_SITO = [2, 2, 2, 92, 62, 52, 82, 23, 42, 22, 82, 12, 28].map((number) => ({ name: 'Serena Rossi', number }));
const STAFF_SITO = [
  { name: 'Serena Rossi', role: '1° Coach' },
  { name: 'Serena Rossi', role: '2° Coach' },
  { name: 'Serena Rossi', role: 'Fisioterapista' },
];

export const SQUADRE: SquadraRegionale[] = [
  {
    key: 'seriec',
    name: 'Serie C',
    photo: SERIE_C_PHOTO,
    description: 'Il team di Serie C unisce talento e determinazione per competere ai massimi livelli regionali. Un vero e proprio trampolino di lancio dove le nostre giovani atlete scendono in campo con la grinta e l’orgoglio dei colori di Arena Volley.',
    players: ROSA_SITO,
    staff: STAFF_SITO,
  },
  {
    key: 'seried',
    name: 'Serie D',
    photo: SERIE_D_PHOTO,
    description: 'Il team di Serie D unisce crescita e passione, rappresentando il primo vero banco di prova nel volley che conta. Una squadra determinata, dove le nostre giovani atlete coltivano il talento e costruiscono il futuro di Arena Volley.',
    players: ROSA_SITO,
    staff: STAFF_SITO,
  },
];

/** Galleria del movimento giovanile, nell'ordine del sito (didascalia solo dove presente) */
export const GALLERIA: { photo: number; ratio: number; title?: string }[] = [
  { photo: require('../../assets/giovanili/galleria-01.jpg'), ratio: 580 / 386, title: 'Squadra A · Stagione 2024/25' },
  { photo: require('../../assets/giovanili/galleria-02.jpg'), ratio: 580 / 435, title: 'Squadra B · Stagione 2024/25' },
  { photo: require('../../assets/giovanili/galleria-03.jpg'), ratio: 580 / 386, title: 'Squadra C · Stagione 2024/25' },
  { photo: require('../../assets/giovanili/galleria-04.jpg'), ratio: 580 / 386, title: 'Squadra A · Stagione 2023/24' },
  { photo: require('../../assets/giovanili/galleria-05.jpg'), ratio: 580 / 386 },
  { photo: require('../../assets/giovanili/galleria-06.jpg'), ratio: 580 / 386 },
  { photo: require('../../assets/giovanili/galleria-07.jpg'), ratio: 580 / 435 },
  { photo: require('../../assets/giovanili/galleria-08.jpg'), ratio: 580 / 386 },
  { photo: require('../../assets/giovanili/galleria-09.jpg'), ratio: 580 / 386 },
  { photo: SERIE_D_PHOTO, ratio: 1600 / 1066 },
  { photo: require('../../assets/giovanili/galleria-11.jpg'), ratio: 580 / 386 },
  { photo: require('../../assets/giovanili/galleria-12.jpg'), ratio: 580 / 386 },
  { photo: require('../../assets/giovanili/galleria-13.jpg'), ratio: 580 / 435 },
  { photo: require('../../assets/giovanili/galleria-14.jpg'), ratio: 580 / 435 },
  { photo: SERIE_C_PHOTO, ratio: 1600 / 1066 },
  { photo: require('../../assets/giovanili/galleria-16.jpg'), ratio: 580 / 435 },
  { photo: require('../../assets/giovanili/galleria-17.jpg'), ratio: 580 / 435 },
  { photo: require('../../assets/giovanili/galleria-18.jpg'), ratio: 580 / 386 },
];
