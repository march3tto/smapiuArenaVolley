import type { ConfigContext, ExpoConfig } from 'expo/config';

/*
 * Estende app.json con i valori che dipendono dall'ambiente e con la configurazione dell'accesso.
 * I login nativi (Apple, Google) richiedono una development build (expo-dev-client): in Expo Go non funzionano.
 */

/** Informativa privacy: cambiando la versione, al login successivo l'app chiede di nuovo i consensi */
const PRIVACY_POLICY_URL = 'https://march3tto.github.io/smapiuArenaVolley/privacy/';
const PRIVACY_POLICY_VERSION = '2026-10-v1';

export default ({ config }: ConfigContext): ExpoConfig => {
  // Client ID OAuth di Google Cloud (identificativi pubblici, non segreti): vedi .env.example
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  // il plugin di Google Sign-In vuole lo schema URL iOS: il client ID iOS con le parti invertite
  const iosUrlScheme = googleIosClientId
    ? `com.googleusercontent.apps.${googleIosClientId.replace(/\.apps\.googleusercontent\.com$/, '')}`
    : undefined;

  return {
    ...config,
    name: config.name ?? 'Arena Volley',
    slug: config.slug ?? 'smapiuArenaVolley',
    plugins: [
      ...(config.plugins ?? []),
      // capability "Sign in with Apple" (entitlement iOS)
      'expo-apple-authentication',
      // senza client ID iOS il plugin fallirebbe il prebuild: si aggiunge solo quando è configurato
      ...(iosUrlScheme ? [['@react-native-google-signin/google-signin', { iosUrlScheme }] as [string, unknown]] : []),
    ],
    extra: {
      ...config.extra,
      privacyPolicyUrl: PRIVACY_POLICY_URL,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      googleWebClientId,
      googleIosClientId,
    },
  };
};
