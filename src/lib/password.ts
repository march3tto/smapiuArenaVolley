/** Robustezza della password per la barra sotto il campo (registrazione e nuova password) */
export function passwordStrength(p: string): { lv: number; label: string } {
  if (!p) return { lv: 0, label: 'Almeno 8 caratteri' };
  if (p.length < 8) return { lv: 1, label: 'Troppo corta' };
  let lv = 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) lv++;
  if (/\d/.test(p)) lv++;
  if (/[^A-Za-z0-9]/.test(p)) lv++;
  return { lv, label: ['', 'Debole', 'Discreta', 'Buona', 'Ottima'][lv] };
}
