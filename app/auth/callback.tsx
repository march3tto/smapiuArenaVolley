import { Redirect } from 'expo-router';

/**
 * Destinazione del redirect OAuth (arenavolley://auth/callback). Lo scambio del codice con la sessione avviene in
 * accediConFacebook (src/lib/auth.ts); se il sistema apre comunque questo link, si torna alla home.
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
