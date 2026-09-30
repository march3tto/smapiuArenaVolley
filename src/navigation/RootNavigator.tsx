import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackHeaderProps,
} from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import AppHeader from '../components/AppHeader';
import type {
  SquadraStackParamList,
  AltroStackParamList,
  RootTabParamList,
} from './types';

import HomeScreen from '../screens/squadra/HomeScreen';
import LiveScreen from '../screens/squadra/LiveScreen';
import GiovaniliScreen from '../screens/giovanili/GiovaniliScreen';
import NewsScreen from '../screens/news/NewsScreen';
import MediaScreen from '../screens/media/MediaScreen';
import MenuScreen from '../screens/altro/MenuScreen';
import RosaScreen from '../screens/altro/RosaScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();
const SquadraStack = createNativeStackNavigator<SquadraStackParamList>();
const AltroStack = createNativeStackNavigator<AltroStackParamList>();

// header unico (vedi AppHeader): stessa altezza e contenuto su stack e tab
const stackHeaderOptions = {
  header: ({ navigation, back }: NativeStackHeaderProps) => (
    <AppHeader onBack={back ? navigation.goBack : undefined} />
  ),
};

function SquadraStackNavigator() {
  return (
    <SquadraStack.Navigator screenOptions={stackHeaderOptions}>
      <SquadraStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'SmapiuArenaVolley' }}
      />
      <SquadraStack.Screen
        name="Live"
        component={LiveScreen}
        options={{ title: 'Diretta' }}
      />
    </SquadraStack.Navigator>
  );
}

function AltroStackNavigator() {
  return (
    <AltroStack.Navigator screenOptions={stackHeaderOptions}>
      <AltroStack.Screen
        name="Menu"
        component={MenuScreen}
        options={{ title: 'Altro' }}
      />
      <AltroStack.Screen
        name="Rosa"
        component={RosaScreen}
        options={{ title: 'Rosa 2026/27' }}
      />
    </AltroStack.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          header: () => <AppHeader />,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: { borderTopColor: colors.line },
          tabBarLabelStyle: { fontFamily: fonts.bodyMedium },
          tabBarIcon: ({ color, size }) => {
            const iconByRoute: Record<string, keyof typeof Ionicons.glyphMap> = {
              SquadraTab: 'home-outline',
              GiovaniliTab: 'people-outline',
              NewsTab: 'newspaper-outline',
              MediaTab: 'play-circle-outline',
              AltroTab: 'grid-outline',
            };
            return (
              <Ionicons
                name={iconByRoute[route.name] ?? 'ellipse-outline'}
                size={size}
                color={color}
              />
            );
          },
        })}
      >
        <Tab.Screen
          name="SquadraTab"
          component={SquadraStackNavigator}
          options={{ headerShown: false, title: 'Squadra' }}
        />
        <Tab.Screen
          name="GiovaniliTab"
          component={GiovaniliScreen}
          options={{ title: 'Giovanili' }}
        />
        <Tab.Screen
          name="NewsTab"
          component={NewsScreen}
          options={{ title: 'News' }}
        />
        <Tab.Screen
          name="MediaTab"
          component={MediaScreen}
          options={{ title: 'Media' }}
        />
        <Tab.Screen
          name="AltroTab"
          component={AltroStackNavigator}
          options={{ headerShown: false, title: 'Altro' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
