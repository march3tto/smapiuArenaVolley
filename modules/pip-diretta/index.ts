import { requireOptionalNativeModule, type NativeModule } from 'expo';

type Events = { onPipChange: (e: { active: boolean }) => void };
declare class PipDirettaModule extends NativeModule<Events> {
  isSupported(): boolean;
  setEnabled(enabled: boolean): void;
}

/** Solo Android (dev build): su iOS, web ed Expo Go il modulo non c'è e le funzioni non fanno nulla */
const native = requireOptionalNativeModule<PipDirettaModule>('PipDiretta');

export const pipSupported = () => native?.isSupported() ?? false;
export const setPipEnabled = (enabled: boolean) => native?.setEnabled(enabled);
export function onPipChange(cb: (active: boolean) => void) {
  const sub = native?.addListener('onPipChange', (e) => cb(e.active));
  return () => sub?.remove();
}
