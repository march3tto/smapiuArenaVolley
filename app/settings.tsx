import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, ScrollView, Switch, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Moon, Settings as SettingsIcon, Sun, Volleyball, X } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Txt } from '@/components/Txt';
import { useToast } from '@/components/Toast';
import { useApp } from '@/store/AppProvider';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { NotifPrefs } from '@/types';

/** Interruttori ridotti del 15%: i margini negativi recuperano lo spazio lasciato dalla scala */
const SMALL_SWITCH = { transform: [{ scale: 0.85 }], marginHorizontal: -4, marginVertical: -2 };

export default function Settings() {
  const { c, mode, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { prefs, updatePrefs, demoLive, setDemoLive, user, signOut } = useApp();
  const { height } = useWindowDimensions();
  // il riquadro sale dal basso mentre lo sfondo si scurisce (dissolvenza della schermata)
  const rise = useRef(new Animated.Value(60)).current;
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

  const Row = ({ k, title, sub }: { k: keyof Omit<NotifPrefs, 'youth' | 'enabled'>; title: string; sub?: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
      <View style={{ flex: 1 }}>
        <Txt w={600} size={14}>{title}</Txt>
        {sub ? <Txt size={12} color="muted">{sub}</Txt> : null}
      </View>
      <Switch value={prefs[k]} onValueChange={(v) => updatePrefs({ [k]: v })} trackColor={{ true: palette.gold, false: c.fill2 }} thumbColor="#fff" style={SMALL_SWITCH} />
    </View>
  );

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      {/* tocco fuori dal riquadro = chiudi */}
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Chiudi" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3,8,22,0.55)' }} />
      <Animated.View style={{
        maxHeight: height * 0.8, width: '100%', maxWidth: 520, alignSelf: 'center', marginBottom: insets.bottom + 10, paddingHorizontal: 10,
        transform: [{ translateY: rise }],
      }}>
        <View style={{ flexShrink: 1, borderRadius: 28, overflow: 'hidden', backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
          <ScrollView contentContainerStyle={{ padding: 18, gap: 4 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold }}>
                <SettingsIcon size={17} color={palette.onGold} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt w={800} size={18} style={{ letterSpacing: -0.3 }}>Notifiche</Txt>
                <Txt size={12} color="muted">Scegli cosa ricevere sul telefono.</Txt>
              </View>
              <IconButton label="Cambia tema" onPress={toggle}>
                {mode === 'dark' ? <Sun size={18} color={c.text} /> : <Moon size={18} color={c.text} />}
              </IconButton>
              <IconButton label="Chiudi" onPress={() => router.back()}>
                <X size={18} color={c.text} />
              </IconButton>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
              <View style={{ flex: 1 }}>
                <Txt w={700} size={14}>Notifiche attive</Txt>
                <Txt size={12} color="muted">Spegnile per non ricevere nulla.</Txt>
              </View>
              <Switch value={prefs.enabled} onValueChange={setEnabled} trackColor={{ true: palette.gold, false: c.fill2 }} thumbColor="#fff" style={SMALL_SWITCH} />
            </View>

            <View style={{ opacity: prefs.enabled ? 1 : 0.4 }} pointerEvents={prefs.enabled ? 'auto' : 'none'}>
              <Group title="Prima squadra" />
              <Row k="start" title="Inizio partita" />
              <Row k="sets" title="Fine di ogni set" />
              <Row k="final" title="Risultato finale" />
              <Group title="Società" />
              <Row k="news" title="Nuove notizie" />
            </View>

            <Group title="Anteprima" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
              <Volleyball size={17} color={c.accent} />
              <View style={{ flex: 1 }}>
                <Txt w={600} size={14}>Partita in diretta (demo)</Txt>
                <Txt size={12} color="muted">Mostra in home una partita dimostrativa, se non ce n'è una vera in corso.</Txt>
              </View>
              <Switch value={demoLive} onValueChange={setDemoLive} trackColor={{ true: palette.gold, false: c.fill2 }} thumbColor="#fff" style={SMALL_SWITCH} />
            </View>

            {/* accesso e registrazione disattivati: "Esci" resta solo per chi aveva già un account */}
            {user ? (
              <Button size="sm" label={`Esci (${user.email})`} style={{ marginTop: 12 }} onPress={async () => { await signOut(); toast.show("Sei uscito dall'account."); }} />
            ) : null}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

function Group({ title }: { title: string }) {
  return (
    <Txt w={700} size={11.5} color="muted" style={{ marginTop: 14, marginBottom: 2, letterSpacing: 0.8, textTransform: 'uppercase' }}>{title}</Txt>
  );
}
