import React from 'react';
import { NavigationContainer, DarkTheme, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackHeaderProps,
} from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import AppHeader from '../components/AppHeader';
import type { AltroStackParamList, RootTabParamList } from './types';

import HomeScreen from '../screens/squadra/HomeScreen';
import LiveScreen from '../screens/squadra/LiveScreen';
import RisultatiScreen from '../screens/risultati/RisultatiScreen';
import RosaScreen from '../screens/squadra/RosaScreen';
import NewsScreen from '../screens/news/NewsScreen';
import MenuScreen from '../screens/altro/MenuScreen';
import MediaScreen from '../screens/media/MediaScreen';
import GiovaniliScreen from '../screens/giovanili/GiovaniliScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();
const AltroStack = createNativeStackNavigator<AltroStackParamList>();

// sfondo blu notte anche durante le transizioni, niente lampi bianchi
const theme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.yellow,
    background: colors.navy,
    card: colors.card,
    text: colors.text,
    border: colors.cardBorder,
  },
};

// header unico (vedi AppHeader): stessa altezza e contenuto su stack e tab
const stackHeaderOptions = {
  header: ({ navigation, back }: NativeStackHeaderProps) => (
    <AppHeader onBack={back ? navigation.goBack : undefined} />
  ),
};

function AltroStackNavigator() {
  return (
    <AltroStack.Navigator screenOptions={stackHeaderOptions}>
      <AltroStack.Screen name="Menu" component={MenuScreen} options={{ title: 'Altro' }} />
      <AltroStack.Screen name="Media" component={MediaScreen} options={{ title: 'Podcast & Video' }} />
      <AltroStack.Screen name="Giovanili" component={GiovaniliScreen} options={{ title: 'Giovanili' }} />
    </AltroStack.Navigator>
  );
}

const iconByRoute: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
  HomeTab: 'home',
  LiveTab: 'flash',
  RisultatiTab: 'trophy',
  SquadraTab: 'people',
  NewsTab: 'newspaper',
  AltroTab: 'grid',
};

export default function RootNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          header: () => <AppHeader />,
          tabBarActiveTintColor: colors.yellow,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: 'rgba(242,184,0,0.3)',
          },
          tabBarLabelStyle: { fontFamily: fonts.display, fontSize: 10 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={iconByRoute[route.name]}
              size={size - 2}
              // il fulmine del Live resta sempre giallo, come nella PWA
              color={route.name === 'LiveTab' ? colors.yellow : color}
            />
          ),
        })}
      >
        <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
        <Tab.Screen name="LiveTab" component={LiveScreen} options={{ title: 'Live' }} />
        <Tab.Screen name="RisultatiTab" component={RisultatiScreen} options={{ title: 'Risultati' }} />
        <Tab.Screen name="SquadraTab" component={RosaScreen} options={{ title: 'Squadra' }} />
        <Tab.Screen name="NewsTab" component={NewsScreen} options={{ title: 'News' }} />
        <Tab.Screen
          name="AltroTab"
          component={AltroStackNavigator}
          options={{ headerShown: false, title: 'Altro' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
