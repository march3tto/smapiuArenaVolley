// Data Deletion Callback di Meta: chiamata da Facebook quando l'utente rimuove l'app dalle impostazioni di Facebook.
// Riceve un form POST con signed_request, ne verifica la firma con FACEBOOK_APP_SECRET, trova l'utente collegato
// (auth.identities, provider 'facebook', provider_id = user_id app-scoped) ed elimina l'account come elimina-account.
// Risponde come richiesto da Meta: { url, confirmation_code }.
//   supabase secrets set FACEBOOK_APP_SECRET=...
//   supabase functions deploy facebook-eliminazione-dati --no-verify-jwt
// URL da inserire in Meta for Developers (Facebook Login > Impostazioni > Callback di eliminazione dati):
//   https://<progetto>.supabase.co/functions/v1/facebook-eliminazione-dati
import { admin, eliminaAccount, registra, urlStato } from '../_shared/eliminazione-account.ts';
import { verificaSignedRequest } from '../_shared/facebook.ts';
import { ErroreHttp, json } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405);
  const segreto = Deno.env.get('FACEBOOK_APP_SECRET');
  if (!segreto) {
    console.error('FACEBOOK_APP_SECRET mancante');
    return json({ error: 'Configurazione mancante' }, 500);
  }

  let signedRequest: string | null = null;
  try {
    signedRequest = String((await req.formData()).get('signed_request') ?? '') || null;
  } catch {
    // non è un form
  }
  if (!signedRequest) return json({ error: 'signed_request mancante' }, 400);

  const dati = await verificaSignedRequest(signedRequest, segreto);
  if (!dati?.user_id) return json({ error: 'signed_request non valido' }, 400);

  try {
    const { data: utenteId, error } = await admin.rpc('utente_da_identita', { p_provider: 'facebook', p_provider_id: String(dati.user_id) });
    if (error) throw new Error(error.message);
    // nessun account collegato: si registra comunque la richiesta, così il codice restituito a Meta è verificabile
    const codice = utenteId
      ? (await eliminaAccount(String(utenteId), 'facebook_callback')).codice
      : await registra(null, ['facebook'], 'facebook_callback');
    return json({ url: urlStato(codice), confirmation_code: codice });
  } catch (e) {
    if (e instanceof ErroreHttp) return json({ error: e.message }, e.status);
    console.error('facebook-eliminazione-dati', e);
    return json({ error: 'Eliminazione non riuscita' }, 500);
  }
});
