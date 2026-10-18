-- Calendario completo del girone dentro partite: anche le gare tra due avversarie (prima in gare_campionato).
-- Le nostre partite restano scritte dal nostro punto di vista (avversario, casa_trasferta, nostri_set_vinti, set_partita);
-- per tutte le gare il risultato neutro casa/ospite (set_casa, set_ospite, parziali) è quello usato dalla classifica.

begin;

-- ---------- nomi squadre uniformati ----------

update public.squadre set nome = 'Olimpia di Navigazione Ravenna' where nome = 'Olympia di Navigazione Ravenna';
update public.partite set avversario = 'Banca Annia Aduna Women' where avversario = 'Banca Annia Aduna Padova';
update public.classifiche set nome_squadra = 'Banca Annia Aduna Women' where nome_squadra = 'Banca Annia Aduna Padova';
update public.classifiche c set squadra_id = s.id from public.squadre s where s.nome = c.nome_squadra and c.squadra_id is null;
update public.partite p set squadra_avversaria_id = s.id
  from public.squadre s where s.nome = p.avversario and p.squadra_avversaria_id is null and p.girone is not null;

-- ---------- nuove colonne ----------

alter table public.partite
  add column numero_gara integer,
  add column squadra_casa_id uuid references public.squadre(id),
  add column squadra_ospite_id uuid references public.squadre(id),
  add column set_casa integer check (set_casa between 0 and 3),
  add column set_ospite integer check (set_ospite between 0 and 3),
  add column rinuncia text check (rinuncia in ('casa', 'ospite')),
  add column nostra_partita boolean not null default true;

comment on column public.partite.nostra_partita is 'false = gara del girone tra due avversarie (solo calendario e classifica)';
comment on column public.partite.parziali is 'Parziali dal punto di vista della squadra di casa: [{"set":1,"casa":25,"ospite":19}, ...]';
comment on column public.partite.rinuncia is 'Squadra rinunciataria: gara persa 0-3 (parziali 0-25) con penalizzazione in classifica';

alter table public.partite alter column avversario drop not null;
alter table public.partite alter column casa_trasferta drop not null;

alter table public.partite
  add constraint partite_squadre_diverse check (squadra_casa_id is distinct from squadra_ospite_id or squadra_casa_id is null),
  add constraint partite_nostra_o_neutra check (
    (nostra_partita and avversario is not null and casa_trasferta is not null)
    or (not nostra_partita and squadra_casa_id is not null and squadra_ospite_id is not null)
  ),
  add constraint partite_campionato_numero_gara_key unique (campionato_id, numero_gara);

create index partite_girone_giornata_idx on public.partite (stagione_id, girone, giornata);

-- ---------- nostre partite: risultato casa/ospite allineato a quello "nostro" ----------

create or replace function public.allinea_casa_ospite()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_noi uuid;
  v_in_casa boolean;
begin
  if not new.nostra_partita then
    return new;
  end if;
  v_in_casa := new.casa_trasferta = 'casa';

  -- squadre casa/ospite dalla nostra squadra e dall'avversaria
  if new.squadra_avversaria_id is not null and (new.squadra_casa_id is null or new.squadra_ospite_id is null) then
    select id into v_noi from squadre where nostra_squadra limit 1;
    if v_noi is not null then
      new.squadra_casa_id := case when v_in_casa then v_noi else new.squadra_avversaria_id end;
      new.squadra_ospite_id := case when v_in_casa then new.squadra_avversaria_id else v_noi end;
    end if;
  end if;

  -- set vinti: comanda il dato "nostro" (diretta, set_partita); casa/ospite solo se è quello cambiato
  if tg_op = 'UPDATE'
     and new.nostri_set_vinti is not distinct from old.nostri_set_vinti
     and new.set_vinti_avversario is not distinct from old.set_vinti_avversario
     and (new.set_casa is distinct from old.set_casa or new.set_ospite is distinct from old.set_ospite) then
    new.nostri_set_vinti := case when v_in_casa then new.set_casa else new.set_ospite end;
    new.set_vinti_avversario := case when v_in_casa then new.set_ospite else new.set_casa end;
  elsif new.nostri_set_vinti is not null or new.set_vinti_avversario is not null then
    new.set_casa := case when v_in_casa then new.nostri_set_vinti else new.set_vinti_avversario end;
    new.set_ospite := case when v_in_casa then new.set_vinti_avversario else new.nostri_set_vinti end;
  end if;
  return new;
end; $$;

create trigger trg_partite_allinea_casa_ospite
  before insert or update on public.partite
  for each row execute function public.allinea_casa_ospite();

-- set_partita: oltre ai set vinti aggiorna anche i parziali (dal punto di vista della squadra di casa)
create or replace function public.aggiorna_risultato_partita()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partita uuid := coalesce(new.partita_id, old.partita_id);
  v_nostri integer; v_avv integer;
  v_parziali jsonb;
begin
  select count(*) filter (where s.completato and s.punti_nostri > s.punti_avversario),
         count(*) filter (where s.completato and s.punti_avversario > s.punti_nostri),
         jsonb_agg(jsonb_build_object(
           'set', s.numero_set,
           'casa', case when p.casa_trasferta = 'trasferta' then s.punti_avversario else s.punti_nostri end,
           'ospite', case when p.casa_trasferta = 'trasferta' then s.punti_nostri else s.punti_avversario end
         ) order by s.numero_set) filter (where s.completato)
    into v_nostri, v_avv, v_parziali
    from set_partita s join partite p on p.id = s.partita_id
   where s.partita_id = v_partita;

  update partite set parziali = v_parziali where id = v_partita and parziali is distinct from v_parziali;

  update partite
     set nostri_set_vinti = v_nostri,
         set_vinti_avversario = v_avv,
         stato = case
                   when greatest(v_nostri, v_avv) >= 3 then 'conclusa'::stato_partita
                   when stato = 'conclusa' then 'live'::stato_partita
                   else stato end,
         aggiornato_il = now()
   where id = v_partita and stato in ('live', 'conclusa');
  return null;
end; $$;

-- ---------- import da gare_campionato ----------

-- gare già collegate a una nostra partita
update public.partite p
   set numero_gara = g.numero_gara,
       campionato_id = coalesce(p.campionato_id, g.campionato_id),
       squadra_casa_id = g.squadra_casa_id,
       squadra_ospite_id = g.squadra_ospite_id,
       squadra_avversaria_id = coalesce(p.squadra_avversaria_id,
         case when sc.nostra_squadra then g.squadra_ospite_id else g.squadra_casa_id end),
       url_a3live = coalesce(p.url_a3live, g.url_a3live),
       parziali = coalesce(p.parziali, g.parziali)
  from public.gare_campionato g
  join public.squadre sc on sc.id = g.squadra_casa_id
 where g.partita_id = p.id;

-- gare tra avversarie
insert into public.partite (
  stagione_id, livello_squadra, nostra_partita, campionato_id, girone, numero_gara, giornata, fase,
  data_partita, squadra_casa_id, squadra_ospite_id, stato, set_casa, set_ospite, parziali, url_a3live, creato_il
)
select g.stagione_id, 'prima_squadra', false, g.campionato_id, g.girone, g.numero_gara, g.giornata, g.fase,
       g.data_partita, g.squadra_casa_id, g.squadra_ospite_id, g.stato, g.set_casa, g.set_ospite, g.parziali, g.url_a3live, g.creato_il
  from public.gare_campionato g
 where g.partita_id is null;

alter table public.gare_campionato rename to gare_campionato_backup;
comment on table public.gare_campionato_backup is 'Backup del calendario del girone importato in partite (migrazione 20261018000100): da eliminare';

-- ---------- solo le nostre partite: diretta automatica e notifiche ----------

create or replace function public.attiva_partite_live()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  update partite
     set stato = 'live', aggiornato_il = now()
   where nostra_partita
     and stato = 'programmata'
     and data_partita <= now() + interval '5 minutes'
     and data_partita >  now() - interval '6 hours';
  get diagnostics n = row_count;
  return n;
end; $$;

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
     where nostra_partita
       and stato = 'programmata'
       and data_partita between now() + interval '25 minutes' and now() + interval '35 minutes'
  loop
    perform invia_notifica_push('prepartita', r.id);
    n := n + 1;
  end loop;
  return n;
end; $$;

revoke execute on function public.attiva_partite_live() from public, anon, authenticated;
revoke execute on function public.notifica_prepartite() from public, anon, authenticated;

drop trigger if exists trg_partite_notifica_inizio_ins on public.partite;
create trigger trg_partite_notifica_inizio_ins after insert on public.partite
  for each row when (new.nostra_partita and new.stato = 'live')
  execute function public.trg_notifica_push('inizio');
drop trigger if exists trg_partite_notifica_inizio_upd on public.partite;
create trigger trg_partite_notifica_inizio_upd after update of stato on public.partite
  for each row when (new.nostra_partita and new.stato = 'live' and old.stato <> 'live')
  execute function public.trg_notifica_push('inizio');

-- ---------- realtime ----------

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'partite') then
    alter publication supabase_realtime add table public.partite;
  end if;
end $$;

commit;
