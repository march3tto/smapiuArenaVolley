import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, RefreshControl, ScrollView, View, useWindowDimensions, type HostInstance } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, RotateCcw, Timer, Trophy, Volleyball } from 'lucide-react-native';
import { AgentScoresTicker } from '@/components/AgentScoresTicker';
import { AttaccoPanel } from '@/components/AttaccoPanel';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PlayerSlot } from '@/components/FloatingPlayer';
import { HiddenScore } from '@/components/HiddenScore';
import { LineupPanel } from '@/components/LineupPanel';
import { LiveDot } from '@/components/LiveDot';
import { MvpPanel } from '@/components/MvpPanel';
import { PointPicker, type Anchor } from '@/components/PointPicker';
import { Pressy } from '@/components/Pressy';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StatsPanel } from '@/components/StatsPanel';
import { TeamBadge } from '@/components/TeamBadge';
import { VoiceCommentary } from '@/components/VoiceCommentary';
import { Txt } from '@/components/Txt';
import { US } from '@/constants';
import { hasSupabase } from '@/lib/supabase';
import { rotateZone } from '@/lib/volley';
import { useApp } from '@/store/AppProvider';
import { useData } from '@/store/DataProvider';
import { PHASE_LABEL, TIMEOUT_MS, ZONE_LABEL, actionLabel, detailLine, teamNames, useLive } from '@/store/LiveProvider';
import { useLiveLineup } from '@/store/LineupProvider';
import { usePlayer, useScoreHidden } from '@/store/PlayerProvider';
import { palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { LineupPlayer, PointDetail } from '@/types';
import { LiveLogos } from '@/components/LiveLogos';
import { SHOW_CRONACA } from '@/lib/features';

export default function Live() {
  const { c, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const live = useLive();
  const m = live.match;
  const lineup = useLiveLineup();
  const { user } = useApp();
  const player = usePlayer();
  // video della diretta aperto: il punteggio non si legge (video e livescore FIPAV sono spesso sfasati, niente spoiler)
  const hidden = useScoreHidden();
  // la funzione cronaca-ai accetta solo staff e admin
  const ai = hasSupabase && (user?.role === 'admin' || user?.role === 'staff');
  // dalla notifica "Vota MVP" la diretta si apre sulla scheda del voto
  const { scheda } = useLocalSearchParams<{ scheda?: string }>();
  const [panel, setPanel] = useState<'formazioni' | 'cronaca' | 'mvp' | 'statistiche'>(scheda === 'mvp' ? 'mvp' : 'formazioni');
  // schermata già aperta e nuova notifica: si passa alla scheda del voto
  const [seenScheda, setSeenScheda] = useState(scheda);
  if (scheda !== seenScheda) {
    setSeenScheda(scheda);
    if (scheda === 'mvp') setPanel('mvp');
  }
  // quattro schede: a larghezza piena solo se le etichette ci stanno, altrimenti scorrono
  const wide = useWindowDimensions().width >= 480;
  // riquadro del punto aperto dal pulsante + di una squadra
  const [picker, setPicker] = useState<{ side: 'us' | 'opp'; name: string; anchor: Anchor } | null>(null);
  // cronaca: azioni filtrate per set ('all' = tutti)
  const [feedSet, setFeedSet] = useState('all');
  // il video della diretta parte solo dal pulsante "Guarda la diretta", mai da solo all'apertura della schermata

  // Ricaricamento della diretta: partite (con quella in corso) e classifica, poi punteggio, set e cronaca.
  // Un solo caricamento alla volta: chi arriva mentre è in corso aspetta quello (niente query doppie).
  const refreshData = useData().refresh;
  const refreshLive = live.refresh;
  const inFlight = useRef<Promise<void> | null>(null);
  // a ogni ricaricamento cambia: la sezione Attacco rilegge il tabellino
  const [reloadKey, setReloadKey] = useState(0);
  const loadLiveData = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    setReloadKey((k) => k + 1);
    const run = Promise.all([refreshData(), refreshLive()])
      .then(() => {})
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = run;
    return run;
  }, [refreshData, refreshLive]);
  // trascinando verso il basso: lo spinner si chiude sempre, anche se la lettura non riesce
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await loadLiveData();
    } catch (e) {
      console.warn('Diretta non aggiornata', e);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, loadLiveData]);
  // all'apertura e quando l'app torna dal background (su iOS la connessione Realtime cade): si rilegge tutto
  useEffect(() => {
    const silent = () => loadLiveData().catch((e: unknown) => console.warn('Diretta non aggiornata', e));
    silent();
    let prev = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (prev === 'background' && next === 'active') silent();
      prev = next;
    });
    return () => sub.remove();
  }, [loadLiveData]);
  // colori sociali: giallo sul fondo scuro, blu sul chiaro (iOS); su Android freccia gialla e blu su cerchio blu notte
  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={mode === 'dark' ? palette.gold : palette.blue}
      colors={[palette.gold, palette.blue]} progressBackgroundColor={palette.navy} />
  );

  if (!m) {
    return (
      // scorrevole solo per il pull-to-refresh: il contenuto resta centrato come prima
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} refreshControl={refreshControl}
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.sm }}>
        <Volleyball size={30} color={c.accent} />
        <Txt w={700} size={18}>Nessuna partita in diretta</Txt>
        <Txt color="muted" center>Quando una partita è in corso la trovi qui, punto per punto.</Txt>
      </ScrollView>
    );
  }

  const home = m.homeAway === 'casa';
  // nella demo può giocare un'altra squadra al posto di Smapiù
  const us = m.usName ?? US;
  const L = { name: home ? us : m.opponent, logo: home ? null : m.opponentLogo, pts: home ? live.our : live.opp, sets: home ? live.ourSets : live.oppSets, serving: (live.serving === 'us') === home, side: (home ? 'us' : 'opp') as 'us' | 'opp' };
  const R = { name: home ? m.opponent : us, logo: home ? m.opponentLogo : null, pts: home ? live.opp : live.our, sets: home ? live.oppSets : live.ourSets, serving: (live.serving === 'us') !== home, side: (home ? 'opp' : 'us') as 'us' | 'opp' };
  // a partita finita lo storico contiene già tutti i set
  const rowsSets = live.finished ? live.history : [...live.history, { our: live.our, opp: live.opp }];
  // al servizio va chi è in zona I dopo le rotazioni del set: col nome si controlla che la rotazione sia giusta
  const serverOf = (side: 'us' | 'opp') => onCourt(side).find((p) => p.zone === 1) ?? null;
  // punti totali della partita (tutti i set), per le statistiche di squadra
  const totals = { us: rowsSets.reduce((n, s) => n + s.our, 0), opp: rowsSets.reduce((n, s) => n + s.opp, 0) };
  const pts = (side: 'us' | 'opp') => (side === 'us' ? live.standing?.our : live.standing?.opp) ?? 0;
  // posizioni attuali in campo: solo nel riquadro del punto, nelle formazioni resta lo Starting Six
  const onCourt = (side: 'us' | 'opp'): LineupPlayer[] => (side === 'us' ? lineup.us : lineup.opp)
    .map((p) => (p.zone == null ? p : { ...p, zone: rotateZone(p.zone, live.rotation[side]) }));
  // un set che non c'è più (es. demo ricominciata) torna a tutti
  const shownSet = feedSet !== 'all' && Number(feedSet) <= rowsSets.length ? Number(feedSet) : null;
  const feed = shownSet ? live.events.filter((e) => e.set === shownSet) : live.events;
  // chi entra prende la zona dello Starting Six di chi esce (le rotazioni del set restano)
  const substitute = (sub: { in: LineupPlayer; out: LineupPlayer }) => {
    const base = (sub.out.team === 'us' ? lineup.us : lineup.opp).find((p) => p.id === sub.out.id)?.zone;
    if (base != null) lineup.moveToZone(sub.in, base);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* il video resta fisso in alto mentre sotto scorrono punteggio e cronaca */}
      <PlayerSlot />
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} refreshControl={refreshControl} contentContainerStyle={{ padding: space.md, gap: space.md, paddingBottom: insets.bottom + space.xl, width: '100%', maxWidth: 900, alignSelf: 'center' }}>
        <Card style={{ gap: space.md, borderColor: 'rgba(255,213,3,0.5)', borderWidth: 1.5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm }}>
            {live.finished ? <Trophy size={14} color={c.accent} /> : <LiveDot />}
            <Txt w={700} size={13} color={live.finished ? 'accent' : 'live'}>{live.finished ? 'Finale' : 'In diretta'}</Txt>
            <Txt size={13} color="muted" numberOfLines={1} style={{ flexShrink: 1 }}>· {m.venue}</Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Side {...L} flash={!hidden && live.lastPoint?.side === L.side ? live.lastPoint.key : 0} serving={L.serving && !live.finished} server={serverOf(L.side)}
              onServe={live.canChooseServe ? () => live.chooseServe(L.side) : undefined}
              onPlus={live.canScore ? (anchor) => setPicker({ side: L.side, name: L.name, anchor }) : undefined} locked={!!live.timeout} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingTop: space.sm }}>
              {hidden ? <HiddenScore width={52} height={56} radius={12} /> : <AnimatedNumber value={live.finished ? L.sets : L.pts} size={48} />}
              <Txt w={400} size={34} color="accent">:</Txt>
              {hidden ? <HiddenScore width={52} height={56} radius={12} /> : <AnimatedNumber value={live.finished ? R.sets : R.pts} size={48} />}
            </View>
            <Side {...R} flash={!hidden && live.lastPoint?.side === R.side ? live.lastPoint.key : 0} serving={R.serving && !live.finished} server={serverOf(R.side)}
              onServe={live.canChooseServe ? () => live.chooseServe(R.side) : undefined}
              onPlus={live.canScore ? (anchor) => setPicker({ side: R.side, name: R.name, anchor }) : undefined} locked={!!live.timeout} />
          </View>

          {live.timeout ? <TimeoutBanner team={live.timeout.side === L.side ? L.name : R.name} until={live.timeout.until} /> : null}

          {live.standing && !hidden ? (
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm, padding: space.md, borderRadius: 16, backgroundColor: c.fill }}>
              <Txt size={13} color="muted">Punti in classifica</Txt>
              <Txt w={800} size={13} tnum>{pts(L.side)} – {pts(R.side)}</Txt>
            </View>
          ) : null}
  
          <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: space.md }}>
            <View style={{ flexDirection: 'row' }}>
              <Txt size={12} color="muted" style={{ flex: 1 }}> </Txt>
              {rowsSets.map((_, i) => (
                <Txt key={i} w={600} size={11} center color={i === rowsSets.length - 1 && !live.finished ? 'accent' : 'muted'} style={{ width: 34 }}>{i + 1}°</Txt>
              ))}
            </View>
            {[L, R].map((t) => (
              <View key={t.name} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: c.line }}>
                <Txt w={700} size={12} numberOfLines={2} style={{ flex: 1, paddingRight: space.sm }}>{t.name}</Txt>
                {rowsSets.map((s, i) => {
                  const mine = t.side === 'us' ? s.our : s.opp;
                  const theirs = t.side === 'us' ? s.opp : s.our;
                  const current = i === rowsSets.length - 1 && !live.finished;
                  // oscurato: niente punti né set vinti evidenziati
                  const won = !hidden && !current && mine > theirs;
                  return hidden ? (
                    <View key={i} style={{ width: 34, alignItems: 'center' }}><HiddenScore width={26} height={22} radius={6} /></View>
                  ) : (
                    <Txt key={i} w={won || current ? 800 : 400} size={13} center tnum color={won ? 'accent' : 'text'}
                      style={{ width: 34, backgroundColor: current ? c.fill : undefined, paddingVertical: space.xs, borderRadius: 6 }}>{mine}</Txt>
                  );
                })}
              </View>
            ))}
          </View>
  
          <View style={{ gap: space.sm, alignItems: 'center' }}>
            {m.youtubeLiveId ? (
              <Button label={hidden ? 'Diretta aperta' : 'Guarda la diretta'} sublabel={hidden ? '(punteggio oscurato)' : undefined} variant="gold" icon={<LiveLogos />}
                onPress={() => player.open(m.youtubeLiveId!, `${L.name} – ${R.name}`)} />
            ) : null}
            <View style={{ alignSelf: 'stretch' }}><AgentScoresTicker /></View>
            {live.canChooseServe ? (
              <Txt size={12} color="muted" center>Inizio set: tocca lo stemma della squadra che va al servizio.</Txt>
            ) : null}
            {live.canScore ? (
              <Txt size={12} color="muted" center>
                {live.autoScore
                  ? 'Punteggio automatico dal livescore FIPAV. Admin: tocca + per raccontare un\'azione in cronaca, senza assegnare punti.'
                  : 'Partita dimostrativa: tocca + per assegnare il punto e scegliere l\'azione.'}
              </Txt>
            ) : null}
            {live.saveError ? <Txt size={12} color="live" center>{live.saveError}</Txt> : null}
            {m.demoLive && live.finished && live.canResetDemo ? (
              <Button size="sm" label="Ricomincia la demo" icon={<RotateCcw size={14} color={c.text} />} onPress={live.resetDemo} />
            ) : null}
          </View>
        </Card>
  
        {/* schede sotto il punteggio: formazioni, cronaca (l'ultima azione è in alto), voto MVP e statistiche */}
        <Card style={{ gap: space.xs }}>
          <View style={{ marginBottom: space.sm }}>
            <SegmentedControl stretch={wide} value={panel} onChange={setPanel}
              options={[{ value: 'formazioni', label: 'Formazioni' }, ...(SHOW_CRONACA ? [{ value: 'cronaca' as const, label: 'Cronaca' }] : []), { value: 'mvp', label: 'Vota MVP' }, { value: 'statistiche', label: 'Statistiche' }]} />
          </View>
          {panel === 'formazioni' ? (
            <LineupPanel lineup={lineup} teams={[L, R].map((t) => ({ team: t.side, name: t.name, logo: t.logo, players: t.side === 'us' ? lineup.us : lineup.opp }))} />
          ) : SHOW_CRONACA && panel === 'cronaca' ? (
            <View style={{ gap: space.sm }}>
              {/* cronaca dal video: solo chi segna i punti */}
              {live.canScore ? (
                <VoiceCommentary onPublish={live.addNote} disabled={!!live.timeout}
                  context={`${L.name} contro ${R.name}. Giocatrici: ${[...lineup.us, ...lineup.opp].map((p) => p.name).join(', ')}.`} />
              ) : null}
              {rowsSets.length > 1 ? (
                // dal 4° set le etichette non stanno in larghezza: il filtro diventa scorrevole
                <SegmentedControl stretch={rowsSets.length <= 3} value={shownSet ? String(shownSet) : 'all'} onChange={setFeedSet}
                  options={[{ value: 'all', label: 'Tutti' }, ...rowsSets.map((_, i) => ({ value: String(i + 1), label: i === 4 ? 'Tie-break' : `${i + 1}° set` }))]} />
              ) : null}
              <Txt size={12.5} color="muted" tnum>{feed.length} {feed.length === 1 ? 'azione' : 'azioni'}</Txt>
              {feed.length ? (
                <View>
                  {feed.map((e, i) => (
                    <FeedItem key={e.id} first={i === 0} last={i === feed.length - 1} us={e.side === 'us'} meta={`${e.set}° set, ${e.our}–${e.opp}`} text={e.text} detail={e.detail} />
                  ))}
                </View>
              ) : (
                <Txt size={13} color="muted">{shownSet ? 'Nessuna azione in questo set.' : 'Nessuna azione ancora.'}</Txt>
              )}
            </View>
          ) : panel === 'mvp' ? (
            <MvpPanel key={m.id} match={m} awayMatch={!home} events={live.events} set={live.set} finished={live.finished}
              teams={[L, R].map((t) => ({ side: t.side, name: t.name, logo: t.logo, players: t.side === 'us' ? lineup.us : lineup.opp }))} />
          ) : (
            <StatsPanel events={live.events} names={{ us, opp: m.opponent }} logos={{ us: null, opp: m.opponentLogo }} totals={totals} home={home ? 'us' : 'opp'}
              sets={rowsSets.length} current={live.finished ? live.history.length : live.set} />
          )}
        </Card>
  
        {/* punti in attacco dal tabellino DataVolley (fonte ufficiale, separata dai punti inseriti a mano) */}
        {hasSupabase && !m.demoLive ? (
          <Card>
            <AttaccoPanel matchId={m.id} names={{ us, opp: m.opponent }} canUpload={ai} reloadKey={reloadKey}
              // proposta: il set appena chiuso; a partita finita il foglio finale
              suggestedSet={live.finished ? null : Math.max(1, live.history.length)} />
          </Card>
        ) : null}

        {picker ? (
          <PointPicker anchor={picker.anchor} side={picker.side} team={picker.name} names={{ us, opp: m.opponent }}
            players={onCourt(picker.side)} rotation={live.rotation[picker.side]} score={{ set: live.set, our: live.our, opp: live.opp }} ai={ai} commentOnly={live.autoScore}
            // punteggio automatico: l'azione diventa una riga di cronaca, senza dettaglio (niente punti alle giocatrici)
            onScore={(detail) => (live.autoScore ? detail && live.addNote(detail.text?.trim() || detailLine(picker.side, detail, teamNames(m)), picker.side) : live.addPoint(picker.side, detail))} onClose={() => setPicker(null)}
            notes={lineup.canEdit ? ['timeout', 'cambio'] : ['timeout']}
            onNote={(kind, text, sub) => {
              if (kind === 'timeout') live.callTimeout(text, picker.side);
              else if (live.addNote(text, picker.side) && sub) substitute(sub);
            }} />
        ) : null}
      </ScrollView>
    </View>
  );
}

/** onServe: sullo 0-0 del set (admin) il tocco sullo stemma mette la squadra al servizio */
/** locked: timeout in corso, il + resta visibile ma non si tocca */
function Side({ name, logo, serving, server, flash, onPlus, onServe, locked }: { name: string; logo?: string | number | null; serving: boolean; server: LineupPlayer | null; flash: number; onPlus?: (anchor: Anchor) => void; onServe?: () => void; locked?: boolean }) {
  const { c } = useTheme();
  const plusRef = useRef<HostInstance>(null);
  const plus = useState(() => new Animated.Value(0))[0];
  const pop = useState(() => new Animated.Value(1))[0];
  // il punto già segnato prima di aprire la schermata non va rianimato: solo quelli nuovi
  const seen = useRef(flash);
  useEffect(() => {
    if (!flash || flash === seen.current) return;
    seen.current = flash;
    plus.setValue(0);
    Animated.timing(plus, { toValue: 1, duration: 900, useNativeDriver: true }).start();
    pop.setValue(0.85);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }).start();
  }, [flash, plus, pop]);
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: space.sm }}>
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Pressy onPress={onServe} disabled={!onServe} scaleTo={0.9} accessibilityRole={onServe ? 'button' : undefined}
          accessibilityLabel={onServe ? `${name} al servizio` : undefined} accessibilityState={onServe ? { selected: serving } : undefined}
          style={{ borderRadius: 30, padding: space.xs, borderWidth: 2, borderColor: onServe && serving ? palette.gold : 'transparent' }}>
          <TeamBadge name={name} logo={logo} size={52} />
        </Pressy>
      </Animated.View>
      <Animated.Text style={{ position: 'absolute', top: -6, fontSize: 26, fontWeight: '900', color: palette.gold, opacity: plus.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }), transform: [{ translateY: plus.interpolate({ inputRange: [0, 1], outputRange: [10, -40] }) }] }}>
        +1
      </Animated.Text>
      {/* altezza fissa di due righe: i pulsanti + restano allineati anche con nomi di lunghezza diversa */}
      <Txt w={700} size={12.5} center numberOfLines={2} style={{ paddingHorizontal: space.xs, minHeight: 33 }}>{name}</Txt>
      <View style={{ alignItems: 'center', opacity: serving ? 1 : 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Volleyball size={13} color={c.accent} />
          <Txt w={600} size={12}>Al servizio</Txt>
        </View>
        {/* riga sempre presente (anche vuota): i pulsanti + restano allineati tra le due squadre */}
        <Txt size={11.5} color="muted" center numberOfLines={1} style={{ paddingHorizontal: space.xs }}>
          {server ? `${server.number != null ? `#${server.number} ` : ''}${server.name}` : ' '}
        </Txt>
      </View>
      {onPlus ? (
        // la posizione del + in finestra serve al riquadro del punto per aprirsi da lì
        <View ref={plusRef} collapsable={false}>
          <Pressy onPress={() => plusRef.current?.measureInWindow((x, y, w, h) => onPlus({ x, y, w, h }))} scaleTo={0.88} disabled={locked}
            accessibilityRole="button" accessibilityLabel={`Punto ${name}`} accessibilityState={{ disabled: !!locked }}
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold, opacity: locked ? 0.35 : 1 }}>
            <Plus size={22} color={palette.onGold} strokeWidth={3} />
          </Pressy>
        </View>
      ) : null}
    </View>
  );
}

function FeedItem({ meta, text, detail, us, first, last }: { meta: string; text: string; detail?: PointDetail | null; us: boolean; first: boolean; last: boolean }) {
  const { c } = useTheme();
  const anim = useState(() => new Animated.Value(first ? 0 : 1))[0];
  useEffect(() => {
    if (first) Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }).start();
  }, [first, anim]);
  return (
    <Animated.View style={{ flexDirection: 'row', gap: space.md, paddingVertical: space.sm, opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }] }}>
      <View style={{ alignItems: 'center', width: 14 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, marginTop: space.xs, backgroundColor: us ? palette.gold : c.muted }} />
        {!last ? <View style={{ flex: 1, width: 2, backgroundColor: c.line, marginTop: space.xs }} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Txt w={600} size={12} color="muted" tnum>{meta}</Txt>
        <Txt size={14}>{text}</Txt>
        {detail ? (
          // azione tecnica registrata: tipo, fase, posizione, giocatrice
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs }}>
            {[actionLabel(detail.action), PHASE_LABEL[detail.phase], detail.zone ? `Zona ${ZONE_LABEL[detail.zone]}` : null, detail.player?.name ?? null]
              .filter((x): x is string => !!x)
              .map((x) => (
                <View key={x} style={{ paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: 6, backgroundColor: c.fill }}>
                  <Txt w={600} size={11} color="muted">{x}</Txt>
                </View>
              ))}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** Timeout in corso: secondi che mancano e barra che si svuota; intanto punti e cronaca sono bloccati */
function TimeoutBanner({ team, until }: { team: string; until: number }) {
  const { c } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, until - now);
  return (
    <View accessibilityLiveRegion="polite" style={{ gap: space.sm, padding: space.md, borderRadius: 16, backgroundColor: 'rgba(255,213,3,0.12)', borderWidth: 1, borderColor: palette.gold }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Timer size={16} color={c.accent} />
        <Txt w={700} size={13} numberOfLines={1} style={{ flex: 1 }}>Timeout {team}</Txt>
        <Txt w={800} size={15} tnum>0:{String(Math.ceil(left / 1000)).padStart(2, '0')}</Txt>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: c.fill, overflow: 'hidden' }}>
        <View style={{ height: 4, width: `${(left / TIMEOUT_MS) * 100}%`, backgroundColor: palette.gold }} />
      </View>
      <Txt size={12} color="muted">Fino alla fine del timeout non si possono inserire punti, timeout o cambi.</Txt>
    </View>
  );
}
