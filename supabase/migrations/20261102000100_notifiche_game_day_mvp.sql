-- Due nuove notifiche push, ognuna con la sua scelta in Impostazioni:
--   game_day: 4 ore prima delle partite della prima squadra (cron ogni 5 minuti);
--   mvp: il voto MVP si apre, cioè inizio del 3° set (due set conclusi) di una nostra partita in casa.
-- Dopo questa migrazione pubblicare la nuova versione di invia-notifica (che conosce i tipi game_day e mvp).

alter table public.push_token
  add column if not exists game_day boolean not null default true,
  add column if not exists voto_mvp boolean not null default true;

comment on column public.push_token.game_day is 'Game day: 4 ore prima delle partite della prima squadra';
comment on column public.push_token.voto_mvp is 'Apertura del voto MVP (inizio del 3° set, partite in casa)';

alter table public.notifiche_inviate drop constraint if exists notifiche_inviate_tipo_check;
alter table public.notifiche_inviate add constraint notifiche_inviate_tipo_check
  check (tipo in ('game_day', 'prepartita', 'inizio', 'mvp', 'fine_set', 'notizia', 'video', 'podcast'));

-- Preferenze del dispositivo: i nuovi parametri hanno un default, le versioni dell'app che non li mandano continuano a funzionare
drop function if exists public.preferenze_push_token(text, boolean, boolean, boolean, boolean, boolean);
create or replace function public.preferenze_push_token(
  p_token text, p_attive boolean, p_inizio boolean, p_set boolean, p_finale boolean, p_contenuti boolean,
  p_game_day boolean default null, p_mvp boolean default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[^\]]{1,200}\]$' then
    raise exception 'Token push non valido';
  end if;
  update public.push_token
     set notifiche_attive = coalesce(p_attive, notifiche_attive),
         inizio_partita = coalesce(p_inizio, inizio_partita),
         fine_set = coalesce(p_set, fine_set),
         risultato_finale = coalesce(p_finale, risultato_finale),
         contenuti = coalesce(p_contenuti, contenuti),
         game_day = coalesce(p_game_day, game_day),
         voto_mvp = coalesce(p_mvp, voto_mvp),
         aggiornato_il = now()
   where token = p_token;
end; $$;

revoke execute on function public.preferenze_push_token(text, boolean, boolean, boolean, boolean, boolean, boolean, boolean) from public;
grant execute on function public.preferenze_push_token(text, boolean, boolean, boolean, boolean, boolean, boolean, boolean) to anon, authenticated;

-- Game day: partite della prima squadra che iniziano tra 3h55' e 4h05' (la function scarta quelle già notificate)
create or replace function public.notifica_game_day()
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
     where nostra_partita
       and livello_squadra = 'prima_squadra'
       and stato = 'programmata'
       and data_partita between now() + interval '3 hours 55 minutes' and now() + interval '4 hours 5 minutes'
  loop
    perform invia_notifica_push('game_day', r.id);
    n := n + 1;
  end loop;
  return n;
end; $$;

revoke execute on function public.notifica_game_day() from public, anon, authenticated;

select cron.schedule('notifiche-game-day', '*/5 * * * *', 'select public.notifica_game_day();');

-- Voto MVP: un set si chiude e i set conclusi diventano due (la function controlla di nuovo e invia una volta per partita)
create or replace function public.trg_notifica_mvp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from partite p where p.id = new.partita_id and p.nostra_partita and p.casa_trasferta = 'casa' and p.stato = 'live')
     and (select count(*) from set_partita s where s.partita_id = new.partita_id and s.completato) >= 2 then
    perform invia_notifica_push('mvp', new.partita_id);
  end if;
  return null;
end; $$;

revoke execute on function public.trg_notifica_mvp() from public, anon, authenticated;

drop trigger if exists trg_set_partita_notifica_mvp_ins on public.set_partita;
create trigger trg_set_partita_notifica_mvp_ins after insert on public.set_partita
  for each row when (new.completato) execute function public.trg_notifica_mvp();
drop trigger if exists trg_set_partita_notifica_mvp_upd on public.set_partita;
create trigger trg_set_partita_notifica_mvp_upd after update of completato on public.set_partita
  for each row when (new.completato and not old.completato) execute function public.trg_notifica_mvp();
