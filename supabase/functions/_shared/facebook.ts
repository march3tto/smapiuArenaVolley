// signed_request di Facebook: "<firma base64url>.<payload base64url>", firma HMAC-SHA256 del payload con l'app secret.

const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));

/** Payload del signed_request se la firma HMAC-SHA256 è valida, altrimenti null */
export async function verificaSignedRequest(signedRequest: string, segreto: string): Promise<{ user_id?: string } | null> {
  const [sig, payload] = signedRequest.split('.', 2);
  if (!sig || !payload) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(segreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  // verify confronta in tempo costante
  const ok = await crypto.subtle.verify('HMAC', key, fromB64url(sig), new TextEncoder().encode(payload));
  if (!ok) return null;
  try {
    const dati = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    return String(dati.algorithm).toUpperCase() === 'HMAC-SHA256' ? dati : null;
  } catch {
    return null;
  }
}
