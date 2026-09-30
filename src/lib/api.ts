// Query per ogni sezione dell'app. Ogni funzione lancia un errore se Supabase risponde con errore.
import { supabase } from './supabase';
import type {
  AlbumFoto, CategoriaGiovanile, EventoLive, Giocatrice, LivelloSquadra, Media,
  Notizia, Partita, PromoSponsor, RigaClassifica, Sponsor, Staff, Stagione, TipoMedia,
} from './types';

function check<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// ---------- Stagione ----------
export async function getStagioneCorrente(): Promise<Stagione | null> {
  const { data, error } = await supabase
    .from('stagioni').select('*').eq('corrente', true).limit(1).maybeSingle();
  return check(data, error);
}

// ---------- Rosa ----------
export async function getGiocatrici(stagioneId: string, livello: LivelloSquadra = 'prima_squadra'): Promise<Giocatrice[]> {
  const { data, error } = await supabase
    .from('giocatrici').select('*')
    .eq('stagione_id', stagioneId)
    .eq('livello_squadra', livello)
    .eq('attiva', true)
    .order('ordine');
  return check(data, error) ?? [];
}

export async function getStaff(categoriaGiovanileId?: string | null): Promise<Staff[]> {
  let q = supabase.from('staff').select('*').eq('attivo', true).order('ordine');
  if (categoriaGiovanileId === null) q = q.is('categoria_giovanile_id', null);        // prima squadra + dirigenti
  else if (categoriaGiovanileId) q = q.eq('categoria_giovanile_id', categoriaGiovanileId);
  const { data, error } = await q;
  return check(data, error) ?? [];
}

// ---------- Giovanili ----------
export async function getCategorieGiovanili(): Promise<CategoriaGiovanile[]> {
  const { data, error } = await supabase.from('categorie_giovanili').select('*').order('ordine');
  return check(data, error) ?? [];
}

// ---------- Calendario / risultati ----------
const PARTITA_SELECT = '*, set_partita(*)';

export async function getPartite(stagioneId: string, livello: LivelloSquadra = 'prima_squadra'): Promise<Partita[]> {
  const { data, error } = await supabase
    .from('partite').select(PARTITA_SELECT)
    .eq('stagione_id', stagioneId)
    .eq('livello_squadra', livello)
    .order('data_partita', { ascending: true })
    .order('numero_set', { referencedTable: 'set_partita', ascending: true });
  return check(data, error) ?? [];
}

export async function getProssimePartite(limit = 3, livello: LivelloSquadra = 'prima_squadra'): Promise<Partita[]> {
  const { data, error } = await supabase
    .from('partite').select('*')
    .eq('livello_squadra', livello)
    .in('stato', ['programmata', 'rinviata'])
    .gte('data_partita', new Date().toISOString())
    .order('data_partita', { ascending: true })
    .limit(limit);
  return check(data, error) ?? [];
}

export async function getUltimeConcluse(limit = 3, livello: LivelloSquadra = 'prima_squadra'): Promise<Partita[]> {
  const { data, error } = await supabase
    .from('partite').select(PARTITA_SELECT)
    .eq('livello_squadra', livello)
    .eq('stato', 'conclusa')
    .order('data_partita', { ascending: false })
    .order('numero_set', { referencedTable: 'set_partita', ascending: true })
    .limit(limit);
  return check(data, error) ?? [];
}

export async function getPartitaLive(): Promise<Partita | null> {
  const { data, error } = await supabase
    .from('partite').select(PARTITA_SELECT)
    .eq('stato', 'live')
    .order('data_partita', { ascending: false })
    .order('numero_set', { referencedTable: 'set_partita', ascending: true })
    .limit(1).maybeSingle();
  return check(data, error);
}

export async function getEventiLive(partitaId: string): Promise<EventoLive[]> {
  const { data, error } = await supabase
    .from('eventi_live').select('*')
    .eq('partita_id', partitaId)
    .order('creato_il', { ascending: false });
  return check(data, error) ?? [];
}

// ---------- Classifica ----------
export async function getClassifica(stagioneId: string, girone?: string): Promise<RigaClassifica[]> {
  let q = supabase.from('classifiche').select('*').eq('stagione_id', stagioneId).order('posizione');
  if (girone) q = q.eq('girone', girone);
  const { data, error } = await q;
  return check(data, error) ?? [];
}

// ---------- News ----------
export async function getNotizie(limit = 20): Promise<Notizia[]> {
  const { data, error } = await supabase
    .from('notizie').select('*')
    .order('pubblicato_il', { ascending: false })
    .limit(limit);
  return check(data, error) ?? [];   // le bozze le vede solo lo staff (RLS)
}

// ---------- Media ----------
export async function getMedia(tipo?: TipoMedia): Promise<Media[]> {
  let q = supabase.from('media').select('*').order('pubblicato_il', { ascending: false });
  if (tipo) q = q.eq('tipo', tipo);
  const { data, error } = await q;
  return check(data, error) ?? [];
}

export const youtubeThumb = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
export const youtubeUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

// ---------- Galleria ----------
export async function getAlbum(): Promise<AlbumFoto[]> {
  const { data, error } = await supabase
    .from('album_foto').select('*').order('data_scatto', { ascending: false });
  return check(data, error) ?? [];
}

export async function getAlbumConFoto(albumId: string): Promise<AlbumFoto | null> {
  const { data, error } = await supabase
    .from('album_foto').select('*, foto(*)')
    .eq('id', albumId)
    .order('ordine', { referencedTable: 'foto', ascending: true })
    .maybeSingle();
  return check(data, error);
}

// ---------- Sponsor ----------
export async function getSponsor(): Promise<Sponsor[]> {
  const { data, error } = await supabase
    .from('sponsor').select('*').eq('attivo', true).order('ordine');
  return check(data, error) ?? [];
}

export async function getPromoAttive(): Promise<PromoSponsor[]> {
  const oggi = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('promo_sponsor').select('*, sponsor(*)')
    .eq('attiva', true)
    .or(`attiva_dal.is.null,attiva_dal.lte.${oggi}`)
    .or(`attiva_al.is.null,attiva_al.gte.${oggi}`);
  return check(data, error) ?? [];
}
