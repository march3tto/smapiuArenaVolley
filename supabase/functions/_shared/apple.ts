// Revoca di Sign in with Apple (obbligatoria per l'App Store quando l'utente elimina l'account).
// Secrets richiesti:
//   APPLE_TEAM_ID      Team ID dell'account Apple Developer
//   APPLE_KEY_ID       Key ID della chiave .p8 con Sign in with Apple abilitato
//   APPLE_CLIENT_ID    bundle ID dell'app iOS (it.arenavolleyteam.app): l'authorizationCode del login nativo è emesso per il bundle,
//                      non per il Services ID usato dal login web
//   APPLE_PRIVATE_KEY  contenuto del file .p8 (PEM "-----BEGIN PRIVATE KEY-----...")

const APPLE = 'https://appleid.apple.com';

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlJson = (v: unknown) => b64url(new TextEncoder().encode(JSON.stringify(v)));

function env(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`Secret ${nome} mancante`);
  return v;
}

/** client_secret per le API Apple: JWT ES256 firmato con la chiave .p8, valido 5 minuti */
export async function clientSecret(teamId: string, keyId: string, clientId: string, pem: string): Promise<string> {
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const iat = Math.floor(Date.now() / 1000);
  const input = `${b64urlJson({ alg: 'ES256', kid: keyId })}.${b64urlJson({ iss: teamId, iat, exp: iat + 300, aud: APPLE, sub: clientId })}`;
  // WebCrypto restituisce la firma già nel formato r||s richiesto da JWS
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(input)));
  return `${input}.${b64url(sig)}`;
}

async function post(path: string, body: Record<string, string>): Promise<Response> {
  return await fetch(`${APPLE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
}

/**
 * Scambia l'authorizationCode (appena ottenuto dall'app) con un refresh token e lo revoca.
 * Lancia un errore se qualcosa non va: chi chiama decide se proseguire.
 */
export async function revocaApple(authorizationCode: string): Promise<void> {
  const clientId = env('APPLE_CLIENT_ID');
  const secret = await clientSecret(env('APPLE_TEAM_ID'), env('APPLE_KEY_ID'), clientId, env('APPLE_PRIVATE_KEY'));

  const res = await post('/auth/token', { client_id: clientId, client_secret: secret, code: authorizationCode, grant_type: 'authorization_code' });
  const tok = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Apple /auth/token ${res.status}: ${tok.error ?? 'errore sconosciuto'}`);
  const token: string | undefined = tok.refresh_token ?? tok.access_token;
  if (!token) throw new Error('Apple /auth/token: nessun token nella risposta');

  const rev = await post('/auth/revoke', {
    client_id: clientId,
    client_secret: secret,
    token,
    token_type_hint: tok.refresh_token ? 'refresh_token' : 'access_token',
  });
  if (!rev.ok) throw new Error(`Apple /auth/revoke ${rev.status}: ${await rev.text()}`);
}
