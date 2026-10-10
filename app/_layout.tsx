import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Roboto_400Regular, Roboto_500Medium, Roboto_600SemiBold, Roboto_700Bold, Roboto_800ExtraBold, Roboto_900Black,
} from '@expo-google-fonts/roboto';
import { BarlowCondensed_800ExtraBold_Italic, BarlowCondensed_900Black_Italic } from '@expo-google-fonts/barlow-condensed';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { AppProvider } from '@/store/AppProvider';
import { DataProvider } from '@/store/DataProvider';
import { LiveProvider } from '@/store/LiveProvider';
import { ToastProvider } from '@/components/Toast';
import { FONT } from '@/theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => {});

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
}

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
              <ToastProvider>
                <RootStack />
              </ToastProvider>
            </LiveProvider>
          </DataProvider>
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { c, mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="live"
          options={{
            headerShown: true,
            title: 'Partita in corso',
            // solo la freccia "<", senza il nome della schermata precedente
            headerBackButtonDisplayMode: 'minimal',
            headerStyle: { backgroundColor: c.bg },
            headerTintColor: c.text,
            headerTitleStyle: { fontFamily: FONT[700] },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen name="player/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="notizia/[id]" options={{ presentation: 'modal' }} />
        {/* riquadro in basso sopra la schermata corrente, non a tutto schermo */}
        <Stack.Screen name="settings" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="info/[section]" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
