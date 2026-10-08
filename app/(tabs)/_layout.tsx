import { useState } from 'react';
import { Tabs } from 'expo-router/tabs';
import { LoadingScreen } from '@/components/LoadingScreen';
import { TabBar } from '@/components/TabBar';
import { TopBar } from '@/components/TopBar';
import { useApp } from '@/store/AppProvider';
import { useData } from '@/store/DataProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const { ready } = useApp();
  const { loading } = useData();
  const { c } = useTheme();
  // l'immagine di caricamento si mostra solo al primo avvio, non a ogni aggiornamento dei dati
  const [started, setStarted] = useState(false);
  if (!started && ready && !loading) setStarted(true);
  if (!started) return <LoadingScreen />;

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ header: () => <TopBar />, headerTransparent: true, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="risultati" options={{ title: 'Risultati' }} />
      <Tabs.Screen name="squadra" options={{ title: 'Squadra' }} />
      <Tabs.Screen name="giovanili" options={{ title: 'Giovanili' }} />
      <Tabs.Screen name="news" options={{ title: 'News' }} />
      <Tabs.Screen name="altro" options={{ title: 'Altro' }} />
    </Tabs>
  );
}
