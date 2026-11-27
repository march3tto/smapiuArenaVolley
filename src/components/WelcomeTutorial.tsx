import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Dimensions, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Volleyball } from 'lucide-react-native';
import { Button } from './Button';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { LEAGUE, US } from '@/constants';
import { haBersaglio, misuraBersaglio, misuraNodo, useTutorial, type Rettangolo } from '@/lib/tutorial';
import { palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/** Passi del tour: id del bersaglio registrato con bersaglioGuida, titolo e testo del fumetto */
const PASSI = [
  { id: 'tab-index', titolo: 'Home', testo: 'Quando si gioca trovi qui la diretta: punteggio, cronaca, video e voto MVP. Poi prossime partite, news e classifica.' },
  { id: 'tab-risultati', titolo: 'Risultati', testo: 'Il calendario, i risultati di ogni giornata e la classifica del girone.' },
  { id: 'tab-squadra', titolo: 'Squadra', testo: 'Rosa, staff e formazioni. Tocca una giocatrice per vedere la sua scheda.' },
  { id: 'assistente', titolo: 'Assistente', testo: 'Chiedi quello che vuoi su squadra, partite e società. Tieni premuto per cambiare avatar.' },
  { id: 'tab-news', titolo: 'News', testo: 'Articoli, video e podcast della squadra.' },
  { id: 'tab-altro', titolo: 'Altro', testo: 'Società, sponsor, contatti e galleria foto.' },
  { id: 'impostazioni', titolo: 'Impostazioni', testo: 'Tema scuro, notifiche (dopo l\'accesso) e, quando vuoi, rivedere questa guida.' },
] as const;

/** Fondo scuro attorno al buco */
const SCURO = 'rgba(3,10,26,0.8)';
/** Margine del buco attorno all'elemento */
const MARGINE = 6;
/** Lato della freccia triangolare del fumetto */
const FRECCIA = 10;
/** Distanza tra il bordo del buco e la punta della freccia */
const STACCO = 4;
/** Ritardo d'avvio del tour: la Home deve fare in tempo a montarsi */
const RITARDO_AVVIO = 350;
const DISSOLVENZA = 220;

type Passo = { indice: number; rect: Rettangolo };

/** Guida di benvenuto alla prima apertura: pagina di benvenuto, poi tour a riflettore sopra l'app vera */
export function WelcomeTutorial() {
  const { completa } = useTutorial();
  const [fase, setFase] = useState<'benvenuto' | 'tour'>('benvenuto');
  const router = useRouter();

  const faiIlTour = () => {
    router.navigate('/');
    setFase('tour');
  };

  if (fase === 'benvenuto') return <Benvenuto onTour={faiIlTour} onSalta={completa} />;
  return <Tour onFine={completa} />;
}

/** Pagina a tutto schermo con icona, titolo e le due scelte */
function Benvenuto({ onTour, onSalta }: { onTour: () => void; onSalta: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityViewIsModal style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.bg,
      alignItems: 'center', justifyContent: 'center', paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg, paddingHorizontal: space.lg }}>
      <View style={{ width: '100%', maxWidth: 420, alignItems: 'center', gap: space.md }}>
        <View style={{ width: 120, height: 120, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold, marginBottom: space.sm }}>
          <Volleyball size={64} color={palette.onGold} strokeWidth={1.8} />
        </View>
        <Txt w={900} size={30} center accessibilityRole="header">{`Benvenuto in ${US}`}</Txt>
        <Txt size={16} color="muted" center style={{ lineHeight: 23 }}>
          {`L'app della squadra di ${LEAGUE}: dirette, risultati, rosa e news in un posto solo. In pochi passi ti mostriamo dove trovare tutto.`}
        </Txt>
        <Button label="Fai il tour" variant="gold" size="lg" onPress={onTour} style={{ alignSelf: 'stretch', marginTop: space.md }} />
        <Pressy onPress={onSalta} accessibilityRole="button" accessibilityLabel="Salta la guida, la vedo dopo" hitSlop={8} style={{ paddingVertical: space.sm }}>
          <Txt w={600} size={14} color="muted" style={{ textDecorationLine: 'underline' }}>Salta, lo vedo dopo</Txt>
        </Pressy>
      </View>
    </View>
  );
}

/** Tour a riflettore: schermo scuro con un buco sull'elemento e un fumetto che lo indica */
function Tour({ onFine }: { onFine: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const radice = useRef<ComponentRef<typeof View>>(null);
  const [passo, setPasso] = useState<Passo | null>(null);
  const opacita = useState(() => new Animated.Value(0))[0];
  // ogni nuova misura annulla quelle ancora in corso (Avanti toccato due volte, rotazione…)
  const giro = useRef(0);
  const annulla = useCallback(() => { giro.current++; }, []);

  const dissolvi = useCallback((a: number) => new Promise<void>((resolve) => {
    Animated.timing(opacita, { toValue: a, duration: DISSOLVENZA, useNativeDriver: true }).start(() => resolve());
  }), [opacita]);

  /** Misura il bersaglio rispetto al tour (che di solito parte da 0,0 ma non è detto) */
  const misura = useCallback(async (id: string): Promise<Rettangolo | null> => {
    const [r, o] = await Promise.all([misuraBersaglio(id), misuraNodo(radice.current)]);
    if (!r) return null;
    return { x: r.x - (o?.x ?? 0), y: r.y - (o?.y ?? 0), w: r.w, h: r.h };
  }, []);

  /** Mostra il primo passo misurabile a partire da `da`; se non ce ne sono, la guida finisce */
  const vai = useCallback(async (da: number, conDissolvenza: boolean) => {
    const io = ++giro.current;
    if (conDissolvenza) await dissolvi(0);
    for (let i = da; i < PASSI.length; i++) {
      const rect = await misura(PASSI[i].id);
      if (giro.current !== io) return;
      if (rect) {
        setPasso({ indice: i, rect });
        if (conDissolvenza) dissolvi(1);
        return;
      }
    }
    onFine();
  }, [dissolvi, misura, onFine]);

  // partenza ritardata: router.navigate('/') ha appena cambiato tab
  useEffect(() => {
    const t = setTimeout(() => { vai(0, true); }, RITARDO_AVVIO);
    return () => {
      clearTimeout(t);
      annulla();
    };
  }, [vai, annulla]);

  // dopo una rotazione gli elementi si spostano: si rimisura il passo corrente, senza dissolvenza
  const indice = passo?.indice ?? null;
  useEffect(() => {
    if (indice == null) return;
    const sub = Dimensions.addEventListener('change', () => {
      // si lascia al layout il tempo di riadattarsi
      setTimeout(() => { vai(indice, false); }, 120);
    });
    return () => sub.remove();
  }, [indice, vai]);

  const ultimo = indice != null && !PASSI.slice(indice + 1).some((p) => haBersaglio(p.id));

  return (
    // blocca ogni tocco sull'app sottostante, anche dentro il buco
    <View ref={radice} collapsable={false} accessibilityViewIsModal onStartShouldSetResponder={() => true}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {passo ? (
        <Animated.View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: opacita }}>
          <Riflettore rect={passo.rect} W={W} H={H} />
          <Fumetto passo={passo} W={W} H={H} ultimo={ultimo}
            onAvanti={() => (ultimo ? onFine() : vai(passo.indice + 1, true))} onSalta={onFine} />
        </Animated.View>
      ) : (
        // prima misura: schermo già scuro, così l'app non si vede "accesa" per un attimo
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: SCURO }} />
      )}
    </View>
  );
}

/** Quattro rettangoli scuri attorno al buco e un bordo giallo arrotondato attorno all'elemento */
function Riflettore({ rect, W, H }: { rect: Rettangolo; W: number; H: number }) {
  const x0 = Math.max(0, rect.x - MARGINE);
  const y0 = Math.max(0, rect.y - MARGINE);
  const x1 = Math.min(W, rect.x + rect.w + MARGINE);
  const y1 = Math.min(H, rect.y + rect.h + MARGINE);
  const lw = x1 - x0;
  const lh = y1 - y0;
  // elementi quasi quadrati (il cerchio dell'assistente): il bordo diventa un cerchio
  const raggio = Math.abs(lw - lh) < 6 ? Math.min(lw, lh) / 2 : Math.min(14, lh / 2);
  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: W, height: y0, backgroundColor: SCURO }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: y1, width: W, height: Math.max(0, H - y1), backgroundColor: SCURO }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: y0, width: x0, height: lh, backgroundColor: SCURO }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: x1, top: y0, width: Math.max(0, W - x1), height: lh, backgroundColor: SCURO }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: x0, top: y0, width: lw, height: lh, borderRadius: raggio, borderWidth: 2, borderColor: palette.gold }} />
    </>
  );
}

/** Fumetto giallo con la freccia verso l'elemento: sotto se l'elemento è nella metà alta, sopra altrimenti */
function Fumetto({ passo, W, H, ultimo, onAvanti, onSalta }: {
  passo: Passo; W: number; H: number; ultimo: boolean; onAvanti: () => void; onSalta: () => void;
}) {
  const { rect, indice } = passo;
  const p = PASSI[indice];
  const larghezza = Math.min(W - 32, 360);
  const cx = rect.x + rect.w / 2;
  const sotto = rect.y + rect.h / 2 < H / 2;
  // centrato sull'elemento, ma sempre dentro lo schermo
  const left = Math.min(Math.max(cx - larghezza / 2, 16), W - larghezza - 16);
  // la freccia segue l'elemento, senza uscire dagli angoli arrotondati
  const frecciaX = Math.min(Math.max(cx - left - FRECCIA, 18), larghezza - 18 - FRECCIA * 2);
  const distanza = MARGINE + STACCO + FRECCIA;
  const posizione = sotto ? { top: rect.y + rect.h + distanza } : { bottom: H - rect.y + distanza };

  return (
    <View accessibilityLiveRegion="polite" style={{ position: 'absolute', left, width: larghezza, ...posizione }}>
      <View pointerEvents="none" style={{
        position: 'absolute', left: frecciaX, width: 0, height: 0,
        borderLeftWidth: FRECCIA, borderRightWidth: FRECCIA, borderLeftColor: 'transparent', borderRightColor: 'transparent',
        ...(sotto ? { top: -FRECCIA, borderBottomWidth: FRECCIA, borderBottomColor: palette.gold } : { bottom: -FRECCIA, borderTopWidth: FRECCIA, borderTopColor: palette.gold }),
      }} />
      <View style={{ backgroundColor: palette.gold, borderRadius: 18, padding: space.md, gap: space.sm,
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm }}>
          <Txt w={800} size={18} color={palette.onGold} accessibilityRole="header">{p.titolo}</Txt>
          <Txt w={700} size={12} color={palette.onGold} style={{ opacity: 0.7 }}>{`${indice + 1} di ${PASSI.length}`}</Txt>
        </View>
        <Txt size={14.5} color={palette.onGold} style={{ lineHeight: 20 }}>{p.testo}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: ultimo ? 'flex-end' : 'space-between', marginTop: space.xs }}>
          {ultimo ? null : (
            <Pressy onPress={onSalta} hitSlop={8} accessibilityRole="button" accessibilityLabel="Salta la guida" style={{ paddingVertical: space.xs }}>
              <Txt w={700} size={14} color={palette.onGold}>Salta</Txt>
            </Pressy>
          )}
          <Pressy onPress={onAvanti} scaleTo={0.94} accessibilityRole="button"
            accessibilityLabel={ultimo ? 'Inizia a usare l\'app' : 'Avanti, passo successivo'}
            style={{ backgroundColor: palette.onGold, borderRadius: 999, paddingHorizontal: space.md + 4, paddingVertical: space.sm }}>
            <Txt w={800} size={14} color={palette.gold}>{ultimo ? 'Inizia' : 'Avanti'}</Txt>
          </Pressy>
        </View>
      </View>
    </View>
  );
}
