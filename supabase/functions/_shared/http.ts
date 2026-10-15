// Risposte JSON e CORS comuni alle Edge Functions dell'account.

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });

/** Errore con stato HTTP e codice leggibile dall'app */
export class ErroreHttp extends Error {
  constructor(readonly status: number, readonly codice: string, messaggio: string) {
    super(messaggio);
  }
}
