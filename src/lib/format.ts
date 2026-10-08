const DAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const MONTHS_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

/** "Domenica 18 ottobre" (con l'anno se diverso da quello corrente della stagione) */
export function longDate(iso: string, refYear = 2026): string {
  const d = new Date(iso);
  const y = d.getFullYear() !== refYear ? ` ${d.getFullYear()}` : '';
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${y}`;
}

/** "18:00" */
export function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "Dom 11 ott, 11:00" */
export function shortDateTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${hh}:${mm}`;
}

export function dayName(iso: string): string {
  return DAYS[new Date(iso).getDay()];
}

export function dayNum(iso: string): number {
  return new Date(iso).getDate();
}

export function monthShort(iso: string): string {
  return MONTHS_SHORT[new Date(iso).getMonth()];
}

/** "28 settembre 2026" */
export function newsDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "12 marzo 2004 · 22 anni" da una data "AAAA-MM-GG" */
export function birthDateAge(iso: string, today = new Date()): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const age = today.getFullYear() - y - (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d) ? 1 : 0);
  return `${d} ${MONTHS[m - 1]} ${y} · ${age} anni`;
}

export function initials(name: string, max = 2): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, max)
    .toUpperCase();
}

export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
