import { useSyncExternalStore } from 'react';
import { loadJSON, saveJSON } from './storage';

/** Volti disponibili per l'assistente, uno per file in assets/avatar (il primo è quello predefinito) */
export const AVATARS = [
  { name: 'beatrice', source: require('../../assets/avatar/beatrice.png') },
  { name: 'alice', source: require('../../assets/avatar/alice.png') },
  { name: 'anna', source: require('../../assets/avatar/anna.png') },
  { name: 'aurora', source: require('../../assets/avatar/aurora.png') },
  { name: 'chiara', source: require('../../assets/avatar/chiara.png') },
  { name: 'francesca', source: require('../../assets/avatar/francesca.png') },
  { name: 'isabella', source: require('../../assets/avatar/isabella.png') },
  { name: 'nicole', source: require('../../assets/avatar/nicole.png') },
  { name: 'sara', source: require('../../assets/avatar/sara.png') },
  { name: 'sofia', source: require('../../assets/avatar/sofia.png') },
  { name: 'valentina', source: require('../../assets/avatar/valentina.png') },
  { name: 'vittoria', source: require('../../assets/avatar/vittoria.png') },
] as const;

// salva il nome del file, non la posizione: aggiungere o togliere avatar non cambia la scelta
const KEY = 'av-assistant-avatar-name';

// stato condiviso fra pulsante e chat: la scelta si vede subito ovunque
let current = 0;
let loaded = false;
const listeners = new Set<() => void>();

function setAvatar(i: number, save = true) {
  if (i < 0 || i >= AVATARS.length || i === current) return;
  current = i;
  listeners.forEach((l) => l());
  if (save) saveJSON(KEY, AVATARS[i].name);
}

/** Nome da mostrare: il nome del file con l'iniziale maiuscola */
export function avatarLabel(i: number) {
  const n = AVATARS[i]?.name ?? '';
  return n.charAt(0).toUpperCase() + n.slice(1);
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (!loaded) {
    loaded = true;
    loadJSON<string>(KEY).then((v) => {
      const i = AVATARS.findIndex((a) => a.name === v);
      if (i >= 0) setAvatar(i, false);
    });
  }
  return () => { listeners.delete(l); };
}

/** Avatar scelto per l'assistente, salvato sul dispositivo */
export function useAssistantAvatar() {
  const index = useSyncExternalStore(subscribe, () => current, () => 0);
  return { index, source: AVATARS[index].source, name: avatarLabel(index), setAvatar };
}
