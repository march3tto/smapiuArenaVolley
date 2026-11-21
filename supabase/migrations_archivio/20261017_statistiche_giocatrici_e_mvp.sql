-- Statistiche delle giocatrici aggiornate dalla diretta e voto MVP della partita.
-- 1) Ogni azione registrata in azioni_punto (nostra squadra, giocatrice della rosa) aggiorna i totali
--    di giocatrici (punti, ace, muri). Se l'azione viene cancellata o corretta i totali si riallineano.
--    Nell'app la schermata live mostra solo le statistiche della partita, calcolate dalle azioni.
-- 2) voti_mvp: un voto per utente registrato e partita, per una giocatrice della nostra formazione.
--    Ognuno vede solo il proprio voto, i conteggi arrivano dalla funzione voti_mvp_partita.
-- Da eseguire in Supabase > SQL Editor.

begin;

-- ---------------------------------------------------------------------------
-- 1) Totali delle giocatrici dalle azioni della diretta
-- ---------------------------------------------------------------------------

create or replace function public.applica_azione_giocatrice(r public.azioni_punto, segno integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.giocatrici
  set punti = greatest(0, coalesce(punti, 0) + segno),
      ace = greatest(0, coalesce(ace, 0) + case when r.azione = 'ace' then segno else 0 end),
      muri = greatest(0, coalesce(muri, 0) + case when r.azione = 'muro' then segno else 0 end)
  where r.squadra = 'nostra' and r.giocatrice_id is not null and id = r.giocatrice_id;
$$;

revoke all on function public.applica_azione_giocatrice(public.azioni_punto, integer) from public, anon, authenticated;

create or replace function public.azioni_punto_statistiche()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.applica_azione_giocatrice(old, -1);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.applica_azione_giocatrice(new, 1);
  end if;
  return null;
end;
$$;

revoke all on function public.azioni_punto_statistiche() from public, anon, authenticated;

drop trigger if exists trg_azioni_punto_statistiche on public.azioni_punto;
create trigger trg_azioni_punto_statistiche
  after insert or update or delete on public.azioni_punto
  for each row execute function public.azioni_punto_statistiche();

-- ---------------------------------------------------------------------------
-- 2) Voto MVP
-- ---------------------------------------------------------------------------

create table if not exists public.voti_mvp (
  id uuid primary key default gen_random_uuid(),
  partita_id uuid not null references public.partite (id) on delete cascade,
  -- con l'eliminazione dell'account spariscono anche i suoi voti
  utente_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  giocatrice_id uuid not null references public.giocatrici (id) on delete cascade,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  constraint voti_mvp_un_voto unique (partita_id, utente_id)
);

create index if not exists voti_mvp_partita_idx on public.voti_mvp (partita_id);
create index if not exists voti_mvp_utente_idx on public.voti_mvp (utente_id);
create index if not exists voti_mvp_giocatrice_idx on public.voti_mvp (giocatrice_id);

alter table public.voti_mvp enable row level security;

-- si vota solo una giocatrice della nostra formazione, a partita in corso o conclusa
create or replace function public.voto_mvp_valido(p_partita uuid, p_giocatrice uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.formazioni_partita f
    join public.partite p on p.id = f.partita_id
    where f.partita_id = p_partita and f.giocatrice_id = p_giocatrice and f.squadra = 'nostra'
      and p.stato in ('live', 'conclusa')
  );
$$;

revoke all on function public.voto_mvp_valido(uuid, uuid) from public, anon;
grant execute on function public.voto_mvp_valido(uuid, uuid) to authenticated;

drop policy if exists voti_mvp_lettura_propri on public.voti_mvp;
create policy voti_mvp_lettura_propri on public.voti_mvp
  for select to authenticated using (utente_id = (select auth.uid()));

drop policy if exists voti_mvp_inserimento on public.voti_mvp;
create policy voti_mvp_inserimento on public.voti_mvp
  for insert to authenticated
  with check (utente_id = (select auth.uid()) and public.voto_mvp_valido(partita_id, giocatrice_id));

drop policy if exists voti_mvp_modifica on public.voti_mvp;
create policy voti_mvp_modifica on public.voti_mvp
  for update to authenticated
  using (utente_id = (select auth.uid()))
  with check (utente_id = (select auth.uid()) and public.voto_mvp_valido(partita_id, giocatrice_id));

drop policy if exists voti_mvp_cancellazione on public.voti_mvp;
create policy voti_mvp_cancellazione on public.voti_mvp
  for delete to authenticated using (utente_id = (select auth.uid()));

-- Conteggi pubblici dei voti di una partita (senza esporre chi ha votato)
create or replace function public.voti_mvp_partita(p_partita uuid)
returns table (giocatrice_id uuid, voti bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select v.giocatrice_id, count(*) as voti
  from public.voti_mvp v
  where v.partita_id = p_partita
  group by v.giocatrice_id;
$$;

revoke all on function public.voti_mvp_partita(uuid) from public;
grant execute on function public.voti_mvp_partita(uuid) to anon, authenticated;

commit;
