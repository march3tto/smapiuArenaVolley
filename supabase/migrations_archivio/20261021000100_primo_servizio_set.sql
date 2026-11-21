-- Squadra al servizio al primo scambio di ogni set, scelta dall'admin sullo 0-0 toccando lo stemma nella diretta.
-- Se manca vale la regola dell'app: 1° set Smapiù, poi chi ha chiuso il set precedente.
-- Da eseguire in Supabase > SQL Editor.

alter table public.set_partita
  add column if not exists primo_servizio text check (primo_servizio in ('nostra', 'avversaria'));

comment on column public.set_partita.primo_servizio is 'Squadra al servizio sullo 0-0 del set (nostra/avversaria); null = regola predefinita';
