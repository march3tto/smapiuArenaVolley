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
                  <RootStack />
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
  const { ready, user, prefs } = useApp();
  useNotifichePush({ ready, userId: user?.id ?? null, enabled: prefs.enabled });
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
        <Stack.Screen name="formazione-avversaria" options={{ ...header, title: 'Formazione avversaria' }} />
        <Stack.Screen name="player/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="notizia/[id]" options={{ presentation: 'modal' }} />
        {/* riquadro in basso sopra la schermata corrente, non a tutto schermo */}
        <Stack.Screen name="settings" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="info/[section]" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
