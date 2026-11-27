import { useSyncExternalStore } from 'react';
import { loadJSON, saveJSON } from '@/lib/storage';

/** Versione della guida: alzandola, tutti la rivedono alla prossima apertura */
export const TUTORIAL_VERSION = 1;
const CHIAVE = 'av-tutorial-visto';

type StatoGuida = 'caricamento' | 'da-mostrare' | 'visto';

/* ---------- store esterno: si legge con useSyncExternalStore, niente setState negli effetti ---------- */

let stato: StatoGuida = 'caricamento';
let avviato = false;
const ascoltatori = new Set<() => void>();

function imposta(nuovo: StatoGuida) {
  if (nuovo === stato) return;
  stato = nuovo;
  ascoltatori.forEach((a) => a());
}

/** Alla prima iscrizione legge da AsyncStorage la versione della guida già vista */
function avvia() {
  if (avviato) return;
  avviato = true;
  loadJSON<number>(CHIAVE).then((vista) => {
    // se nel frattempo è stata chiusa o riaperta a mano, vale quella scelta
    if (stato !== 'caricamento') return;
    imposta((vista ?? 0) >= TUTORIAL_VERSION ? 'visto' : 'da-mostrare');
  });
}

function iscriviti(ascoltatore: () => void) {
  ascoltatori.add(ascoltatore);
  avvia();
  return () => {
    ascoltatori.delete(ascoltatore);
  };
}

const leggi = () => stato;
const leggiServer = (): StatoGuida => 'caricamento';

/** Chiude la guida (Salta o Inizia): non ricompare più fino alla prossima TUTORIAL_VERSION */
function completa() {
  imposta('visto');
  saveJSON(CHIAVE, TUTORIAL_VERSION);
}

/** Riapre la guida dall'inizio (Impostazioni > Rivedi la guida) */
function rivedi() {
  imposta('da-mostrare');
}

/** Stato della guida di benvenuto */
export function useTutorial() {
  const attuale = useSyncExternalStore(iscriviti, leggi, leggiServer);
  return { daMostrare: attuale === 'da-mostrare', completa, rivedi };
}

/* ---------- registro dei bersagli del tour ---------- */

export interface Rettangolo {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Qualunque vista nativa che si può misurare (View, Pressable, …) */
interface Misurabile {
  measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void;
}

const bersagli = new Map<string, Misurabile>();
/** Una callback per id, sempre la stessa: React non stacca e riattacca la ref a ogni render */
const callback = new Map<string, (nodo: Misurabile | null) => (() => void) | undefined>();

/** Ref da mettere sull'elemento che il tour deve indicare */
export function bersaglioGuida(id: string) {
  let cb = callback.get(id);
  if (!cb) {
    cb = (nodo) => {
      if (!nodo) return undefined;
      bersagli.set(id, nodo);
      // si toglie solo se nel frattempo non è stato registrato un altro nodo con lo stesso id
      return () => {
        if (bersagli.get(id) === nodo) bersagli.delete(id);
      };
    };
    callback.set(id, cb);
  }
  return cb;
}

/** Vero se l'elemento è montato e registrato */
export function haBersaglio(id: string) {
  return bersagli.has(id);
}

/** Posizione nella finestra di una vista; null se non risponde entro 500ms o non ha dimensioni */
export function misuraNodo(nodo: Misurabile | null | undefined): Promise<Rettangolo | null> {
  if (!nodo) return Promise.resolve(null);
  return new Promise((resolve) => {
    const scadenza = setTimeout(() => resolve(null), 500);
    try {
      nodo.measureInWindow((x, y, w, h) => {
        clearTimeout(scadenza);
        resolve(w > 0 && h > 0 ? { x, y, w, h } : null);
      });
    } catch {
      clearTimeout(scadenza);
      resolve(null);
    }
  });
}

/** Posizione nella finestra dell'elemento registrato con questo id */
export function misuraBersaglio(id: string): Promise<Rettangolo | null> {
  return misuraNodo(bersagli.get(id));
}
