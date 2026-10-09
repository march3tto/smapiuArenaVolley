import { useEffect, useRef } from 'react';
import { Animated, Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MonitorPlay, Plus, RotateCcw, Trophy, Volleyball } from 'lucide-react-native';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LiveDot } from '@/components/LiveDot';
import { Pressy } from '@/components/Pressy';
import { TeamBadge } from '@/components/TeamBadge';
import { Txt } from '@/components/Txt';
import { US } from '@/constants';
import { setTarget } from '@/lib/volley';
import { useLive } from '@/store/LiveProvider';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export default function Live() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const live = useLive();
  const m = live.match;

  if (!m) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 }}>
        <Volleyball size={30} color={c.accent} />
        <Txt w={700} size={18}>Nessuna partita in diretta</Txt>
        <Txt color="muted" center>Quando una partita è in corso la trovi qui, punto per punto.</Txt>
      </View>
    );
  }

  const home = m.homeAway === 'casa';
  const L = { name: home ? US : m.opponent, logo: home ? null : m.opponentLogo, pts: home ? live.our : live.opp, sets: home ? live.ourSets : live.oppSets, serving: (live.serving === 'us') === home, side: (home ? 'us' : 'opp') as 'us' | 'opp' };
  const R = { name: home ? m.opponent : US, logo: home ? m.opponentLogo : null, pts: home ? live.opp : live.our, sets: home ? live.oppSets : live.ourSets, serving: (live.serving === 'us') !== home, side: (home ? 'opp' : 'us') as 'us' | 'opp' };
  // a partita finita lo storico contiene già tutti i set
  const rowsSets = live.finished ? live.history : [...live.history, { our: live.our, opp: live.opp }];
  const pts = (side: 'us' | 'opp') => (side === 'us' ? live.standing?.our : live.standing?.opp) ?? 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 14, gap: 16, paddingBottom: insets.bottom + 30, width: '100%', maxWidth: 900, alignSelf: 'center' }}>
      <Card style={{ gap: 18, borderColor: 'rgba(242,184,0,0.5)', borderWidth: 1.5 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {live.finished ? <Trophy size={14} color={c.accent} /> : <LiveDot />}
          <Txt w={700} size={13} color={live.finished ? 'accent' : 'live'}>{live.finished ? 'Finale' : 'In diretta'}</Txt>
          <Txt size={13} color="muted" numberOfLines={1} style={{ flexShrink: 1 }}>· {m.venue}</Txt>
        </View>
        <Txt w={600} size={13} color="muted" center>
          {live.finished
            ? `Set ${L.sets}–${R.sets}`
            : `${live.set === 5 ? 'Tie-break' : `${live.set}° set`} a ${setTarget(live.set)}, set ${L.sets}–${R.sets}`}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Side {...L} flash={live.lastPoint?.side === L.side ? live.lastPoint.key : 0} serving={L.serving && !live.finished}
            onPlus={live.canScore ? () => live.addPoint(L.side) : undefined} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: 8 }}>
            <AnimatedNumber value={live.finished ? L.sets : L.pts} size={48} />
            <Txt w={400} size={34} color="accent">:</Txt>
            <AnimatedNumber value={live.finished ? R.sets : R.pts} size={48} />
          </View>
          <Side {...R} flash={live.lastPoint?.side === R.side ? live.lastPoint.key : 0} serving={R.serving && !live.finished}
            onPlus={live.canScore ? () => live.addPoint(R.side) : undefined} />
        </View>

        {live.standing ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: c.fill }}>
            <Txt size={13} color="muted">Punti in classifica</Txt>
            <Txt w={800} size={13} tnum>{pts(L.side)} – {pts(R.side)}</Txt>
          </View>
        ) : null}

        <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12 }}>
          <View style={{ flexDirection: 'row' }}>
            <Txt size={12} color="muted" style={{ flex: 1 }}> </Txt>
            {rowsSets.map((_, i) => (
              <Txt key={i} w={600} size={11} center color={i === rowsSets.length - 1 && !live.finished ? 'accent' : 'muted'} style={{ width: 34 }}>{i + 1}°</Txt>
            ))}
          </View>
          {[L, R].map((t) => (
            <View key={t.name} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: c.line }}>
              <Txt w={700} size={12} numberOfLines={2} style={{ flex: 1, paddingRight: 6 }}>{t.name}</Txt>
              {rowsSets.map((s, i) => {
                const mine = t.side === 'us' ? s.our : s.opp;
                const theirs = t.side === 'us' ? s.opp : s.our;
                const current = i === rowsSets.length - 1 && !live.finished;
                return (
                  <Txt key={i} w={!current && mine > theirs ? 800 : current ? 800 : 400} size={13} center tnum color={!current && mine > theirs ? 'accent' : 'text'}
                    style={{ width: 34, backgroundColor: current ? c.fill : undefined, paddingVertical: 2, borderRadius: 6 }}>{mine}</Txt>
                );
              })}
            </View>
          ))}
        </View>

        <View style={{ gap: 8, alignItems: 'center' }}>
          {m.youtubeLiveId ? (
            <Button label="Guarda su YouTube" variant="gold" icon={<MonitorPlay size={18} color={palette.onGold} />} onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${m.youtubeLiveId}`)} />
          ) : null}
          {live.canScore ? <Txt size={12} color="muted">Partita dimostrativa: tocca + per assegnare il punto.</Txt> : null}
          {m.demoLive && live.finished ? (
            <Button size="sm" label="Ricomincia la demo" icon={<RotateCcw size={14} color={c.text} />} onPress={live.resetDemo} />
          ) : null}
        </View>
      </Card>

      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Txt w={800} size={17}>Cronaca</Txt>
          <Txt size={13} color="muted">{live.events.length} azioni</Txt>
        </View>
        {live.events.map((e, i) => (
          <FeedItem key={e.id} first={i === 0} last={i === live.events.length - 1} us={e.side === 'us'} meta={`${e.set}° set, ${e.our}–${e.opp}`} text={e.text} />
        ))}
      </Card>
    </ScrollView>
  );
}

function Side({ name, logo, serving, flash, onPlus }: { name: string; logo?: string | number | null; serving: boolean; flash: number; onPlus?: () => void }) {
  const { c } = useTheme();
  const plus = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!flash) return;
    plus.setValue(0);
    Animated.timing(plus, { toValue: 1, duration: 900, useNativeDriver: true }).start();
    pop.setValue(0.85);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }).start();
  }, [flash, plus, pop]);
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <TeamBadge name={name} logo={logo} size={52} />
      </Animated.View>
      <Animated.Text style={{ position: 'absolute', top: -6, fontSize: 26, fontWeight: '900', color: palette.gold, opacity: plus.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }), transform: [{ translateY: plus.interpolate({ inputRange: [0, 1], outputRange: [10, -40] }) }] }}>
        +1
      </Animated.Text>
      {/* altezza fissa di due righe: i pulsanti + restano allineati anche con nomi di lunghezza diversa */}
      <Txt w={700} size={12.5} center numberOfLines={2} style={{ paddingHorizontal: 2, minHeight: 33 }}>{name}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: serving ? 1 : 0 }}>
        <Volleyball size={13} color={c.accent} />
        <Txt w={600} size={12} color="accent">Al servizio</Txt>
      </View>
      {onPlus ? (
        <Pressy onPress={onPlus} scaleTo={0.88} accessibilityRole="button" accessibilityLabel={`Punto ${name}`}
          style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold }}>
          <Plus size={22} color={palette.onGold} strokeWidth={3} />
        </Pressy>
      ) : null}
    </View>
  );
}

function FeedItem({ meta, text, us, first, last }: { meta: string; text: string; us: boolean; first: boolean; last: boolean }) {
  const { c } = useTheme();
  const anim = useRef(new Animated.Value(first ? 0 : 1)).current;
  useEffect(() => {
    if (first) Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }).start();
  }, [first, anim]);
  return (
    <Animated.View style={{ flexDirection: 'row', gap: 14, paddingVertical: 10, opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }] }}>
      <View style={{ alignItems: 'center', width: 14 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, marginTop: 4, backgroundColor: us ? palette.gold : c.muted }} />
        {!last ? <View style={{ flex: 1, width: 2, backgroundColor: c.line, marginTop: 4 }} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Txt w={600} size={12} color="muted" tnum>{meta}</Txt>
        <Txt size={14}>{text}</Txt>
      </View>
    </Animated.View>
  );
}
