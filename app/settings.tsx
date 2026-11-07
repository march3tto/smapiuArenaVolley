import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, Animated, AppState, LayoutAnimation, Linking, Platform, Pressable, ScrollView, Switch, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, ChevronDown, ChevronRight, Megaphone, Moon, Radio, Settings as SettingsIcon, ShieldCheck, Volleyball, X } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { Txt } from '@/components/Txt';
import { useToast } from '@/components/Toast';
import { useApp } from '@/store/AppProvider';
import { attivaNotifiche, disattivaNotifiche, permessoNotifiche, salvaPreferenzeNotifiche, statoNotifiche, type PreferenzeNotifiche } from '@/services/notifiche';
import { palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { NotifPrefs } from '@/types';

/** Interruttori ridotti del 15%: i margini negativi recuperano lo spazio lasciato dalla scala */
const SMALL_SWITCH = { transform: [{ scale: 0.85 }], marginHorizontal: -4, marginVertical: -2 };

/** Singole notifiche, nell'ordine in cui compaiono */
const NOTIF_TYPES: { key: keyof Omit<NotifPrefs, 'youth' | 'enabled'>; title: string }[] = [
  { key: 'gameDay', title: 'Game day (4 ore prima)' },
  { key: 'start', title: 'Inizio partita' },
  { key: 'mvp', title: 'Vota MVP' },
  { key: 'sets', title: 'Fine di ogni set' },
  { key: 'final', title: 'Risultato finale' },
  { key: 'news', title: 'Nuove news o podcast' },
];

/** Impostazioni: modalità scura, notifiche, privacy, partita demo e account, in blocchi uno sotto l'altro */
export default function Settings() {
  const { c, mode, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { prefs, updatePrefs, demoLive, setDemoLive, noAds, setNoAds, user, signOut } = useApp();
  const { height } = useWindowDimensions();
  // il riquadro sale dal basso mentre lo sfondo si scurisce (dissolvenza della schermata)
  const [rise] = useState(() => new Animated.Value(60));
  useEffect(() => {
    Animated.spring(rise, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 4 }).start();
  }, [rise]);

  // blocco Notifiche chiuso: resta visibile solo l'interruttore generale
  const [notifOpen, setNotifOpen] = useState(false);
  const toggleNotif = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNotifOpen((v) => !v);
  };

  // interruttore generale: acceso solo se il permesso di sistema è concesso e il token dell'utente è attivo su questo dispositivo
  const [notifAttive, setNotifAttive] = useState(false);
  const [notifOccupato, setNotifOccupato] = useState(false);
  const userId = user?.id ?? null;

  // durante un'attivazione/disattivazione non si riallinea (il popup di iOS fa tornare l'app "active" a metà);
  // a operazione finita notifOccupato cambia, useFocusEffect riparte e riallinea con lo stato definitivo
  const riallineaNotifiche = useCallback(async () => {
    if (!userId || notifOccupato) return;
    try {
      const st = await statoNotifiche(userId);
      setNotifAttive(st.permesso === 'granted' && st.attiveSuDispositivo);
    } catch (e) {
      console.warn('Impostazioni: stato delle notifiche non disponibile', e);
    }
  }, [userId, notifOccupato]);

  // al focus della schermata e al ritorno dalle impostazioni di sistema (l'app torna attiva, la schermata resta a fuoco)
  useFocusEffect(useCallback(() => {
    riallineaNotifiche();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') riallineaNotifiche(); });
    return () => sub.remove();
  }, [riallineaNotifiche]));

  const scelteTipi = (p: typeof prefs): PreferenzeNotifiche => ({ start: p.start, sets: p.sets, final: p.final, news: p.news, gameDay: p.gameDay, mvp: p.mvp });

  const avvisoPermessoNegato = () => {
    const dove = Platform.OS === 'ios' ? 'nelle Impostazioni di iOS' : 'nelle impostazioni di Android';
    Alert.alert(
      'Notifiche non consentite',
      `Hai negato il permesso alle notifiche. Per riceverle attivale ${dove}, alla voce Notifiche dell'app.`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Apri Impostazioni', onPress: () => { Linking.openSettings().catch(() => {}); } },
      ],
    );
  };

  const attiva = async () => {
    if (!userId) return;
    // riaccese con tutte le singole spente: si riattivano tutte, altrimenti non arriverebbe nulla
    const allOff = NOTIF_TYPES.every((t) => !prefs[t.key]);
    const scelte = allOff ? { ...prefs, ...Object.fromEntries(NOTIF_TYPES.map((t) => [t.key, true])) } : prefs;
    setNotifOccupato(true);
    try {
      const esito = await attivaNotifiche(userId, scelteTipi(scelte));
      if (esito === 'attivate') {
        setNotifAttive(true);
        updatePrefs(allOff ? { ...scelteTipi(scelte), enabled: true } : { enabled: true });
        toast.show('Notifiche attivate.');
      } else if (esito === 'negate') {
        setNotifAttive(false);
        avvisoPermessoNegato();
      } else {
        setNotifAttive(false);
        toast.show("Le notifiche sono disponibili solo nell'app su iPhone o Android.");
      }
    } catch (e) {
      setNotifAttive(false);
      Alert.alert('Notifiche', e instanceof Error ? e.message : 'Attivazione delle notifiche non riuscita, riprova.');
    } finally {
      setNotifOccupato(false);
    }
  };

  const disattiva = async () => {
    if (!userId) return;
    setNotifAttive(false);
    setNotifOccupato(true);
    try {
      await disattivaNotifiche(userId);
      updatePrefs({ enabled: false });
    } catch (e) {
      setNotifAttive(true);
      Alert.alert('Notifiche', e instanceof Error ? e.message : 'Disattivazione delle notifiche non riuscita, riprova.');
    } finally {
      setNotifOccupato(false);
    }
  };

  const setEnabled = async (v: boolean) => {
    if (!userId || notifOccupato) return;
    if (!v) return disattiva();
    const permesso = await permessoNotifiche();
    if (permesso === 'non_supportato') {
      toast.show("Le notifiche sono disponibili solo nell'app su iPhone o Android.");
      return;
    }
    if (permesso === 'undetermined') {
      // nostra spiegazione prima del popup di sistema: il popup parte solo con "Attiva"
      Alert.alert('Notifiche', 'Vuoi ricevere avvisi su risultati, dirette e news della squadra?', [
        { text: 'Più tardi', style: 'cancel' },
        { text: 'Attiva', onPress: () => { attiva(); } },
      ]);
      return;
    }
    // già concesso: si registra subito; negato: attivaNotifiche restituisce 'negate' e si spiega come riattivarlo
    await attiva();
  };

  // spente tutte e sei le singole notifiche: si spegne anche l'interruttore generale
  const setType = (k: (typeof NOTIF_TYPES)[number]['key'], v: boolean) => {
    const allOff = NOTIF_TYPES.every((t) => (t.key === k ? !v : !prefs[t.key]));
    updatePrefs({ [k]: v });
    if (!userId || !notifAttive) return;
    if (allOff) {
      disattiva();
      return;
    }
    salvaPreferenzeNotifiche(userId, scelteTipi({ ...prefs, [k]: v }))
      .catch((e) => toast.show(e instanceof Error ? e.message : 'Preferenze non salvate, riprova.'));
  };

  const toggleSwitch = (value: boolean, onChange: (v: boolean) => void) => (
    <Switch value={value} onValueChange={onChange} trackColor={{ true: palette.gold, false: c.fill2 }} thumbColor="#fff" style={SMALL_SWITCH} />
  );


  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      {/* tocco fuori dal riquadro = chiudi */}
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Chiudi" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3,26,56,0.55)' }} />
      <Animated.View style={{
        maxHeight: height * 0.85, width: '100%', maxWidth: 520, alignSelf: 'center', marginBottom: insets.bottom + space.sm, paddingHorizontal: space.sm,
        transform: [{ translateY: rise }],
      }}>
        <View style={{ flexShrink: 1, borderRadius: 28, overflow: 'hidden', backgroundColor: c.bg, borderWidth: 1, borderColor: c.line }}>
          <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xs }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold }}>
                <SettingsIcon size={17} color={palette.onGold} />
              </View>
              <Txt w={800} size={18} style={{ flex: 1, letterSpacing: -0.3 }}>Impostazioni</Txt>
              <IconButton label="Chiudi" onPress={() => router.back()}>
                <X size={18} color={c.text} />
              </IconButton>
            </View>

            <Block icon={<Moon size={16} color={c.accent} />} title="Aspetto">
              <Item title="Modalità scura" sub={mode === 'dark' ? 'Attiva' : 'Disattivata'} first
                right={<ThemeSwitch dark={mode === 'dark'} onChange={(d) => { if (d !== (mode === 'dark')) toggle(); }} />} />
            </Block>

            {/* notifiche e privacy: solo per gli utenti registrati */}
            {user ? (
              <>
                <Block icon={<Bell size={16} color={c.accent} />} title="Notifiche" open={notifOpen} onToggle={toggleNotif}>
                  <Item title="Notifiche attive" sub={notifOpen ? 'Spegnile per non ricevere nulla.' : 'Tocca Notifiche per scegliere quali ricevere.'} first
                    right={toggleSwitch(notifAttive, setEnabled)} />
                  {notifOpen ? (
                    <View style={{ opacity: notifAttive ? 1 : 0.4 }} pointerEvents={notifAttive ? 'auto' : 'none'}>
                      {NOTIF_TYPES.map((t) => (
                        <Item key={t.key} title={t.title} right={toggleSwitch(prefs[t.key], (v) => setType(t.key, v))} />
                      ))}
                    </View>
                  ) : null}
                </Block>

                <Block icon={<ShieldCheck size={16} color={c.accent} />} title="Privacy">
                  <Pressable onPress={() => router.push('/account')} accessibilityRole="button">
                    <Item title="Account e privacy" sub="Consensi, informativa, elimina account" first
                      right={<ChevronRight size={17} color={c.muted} />} />
                  </Pressable>
                </Block>
              </>
            ) : (
              // senza accesso niente interruttore: le notifiche si attivano solo dopo il login
              <Block icon={<Bell size={16} color={c.accent} />} title="Notifiche">
                <Pressable onPress={() => router.replace('/login')} accessibilityRole="link" accessibilityLabel="Accedi per attivare le notifiche">
                  <Item title="Accedi per attivare le notifiche" sub="Avvisi su risultati, dirette e news della squadra." first
                    right={<ChevronRight size={17} color={c.muted} />} />
                </Pressable>
              </Block>
            )}

            {/* solo per gli utenti registrati */}
            {user ? (
              <Block icon={<Megaphone size={16} color={c.accent} />} title="Pubblicità">
                <Item title="Elimina pubblicità" sub="Non mostrare più gli annunci al centro dello schermo." first
                  right={toggleSwitch(noAds, setNoAds)} />
              </Block>
            ) : null}

            {/* stato e log dell'agente livescore: staff e admin */}
            {user?.role === 'admin' || user?.role === 'staff' ? (
              <Block icon={<Radio size={16} color={c.accent} />} title="Agente livescore">
                <Pressable onPress={() => router.push('/agente')} accessibilityRole="button">
                  <Item title="Stato e log" sub="Mac e Zima: finestra, punteggi scritti, avvisi ed errori" first
                    right={<ChevronRight size={17} color={c.muted} />} />
                </Pressable>
              </Block>
            ) : null}

            {/* la partita demo la gestiscono solo gli amministratori collegati */}
            {user?.role === 'admin' ? (
              <Block icon={<Volleyball size={16} color={c.accent} />} title="Partita demo">
                <Item title="Partita in diretta (demo)" sub="Mostra in home una partita dimostrativa, se non ce n'è una vera in corso." first
                  right={toggleSwitch(demoLive, setDemoLive)} />
              </Block>
            ) : null}

            {user ? (
              <Button size="sm" label={`Esci (${user.email})`} onPress={async () => { await signOut(); toast.show("Sei uscito dall'account."); router.replace('/login'); }} />
            ) : (
              <Button size="sm" label="Accedi o registrati" variant="gold" onPress={() => router.replace('/login')} />
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

/** Blocco dello stack: intestazione con icona e righe dentro un riquadro. Con onToggle l'intestazione apre e chiude il blocco */
function Block({ icon, title, children, open, onToggle }: { icon: ReactNode; title: string; children: ReactNode; open?: boolean; onToggle?: () => void }) {
  const { c } = useTheme();
  const head = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs }}>
      {icon}
      <Txt w={700} size={11.5} color="muted" style={{ flex: 1, letterSpacing: 0.8, textTransform: 'uppercase' }}>{title}</Txt>
      {onToggle ? <ChevronDown size={16} color={c.muted} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} /> : null}
    </View>
  );
  return (
    <View style={{ borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.xs }}>
      {onToggle ? (
        <Pressable onPress={onToggle} hitSlop={8} accessibilityRole="button" accessibilityState={{ expanded: !!open }}
          accessibilityLabel={`${title}, ${open ? 'chiudi' : 'mostra'} le singole notifiche`}>
          {head}
        </Pressable>
      ) : head}
      {children}
    </View>
  );
}

function Item({ title, sub, right, first }: { title: string; sub?: string; right: ReactNode; first?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderTopWidth: first ? 0 : 1, borderTopColor: c.line }}>
      <View style={{ flex: 1 }}>
        <Txt w={600} size={14}>{title}</Txt>
        {sub ? <Txt size={12} color="muted">{sub}</Txt> : null}
      </View>
      {right}
    </View>
  );
}
