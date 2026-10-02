// Tipi allineati allo schema Supabase in italiano

export type RuoloUtente = 'pubblico' | 'genitore' | 'staff' | 'admin';
export type RuoloGiocatrice = 'palleggiatrice' | 'schiacciatrice' | 'centrale' | 'opposto' | 'libero';
export type RuoloStaff = 'allenatore' | 'allenatore_giovanili' | 'dirigente';
export type StatoPartita = 'programmata' | 'live' | 'conclusa' | 'rinviata';
export type LivelloSquadra = 'prima_squadra' | 'under12' | 'under14' | 'under16' | 'under18';
export type CasaTrasferta = 'casa' | 'trasferta';
export type CategoriaNotizia = 'societa' | 'prima_squadra' | 'giovanili' | 'sponsor';
export type TipoMedia = 'video' | 'podcast';
export type LivelloSponsor = 'gold' | 'silver' | 'bronze';

export interface Profilo {
  id: string;
  nome_completo: string | null;
  ruolo: RuoloUtente;
  categoria_giovanile_id: string | null;
  creato_il: string;
}

export interface Stagione {
  id: string;
  etichetta: string;
  corrente: boolean;
}

export interface CategoriaGiovanile {
  id: string;
  nome: string;
  descrizione: string | null;
  ordine: number | null;
}

export interface Giocatrice {
  id: string;
  stagione_id: string;
  livello_squadra: LivelloSquadra;
  categoria_giovanile_id: string | null;
  nome: string;
  cognome: string;
  numero_maglia: number | null;
  ruolo: RuoloGiocatrice | null;
  foto_url: string | null;
  bio: string | null;
  attiva: boolean;
  ordine: number | null;
  data_nascita: string | null;
}

export interface Staff {
  id: string;
  nome: string;
  cognome: string;
  ruolo: RuoloStaff;
  categoria_giovanile_id: string | null;
  foto_url: string | null;
  bio: string | null;
  attivo: boolean;
  ordine: number | null;
}

export interface SetPartita {
  id: string;
  partita_id: string;
  numero_set: number;
  punti_nostri: number;
  punti_avversario: number;
  completato: boolean;
}

export interface Partita {
  id: string;
  stagione_id: string;
  livello_squadra: LivelloSquadra;
  categoria_giovanile_id: string | null;
  avversario: string;
  casa_trasferta: CasaTrasferta;
  sede: string | null;
  data_partita: string;
  girone: string | null;
  stato: StatoPartita;
  nostri_set_vinti: number | null;
  set_vinti_avversario: number | null;
  id_video_youtube_live: string | null;
  logo_avversario_url: string | null;
  logo_smapiuarenavolley_url: string | null;
  creato_il: string;
  aggiornato_il: string;
  set_partita?: SetPartita[];
}

export interface EventoLive {
  id: string;
  partita_id: string;
  numero_set: number;
  punteggio_nostro: number;
  punteggio_avversario: number;
  descrizione: string;
  creato_il: string;
}

export interface RigaClassifica {
  id: string;
  stagione_id: string;
  girone: string | null;
  nome_squadra: string;
  nostra_squadra: boolean;
  posizione: number;
  giocate: number;
  vinte: number;
  perse: number;
  punti: number;
  aggiornato_il: string;
}

export interface Notizia {
  id: string;
  titolo: string;
  categoria: CategoriaNotizia;
  corpo: string | null;
  url_immagine_copertina: string | null;
  autore: string | null;
  pubblicato_il: string;
  pubblicata: boolean;
}

export interface Media {
  id: string;
  tipo: TipoMedia;
  titolo: string;
  riferimento_esterno: string;
  url_immagine_copertina: string | null;
  etichetta_durata: string | null;
  pubblicato_il: string;
  pubblicato: boolean;
}

export interface Foto {
  id: string;
  album_id: string;
  url_immagine: string;
  ordine: number | null;
}

export interface AlbumFoto {
  id: string;
  titolo: string;
  url_copertina: string | null;
  data_scatto: string | null;
  foto?: Foto[];
}

export interface Sponsor {
  id: string;
  nome: string;
  url_logo: string | null;
  url_sito: string | null;
  livello: LivelloSponsor;
  attivo: boolean;
  ordine: number | null;
}

export interface PromoSponsor {
  id: string;
  sponsor_id: string;
  titolo: string;
  url_immagine: string | null;
  url_video: string | null;
  attiva: boolean;
  attiva_dal: string | null;
  attiva_al: string | null;
  sponsor?: Sponsor;
}
