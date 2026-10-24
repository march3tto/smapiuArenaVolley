-- Partita demo condivisa: punteggio e formazioni salvati qui, fuori da partite, set e formazioni vere,
-- così la demo non tocca risultati e classifica. Una riga per argomento: chiave "live-<id partita>" o "formazioni-<id partita>".
-- Scrive solo l'admin, leggono tutti. Le modifiche arrivano agli altri dispositivi sul canale broadcast della demo;
-- qui restano salvate, così chi apre o ricarica la demo riparte dallo stato più recente.

create table if not exists public.demo_diretta (
  chiave        text primary key,
  stato         jsonb not null,
  -- ora della modifica in millisecondi: il client tiene solo lo stato più recente
  versione      bigint not null,
  aggiornato_il timestamptz not null default now()
);

comment on table public.demo_diretta is
  'Stato della partita demo condivisa (punteggio e formazioni), separato dalle partite vere.';

alter table public.demo_diretta enable row level security;

drop policy if exists "demo_diretta: lettura" on public.demo_diretta;
create policy "demo_diretta: lettura"
  on public.demo_diretta for select
  to anon, authenticated
  using (true);

drop policy if exists "demo_diretta: inserimento admin" on public.demo_diretta;
create policy "demo_diretta: inserimento admin"
  on public.demo_diretta for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "demo_diretta: modifica admin" on public.demo_diretta;
create policy "demo_diretta: modifica admin"
  on public.demo_diretta for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
