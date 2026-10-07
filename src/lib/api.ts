import type { RealtimeChannel } from '@supabase/supabase-js';
import { storageUrl, supabase } from './supabase';
import { slugify } from './format';
import * as mock from '@/data/mock';
import { COMPETITION_LOGOS, NEWS_IMAGES, OPPONENT_LOGOS, PLAYER_PHOTOS, SPONSOR_LOGOS } from '@/data/assets';
import type {
  Competition, ImgSrc, LiveEvent, Match, MatchStatus, MediaItem, NewsItem, Player, PlayerRole, SetScore, Sponsor, SponsorTier, Standing, Venue, YouthTeam,
} from '@/types';

/** Tabelle dello schema Supabase (in italiano) */
export const T = {
  stagioni: 'stagioni',
  campionati: 'campionati',
  partite: 'partite',
  setPartita: 'set_partita',
  eventiLive: 'eventi_live',
  classifiche: 'classifiche',
  giocatrici: 'giocatrici',
  staff: 'staff',
  categorie: 'categorie_giovanili',
  notizie: 'notizie',
  sponsor: 'sponsor',
  media: 'media',
} as const;

export interface AppData {
  matches: Match[];
  standings: Standing[];
  players: Player[];
  news: NewsItem[];
  sponsors: Sponsor[];
  youth: YouthTeam[];
  venues: Venue[];
  media: MediaItem[];
  source: 'supabase' | 'demo';
}

// Le righe arrivano senza tipi generati: vengono lette in modo difensivo nei mapper.
type Row = Record<string, unknown>;
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : v == null ? d : String(v));
const num = (v: unknown): number | null => (typeof v === 'number' ? v : v == null || v === '' ? null : Number(v));

export function emptyData(): AppData {
  return { matches: [], standings: [], players: [], news: [], sponsors: [], youth: [], venues: mock.venues, media: [], source: 'supabase' };
}

export function demoData(): AppData {
  return {
    matches: mock.matches.map((m) => ({ ...m, competition: m.girone ? SERIE_A3 : null })),
    standings: mock.standings,
    players: mock.players,
    news: mock.news,
    sponsors: mock.sponsors,
    youth: mock.youth,
    venues: mock.venues,
    media: [],
    source: 'demo',
  };
}

// ---------- mapper ----------

const STATO: Record<string, MatchStatus> = { programmata: 'scheduled', live: 'live', conclusa: 'finished', rinviata: 'postponed' };
const CATEGORIA_NOTIZIA: Record<string, string> = { societa: 'Società', prima_squadra: 'Serie A3', giovanili: 'Giovanili', sponsor: 'Sponsor' };
const LIVELLO_SPONSOR: Record<string, SponsorTier> = {
  'title sponsor': 'title', gold: 'title',
  'main sponsor': 'main', silver: 'main',
  sponsor: 'sponsor', bronze: 'sponsor',
  'charity partner': 'charity',
};

/**
 * Immagine da un campo del database: URL completo, oppure percorso "bucket/file" nello Storage (bucket pubblici).
 * La copia inclusa nell'app (stesso nome file, o nome della giocatrice/sponsor) serve solo se il campo è vuoto.
 */
function image(url: unknown, local: Record<string, number>, ...keys: string[]): ImgSrc {
  if (typeof url === 'string' && url) return storageUrl(url);
  for (const k of keys) if (k && local[k] != null) return local[k];
  return '';
}

function mapSets(r: Row): SetScore[] | undefined {
  if (!Array.isArray(r.set_partita)) return undefined;
  return (r.set_partita as Row[])
    .sort((a, b) => (num(a.numero_set) ?? 0) - (num(b.numero_set) ?? 0))
    .map((s) => ({ our: num(s.punti_nostri) ?? 0, opp: num(s.punti_avversario) ?? 0 }));
}

/** Campionato usato per le partite con girone quando la tabella campionati non c'è o la partita non è collegata */
const SERIE_A3: Competition = { name: 'Serie A3 Femminile', federation: 'FIPAV', logo: COMPETITION_LOGOS['serie-a3-femminile'] };

function mapCompetition(r: Row): Competition {
  const name = str(r.nome);
  return { name, federation: (r.federazione as string | null) ?? null, logo: image(r.logo_url, COMPETITION_LOGOS, slugify(name)) };
}

function mapMatch(r: Row, competitions: Map<string, Competition> = new Map(), seasons: Map<string, string> = new Map()): Match {
  return {
    id: str(r.id),
    giornata: num(r.giornata),
    girone: (r.girone as string | null) ?? null,
    phase: str(r.fase).toLowerCase() === 'ritorno' ? 'ritorno' : 'andata',
    date: str(r.data_partita),
    homeAway: r.casa_trasferta === 'trasferta' ? 'trasferta' : 'casa',
    opponent: str(r.avversario),
    opponentLogo: image(r.logo_avversario_url ?? r.opponent_logo_url, OPPONENT_LOGOS, slugify(str(r.avversario))) || null,
    venue: str(r.sede),
    season: seasons.get(str(r.stagione_id)) || null,
    competition: (r.campionato_id ? competitions.get(str(r.campionato_id)) : undefined) ?? (r.girone ? SERIE_A3 : null),
    status: STATO[str(r.stato)] ?? 'scheduled',
    ourSets: num(r.nostri_set_vinti),
    oppSets: num(r.set_vinti_avversario),
    sets: mapSets(r),
    youtubeLiveId: (r.id_video_youtube_live as string | null) || null,
  };
}

function mapStanding(r: Row): Standing {
  return {
    team: str(r.nome_squadra),
    position: num(r.posizione) ?? 0,
    played: num(r.giocate) ?? 0,
    won: num(r.vinte) ?? 0,
    lost: num(r.perse) ?? 0,
    points: num(r.punti) ?? 0,
    isUs: r.nostra_squadra === true,
  };
}

function mapPlayer(r: Row): Player {
  const first = str(r.nome);
  const last = str(r.cognome);
  const born = typeof r.data_nascita === 'string' ? Number(r.data_nascita.slice(0, 4)) : null;
  return {
    id: str(r.id),
    firstName: first,
    lastName: last,
    role: (str(r.ruolo, 'schiacciatrice') as PlayerRole),
    number: num(r.numero_maglia),
    photo: image(r.foto_url, PLAYER_PHOTOS, slugify(`${first} ${last}`)),
    bio: (r.bio as string | null) ?? null,
    status: null,
    born,
    isCaptain: r.capitana === true,
    heightCm: num(r.altezza_cm),
    points: num(r.punti),
    aces: num(r.ace),
    blocks: num(r.muri),
  };
}

function mapNews(r: Row): NewsItem {
  const body = str(r.corpo);
  return {
    id: str(r.id),
    title: str(r.titolo),
    category: CATEGORIA_NOTIZIA[str(r.categoria)] ?? str(r.categoria),
    date: str(r.pubblicato_il),
    image: image(r.url_immagine_copertina, NEWS_IMAGES),
    excerpt: body.length > 160 ? `${body.slice(0, 157)}…` : body,
    body,
  };
}

function mapSponsor(r: Row): Sponsor {
  const name = str(r.nome);
  return {
    id: str(r.id),
    name,
    tier: LIVELLO_SPONSOR[str(r.livello).toLowerCase()] ?? 'sponsor',
    logo: image(r.url_logo, SPONSOR_LOGOS, slugify(name)),
    url: (r.url_sito as string | null) || null,
  };
}

function mapMedia(r: Row): MediaItem {
  return {
    id: str(r.id),
    type: r.tipo === 'podcast' ? 'podcast' : 'video',
    title: str(r.titolo),
    ref: str(r.riferimento_esterno),
    cover: (r.url_immagine_copertina as string | null) ?? null,
    duration: (r.etichetta_durata as string | null) ?? null,
    date: str(r.pubblicato_il),
  };
}

/** Categorie giovanili + allenatori (staff) + prossima/ultima partita della categoria */
function buildYouth(categorie: Row[], staff: Row[], partite: Row[]): YouthTeam[] {
  const now = Date.now();
  return categorie.map((c) => {
    const id = str(c.id);
    const name = str(c.nome);
    const coaches = staff.filter((s) => s.categoria_giovanile_id === id).map((s) => `${str(s.nome)} ${str(s.cognome)}`.trim());
    const games = partite.filter((p) => p.categoria_giovanile_id === id).sort((a, b) => str(a.data_partita).localeCompare(str(b.data_partita)));
    const next = games.find((p) => str(p.stato) !== 'conclusa' && new Date(str(p.data_partita)).getTime() >= now);
    const last = [...games].reverse().find((p) => str(p.stato) === 'conclusa');
    return {
      id,
      name,
      // "Under 14" → "U14"; altri nomi (es. "Prima Squadra") → iniziali, per stare nel badge
      short: /under/i.test(name) ? name.replace(/Under\s*/i, 'U') : name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 3),
      coach: coaches.join(', ') || 'Da definire',
      description: str(c.descrizione),
      next: next ? { opponent: str(next.avversario), date: str(next.data_partita), home: next.casa_trasferta === 'casa' } : null,
      last: last ? { opponent: str(last.avversario), our: num(last.nostri_set_vinti) ?? 0, opp: num(last.set_vinti_avversario) ?? 0 } : null,
    };
  });
}

// ---------- caricamento ----------

function must<D>(res: { data: D | null; error: { message: string } | null }, what: string): D {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return (res.data ?? ([] as unknown)) as D;
}

/**
 * Carica tutti i dati della stagione corrente.
 * Se nel DB ci sono più stagioni con corrente = true, i dati vengono uniti.
 */
export async function loadAll(): Promise<AppData> {
  if (!supabase) return demoData();
  const db = supabase;

  const stagioni = must(await db.from(T.stagioni).select('id, etichetta').eq('corrente', true), 'stagioni') as Row[];
  const ids = stagioni.map((s) => str(s.id));
  const seasons = new Map(stagioni.map((s) => [str(s.id), str(s.etichetta)]));
  if (!ids.length) throw new Error('Nessuna stagione con corrente = true in "stagioni".');

  const [partite, classifiche, giocatrici, notizie, sponsor, categorie, staff, media, campionati] = await Promise.all([
    db.from(T.partite).select(`*, ${T.setPartita}(*)`).in('stagione_id', ids).order('data_partita'),
    db.from(T.classifiche).select('*').in('stagione_id', ids).order('posizione'),
    db.from(T.giocatrici).select('*').in('stagione_id', ids).eq('livello_squadra', 'prima_squadra').eq('attiva', true).order('ordine'),
    db.from(T.notizie).select('*').eq('pubblicata', true).order('pubblicato_il', { ascending: false }).limit(30),
    db.from(T.sponsor).select('*').eq('attivo', true).order('ordine'),
    db.from(T.categorie).select('*').order('ordine'),
    db.from(T.staff).select('*').eq('attivo', true).order('ordine'),
    db.from(T.media).select('*').eq('pubblicato', true).order('pubblicato_il', { ascending: false }),
    db.from(T.campionati).select('*'),
  ]);

  const p = must(partite, 'partite') as Row[];
  // tabella facoltativa (migrazione 20261006_campionati): se manca si usa SERIE_A3 per le partite con girone
  const competitions = new Map(((campionati.data ?? []) as Row[]).map((r) => [str(r.id), mapCompetition(r)]));
  return {
    matches: p.filter((r) => r.livello_squadra === 'prima_squadra').map((r) => mapMatch(r, competitions, seasons)),
    standings: (must(classifiche, 'classifiche') as Row[]).map(mapStanding),
    players: (must(giocatrici, 'giocatrici') as Row[]).map(mapPlayer),
    news: (must(notizie, 'notizie') as Row[]).map(mapNews),
    sponsors: (must(sponsor, 'sponsor') as Row[]).map(mapSponsor),
    youth: buildYouth(must(categorie, 'categorie_giovanili') as Row[], must(staff, 'staff') as Row[], p),
    venues: mock.venues,
    media: (must(media, 'media') as Row[]).map(mapMedia),
    source: 'supabase',
  };
}

/** Aggiorna quando cambia una partita (es. stato -> 'live' o 'conclusa') */
export function subscribeMatches(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const ch = client
    .channel(`partite-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: T.partite }, onChange)
    .subscribe();
  return () => {
    client.removeChannel(ch);
  };
}

// ---------- diretta ----------

function mapEvent(r: Row, side: 'us' | 'opp' = 'us'): LiveEvent {
  return {
    id: str(r.id),
    set: num(r.numero_set) ?? 1,
    our: num(r.punteggio_nostro) ?? 0,
    opp: num(r.punteggio_avversario) ?? 0,
    text: str(r.descrizione),
    side,
  };
}

/**
 * La tabella eventi_live non ha una colonna "chi ha fatto punto":
 * si deduce confrontando ogni evento con il precedente dello stesso set.
 * (Timeout e cambi non cambiano il punteggio e restano grigi.)
 */
function withSides(desc: Row[]): LiveEvent[] {
  return desc.map((r, i) => {
    const prev = desc.slice(i + 1).find((x) => num(x.numero_set) === num(r.numero_set));
    const our = num(r.punteggio_nostro) ?? 0;
    const opp = num(r.punteggio_avversario) ?? 0;
    const side: 'us' | 'opp' = opp > (num(prev?.punteggio_avversario) ?? 0) && our === (num(prev?.punteggio_nostro) ?? 0) ? 'opp' : 'us';
    return mapEvent(r, side);
  });
}

export interface LiveSnapshot {
  events: LiveEvent[];
  sets: SetScore[];
  completed: boolean[];
}

export async function fetchLive(matchId: string): Promise<LiveSnapshot | null> {
  if (!supabase) return null;
  const [ev, st] = await Promise.all([
    supabase.from(T.eventiLive).select('*').eq('partita_id', matchId).order('creato_il', { ascending: false }).limit(80),
    supabase.from(T.setPartita).select('*').eq('partita_id', matchId).order('numero_set'),
  ]);
  const sets = (st.data as Row[] | null) ?? [];
  return {
    events: withSides((ev.data as Row[] | null) ?? []),
    sets: sets.map((s) => ({ our: num(s.punti_nostri) ?? 0, opp: num(s.punti_avversario) ?? 0 })),
    completed: sets.map((s) => s.completato === true),
  };
}

/** Realtime: nuovi eventi di cronaca e aggiornamenti dei set (tabelle nella pubblicazione supabase_realtime) */
export function subscribeLive(matchId: string, onEvent: (e: LiveEvent) => void, onSets: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const ch: RealtimeChannel = client
    .channel(`live-${matchId}-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: T.eventiLive, filter: `partita_id=eq.${matchId}` }, (p) =>
      onEvent(mapEvent(p.new as Row)),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: T.setPartita, filter: `partita_id=eq.${matchId}` }, () => onSets())
    .subscribe();
  return () => {
    client.removeChannel(ch);
  };
}

export const youtubeThumb = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
export const youtubeUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;