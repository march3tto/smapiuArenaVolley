-- Ogni quanti minuti la stessa pubblicità può ricomparire sullo stesso dispositivo (letta da src/components/AdPopup.tsx).

alter table public.pubblicita
  add column if not exists frequenza_minuti integer not null default 30 check (frequenza_minuti > 0);
