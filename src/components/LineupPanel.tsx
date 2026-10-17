import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ClipboardList, X } from 'lucide-react-native';
import { Button } from './Button';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { STARTERS, type Lineup } from '@/store/useLineup';
import { brand, palette, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { LineupPlayer, PlayerRole } from '@/types';

export const ROLE_LABEL: Record<PlayerRole, string> = { palleggiatrice: 'Palleggiatrice', schiacciatrice: 'Schiacciatrice', centrale: 'Centrale', opposto: 'Opposto', libero: 'Libero' };
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
/** Metà campo vista da dietro: rete in alto, prima linea 4-3-2, seconda linea 5-6-1 */
const ROWS = [[4, 3, 2], [5, 6, 1]];
/** Campo color panna */
const COURT = { bg: '#F6EFDF', line: 'rgba(11,49,102,0.28)', zone: 'rgba(11,49,102,0.4)', net: brand.bluScuro, text: brand.inchiostro };

const surname = (name: string) => name.split(' ').slice(-1)[0] ?? name;

interface TeamProps {
  players: LineupPlayer[];
  team: 'us' | 'opp';
}

/** Formazioni delle due squadre affiancate, nello stesso ordine del tabellone: giocatrici a referto e Starting Six sul campo */
export function LineupPanel({ lineup, teams }: { lineup: Lineup; teams: TeamProps[] }) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        {teams.map((t) => (
          <TeamLineup key={t.team} {...t} lineup={lineup} />
        ))}
      </View>
      {lineup.error ? <Txt size={12.5} color="danger">{lineup.error}</Txt> : null}
      {lineup.canEdit ? (
        <Txt size={12} color="muted">Tocca una giocatrice per metterla nello Starting Six: l'ordine dei tocchi dà le posizioni I-VI (I al servizio). Tocca L su una giocatrice con ruolo Libero per sceglierla come libero della partita.</Txt>
      ) : null}
    </View>
  );
}

function TeamLineup({ players, team, lineup }: TeamProps & { lineup: Lineup }) {
  const { c } = useTheme();
  const router = useRouter();
  const starters = players.filter((p) => p.zone != null).length;
  const editOpp = team === 'opp' && lineup.canEdit;
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
      {players.length ? (
        <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
          {players.map((p, i) => (
            <PlayerRow key={p.id} p={p} first={i === 0} editable={lineup.canEdit} onToggle={() => lineup.toggleStarter(p)} onLibero={() => lineup.toggleLibero(p)} />
          ))}
        </View>
      ) : (
        <Txt size={13} color="muted" center>
          {lineup.loading ? 'Caricamento formazione…' : team === 'opp' ? 'Formazione avversaria non ancora inserita.' : 'Rosa non disponibile.'}
        </Txt>
      )}

      {editOpp ? (
        <Button size="sm" label={players.length ? 'Modifica' : 'Inserisci formazione'} icon={<ClipboardList size={15} color={c.text} />}
          onPress={() => router.push('/formazione-avversaria')} />
      ) : null}

      <View style={{ gap: 6, marginTop: 4 }}>
        <Txt w={700} size={11.5} center color={starters === STARTERS ? 'accent' : 'muted'} tnum>Starting Six {starters}/{STARTERS}</Txt>
        <Court players={players} />
        <LiberoLine player={players.find((p) => p.isLibero)} />
      </View>
    </View>
  );
}

/** Metà campo con lo Starting Six; con onPick le giocatrici si toccano (selezionata = selectedId) */
export function Court({ players, big, selectedId, onPick }: { players: LineupPlayer[]; big?: boolean; selectedId?: string | null; onPick?: (p: LineupPlayer) => void }) {
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
              return (
                <Pressable key={z} disabled={!p || !onPick} onPress={p && onPick ? () => onPick(p) : undefined}
                  accessibilityRole={p && onPick ? 'button' : undefined} accessibilityState={onPick ? { selected: on } : undefined}
                  accessibilityLabel={p ? `${p.name}, posizione ${ROMAN[z]}` : undefined}
                  style={({ pressed }) => ({ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2, margin: 2, borderRadius: 8,
                    backgroundColor: on ? 'rgba(255,213,3,0.45)' : pressed ? 'rgba(11,49,102,0.08)' : undefined })}>
                  <Txt w={700} size={8.5} color={COURT.zone} style={{ position: 'absolute', top: 0, left: 2 }}>{ROMAN[z]}</Txt>
                  {p ? (
                    <>
                      <NumberTag value={p.number} variant="court" size={big ? 28 : 22} />
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
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 24 }}>
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
export function NumberTag({ value, variant, size = 26 }: { value: number | null; variant: 'court' | 'starter' | 'bench' | 'libero'; size?: number }) {
  const { c } = useTheme();
  const look = {
    court: { bg: brand.bluScuro, border: brand.bluScuro, fg: palette.gold },
    starter: { bg: palette.gold, border: palette.gold, fg: palette.onGold },
    bench: { bg: 'transparent', border: c.lineStrong, fg: c.text },
    // il libero ha la maglia di un altro colore
    libero: { bg: palette.blue, border: palette.blue, fg: palette.white },
  }[variant];
  return (
    <View style={{ minWidth: size, height: size, paddingHorizontal: 3, borderRadius: Math.round(size * 0.3), borderWidth: 1.5, borderColor: look.border, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Txt w={800} display size={Math.round(size * 0.56)} color={look.fg} tnum style={{ lineHeight: Math.round(size * 0.62) }}>{value ?? '–'}</Txt>
    </View>
  );
}

/** Capitana: lettera C cerchiata */
function CaptainMark() {
  const { c } = useTheme();
  return (
    <View accessibilityLabel="Capitana" style={{ width: 15, height: 15, borderRadius: 8, borderWidth: 1.5, borderColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
      <Txt w={800} size={8.5} color="accent" display={false} style={{ lineHeight: 10 }}>C</Txt>
    </View>
  );
}

export function PlayerRow({ p, first, editable, onToggle, onLibero, onRemove }: { p: LineupPlayer; first: boolean; editable: boolean; onToggle: () => void; onLibero?: () => void; onRemove?: () => void }) {
  const { c } = useTheme();
  const starter = p.zone != null;
  // i pulsanti L e X stanno accanto alla parte toccabile, non dentro (sul web un pulsante non può contenerne un altro)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8, borderTopWidth: first ? 0 : 1, borderTopColor: c.line, backgroundColor: starter ? c.fill : undefined }}>
      <Pressable onPress={editable ? onToggle : undefined} disabled={!editable} accessibilityRole={editable ? 'button' : undefined}
        accessibilityLabel={`${p.name}${p.isCaptain ? ', capitana' : ''}${p.isLibero ? ', libero' : ''}${starter ? `, titolare in posizione ${ROMAN[p.zone ?? 0]}` : ''}`}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 8, paddingVertical: 8, backgroundColor: pressed ? c.fill2 : undefined })}>
        <NumberTag value={p.number} variant={starter ? 'starter' : p.isLibero ? 'libero' : 'bench'} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Txt w={600} size={13} numberOfLines={1} style={{ flexShrink: 1 }}>{p.name}</Txt>
            {p.isCaptain ? <CaptainMark /> : null}
          </View>
          {/* la posizione si vede solo sul campo */}
          {p.role ? <Txt size={11} color="muted" numberOfLines={1}>{ROLE_LABEL[p.role]}</Txt> : null}
        </View>
      </Pressable>
      {/* L solo per le giocatrici con ruolo Libero (o per togliere un libero già scelto) */}
      {editable && onLibero && !starter && (p.role === 'libero' || p.isLibero) ? (
        <Pressy onPress={onLibero} scaleTo={0.85} accessibilityRole="button" accessibilityState={{ selected: p.isLibero }}
          accessibilityLabel={p.isLibero ? `Togli ${p.name} dal ruolo di libero` : `Scegli ${p.name} come libero`}
          style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
            borderColor: p.isLibero ? palette.blue : c.lineStrong, backgroundColor: p.isLibero ? palette.blue : undefined }}>
          <Txt w={800} size={10.5} display={false} color={p.isLibero ? palette.white : 'muted'} style={{ lineHeight: 12 }}>L</Txt>
        </Pressy>
      ) : null}
      {onRemove ? (
        <Pressy onPress={onRemove} scaleTo={0.85} accessibilityRole="button" accessibilityLabel={`Togli ${p.name}`} style={{ padding: 4 }}>
          <X size={16} color={c.muted} />
        </Pressy>
      ) : null}
    </View>
  );
}
