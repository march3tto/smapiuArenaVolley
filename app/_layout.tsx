import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Roboto_400Regular, Roboto_500Medium, Roboto_600SemiBold, Roboto_700Bold, Roboto_800ExtraBold, Roboto_900Black,
} from '@expo-google-fonts/roboto';
import { BarlowCondensed_800ExtraBold_Italic, BarlowCondensed_900Black_Italic } from '@expo-google-fonts/barlow-condensed';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { AppProvider, useApp } from '@/store/AppProvider';
import { DataProvider } from '@/store/DataProvider';
import { LiveProvider } from '@/store/LiveProvider';
import { LineupProvider } from '@/store/LineupProvider';
import { PlayerProvider } from '@/store/PlayerProvider';
import { FloatingPlayer } from '@/components/FloatingPlayer';
import { AdPopup } from '@/components/AdPopup';
import { ConsentGate } from '@/components/ConsentGate';
import { PwaUpdater } from '@/components/PwaUpdater';
import { ToastProvider } from '@/components/Toast';
import { FONT } from '@/theme/colors';
import { useNotifichePush } from '@/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded] = useFonts({
    Roboto_400Regular, Roboto_500Medium, Roboto_600SemiBold, Roboto_700Bold, Roboto_800ExtraBold, Roboto_900Black,
    BarlowCondensed_800ExtraBold_Italic, BarlowCondensed_900Black_Italic,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <DataProvider>
            <LiveProvider>
              <LineupProvider>
                <ToastProvider>
                  <PlayerProvider>
                    <RootStack />
                  </PlayerProvider>
                </ToastProvider>
              </LineupProvider>
            </LiveProvider>
          </DataProvider>
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { c, mode } = useTheme();
  const { ready, user, prefs, consentStatus } = useApp();
  useNotifichePush({ ready, userId: user?.id ?? null, prefs });
  const header = {
    headerShown: true,
    // solo la freccia "<", senza il nome della schermata precedente
    headerBackButtonDisplayMode: 'minimal',
    headerStyle: { backgroundColor: c.bg },
    headerTintColor: c.text,
    headerTitleStyle: { fontFamily: FONT[700] },
    headerShadowVisible: false,
  } as const;
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="live" options={{ ...header, title: 'Partita in corso' }} />
        <Stack.Screen name="giornata/[numero]" options={{ ...header, title: 'Giornata' }} />
        <Stack.Screen name="formazione/[squadra]" options={({ route }) => ({
          ...header, title: (route.params as { squadra?: string } | undefined)?.squadra === 'nostra' ? 'Formazione Smapiù' : 'Formazione avversaria',
        })} />
        <Stack.Screen name="player/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="notizia/[id]" options={{ presentation: 'modal' }} />
        {/* riquadro in basso sopra la schermata corrente, non a tutto schermo */}
        <Stack.Screen name="settings" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="info/[section]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="account" options={{ presentation: 'modal' }} />
        <Stack.Screen name="assistente" options={{ presentation: 'modal' }} />
        <Stack.Screen name="elimina-account" options={{ presentation: 'modal' }} />
        {/* ritorno dal login Facebook su Android: il codice lo gestisce già openAuthSessionAsync */}
        <Stack.Screen name="auth/callback" options={{ animation: 'none' }} />
      </Stack>
      {/* diretta video: agganciata nella Live o in finestrella sopra qualsiasi schermata */}
      <FloatingPlayer />
      {/* pubblicità al centro dello schermo, con la frequenza indicata nella tabella pubblicita */}
      {ready && !(user && consentStatus === 'mancanti') ? <AdPopup /> : null}
      {/* sopra tutto (navigazione compresa) finché mancano i consensi obbligatori */}
      {user && consentStatus === 'mancanti' ? <ConsentGate /> : null}
      {/* solo PWA: avviso "Nuova versione disponibile" (sul nativo non mostra nulla) */}
      <PwaUpdater />
    </>
  );
}
