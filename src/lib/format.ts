import type { Partita, RuoloGiocatrice } from './types';

export const NOSTRA_SQUADRA = 'Smapiù Arena';
export const NOSTRA_SIGLA = 'AVT';

// parole che non identificano la squadra ("Chieri Volley" -> CHI)
const PAROLE_GENERICHE = new Set(['volley', 'pallavolo', 'team', 'asd', 'ssd', 'club', 'polisportiva']);

export function sigla(nome: string): string {
  const parole = nome.split(/\s+/).filter((p) => p && !PAROLE_GENERICHE.has(p.toLowerCase()));
  const base = parole[parole.length - 1] ?? nome;
  return base.slice(0, 3).toUpperCase();
}

// squadra di casa / ospite nell'ordine ufficiale del tabellino
export function squadre(p: Partita) {
  const inCasa = p.casa_trasferta === 'casa';
  return {
    casa: inCasa ? NOSTRA_SQUADRA : p.avversario,
    ospite: inCasa ? p.avversario : NOSTRA_SQUADRA,
    inCasa,
  };
}

// "2 - 1" nell'ordine casa-ospite, "vs" se non ancora giocata
export function risultato(p: Partita): string {
  if (p.stato !== 'conclusa' && p.stato !== 'live') return 'vs';
  const nostri = p.nostri_set_vinti ?? 0;
  const loro = p.set_vinti_avversario ?? 0;
  return p.casa_trasferta === 'casa' ? `${nostri} - ${loro}` : `${loro} - ${nostri}`;
}

export function parzialiSet(p: Partita): string | null {
  const sets = p.set_partita?.filter((s) => s.completato) ?? [];
  if (sets.length === 0) return null;
  return sets
    .map((s) =>
      p.casa_trasferta === 'casa'
        ? `${s.punti_nostri}-${s.punti_avversario}`
        : `${s.punti_avversario}-${s.punti_nostri}`
    )
    .join(', ');
}

export function dataPartita(iso: string): string {
  const d = new Date(iso);
  const giorno = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return `${giorno.charAt(0).toUpperCase()}${giorno.slice(1)} - ${ora}`;
}

export function dataBreve(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function eta(dataNascita: string): number {
  const nascita = new Date(dataNascita);
  const oggi = new Date();
  const compleannoPassato =
    oggi.getMonth() > nascita.getMonth() ||
    (oggi.getMonth() === nascita.getMonth() && oggi.getDate() >= nascita.getDate());
  return oggi.getFullYear() - nascita.getFullYear() - (compleannoPassato ? 0 : 1);
}

export const ETICHETTE_RUOLO: Record<RuoloGiocatrice, string> = {
  palleggiatrice: 'Palleggiatrice',
  schiacciatrice: 'Schiacciatrice',
  centrale: 'Centrale',
  opposto: 'Opposto',
  libero: 'Libero',
};
