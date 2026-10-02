import type { NavigatorScreenParams } from '@react-navigation/native';

export type AltroStackParamList = {
  Menu: undefined;
  Media: undefined;
  Giovanili: undefined;
};

export type RootTabParamList = {
  HomeTab: undefined;
  LiveTab: undefined;
  RisultatiTab: undefined;
  SquadraTab: undefined;
  NewsTab: undefined;
  AltroTab: NavigatorScreenParams<AltroStackParamList> | undefined;
};
