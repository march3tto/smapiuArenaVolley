import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { parseStream, type Stream } from '@/lib/stream';

export interface Rect { x: number; y: number; w: number; h: number }

interface PlayerState {
  stream: Stream | null;
  title: string;
  /** ridotto a finestrella flottante (spostabile), anche se la schermata Live è aperta */
  minimized: boolean;
  /** spazio riservato dalla schermata Live (coordinate finestra): lì il player si aggancia a grandezza piena */
  dock: Rect | null;
  open: (ref: string, title?: string) => void;
  close: () => void;
  setMinimized: (v: boolean) => void;
  setDock: (r: Rect | null) => void;
}

const Ctx = createContext<PlayerState | null>(null);

/** Player della diretta unico per tutta l'app: sopravvive ai cambi di schermata, così il video non riparte */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const [stream, setStream] = useState<Stream | null>(null);
  const [title, setTitle] = useState('');
  const [minimized, setMinimized] = useState(false);
  const [dock, setDock] = useState<Rect | null>(null);

  const open = useCallback((ref: string, t = 'Diretta') => {
    const s = parseStream(ref);
    if (!s) return;
    // stesso video già aperto: non si ricarica, si riporta solo a grandezza piena
    setStream((cur) => (cur && cur.url === s.url ? cur : s));
    setTitle(t);
    setMinimized(false);
  }, []);
  const close = useCallback(() => setStream(null), []);

  const value = useMemo(() => ({ stream, title, minimized, dock, open, close, setMinimized, setDock }), [stream, title, minimized, dock, open, close]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlayer fuori da PlayerProvider');
  return v;
}
