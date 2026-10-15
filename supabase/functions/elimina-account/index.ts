// Cancellazione dell'account dall'app (Impostazioni > Account e privacy > Elimina account), per ogni tipo di accesso
// (email, Apple, Google, Facebook, anche con più identità collegate).
// POST con il JWT dell'utente in Authorization; body facoltativo { appleAuthorizationCode } per revocare Sign in with Apple.
// Risponde { codice, provider, appleRevocato }.
//   supabase secrets set APPLE_TEAM_ID=... APPLE_KEY_ID=... APPLE_CLIENT_ID=it.arenavolleyteam.app APPLE_PRIVATE_KEY="$(cat AuthKey_XXXX.p8)"
//   supabase functions deploy elimina-account
import { createClient } from 'npm:@supabase/supabase-js@2';
import { eliminaAccount } from '../_shared/eliminazione-account.ts';
import { CORS, ErroreHttp, json } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito', codice: 'metodo' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Accesso richiesto', codice: 'non_autenticato' }, 401);

  // utente ricavato dal suo token con il client anon: il service role serve solo per la cancellazione
  const utente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await utente.auth.getUser();
  if (error || !data.user) return json({ error: 'Sessione non valida, accedi di nuovo', codice: 'non_autenticato' }, 401);

  let appleAuthorizationCode: string | null = null;
  try {
    const b = await req.json();
    if (typeof b?.appleAuthorizationCode === 'string' && b.appleAuthorizationCode.length < 2000) appleAuthorizationCode = b.appleAuthorizationCode;
  } catch {
    // body vuoto: va bene
  }

  try {
    return json(await eliminaAccount(data.user.id, 'app', appleAuthorizationCode));
  } catch (e) {
    if (e instanceof ErroreHttp) return json({ error: e.message, codice: e.codice }, e.status);
    console.error('elimina-account', data.user.id, e);
    return json({ error: 'Eliminazione non riuscita, riprova più tardi', codice: 'errore' }, 500);
  }
});
