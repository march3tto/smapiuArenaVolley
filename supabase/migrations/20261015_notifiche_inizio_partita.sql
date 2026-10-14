-- Notifiche push: notifica "Si comincia!" quando la partita passa in live (dal cron attiva_partite_live o a mano).

alter table public.notifiche_inviate drop constraint if exists notifiche_inviate_tipo_check;
alter table public.notifiche_inviate add constraint notifiche_inviate_tipo_check
  check (tipo in ('prepartita', 'inizio', 'fine_set', 'notizia', 'video', 'podcast'));

-- Pre-partita: solo partite programmate che iniziano tra 25 e 35 minuti (come in 20261015_notifiche_push.sql).
-- Una partita inserita o spostata più tardi non riceve il promemoria: arriva solo "Si comincia!", che apre la diretta.
create or replace function public.notifica_prepartite()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select id from partite
     where stato = 'programmata'
       and data_partita between now() + interval '25 minutes' and now() + interval '35 minutes'
  loop
    perform invia_notifica_push('prepartita', r.id);
    n := n + 1;
  end loop;
  return n;
end; $$;

revoke execute on function public.notifica_prepartite() from public, anon, authenticated;

-- partite: stato diventa live (una sola notifica per partita, anche se il trigger aggiorna_risultato_partita la riporta in live)
drop trigger if exists trg_partite_notifica_inizio_ins on public.partite;
create trigger trg_partite_notifica_inizio_ins after insert on public.partite
  for each row when (new.stato = 'live') execute function public.trg_notifica_push('inizio');
drop trigger if exists trg_partite_notifica_inizio_upd on public.partite;
create trigger trg_partite_notifica_inizio_upd after update of stato on public.partite
  for each row when (new.stato = 'live' and old.stato <> 'live') execute function public.trg_notifica_push('inizio');
