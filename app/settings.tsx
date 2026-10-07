import { Platform, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Bell, Moon, Send, Settings as SettingsIcon, Sun, Volleyball, X } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Txt } from '@/components/Txt';
import { useToast } from '@/components/Toast';
import { useApp } from '@/store/AppProvider';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { NotifPrefs } from '@/types';

export default function Settings() {
  const { c, mode, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { prefs, updatePrefs, demoLive, setDemoLive, user, signOut } = useApp();

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

  const testNotification = async () => {
    const ok = await askPermission();
    if (!ok) return toast.show('Notifiche non disponibili: abilitale nelle impostazioni del telefono.', Bell);
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Smapiù Arena Volley', body: 'Punto Smapiù! Muro di Anna Riccato (18–15).' },
      trigger: null,
    });
  };

  const Row = ({ k, title, sub }: { k: keyof Omit<NotifPrefs, 'youth' | 'enabled'>; title: string; sub?: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.line }}>
      <View style={{ flex: 1 }}>
        <Txt w={600} size={15}>{title}</Txt>
        {sub ? <Txt size={12.5} color="muted">{sub}</Txt> : null}
      </View>
      <Switch value={prefs[k]} onValueChange={(v) => updatePrefs({ [k]: v })} trackColor={{ true: palette.gold, false: c.fill2 }} thumbColor="#fff" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.card }}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingTop: Platform.OS === 'ios' ? 22 : insets.top + 16, paddingBottom: insets.bottom + 30, gap: 6, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold }}>
            <SettingsIcon size={20} color={palette.onGold} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt w={800} size={22} style={{ letterSpacing: -0.4 }}>Notifiche</Txt>
            <Txt size={13} color="muted">Scegli cosa ricevere sul telefono.</Txt>
          </View>
          <IconButton label="Cambia tema" onPress={toggle}>
            {mode === 'dark' ? <Sun size={18} color={c.text} /> : <Moon size={18} color={c.text} />}
          </IconButton>
          <IconButton label="Chiudi" onPress={() => router.back()}>
            <X size={18} color={c.text} />
          </IconButton>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
          <View style={{ flex: 1 }}>
            <Txt w={700} size={15}>Notifiche attive</Txt>
            <Txt size={12.5} color="muted">Spegnile per non ricevere nulla.</Txt>
          </View>
          <Switch value={prefs.enabled} onValueChange={setEnabled} trackColor={{ true: palette.gold, false: c.fill2 }} thumbColor="#fff" />
        </View>

        <View style={{ opacity: prefs.enabled ? 1 : 0.4 }} pointerEvents={prefs.enabled ? 'auto' : 'none'}>
          <Group title="Prima squadra" />
          <Row k="start" title="Inizio partita" />
          <Row k="points" title="Ogni punto in diretta" sub="Molte notifiche durante il match." />
          <Row k="sets" title="Fine di ogni set" />
          <Row k="final" title="Risultato finale" />
          <Group title="Società" />
          <Row k="news" title="Nuove notizie" />
        </View>

        <Button label="Invia notifica di prova" icon={<Send size={16} color={c.text} />} onPress={testNotification} style={{ marginTop: 14 }} />

        <Group title="Anteprima" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.line }}>
          <Volleyball size={18} color={c.accent} />
          <View style={{ flex: 1 }}>
            <Txt w={600} size={15}>Partita in diretta (demo)</Txt>
            <Txt size={12.5} color="muted">Mostra o nasconde la diretta in home, con una partita dimostrativa, se non ce n'è già una con stato "live".</Txt>
          </View>
          <Switch value={demoLive} onValueChange={setDemoLive} trackColor={{ true: palette.gold, false: c.fill2 }} thumbColor="#fff" />
        </View>

        {user ? (
          <Button label={`Esci (${user.email})`} style={{ marginTop: 18 }} onPress={async () => { await signOut(); router.replace('/login'); }} />
        ) : (
          <Button label="Accedi o registrati" variant="gold" style={{ marginTop: 18 }} onPress={() => router.replace('/login')} />
        )}
      </ScrollView>
    </View>
  );
}

function Group({ title }: { title: string }) {
  return (
    <Txt w={700} size={12} color="muted" style={{ marginTop: 20, marginBottom: 2 }}>{title}</Txt>
  );
}
