import type { RealtimeChannel } from '@supabase/supabase-js';
import { storageUrl, supabase } from './supabase';
import { slugify } from './format';
import * as mock from '@/data/mock';
import { COMPETITION_LOGOS, COMPETITION_LOGOS_LIGHT, OPPONENT_LOGOS, PLAYER_PHOTOS, SPONSOR_LOGOS, STAFF_PHOTOS } from '@/data/assets';
import type {
  Ad, Competition, Convenzione, ImgSrc, LeagueGame, LineupPlayer, LiveEvent, Match, MatchStatus, MediaItem, NewsItem, Player, PlayerRole, PointAction, PointDetail, PointPhase, RegionalRoster, SetScore, Sponsor, SponsorTier, StaffMember, Standing, Venue, YouthTeam,
} from '@/types';

/** Tabelle dello schema Supabase (in italiano) */
export const T = {
  stagioni: 'stagioni',
  campionati: 'campionati',
  partite: 'partite',
  setPartita: 'set_partita',
  eventiLive: 'eventi_live',
  azioniPunto: 'azioni_punto',
  formazioni: 'formazioni_partita',
  votiMvp: 'voti_mvp',
  classifiche: 'classifiche',
  giocatrici: 'giocatrici',
  /** Vista pubblica della rosa: foto e bio solo con la liberatoria (migrazione 20261016000200_consensi_e_foto) */
  giocatriciPubbliche: 'giocatrici_pubbliche',
  staff: 'staff',
  categorie: 'categorie_giovanili',
  notizie: 'notizie',
  sponsor: 'sponsor',
  /** Convenzioni dell'Arena Volley Card (migrazione 20261023000100_convenzioni_arena_card) */
  convenzioni: 'convenzioni',
  /** Pubblicità al centro dello schermo (migrazione 20261023000300_pubblicita) */
  pubblicita: 'pubblicita',
  media: 'media',
} as const;

export interface AppData {
  matches: Match[];
  standings: Standing[];
  players: Player[];
  news: NewsItem[];
  sponsors: Sponsor[];
  convenzioni: Convenzione[];
  ads: Ad[];
  youth: YouthTeam[];
  /** Squadre regionali per nome della categoria giovanile (es. "Serie B2") */
  rosters: Record<string, RegionalRoster>;
  staff: StaffMember[];
  venues: Venue[];
  media: MediaItem[];
  source: 'supabase' | 'demo';
}

// Le righe arrivano senza tipi generati: vengono lette in modo difensivo nei mapper.
type Row = Record<string, unknown>;
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : v == null ? d : String(v));
const num = (v: unknown): number | null => (typeof v === 'number' ? v : v == null || v === '' ? null : Number(v));

export function emptyData(): AppData {
  return { matches: [], standings: [], players: [], news: [], sponsors: [], convenzioni: [], ads: [], youth: [], rosters: {}, staff: [], venues: mock.venues, media: [], source: 'supabase' };
}

export function demoData(): AppData {
  return {
    matches: mock.matches.map((m) => ({ ...m, competition: m.girone ? SERIE_A3 : null })),
    standings: mock.standings,
    players: mock.players,
    news: mock.news,
    sponsors: mock.sponsors,
    convenzioni: [],
    ads: [],
    youth: mock.youth,
    rosters: {},
    staff: [],
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
const SERIE_A3: Competition = { name: 'Serie A3 Femminile', federation: 'FIPAV', logo: COMPETITION_LOGOS['serie-a3-femminile'], logoLight: COMPETITION_LOGOS_LIGHT['serie-a3-femminile'] };

function mapCompetition(r: Row): Competition {
  const name = str(r.nome);
  const logo = image(r.logo_url, COMPETITION_LOGOS, slugify(name));
  // variante chiara dallo storage (logo_chiaro_url); quella inclusa nell'app vale solo se nemmeno il logo arriva dallo storage
  const logoLight = typeof r.logo_chiaro_url === 'string' && r.logo_chiaro_url
    ? storageUrl(r.logo_chiaro_url)
    : typeof logo === 'number' ? COMPETITION_LOGOS_LIGHT[slugify(name)] ?? null : null;
  return { name, federation: (r.federazione as string | null) ?? null, logo, logoLight };
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
    opponentTeamId: (r.squadra_avversaria_id as string | null) ?? null,
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
    won30: num(r.vinte_3_0_3_1) ?? 0,
    won32: num(r.vinte_3_2) ?? 0,
    lost23: num(r.perse_2_3) ?? 0,
    lost03: num(r.perse_0_3_1_3) ?? 0,
    setsWon: num(r.set_vinti) ?? 0,
    setsLost: num(r.set_persi) ?? 0,
    setRatio: num(r.quoziente_set),
    pointsFor: num(r.punti_fatti) ?? 0,
    pointsAgainst: num(r.punti_subiti) ?? 0,
    pointRatio: num(r.quoziente_punti),
    penalty: num(r.penalita) ?? 0,
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
    // senza liberatoria niente foto, nemmeno quella inclusa nell'app: si mostra il segnaposto con il numero di maglia
    photo: r.consenso_foto === true ? image(r.foto_url, PLAYER_PHOTOS, slugify(`${first} ${last}`)) : '',
    bio: (r.bio as string | null) ?? null,
    status: null,
    born,
    birthDate: typeof r.data_nascita === 'string' ? r.data_nascita : null,
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
    // copertina sempre dallo Storage Supabase (bucket "news"), nessuna immagine inclusa nell'app
    image: image(r.url_immagine_copertina, {}),
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

function mapConvenzione(r: Row): Convenzione {
  return {
    id: str(r.id),
    name: str(r.nome),
    promo: str(r.promozione),
    // logo sempre dallo Storage Supabase (bucket "convenzioni"), nessuna immagine inclusa nell'app
    logo: image(r.url_logo, {}),
    url: (r.url_sito as string | null) || null,
  };
}

function mapAd(r: Row): Ad {
  return {
    id: str(r.id),
    title: str(r.titolo),
    subtitle: (r.sottotitolo as string | null) || null,
    text: (r.testo as string | null) || null,
    // immagine sempre dallo Storage Supabase (bucket "pubblicita")
    image: image(r.url_immagine, {}),
    url: (r.url_link as string | null) || null,
    linkLabel: (r.etichetta_link as string | null) || null,
    everyMinutes: Math.max(1, num(r.frequenza_minuti) ?? 30),
  };
}

const RUOLO_STAFF: Record<string, string> = { allenatore: 'Allenatore', dirigente: 'Dirigente', staff_sanitario: 'Staff sanitario' };

function mapStaff(r: Row): StaffMember {
  const ruolo = str(r.ruolo);
  const name = `${str(r.nome)} ${str(r.cognome)}`.trim();
  return {
    id: str(r.id),
    name,
    // "qualifica" è la dicitura precisa (es. "Primo Allenatore"), il ruolo la categoria generale
    role: str(r.qualifica) || RUOLO_STAFF[ruolo] || ruolo.replace(/_/g, ' ').replace(/^./, (ch) => ch.toUpperCase()),
    photo: image(r.foto_url, STAFF_PHOTOS, slugify(name)),
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
/** Giocatrici e staff delle squadre regionali, raggruppati per categoria giovanile */
function buildRosters(categorie: Row[], giocatrici: Row[], staff: Row[]): Record<string, RegionalRoster> {
  const out: Record<string, RegionalRoster> = {};
  for (const c of categorie) {
    const id = str(c.id);
    const players = giocatrici.filter((g) => g.categoria_giovanile_id === id).map((g) => ({
      id: str(g.id),
      name: `${str(g.nome)} ${str(g.cognome)}`.trim(),
      number: num(g.numero_maglia),
      birthDate: typeof g.data_nascita === 'string' ? g.data_nascita : null,
    }));
    const coaches = staff.filter((s) => s.categoria_giovanile_id === id).map((s) => {
      const m = mapStaff(s);
      return { id: m.id, name: m.name, role: m.role };
    });
    if (players.length || coaches.length) out[str(c.nome)] = { players, staff: coaches };
  }
  return out;
}

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

  const [partite, classifiche, giocatrici, regionali, notizie, sponsor, categorie, staff, media, campionati, convenzioni, pubblicita] = await Promise.all([
    // solo le nostre partite: quelle tra avversarie (nostra_partita = false) servono a giornate e classifica
    db.from(T.partite).select(`*, ${T.setPartita}(*)`).in('stagione_id', ids).eq('nostra_partita', true).order('data_partita'),
    db.from(T.classifiche).select('*').in('stagione_id', ids).order('posizione'),
    // la vista contiene anche le rose delle avversarie: solo le giocatrici della squadra con nostra_squadra = true
    db.from(T.giocatriciPubbliche).select('*').in('stagione_id', ids).eq('livello_squadra', 'prima_squadra').eq('attiva', true).eq('nostra_squadra', true).order('ordine'),
    db.from(T.giocatriciPubbliche).select('*').in('stagione_id', ids).in('livello_squadra', ['serie_b2', 'serie_d']).eq('attiva', true).order('ordine'),
    db.from(T.notizie).select('*').eq('pubblicata', true).order('pubblicato_il', { ascending: false }).limit(30),
    db.from(T.sponsor).select('*').eq('attivo', true).order('ordine'),
    db.from(T.categorie).select('*').order('ordine'),
    db.from(T.staff).select('*').eq('attivo', true).order('ordine'),
    db.from(T.media).select('*').eq('pubblicato', true).order('pubblicato_il', { ascending: false }),
    db.from(T.campionati).select('*'),
    db.from(T.convenzioni).select('*').eq('attiva', true).order('ordine'),
    db.from(T.pubblicita).select('*').eq('attiva', true).order('ordine'),
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
    // tabella facoltativa finché la migrazione non è applicata: senza, la pagina della card non mostra promozioni
    convenzioni: ((convenzioni.data ?? []) as Row[]).map(mapConvenzione),
    ads: ((pubblicita.data ?? []) as Row[]).map(mapAd),
    youth: buildYouth(must(categorie, 'categorie_giovanili') as Row[], must(staff, 'staff') as Row[], p),
    rosters: buildRosters(must(categorie, 'categorie_giovanili') as Row[], must(regionali, 'giocatrici') as Row[], must(staff, 'staff') as Row[]),
    // staff della prima squadra: le righe con categoria giovanile appartengono alle giovanili
    staff: (must(staff, 'staff') as Row[]).filter((r) => r.categoria_giovanile_id == null).map(mapStaff),
    venues: mock.venues,
    media: (must(media, 'media') as Row[]).map(mapMedia),
    source: 'supabase',
  };
}

// ---------- giornata del girone ----------

function teamLogo(r: Row | null | undefined): ImgSrc | null {
  if (!r) return null;
  return image(r.logo_url, OPPONENT_LOGOS, slugify(str(r.nome))) || null;
}

function mapLeagueGame(r: Row): LeagueGame {
  const home = (r.casa as Row | null) ?? null;
  const away = (r.ospite as Row | null) ?? null;
  // set_casa/set_ospite e parziali: per le nostre partite li allineano i trigger da nostri_set_vinti e set_partita
  const parziali = Array.isArray(r.parziali) ? (r.parziali as Row[]) : [];
  return {
    id: str(r.id),
    number: num(r.numero_gara) ?? 0,
    giornata: num(r.giornata) ?? 0,
    phase: str(r.fase).toLowerCase() === 'ritorno' ? 'ritorno' : 'andata',
    date: str(r.data_partita),
    home: str(home?.nome),
    away: str(away?.nome),
    homeLogo: teamLogo(home),
    awayLogo: teamLogo(away),
    status: STATO[str(r.stato)] ?? 'scheduled',
    homeSets: num(r.set_casa),
    awaySets: num(r.set_ospite),
    sets: parziali
      .sort((a, b) => (num(a.set) ?? 0) - (num(b.set) ?? 0))
      .map((s) => ({ home: num(s.casa) ?? 0, away: num(s.ospite) ?? 0 })),
    matchId: r.nostra_partita === true ? str(r.id) : null,
  };
}

/** Tutte le gare di una giornata del girone (nostre e tra avversarie), per le stagioni correnti */
export async function fetchGiornata(giornata: number, girone: string): Promise<LeagueGame[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(T.partite)
    .select(`id, numero_gara, giornata, fase, data_partita, stato, set_casa, set_ospite, parziali, nostra_partita,
      casa:squadre!partite_squadra_casa_id_fkey(nome, logo_url),
      ospite:squadre!partite_squadra_ospite_id_fkey(nome, logo_url),
      stagione:stagioni!inner(corrente)`)
    .eq('giornata', giornata)
    .eq('girone', girone)
    .eq('stagione.corrente', true)
    .order('data_partita')
    .order('numero_gara');
  if (error) throw new Error(`partite: ${error.message}`);
  return ((data as Row[] | null) ?? []).map(mapLeagueGame);
}

// ---------- classifica ----------

/** Classifica delle stagioni correnti (calcolata dal database dai risultati, vedi calcola_classifica) */
export async function fetchStandings(): Promise<Standing[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(T.classifiche)
    .select('*, stagione:stagioni!inner(corrente)')
    .eq('stagione.corrente', true)
    .order('posizione');
  if (error) throw new Error(`classifiche: ${error.message}`);
  return ((data as Row[] | null) ?? []).map(mapStanding);
}

/** Realtime: la classifica viene ricalcolata dal database a ogni risultato */
export function subscribeStandings(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const ch = client
    .channel(`classifiche-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: T.classifiche }, onChange)
    .subscribe();
  return () => {
    client.removeChannel(ch);
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

const AZIONI: PointAction[] = ['schiacciata', 'pipe', 'primo_tempo', 'pallonetto', 'ace', 'muro', 'errore_avversario'];

/** Riga di azioni_punto → evento (id) + chi ha fatto punto + azione */
export interface LiveAction {
  eventId: string;
  side: 'us' | 'opp';
  detail: PointDetail;
}

function mapAction(r: Row): LiveAction | null {
  const action = str(r.azione) as PointAction;
  if (!AZIONI.includes(action)) return null;
  const name = (r.nome_giocatrice as string | null) || null;
  return {
    eventId: str(r.evento_id),
    side: r.squadra === 'avversaria' ? 'opp' : 'us',
    detail: {
      action,
      phase: (r.fase === 'difesa' ? 'difesa' : 'attacco') as PointPhase,
      zone: num(r.zona),
      player: name ? { lineupId: str(r.formazione_id), playerId: (r.giocatrice_id as string | null) ?? null, name, number: null } : null,
      aiText: r.frase_ai === true,
    },
  };
}

/** L'azione registrata dice chi ha fatto punto: più affidabile del confronto tra punteggi */
export function withAction(e: LiveEvent, a: LiveAction | undefined): LiveEvent {
  return a ? { ...e, side: a.side, detail: { ...a.detail, text: e.text } } : e;
}

/** Eventi di cronaca tenuti per la diretta: abbastanza per una partita intera al tie-break (statistiche e grafico) */
export const LIVE_EVENTS_MAX = 600;

export interface LiveSnapshot {
  events: LiveEvent[];
  sets: SetScore[];
  completed: boolean[];
  /** Squadra al servizio sullo 0-0, per numero di set (solo i set in cui l'admin l'ha scelta) */
  firstServe: Record<number, 'us' | 'opp'>;
}

export async function fetchLive(matchId: string): Promise<LiveSnapshot | null> {
  if (!supabase) return null;
  const [ev, st, az] = await Promise.all([
    supabase.from(T.eventiLive).select('*').eq('partita_id', matchId).order('creato_il', { ascending: false }).limit(LIVE_EVENTS_MAX),
    supabase.from(T.setPartita).select('*').eq('partita_id', matchId).order('numero_set'),
    // tabella facoltativa (migrazione 20261014_azioni_punto): senza, la cronaca resta solo testo
    supabase.from(T.azioniPunto).select('*').eq('partita_id', matchId),
  ]);
  const sets = (st.data as Row[] | null) ?? [];
  const actions = new Map(((az.data as Row[] | null) ?? []).map(mapAction).filter((a): a is LiveAction => !!a).map((a) => [a.eventId, a]));
  return {
    events: withSides((ev.data as Row[] | null) ?? []).map((e) => withAction(e, actions.get(e.id))),
    sets: sets.map((s) => ({ our: num(s.punti_nostri) ?? 0, opp: num(s.punti_avversario) ?? 0 })),
    completed: sets.map((s) => s.completato === true),
    firstServe: Object.fromEntries(sets
      .filter((s) => s.primo_servizio === 'nostra' || s.primo_servizio === 'avversaria')
      .map((s) => [num(s.numero_set) ?? 0, s.primo_servizio === 'nostra' ? 'us' : 'opp'])),
  };
}

/** Squadra al servizio sullo 0-0 del set: crea la riga del set se non c'è ancora (punti 0-0), altrimenti cambia solo questo dato */
export async function setFirstServe(matchId: string, set: number, side: 'us' | 'opp'): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from(T.setPartita).upsert(
    { partita_id: matchId, numero_set: set, primo_servizio: side === 'us' ? 'nostra' : 'avversaria' },
    { onConflict: 'partita_id,numero_set' },
  );
  if (error) throw error;
}

/** Realtime: nuovi eventi di cronaca e aggiornamenti dei set (tabelle nella pubblicazione supabase_realtime) */
export function subscribeLive(matchId: string, onEvent: (e: LiveEvent) => void, onSets: () => void, onAction: (a: LiveAction) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const ch: RealtimeChannel = client
    .channel(`live-${matchId}-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: T.eventiLive, filter: `partita_id=eq.${matchId}` }, (p) =>
      onEvent(mapEvent(p.new as Row)),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: T.setPartita, filter: `partita_id=eq.${matchId}` }, () => onSets())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: T.azioniPunto, filter: `partita_id=eq.${matchId}` }, (p) => {
      const a = mapAction(p.new as Row);
      if (a) onAction(a);
    })
    .subscribe();
  return () => {
    client.removeChannel(ch);
  };
}

/** uuid v4 generato sul client: l'evento ha lo stesso id in locale e nel database (si riconosce l'eco del Realtime) */
export function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 3) | 8).toString(16);
  });
}

/**
 * Admin: salva un punto della diretta (richiede ruolo staff/admin, policy e_staff()).
 * events: nuovi eventi di cronaca dal più recente; score: punteggio del set `set` dopo il punto.
 */
export async function pushLivePoint(
  matchId: string,
  p: { set: number; score: SetScore; completed: boolean; events: LiveEvent[]; final: { our: number; opp: number } | null },
): Promise<void> {
  if (!supabase) return;
  // uno alla volta, dal più vecchio: creato_il (now() sul server) mantiene l'ordine della cronaca
  for (const e of [...p.events].reverse()) {
    const { error } = await supabase.from(T.eventiLive).insert({
      id: e.id, partita_id: matchId, numero_set: e.set, punteggio_nostro: e.our, punteggio_avversario: e.opp, descrizione: e.text,
    });
    if (error) throw error;
    if (e.detail) await pushAction(matchId, e);
  }
  const st = await supabase.from(T.setPartita).upsert(
    { partita_id: matchId, numero_set: p.set, punti_nostri: p.score.our, punti_avversario: p.score.opp, completato: p.completed },
    { onConflict: 'partita_id,numero_set' },
  );
  if (st.error) throw st.error;
  if (p.final) {
    const { error } = await supabase.from(T.partite).update({ nostri_set_vinti: p.final.our, set_vinti_avversario: p.final.opp }).eq('id', matchId);
    if (error) throw error;
  }
}

/** Azione tecnica del punto: se non si salva (es. migrazione non eseguita) il punto e la cronaca restano validi */
async function pushAction(matchId: string, e: LiveEvent): Promise<void> {
  if (!supabase || !e.detail) return;
  const d = e.detail;
  const { error } = await supabase.from(T.azioniPunto).insert({
    partita_id: matchId, evento_id: e.id, numero_set: e.set, squadra: e.side === 'opp' ? 'avversaria' : 'nostra',
    azione: d.action, fase: d.phase, zona: d.zone ?? null,
    formazione_id: d.player?.lineupId ?? null, giocatrice_id: d.player?.playerId ?? null, nome_giocatrice: d.player?.name ?? null,
    punteggio_nostro: e.our, punteggio_avversario: e.opp, frase_ai: d.aiText === true,
  });
  if (error) console.warn('Azione del punto non salvata', error.message);
}

/** Dati del punto per l'AI: chi ha fatto punto e il punteggio li decide l'app, l'AI scrive solo le frasi */
export interface CommentaryRequest {
  squadra: string;
  avversaria: string;
  puntoA: 'us' | 'opp';
  azione: PointAction;
  fase: PointPhase;
  zona?: number | null;
  giocatrice?: string | null;
  set: number;
  nostri: number;
  loro: number;
  chiudeSet?: boolean;
  evita?: string[];
}

/** Frasi di cronaca proposte dall'AI (Edge Function cronaca-ai con Groq, solo staff/admin) */
export async function suggestCommentary(req: CommentaryRequest): Promise<string[]> {
  if (!supabase) throw new Error('Supabase non configurato');
  const { data, error } = await supabase.functions.invoke('cronaca-ai', { body: req });
  if (error) throw error;
  const frasi = (data as { frasi?: unknown } | null)?.frasi;
  return Array.isArray(frasi) ? frasi.filter((f): f is string => typeof f === 'string') : [];
}

// ---------- formazioni ----------

const RUOLI: PlayerRole[] = ['palleggiatrice', 'schiacciatrice', 'centrale', 'opposto', 'libero'];

function mapLineup(r: Row): LineupPlayer {
  const role = str(r.ruolo) as PlayerRole;
  return {
    id: str(r.id),
    team: r.squadra === 'avversaria' ? 'opp' : 'us',
    playerId: (r.giocatrice_id as string | null) ?? null,
    number: num(r.numero_maglia),
    name: str(r.nome),
    role: RUOLI.includes(role) ? role : null,
    isCaptain: r.capitana === true,
    zone: num(r.zona),
    isLibero: r.libero === true,
    order: num(r.ordine) ?? 0,
  };
}

const lineupRow = (matchId: string, p: LineupPlayer) => ({
  id: p.id, partita_id: matchId, squadra: p.team === 'opp' ? 'avversaria' : 'nostra', giocatrice_id: p.playerId ?? null,
  numero_maglia: p.number, nome: p.name, ruolo: p.role, capitana: p.isCaptain, zona: p.zone, ordine: p.order,
  // solo se serve: le righe nuove si salvano anche prima della migrazione della colonna libero
  ...(p.isLibero ? { libero: true } : {}),
});

/** Rosa di una squadra del girone (anche avversaria), per numero di maglia: si sceglie da qui la formazione */
export async function fetchTeamRoster(teamId: string): Promise<Player[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from(T.giocatriciPubbliche).select('*').eq('squadra_id', teamId).eq('attiva', true)
    .order('numero_maglia', { nullsFirst: false });
  if (error) throw error;
  return ((data as Row[] | null) ?? []).map(mapPlayer);
}

/** Formazioni della partita; null se la tabella non è raggiungibile (es. migrazione non ancora eseguita) */
export async function fetchLineup(matchId: string): Promise<LineupPlayer[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from(T.formazioni).select('*').eq('partita_id', matchId).order('ordine');
  if (error) {
    console.warn('Formazioni non disponibili', error.message);
    return null;
  }
  return ((data as Row[] | null) ?? []).map(mapLineup);
}

export async function insertLineup(matchId: string, players: LineupPlayer[]): Promise<void> {
  if (!supabase || !players.length) return;
  const { error } = await supabase.from(T.formazioni).insert(players.map((p) => lineupRow(matchId, p)));
  if (error) throw error;
}

/** Numero, nome e ruolo di una giocatrice a referto (il collegamento alla sua scheda resta) */
export async function updateLineupPlayer(id: string, f: { number: number | null; name: string; role: PlayerRole | null }): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from(T.formazioni).update({ numero_maglia: f.number, nome: f.name, ruolo: f.role }).eq('id', id);
  if (error) throw error;
}

export async function setLineupZone(id: string, zone: number | null): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from(T.formazioni).update({ zona: zone }).eq('id', id);
  if (error) throw error;
}

/** Sceglie il libero della squadra (id null = nessuno): prima si toglie il precedente, c'è un solo libero per squadra */
export async function setLineupLibero(matchId: string, team: 'us' | 'opp', id: string | null): Promise<void> {
  if (!supabase) return;
  const squadra = team === 'opp' ? 'avversaria' : 'nostra';
  const off = await supabase.from(T.formazioni).update({ libero: false }).eq('partita_id', matchId).eq('squadra', squadra).eq('libero', true);
  if (off.error) throw off.error;
  if (!id) return;
  const on = await supabase.from(T.formazioni).update({ libero: true }).eq('id', id);
  if (on.error) throw on.error;
}

/** Sceglie la capitana della squadra nella partita (id null = nessuna): come per il libero, una sola per squadra */
export async function setLineupCaptain(matchId: string, team: 'us' | 'opp', id: string | null): Promise<void> {
  if (!supabase) return;
  const squadra = team === 'opp' ? 'avversaria' : 'nostra';
  const off = await supabase.from(T.formazioni).update({ capitana: false }).eq('partita_id', matchId).eq('squadra', squadra).eq('capitana', true);
  if (off.error) throw off.error;
  if (!id) return;
  const on = await supabase.from(T.formazioni).update({ capitana: true }).eq('id', id);
  if (on.error) throw on.error;
}

export async function deleteLineupPlayer(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from(T.formazioni).delete().eq('id', id);
  if (error) throw error;
}

export function subscribeLineup(matchId: string, onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const ch = client
    .channel(`formazioni-${matchId}-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: T.formazioni, filter: `partita_id=eq.${matchId}` }, onChange)
    .subscribe();
  return () => {
    client.removeChannel(ch);
  };
}

export const youtubeThumb = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
export const youtubeUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** Voti MVP di una partita: conteggi per giocatrice della rosa e voto dell'utente (migrazione 20261017_statistiche_giocatrici_e_mvp) */
export interface MvpVotes {
  counts: Record<string, number>;
  mine: string | null;
}

export async function fetchMvpVotes(matchId: string, userId: string | null): Promise<MvpVotes | null> {
  if (!supabase) return null;
  const [cnt, own] = await Promise.all([
    supabase.rpc('voti_mvp_partita', { p_partita: matchId }),
    userId ? supabase.from(T.votiMvp).select('giocatrice_id').eq('partita_id', matchId).eq('utente_id', userId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (cnt.error) throw cnt.error;
  const counts: Record<string, number> = {};
  for (const r of (cnt.data as Row[] | null) ?? []) counts[str(r.giocatrice_id)] = num(r.voti) ?? 0;
  return { counts, mine: ((own.data as Row | null)?.giocatrice_id as string | null) ?? null };
}

/** Un voto per utente e partita: votare di nuovo cambia la giocatrice scelta */
export async function voteMvp(matchId: string, userId: string, playerId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from(T.votiMvp).upsert(
    { partita_id: matchId, utente_id: userId, giocatrice_id: playerId, aggiornato_il: new Date().toISOString() },
    { onConflict: 'partita_id,utente_id' },
  );
  if (error) throw error;
}

/** Toglie il voto dell'utente per la partita (policy voti_mvp_cancellazione: solo il proprio) */
export async function unvoteMvp(matchId: string, userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from(T.votiMvp).delete().eq('partita_id', matchId).eq('utente_id', userId);
  if (error) throw error;
}
