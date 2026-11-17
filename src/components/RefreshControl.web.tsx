import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, View, type HostInstance, type RefreshControlProps } from 'react-native';
import { ArrowDown } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';

/** Distanza (già smorzata) oltre la quale, rilasciando, si ricarica */
const SOGLIA = 64;
const MAX_TIRO = 110;
/** Il dito scorre il doppio dell'indicatore: il tiro sembra elastico come sul nativo */
const SMORZAMENTO = 0.5;
const SIZE = 38;

/**
 * Pull-to-refresh per la PWA. react-native-web non lo implementa: il suo RefreshControl è una View vuota e la
 * ScrollView gli passa sé stessa come figlio (con lo stile). Qui si avvolge la ScrollView, si ascolta il trascinamento
 * verso il basso quando la lista è già in cima e si disegna l'indicatore. Le props sono le stesse del nativo.
 */
export function RefreshControl({ refreshing, onRefresh, enabled = true, progressViewOffset = 0, tintColor, style, children }: RefreshControlProps & { children?: ReactNode }) {
  const { c } = useTheme();
  const box = useRef<HostInstance>(null);
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  // il ricaricamento partito dal gesto: lo spinner resta finché il genitore non ha finito
  const [attivo, setAttivo] = useState(false);
  const visto = useRef(false);
  // valori letti dai listener del DOM, registrati una volta sola
  const cb = useRef({ onRefresh, enabled, attivo });
  useEffect(() => {
    cb.current = { onRefresh, enabled, attivo };
  });

  useEffect(() => {
    if (!attivo) return;
    if (refreshing) visto.current = true;
    else if (visto.current) setAttivo(false);
  }, [refreshing, attivo]);

  useEffect(() => {
    if (!attivo) return;
    // il genitore può non passare mai per refreshing=true (dati già in cache): lo spinner si chiude da solo
    const breve = setTimeout(() => !visto.current && setAttivo(false), 800);
    const lungo = setTimeout(() => setAttivo(false), 15000);
    return () => {
      clearTimeout(breve);
      clearTimeout(lungo);
    };
  }, [attivo]);

  useEffect(() => {
    const el = box.current as unknown as HTMLElement | null;
    if (!el?.addEventListener) return;
    let start: { x: number; y: number; scroller: HTMLElement } | null = null;
    let tirando = false;
    let ultimo = 0;

    /** La lista verticale sotto il dito (le liste orizzontali, es. le giornate, non contano) */
    const scrollerDi = (t: EventTarget | null) => {
      for (let n = t as HTMLElement | null; n && n !== el.parentElement; n = n.parentElement) {
        const oy = getComputedStyle(n).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight) return n;
      }
      return el.firstElementChild as HTMLElement | null;
    };

    const onStart = (e: TouchEvent) => {
      if (!cb.current.enabled || cb.current.attivo || e.touches.length !== 1) return;
      const scroller = scrollerDi(e.target);
      if (!scroller || scroller.scrollTop > 0) return;
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY, scroller };
      tirando = false;
    };
    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const dx = e.touches[0].clientX - start.x;
      const dy = e.touches[0].clientY - start.y;
      if (!tirando) {
        // scorrimento orizzontale o verso l'alto: non è un pull-to-refresh
        if (Math.abs(dx) > Math.abs(dy) || dy < 0 || start.scroller.scrollTop > 0) {
          if (Math.abs(dx) > 8 || Math.abs(dy) > 8) start = null;
          return;
        }
        if (dy < 8) return;
        tirando = true;
        setDragging(true);
      }
      // niente rimbalzo né scorrimento della pagina mentre si tira
      if (e.cancelable) e.preventDefault();
      ultimo = Math.min(MAX_TIRO, Math.max(0, (dy - 8) * SMORZAMENTO));
      setPull(ultimo);
    };
    const onEnd = () => {
      if (tirando) {
        setDragging(false);
        if (ultimo >= SOGLIA && cb.current.onRefresh) {
          visto.current = false;
          setAttivo(true);
          setPull(0);
          cb.current.onRefresh();
        } else setPull(0);
      }
      start = null;
      tirando = false;
      ultimo = 0;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  const colore = (tintColor as string | undefined) ?? c.accent;
  // durante il ricaricamento l'indicatore resta fermo alla soglia
  const y = attivo ? SOGLIA : pull;
  const progresso = Math.min(1, y / SOGLIA);
  return (
    <View ref={box} style={[{ flex: 1 }, style, { overflow: 'hidden' }]}>
      {children}
      <View
        pointerEvents="none"
        accessibilityLabel={attivo ? 'Aggiornamento in corso' : undefined}
        style={{
          position: 'absolute', top: progressViewOffset, left: 0, right: 0, alignItems: 'center',
          transform: [{ translateY: y - SIZE - 4 }], opacity: attivo ? 1 : progresso,
          // al rilascio l'indicatore torna su con una transizione; mentre si tira segue il dito
          ...(dragging ? {} : { transitionProperty: 'transform, opacity', transitionDuration: '200ms' }),
        } as object}
      >
        <View style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card,
          borderWidth: 1, borderColor: c.line, boxShadow: '0 2px 8px rgba(0,0,0,0.25)' } as object}>
          {attivo ? (
            <ActivityIndicator size="small" color={colore} />
          ) : (
            // la freccia gira di mezzo giro avvicinandosi alla soglia: oltre, rilasciando si ricarica
            <View style={{ transform: [{ rotate: `${progresso * 180}deg` }] }}>
              <ArrowDown size={18} color={colore} strokeWidth={2.5} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
