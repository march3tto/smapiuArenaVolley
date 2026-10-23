import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, ScrollView, Switch, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Bell, ChevronRight, Megaphone, Moon, Settings as SettingsIcon, ShieldCheck, Volleyball, X } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { Txt } from '@/components/Txt';
import { useToast } from '@/components/Toast';
import { useApp } from '@/store/AppProvider';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { NotifPrefs } from '@/types';

/** Interruttori ridotti del 15%: i margini negativi recuperano lo spazio lasciato dalla scala */
const SMALL_SWITCH = { transform: [{ scale: 0.85 }], marginHorizontal: -4, marginVertical: -2 };

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

  const askPermission = async () => {
    if (Platform.OS === 'web') return false;
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  };

  const setEnabled = async (v: boolean) => {
    updatePrefs({ enabled: v });
    if (v) await askPermission();
  };

  const toggleSwitch = (value: boolean, onChange: (v: boolean) => void) => (
    <Switch value={value} onValueChange={onChange} trackColor={{ true: palette.gold, false: c.fill2 }} thumbColor="#fff" style={SMALL_SWITCH} />
  );

  const notifRow = (k: keyof Omit<NotifPrefs, 'youth' | 'enabled'>, title: string) => (
    <Item key={k} title={title} right={toggleSwitch(prefs[k], (v) => updatePrefs({ [k]: v }))} />
  );

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      {/* tocco fuori dal riquadro = chiudi */}
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Chiudi" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3,26,56,0.55)' }} />
      <Animated.View style={{
        maxHeight: height * 0.85, width: '100%', maxWidth: 520, alignSelf: 'center', marginBottom: insets.bottom + 10, paddingHorizontal: 10,
        transform: [{ translateY: rise }],
      }}>
        <View style={{ flexShrink: 1, borderRadius: 28, overflow: 'hidden', backgroundColor: c.bg, borderWidth: 1, borderColor: c.line }}>
          <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
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

            <Block icon={<Bell size={16} color={c.accent} />} title="Notifiche">
              <Item title="Notifiche attive" sub="Spegnile per non ricevere nulla." first right={toggleSwitch(prefs.enabled, setEnabled)} />
              <View style={{ opacity: prefs.enabled ? 1 : 0.4 }} pointerEvents={prefs.enabled ? 'auto' : 'none'}>
                {notifRow('start', 'Inizio partita')}
                {notifRow('sets', 'Fine di ogni set')}
                {notifRow('final', 'Risultato finale')}
                {notifRow('news', 'Nuove news o podcast')}
              </View>
            </Block>

            <Block icon={<ShieldCheck size={16} color={c.accent} />} title="Privacy">
              <Pressable onPress={() => router.push('/account')} accessibilityRole="button">
                <Item title="Account e privacy" sub={user ? 'Consensi, informativa, elimina account' : 'Informativa privacy'} first
                  right={<ChevronRight size={17} color={c.muted} />} />
              </Pressable>
            </Block>

            {/* solo per gli utenti registrati */}
            {user ? (
              <Block icon={<Megaphone size={16} color={c.accent} />} title="Pubblicità">
                <Item title="Elimina pubblicità" sub="Non mostrare più gli annunci al centro dello schermo." first
                  right={toggleSwitch(noAds, setNoAds)} />
              </Block>
            ) : null}

            <Block icon={<Volleyball size={16} color={c.accent} />} title="Partita demo">
              <Item title="Partita in diretta (demo)" sub="Mostra in home una partita dimostrativa, se non ce n'è una vera in corso." first
                right={toggleSwitch(demoLive, setDemoLive)} />
            </Block>

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

/** Blocco dello stack: intestazione con icona e righe dentro un riquadro */
function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        {icon}
        <Txt w={700} size={11.5} color="muted" style={{ letterSpacing: 0.8, textTransform: 'uppercase' }}>{title}</Txt>
      </View>
      {children}
    </View>
  );
}

function Item({ title, sub, right, first }: { title: string; sub?: string; right: ReactNode; first?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: first ? 0 : 1, borderTopColor: c.line }}>
      <View style={{ flex: 1 }}>
        <Txt w={600} size={14}>{title}</Txt>
        {sub ? <Txt size={12} color="muted">{sub}</Txt> : null}
      </View>
      {right}
    </View>
  );
}
