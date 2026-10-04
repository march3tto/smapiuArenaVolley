import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { TabBar } from '@/components/TabBar';
import { TopBar } from '@/components/TopBar';
import { useApp } from '@/store/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const { ready, user, guest } = useApp();
  const { c } = useTheme();
  if (!ready) return null;
  if (!user && !guest) return <Redirect href="/login" />;

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
