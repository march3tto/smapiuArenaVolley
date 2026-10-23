import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Linking, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { usePathname } from 'expo-router';
import { ChevronRight, X } from 'lucide-react-native';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { loadJSON, saveJSON } from '@/lib/storage';
import { useApp } from '@/store/AppProvider';
import { useData } from '@/store/DataProvider';
import { palette } from '@/theme/colors';
import type { Ad } from '@/types';

/** Pausa minima tra due pubblicità diverse, perché non compaiano una dopo l'altra */
const GAP = 5 * 60 * 1000;
/** Ogni quanto si controlla se è il momento di mostrarla (anche al ritorno in primo piano) */
const CHECK = 60 * 1000;
/** Attesa dopo il caricamento dei dati, per non coprire subito la schermata */
const FIRST_DELAY = 4000;
/** Dopo quanto la pubblicità si chiude da sola */
const AUTO_CLOSE = 15 * 1000;
/** Ultima apparizione di ogni pubblicità (per id) e di una qualsiasi (at) */
const K_LAST = 'av-ad-shown';
/** Schermate su cui non si interrompe l'utente */
const SKIP = ['/login', '/auth/callback', '/elimina-account'];

/**
 * Pubblicità al centro dello schermo: ognuna ricompare dopo i suoi pubblicita.frequenza_minuti (le apparizioni restano
 * salvate, quindi riaprire l'app non la ripropone subito). Con più pubblicità pronte esce quella vista meno di recente.
 * Riquadro piccolo che non blocca l'app: si chiude con la X o da solo dopo 15 secondi.
 * Non compare per gli utenti registrati che l'hanno eliminata dalle Impostazioni.
 */
export function AdPopup() {
  const { ads, loading } = useData();
  const { adsHidden } = useApp();
  const pathname = usePathname();
  const [ad, setAd] = useState<Ad | null>(null);
  const [anim] = useState(() => new Animated.Value(0));
  // stato letto dal timer senza ricrearlo a ogni cambio di schermata
  const state = useRef({ ads, blocked: true, open: false });
  useEffect(() => {
    state.current = { ads, blocked: adsHidden || loading || SKIP.includes(pathname), open: ad !== null };
  });

  // controllo condiviso da timer, ritorno in primo piano e fine del caricamento
  const check = useRef(async () => {});
  useEffect(() => {
    let active = true;
    check.current = async () => {
      const s = state.current;
      if (s.blocked || s.open || !s.ads.length) return;
      const shown = (await loadJSON<{ at: number; ads: Record<string, number> }>(K_LAST)) ?? { at: 0, ads: {} };
      const now = Date.now();
      if (!active || state.current.blocked || state.current.open || now - shown.at < GAP) return;
      const due = s.ads.filter((a) => now - (shown.ads[a.id] ?? 0) >= a.everyMinutes * 60 * 1000);
      if (!due.length) return;
      // sort stabile: a parità di ultima apparizione resta l'ordine della tabella
      const next = [...due].sort((a, b) => (shown.ads[a.id] ?? 0) - (shown.ads[b.id] ?? 0))[0];
      await saveJSON(K_LAST, { at: now, ads: { ...shown.ads, [next.id]: now } });
      setAd(next);
    };
    const timer = setInterval(() => check.current(), CHECK);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') check.current(); });
    return () => {
      active = false;
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  // prima apparizione: poco dopo che i dati (e quindi le pubblicità) sono arrivati
  const loaded = !loading && ads.length > 0;
  useEffect(() => {
    if (!loaded) return;
    const first = setTimeout(() => check.current(), FIRST_DELAY);
    return () => clearTimeout(first);
  }, [loaded]);

  useEffect(() => {
    if (ad) Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 6 }).start();
  }, [ad, anim]);

  // stabile: la barra del tempo di AdCard non riparte a ogni render
  const close = useCallback(() => Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setAd(null)), [anim]);

  // pubblicità eliminata mentre era aperta: sparisce subito
  if (!ad || adsHidden) return null;
  return <AdCard ad={ad} anim={anim} onClose={close} />;
}

/** Riquadro giallo con testi blu (colori del club), uguale in modalità chiara e scura */
const INK = palette.navy;

function AdCard({ ad, anim, onClose }: { ad: Ad; anim: Animated.Value; onClose: () => void }) {
  // barra del tempo rimasto: a fine corsa la pubblicità si chiude da sola
  const [left] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const run = Animated.timing(left, { toValue: 0, duration: AUTO_CLOSE, easing: Easing.linear, useNativeDriver: false });
    run.start(({ finished }) => { if (finished) onClose(); });
    return () => run.stop();
  }, [left, onClose]);
  const open = () => {
    if (ad.url) Linking.openURL(ad.url);
    onClose();
  };
  return (
    // il resto dello schermo resta utilizzabile: solo il riquadro riceve i tocchi
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 20, opacity: anim }}>
      <Animated.View accessibilityRole="alert" style={{
        width: '100%', maxWidth: 340, borderRadius: 22, overflow: 'hidden', backgroundColor: palette.gold,
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10,
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
      }}>
        <Pressable onPress={open} disabled={!ad.url} accessibilityRole={ad.url ? 'link' : undefined} accessibilityLabel={`${ad.title}: ${ad.linkLabel ?? 'scopri di più'}`}
          style={{ flexDirection: 'row', gap: 12, padding: 12, paddingRight: 40 }}>
          {ad.image ? <Image source={ad.image} style={{ width: 64, aspectRatio: 2 / 3, borderRadius: 6 }} contentFit="cover" transition={200} /> : null}
          <View style={{ flex: 1, gap: 3, justifyContent: 'center' }}>
            {ad.subtitle ? <Txt w={800} size={12} color={INK} numberOfLines={2}>{ad.subtitle}</Txt> : null}
            <Txt display w={900} size={18} color={INK} numberOfLines={2}>{ad.title}</Txt>
            {ad.text ? <Txt size={12.5} color={INK} style={{ lineHeight: 17, textAlign: 'left' }}>{ad.text}</Txt> : null}
            {ad.url ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                <Txt w={800} size={12.5} color={INK} numberOfLines={1} style={{ flexShrink: 1, textDecorationLine: 'underline' }}>{ad.linkLabel ?? 'Scopri di più'}</Txt>
                <ChevronRight size={14} color={INK} />
              </View>
            ) : null}
          </View>
        </Pressable>
        <Pressy onPress={onClose} scaleTo={0.85} hitSlop={8} accessibilityRole="button" accessibilityLabel="Chiudi"
          style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,26,58,0.12)' }}>
          <X size={15} color={INK} />
        </Pressy>
        <View style={{ height: 3, backgroundColor: 'rgba(6,26,58,0.12)' }}>
          <Animated.View style={{ height: 3, backgroundColor: INK, width: left.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}
