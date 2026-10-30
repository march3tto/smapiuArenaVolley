import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ClipboardList, RefreshCw, X } from 'lucide-react-native';
import { Button } from './Button';
import { Pressy } from './Pressy';
import { SearchField, matchesPlayer } from './SearchField';
import { TeamSwitch } from './TeamSwitch';
import { Txt } from './Txt';
import { rotationName } from '@/lib/rotations';
import { STARTERS, type Lineup } from '@/store/useLineup';
import { blue, palette, radius, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { ImgSrc, LineupPlayer, PlayerRole } from '@/types';

export const ROLE_LABEL: Record<PlayerRole, string> = { palleggiatrice: 'Palleggiatrice', schiacciatrice: 'Schiacciatrice', centrale: 'Centrale', opposto: 'Opposto', libero: 'Libero' };
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
/** Metà campo vista da dietro: rete in alto, prima linea 4-3-2, seconda linea 5-6-1 */
const ROWS = [[4, 3, 2], [5, 6, 1]];
/** Campo color panna */
const COURT = { bg: '#F6EFDF', line: 'rgba(11,49,102,0.28)', zone: 'rgba(11,49,102,0.4)', net: blue[800], text: blue[900] };

const surname = (name: string) => name.split(' ').slice(-1)[0] ?? name;

interface TeamProps {
  players: LineupPlayer[];
  team: 'us' | 'opp';
  name: string;
  logo?: ImgSrc | null;
}

/**
 * Formazione di una squadra alla volta: l'interruttore in alto sceglie tra le due (nello stesso ordine del tabellone, si parte dalla nostra),
 * sotto la ricerca per nome o numero, che filtra l'elenco (il campo resta completo), poi giocatrici a referto e Starting Six sul campo.
 */
export function LineupPanel({ lineup, teams }: { lineup: Lineup; teams: TeamProps[] }) {
  const [team, setTeam] = useState<TeamProps['team']>('us');
  const [query, setQuery] = useState('');
  const shown = teams.find((t) => t.team === team) ?? teams[0];
  const side = (t: TeamProps) => ({ value: t.team, name: t.name, logo: t.logo });
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.sm }}>
        {teams.length === 2 ? <TeamSwitch left={side(teams[0])} right={side(teams[1])} value={shown.team} onChange={setTeam} /> : null}
        <SearchField value={query} onChange={setQuery} placeholder="Cerca per nome o numero" label="Cerca una giocatrice per nome o numero di maglia" />
      </View>
      {shown ? <TeamLineup key={shown.team} {...shown} lineup={lineup} query={query} /> : null}
      {lineup.error ? <Txt size={12.5} color="danger">{lineup.error}</Txt> : null}
      <TagLegend />
      {lineup.canEdit ? (
        <Txt size={12} color="muted">Tocca una giocatrice dell&apos;elenco per metterla nello Starting Six (prima zona libera, I al servizio): alla sesta, con palleggiatrice, opposto, due schiacciatrici e due centrali, lo schieramento va in P1. Il tasto di rotazione accanto a Starting Six passa da P1 a P6, P5, P4, P3, P2. Per sistemare le posizioni tocca una giocatrice in campo e poi un&apos;altra zona: si scambiano. Con una giocatrice in campo selezionata, toccane una in panchina per farla entrare al suo posto: anche il libero, ad esempio al posto di una schiacciatrice in difesa. C sceglie la capitana, L il libero (ruolo Libero); numeri, nomi e giocatrici si cambiano da Modifica.</Txt>
      ) : null}
    </View>
  );
}

function TeamLineup({ players, team, name, lineup, query }: TeamProps & { lineup: Lineup; query: string }) {
  const { c } = useTheme();
  const router = useRouter();
  const starters = players.filter((p) => p.zone != null).length;
  // nome della rotazione dalla zona della palleggiatrice (P1 = al servizio)
  const rotation = rotationName([1, 2, 3, 4, 5, 6].map((z) => players.find((p) => p.zone === z)?.id ?? null),
    (id) => players.find((p) => p.id === id)?.role);
  // tap-tap: primo tocco su una giocatrice in campo, secondo su un'altra zona (o su una giocatrice in panchina) e si scambiano
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = players.find((p) => p.id === selectedId && p.zone != null) ?? null;
  const tapZone = (zone: number, p?: LineupPlayer) => {
    if (!selected) {
      setSelectedId(p?.id ?? null);
      return;
    }
    if (selected.id !== p?.id) lineup.moveToZone(selected, zone);
    setSelectedId(null);
  };
  const tapRow = (p: LineupPlayer) => {
    if (selected && p.id !== selected.id) lineup.moveToZone(p, selected.zone!);
    else if (!selected) lineup.toggleStarter(p);
    setSelectedId(null);
  };
  // la scheda giocatrice c'è solo per la nostra rosa; chi modifica la formazione usa il tocco per lo Starting Six, C e L per capitana e libero
  const open = (p: LineupPlayer) => (!lineup.canEdit && team === 'us' && p.playerId
    ? () => router.push({ pathname: '/player/[id]', params: { id: p.playerId! } })
    : undefined);
  const listed = players.filter((p) => matchesPlayer(p, query));
  return (
    <View style={{ gap: space.sm }}>
      {players.length && !listed.length ? (
        <Txt size={13} color="muted" center>Nessuna giocatrice trovata.</Txt>
      ) : players.length ? (
        <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
          {listed.map((p, i) => (
            <PlayerRow key={p.id} p={p} first={i === 0} onPress={lineup.canEdit ? () => tapRow(p) : open(p)} pressRole={lineup.canEdit ? 'button' : 'link'}
              selected={lineup.canEdit ? p.id === selected?.id : undefined}
              onCaptain={lineup.canEdit ? () => lineup.toggleCaptain(p) : undefined} captainSet={players.some((x) => x.isCaptain)}
              onLibero={lineup.canEdit ? () => lineup.toggleLibero(p) : undefined} />
          ))}
        </View>
      ) : (
        <Txt size={13} color="muted" center>
          {lineup.loading ? 'Caricamento formazione…' : team === 'opp' ? 'Formazione avversaria non ancora inserita.' : 'Rosa non disponibile.'}
        </Txt>
      )}

      {lineup.canEdit ? (
        <Button size="sm" label={players.length ? 'Modifica' : 'Inserisci formazione'} icon={<ClipboardList size={15} color={c.text} />}
          onPress={() => router.push({ pathname: '/formazione/[squadra]', params: { squadra: team === 'us' ? 'nostra' : 'avversaria' } })} />
      ) : null}

      <View style={{ gap: space.sm, marginTop: space.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, minHeight: 28 }}>
          <Txt w={700} size={11.5} color={starters === STARTERS ? 'accent' : 'muted'} tnum>
            Starting Six {starters}/{STARTERS}{rotation ? ` · ${rotation}` : ''}
          </Txt>
          {lineup.canEdit && starters ? (
            // una rotazione a ogni tocco: P1 → P6 → P5 → P4 → P3 → P2 → P1
            <Pressy onPress={() => {
              setSelectedId(null);
              lineup.rotateStarters(team);
            }} scaleTo={0.85} hitSlop={8} accessibilityRole="button"
              accessibilityLabel={`Ruota lo Starting Six di ${name}${rotation ? `, ora in ${rotation}` : ''}`}
              style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.lineStrong }}>
              <RefreshCw size={14} color={c.text} />
            </Pressy>
          ) : null}
        </View>
        <Court players={players} big selectedId={selected?.id} onZone={lineup.canEdit ? tapZone : undefined} />
        {selected ? (
          <Txt size={11} color="accent" center numberOfLines={2}>{surname(selected.name)} selezionata: tocca la zona o la giocatrice con cui scambiarla</Txt>
        ) : null}
        <LiberoLine player={players.find((p) => p.isLibero)} />
      </View>
    </View>
  );
}

/**
 * Metà campo con lo Starting Six; con onPick le giocatrici si toccano (selezionata = selectedId).
 * onZone: si toccano tutte le zone, anche quelle vuote (scambio delle posizioni).
 */
export function Court({ players, big, selectedId, onPick, onZone }: { players: LineupPlayer[]; big?: boolean; selectedId?: string | null; onPick?: (p: LineupPlayer) => void; onZone?: (zone: number, p?: LineupPlayer) => void }) {
  const at = (z: number) => players.find((p) => p.zone === z);
  return (
    <View accessibilityLabel="Starting Six in campo" style={{ width: '100%', maxWidth: big ? 300 : 200, alignSelf: 'center' }}>
      <View style={{ height: 4, marginHorizontal: -3, borderRadius: 2, backgroundColor: COURT.net }} />
      <View style={{ backgroundColor: COURT.bg, borderWidth: 1.5, borderTopWidth: 0, borderColor: COURT.line, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }}>
        {ROWS.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', height: (r === 0 ? 52 : 64) * (big ? 1.25 : 1), borderTopWidth: r ? 1.5 : 0, borderTopColor: COURT.line }}>
            {row.map((z) => {
              const p = at(z);
              const on = !!p && p.id === selectedId;
              const press = onZone ? () => onZone(z, p) : p && onPick ? () => onPick(p) : undefined;
              // con una giocatrice selezionata anche le zone vuote si possono toccare: le si indica con un bordo
              const target = !!onZone && !!selectedId && !on;
              return (
                <Pressable key={z} disabled={!press} onPress={press}
                  accessibilityRole={press ? 'button' : undefined} accessibilityState={onPick || onZone ? { selected: on } : undefined}
                  accessibilityLabel={p ? `${p.name}, posizione ${ROMAN[z]}` : `Posizione ${ROMAN[z]} libera`}
                  style={({ pressed }) => ({ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xs, paddingHorizontal: space.xs, margin: space.xs, borderRadius: 8,
                    borderWidth: 1.5, borderStyle: 'dashed', borderColor: target ? COURT.zone : 'transparent',
                    backgroundColor: on ? 'rgba(255,213,3,0.45)' : pressed ? 'rgba(11,49,102,0.08)' : undefined })}>
                  <Txt w={700} size={8.5} color={COURT.zone} style={{ position: 'absolute', top: 0, left: 2 }}>{ROMAN[z]}</Txt>
                  {p ? (
                    <>
                      <NumberTag value={p.number} variant={p.isLibero ? 'libero' : 'court'} size={big ? 28 : 22} />
                      <Txt w={600} size={big ? 11 : 9.5} color={COURT.text} numberOfLines={1}>{surname(p.name)}</Txt>
                    </>
                  ) : (
                    <Txt size={14} color={COURT.zone}>—</Txt>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Libero sotto il campo: entra al posto delle giocatrici di seconda linea */
function LiberoLine({ player }: { player?: LineupPlayer }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, minHeight: 24 }}>
      <Txt w={700} size={11} color="muted">Libero</Txt>
      {player ? (
        <>
          <NumberTag value={player.number} variant="libero" size={20} />
          <Txt w={600} size={11.5} numberOfLines={1} style={{ flexShrink: 1 }}>{surname(player.name)}</Txt>
        </>
      ) : (
        <Txt size={11.5} color="muted">non scelto</Txt>
      )}
    </View>
  );
}

/** Numero di maglia: piastrina arrotondata con il numero nel font dei titoli */
export function NumberTag({ value, variant, size = 26 }: { value: number | null; variant: TagVariant; size?: number }) {
  const { c } = useTheme();
  const look = {
    court: { bg: blue[800], border: blue[800], fg: palette.gold },
    starter: { bg: palette.gold, border: palette.gold, fg: palette.onGold },
    bench: { bg: 'transparent', border: c.lineStrong, fg: c.text },
    // il libero ha la maglia di un altro colore
    libero: { bg: palette.blue, border: palette.blue, fg: palette.white },
    // capitana: maglia blu notte con bordo e numero oro
    captain: { bg: palette.navy, border: palette.gold, fg: palette.gold },
  }[variant];
  return (
    <View style={{ minWidth: size, height: size, paddingHorizontal: space.xs, borderRadius: Math.round(size * 0.3), borderWidth: 1.5, borderColor: look.border, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Txt w={800} display size={Math.round(size * 0.56)} color={look.fg} tnum style={{ lineHeight: Math.round(size * 0.62) }}>{value ?? '–'}</Txt>
    </View>
  );
}

type TagVariant = 'court' | 'starter' | 'bench' | 'libero' | 'captain';

/** Colore del numero nell'elenco: libero e capitana hanno il loro, poi titolari e panchina */
export const tagVariant = (p: LineupPlayer): TagVariant =>
  (p.isLibero ? 'libero' : p.isCaptain ? 'captain' : p.zone != null ? 'starter' : 'bench');

/** Legenda dei colori del numero di maglia */
export function TagLegend() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
      {([['starter', 'Titolare'], ['captain', 'Capitana'], ['libero', 'Libero']] as const).map(([v, label]) => (
        <View key={v} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <NumberTag value={null} variant={v} size={16} />
          <Txt size={11.5} color="muted">{label}</Txt>
        </View>
      ))}
    </View>
  );
}

/**
 * Riga giocatrice. onPress: tocco sulla riga (Starting Six, scheda giocatrice o selezione per la modifica).
 * onLibero / onCaptain: pulsanti L e C (solo per chi modifica la formazione); C su tutte finché la squadra non ha una capitana, poi solo su di lei.
 */
export function PlayerRow({ p, first, onPress, pressRole, selected, onLibero, onCaptain, captainSet, onRemove }: {
  p: LineupPlayer; first: boolean; onPress?: () => void; pressRole?: 'button' | 'link'; selected?: boolean;
  onLibero?: () => void; onCaptain?: () => void; captainSet?: boolean; onRemove?: () => void;
}) {
  const { c } = useTheme();
  const starter = p.zone != null;
  const liberoButton = !!onLibero && (p.role === 'libero' || p.isLibero);
  const captainButton = !!onCaptain && (p.isCaptain || !captainSet);
  // i pulsanti C, L e X stanno accanto alla parte toccabile, non dentro (sul web un pulsante non può contenerne un altro)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: space.sm, borderTopWidth: first ? 0 : 1, borderTopColor: c.line,
      backgroundColor: selected ? 'rgba(255,213,3,0.14)' : starter ? c.fill : undefined }}>
      <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? pressRole ?? 'button' : undefined} accessibilityState={selected != null ? { selected } : undefined}
        accessibilityLabel={`${p.name}${p.isCaptain ? ', capitana' : ''}${p.isLibero ? ', libero' : ''}${starter ? `, titolare in posizione ${ROMAN[p.zone ?? 0]}` : ''}`}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.sm, paddingVertical: space.sm, backgroundColor: pressed ? c.fill2 : undefined })}>
        <NumberTag value={p.number} variant={tagVariant(p)} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt w={600} size={13} numberOfLines={1}>{p.name}</Txt>
          {/* la posizione si vede solo sul campo */}
          {p.role ? <Txt size={11} color="muted" numberOfLines={1}>{ROLE_LABEL[p.role]}</Txt> : null}
        </View>
      </Pressable>
      {captainButton ? (
        <RoundToggle label="C" on={p.isCaptain} color={palette.gold} fg={palette.onGold} onPress={onCaptain!}
          a11y={p.isCaptain ? `Togli a ${p.name} la fascia di capitana` : `Scegli ${p.name} come capitana`} />
      ) : null}
      {/* L solo per le giocatrici con ruolo Libero (o per togliere un libero già scelto) */}
      {liberoButton ? (
        <RoundToggle label="L" on={p.isLibero} color={palette.blue} fg={palette.white} onPress={onLibero!}
          a11y={p.isLibero ? `Togli ${p.name} dal ruolo di libero` : `Scegli ${p.name} come libero`} />
      ) : null}
      {onRemove ? (
        <Pressy onPress={onRemove} scaleTo={0.85} accessibilityRole="button" accessibilityLabel={`Togli ${p.name}`} style={{ padding: space.xs }}>
          <X size={16} color={c.muted} />
        </Pressy>
      ) : null}
    </View>
  );
}

/** Pulsante tondo con una lettera (C capitana, L libero): pieno quando attivo */
function RoundToggle({ label, on, color, fg, onPress, a11y }: { label: string; on: boolean; color: string; fg: string; onPress: () => void; a11y: string }) {
  const { c } = useTheme();
  return (
    <Pressy onPress={onPress} scaleTo={0.85} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={a11y}
      style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
        borderColor: on ? color : c.lineStrong, backgroundColor: on ? color : undefined }}>
      <Txt w={800} size={10.5} display={false} color={on ? fg : 'muted'} style={{ lineHeight: 12 }}>{label}</Txt>
    </Pressy>
  );
}
