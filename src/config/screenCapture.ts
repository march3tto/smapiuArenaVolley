// Blocco di screenshot e registrazione dello schermo.
// Attivo di default; si disattiva solo con EXPO_PUBLIC_ALLOW_CAPTURE=true (profilo EAS "demo",
// usato per registrare i video per la revisione dell'App Store). Il valore viene inserito
// nel bundle al momento della build: va letto così, con accesso statico a process.env.
export const ALLOW_SCREEN_CAPTURE = process.env.EXPO_PUBLIC_ALLOW_CAPTURE === 'true';
