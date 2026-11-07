import { useCallback, useEffect, useState } from 'react';
import { FlatList, Platform, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Radio, X } from 'lucide-react-native';
import { IconButton } from '@/components/IconButton';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Txt } from '@/components/Txt';
import {
  agentLogMatches, fetchAgentLog, fetchAgentStatus, subscribeAgentLog,
  type AgentLogEntry, type AgentLogFilter, type AgentStatus,
} from '@/lib/api';
import { hasSupabase } from '@/lib/supabase';
import { useApp } from '@/store/AppProvider';
import { palette, radius, space, type Colors } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/** Righe tenute in lista (le più recenti) */
const MAX_RIGHE = 300;
/** Durante la finestra l'agente scrive almeno un battito ogni 5': oltre 10' di silenzio qualcosa non va */
const SILENZIO_MINUTI = 10;
/** Eventi scritti solo a finestra aperta (l'agente sta leggendo il feed) */
const IN_FINESTRA = new Set(['finestra_aperta', 'battito', 'aggiornamento', 'correzione', 'feed_fermo', 'feed_ripartito', 'feed_mancante']);

const FILTRI: { value: AgentLogFilter; label: string }[] = [
  { value: 'tutti', label: 'Tutto' },
  { value: 'punteggi', label: 'Punteggi' },
  { value: 'problemi', label: 'Avvisi ed errori' },
];

/** Impostazioni > Agente livescore: stato di Mac e Zima e log in tempo reale (solo staff/admin) */
export default function Agente() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useApp();
  const staff = user?.role === 'admin' || user?.role === 'staff';

  const [filter, setFilter] = useState<AgentLogFilter>('tutti');
  const [status, setStatus] = useState<AgentStatus[]>([]);
  const [log, setLog] = useState<AgentLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // orologio per "N min fa" e per accorgersi di un agente che tace
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    if (!staff || !hasSupabase) return;
    setLoading(true);
    try {
      const [s, l] = await Promise.all([fetchAgentStatus(), fetchAgentLog(filter)]);
      setStatus(s);
      setLog(l);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setNow(Date.now());
    }
  }, [staff, filter]);

  useEffect(() => {
    load();
  }, [load]);

  // nuove righe in tempo reale: in cima alla lista (se passano il filtro) e nello stato dell'agente
  useEffect(() => {
    if (!staff) return;
    return subscribeAgentLog((e) => {
      if (agentLogMatches(e, filter)) setLog((prev) => (prev.some((x) => x.id === e.id) ? prev : [e, ...prev].slice(0, MAX_RIGHE)));
      setStatus((prev) => {
        const next: AgentStatus = { agent: e.agent, lastSeen: e.at, lastEvent: e.event, lastLevel: e.level, lastMessage: e.message };
        const rest = prev.filter((s) => s.agent !== e.agent);
        return [...rest, next].sort((a, b) => a.agent.localeCompare(b.agent));
      });
      setNow(Date.now());
    });
  }, [staff, filter]);

  const paddingTop = Platform.OS === 'ios' ? space.lg : insets.top + space.md;

  if (!staff) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: space.md, paddingTop, gap: space.md }}>
        <Header onClose={() => router.back()} />
        <Txt size={15} color="muted">Questa schermata è riservata allo staff.</Txt>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={log}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={{ padding: space.md, paddingTop, paddingBottom: insets.bottom + space.xl, width: '100%', maxWidth: 640, alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={loading && log.length > 0} onRefresh={load} tintColor={c.accent} colors={[c.accent]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.md }}>
            <Header onClose={() => router.back()} />
            {!hasSupabase ? <Txt size={14} color="muted">Supabase non configurato: nessun log da mostrare.</Txt> : null}
            {error ? <Txt size={13} color="danger">Errore nel caricamento: {error}</Txt> : null}
            {status.length ? (
              <View style={{ gap: space.sm }}>
                {status.map((s) => <StatusCard key={s.agent} s={s} now={now} />)}
              </View>
            ) : !loading && hasSupabase ? (
              <Txt size={14} color="muted">Nessun segnale ancora: l'agente scrive qui appena viene avviato.</Txt>
            ) : null}
            <SegmentedControl options={FILTRI} value={filter} onChange={setFilter} stretch />
          </View>
        }
        renderItem={({ item, index }) => {
          const prev = index > 0 ? log[index - 1] : null;
          const newDay = !prev || dayKey(prev.at) !== dayKey(item.at);
          return (
            <View>
              {newDay ? (
                <Txt w={700} size={11.5} color="muted" style={{ letterSpacing: 0.8, textTransform: 'uppercase', marginTop: index ? space.md : 0, marginBottom: space.xs }}>
                  {fmtDay(item.at)}
                </Txt>
              ) : null}
              <LogRow e={item} multi={status.length > 1} />
            </View>
          );
        }}
        ListEmptyComponent={!loading && hasSupabase ? <Txt size={14} color="muted">Nessuna riga per questo filtro.</Txt> : undefined}
      />
    </View>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold }}>
        <Radio size={17} color={palette.onGold} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt w={800} size={18} style={{ letterSpacing: -0.3 }}>Agente livescore</Txt>
        <Txt size={12} color="muted">Risultati dal feed Federvolley</Txt>
      </View>
      <IconButton label="Chiudi" onPress={onClose}>
        <X size={18} color={c.text} />
      </IconButton>
    </View>
  );
}

/** Stato di un agente dall'ultimo segnale */
function health(s: AgentStatus, now: number, c: Colors): { label: string; color: string } {
  const minuti = (now - s.lastSeen.getTime()) / 60_000;
  if (s.lastEvent === 'stop') return { label: 'Fermato', color: c.muted };
  if (IN_FINESTRA.has(s.lastEvent)) {
    return minuti > SILENZIO_MINUTI ? { label: `Nessun segnale da ${Math.floor(minuti)} min`, color: c.danger } : { label: 'In ascolto', color: c.ok };
  }
  if (s.lastLevel === 'errore') return { label: 'Errore', color: c.danger };
  return { label: 'In attesa della prossima giornata', color: c.cobalt };
}

function StatusCard({ s, now }: { s: AgentStatus; now: number }) {
  const { c } = useTheme();
  const h = health(s, now, c);
  return (
    <View style={{ backgroundColor: c.card, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: space.md, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: h.color }} />
        <Txt w={700} size={15} style={{ textTransform: 'capitalize' }}>{s.agent}</Txt>
        <Txt w={600} size={13} color={h.color} style={{ flex: 1 }} numberOfLines={1}>{h.label}</Txt>
        <Txt size={12} color="muted" tnum>{fmtAgo(s.lastSeen, now)}</Txt>
      </View>
      <Txt size={13} color="muted" numberOfLines={2}>{s.lastMessage}</Txt>
    </View>
  );
}

function LogRow({ e, multi }: { e: AgentLogEntry; multi: boolean }) {
  const { c } = useTheme();
  const bar = e.level === 'errore' ? c.danger : e.level === 'avviso' ? palette.gold : e.event === 'aggiornamento' ? c.ok : c.line;
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <View style={{ width: 3, borderRadius: 2, backgroundColor: bar }} />
      <Txt size={12} color="muted" tnum style={{ width: 58 }}>{fmtTime(e.at)}</Txt>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={13.5} color={e.level === 'errore' ? 'danger' : undefined}>{e.message}</Txt>
        {multi ? <Txt size={11} color="muted">{e.agent}</Txt> : null}
      </View>
    </View>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

function fmtDay(d: Date): string {
  const oggi = new Date();
  const ieri = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - 1);
  if (dayKey(d) === dayKey(oggi)) return 'Oggi';
  if (dayKey(d) === dayKey(ieri)) return 'Ieri';
  return `${GIORNI[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

function fmtAgo(d: Date, now: number): string {
  const min = Math.floor((now - d.getTime()) / 60_000);
  if (min < 1) return 'adesso';
  if (min < 60) return `${min} min fa`;
  const sameDay = dayKey(d) === dayKey(new Date(now));
  return sameDay ? `alle ${pad(d.getHours())}:${pad(d.getMinutes())}` : `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
