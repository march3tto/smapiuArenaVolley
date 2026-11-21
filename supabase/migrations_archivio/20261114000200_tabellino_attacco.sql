-- Tabellino DataVolley 4: foto dei fogli "Tabellino - Set N" e del foglio finale, lette dall'AI (Edge Function leggi-tabellino)
-- e confermate dallo staff. È la fonte ufficiale dei punti in attacco, separata da azioni_punto / punti_giocatrici_partita
-- (punti inseriti a mano durante la diretta): le due cose non si mescolano.
-- Da eseguire in Supabase > SQL Editor (o supabase db push).

begin;

-- ---------- Storage: bucket privato delle foto (solo staff) ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tabellini', 'tabellini', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists tabellini_storage_staff on storage.objects;
create policy tabellini_storage_staff on storage.objects
  for all to authenticated
  using (bucket_id = 'tabellini' and public.e_staff())
  with check (bucket_id = 'tabellini' and public.e_staff());

-- ---------- una riga per foto caricata ----------

create table if not exists public.tabellini (
  id uuid primary key default gen_random_uuid(),
  partita_id uuid not null references public.partite (id) on delete cascade,
  -- null = foglio finale (cumulati della partita)
  numero_set smallint check (numero_set between 1 and 5),
  -- percorso nel bucket "tabellini" (senza il nome del bucket)
  percorso_immagine text not null,
  stato text not null default 'in_attesa' check (stato in ('in_attesa', 'letto', 'confermato', 'errore')),
  -- output grezzo del modello (normalizzato); dopo la conferma, i dati confermati
  json_letto jsonb,
  errore text,
  -- annotazioni della conferma (es. set senza foglio ricavati per differenza)
  note text,
  caricato_da uuid references auth.users (id) on delete set null default auth.uid(),
  creato_il timestamptz not null default now(),
  confermato_il timestamptz
);

create index if not exists tabellini_partita_idx on public.tabellini (partita_id, creato_il desc);

alter table public.tabellini enable row level security;

drop policy if exists tabellini_staff on public.tabellini;
create policy tabellini_staff on public.tabellini for all to authenticated using (public.e_staff()) with check (public.e_staff());

-- ---------- statistiche d'attacco per set ----------

create table if not exists public.statistiche_attacco (
  id uuid primary key default gen_random_uuid(),
  partita_id uuid not null references public.partite (id) on delete cascade,
  tabellino_id uuid references public.tabellini (id) on delete set null,
  squadra text not null check (squadra in ('nostra', 'avversaria')),
  -- sempre valorizzato: i set senza foglio si ricavano dal foglio finale per differenza (derivato = true)
  numero_set smallint not null check (numero_set between 1 and 5),
  numero_maglia smallint not null check (numero_maglia between 0 and 99),
  nome text not null default '',
  giocatrice_id uuid references public.giocatrici (id) on delete set null,
  tentativi integer not null default 0 check (tentativi >= 0),
  errori integer not null default 0 check (errori >= 0),
  murati integer not null default 0 check (murati >= 0),
  punti integer not null default 0 check (punti >= 0),
  -- true: riga calcolata come finale − somma dei set salvati (si ricalcola a ogni conferma)
  derivato boolean not null default false,
  aggiornato_il timestamptz not null default now(),
  -- rifotografare lo stesso foglio aggiorna le stesse righe
  unique (partita_id, squadra, numero_set, numero_maglia)
);

create index if not exists statistiche_attacco_giocatrice_idx on public.statistiche_attacco (giocatrice_id);

alter table public.statistiche_attacco enable row level security;

drop policy if exists statistiche_attacco_lettura on public.statistiche_attacco;
create policy statistiche_attacco_lettura on public.statistiche_attacco for select using (true);

drop policy if exists statistiche_attacco_scrittura_staff on public.statistiche_attacco;
create policy statistiche_attacco_scrittura_staff on public.statistiche_attacco
  for all to authenticated using (public.e_staff()) with check (public.e_staff());

grant select on public.statistiche_attacco to anon, authenticated;

-- Somme per partita e giocatrice (tutti i set), con la percentuale punti / tentativi
create or replace view public.attacco_giocatrici_partita with (security_invoker = true) as
select
  partita_id,
  squadra,
  numero_maglia,
  (array_agg(giocatrice_id) filter (where giocatrice_id is not null))[1] as giocatrice_id,
  max(nome) as nome,
  sum(tentativi)::int as tentativi,
  sum(errori)::int as errori,
  sum(murati)::int as murati,
  sum(punti)::int as punti,
  round(100.0 * sum(punti) / nullif(sum(tentativi), 0))::int as pt_perc
from public.statistiche_attacco
group by partita_id, squadra, numero_maglia;

grant select on public.attacco_giocatrici_partita to anon, authenticated;

-- ---------- conferma ----------

-- Giocatrice della rosa per numero di maglia: prima il referto della partita, poi la rosa della stagione
create or replace function public.giocatrice_da_maglia(p_partita uuid, p_squadra text, p_numero int)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select f.giocatrice_id from formazioni_partita f
      where f.partita_id = p_partita and f.squadra = p_squadra and f.numero_maglia = p_numero and f.giocatrice_id is not null
      limit 1),
    (select g.id from partite p
       join giocatrici g on g.stagione_id = p.stagione_id and g.numero_maglia = p_numero and g.attiva
       join squadre s on s.id = g.squadra_id
      where p.id = p_partita
        and case when p_squadra = 'nostra' then s.nostra_squadra and g.livello_squadra = p.livello_squadra
                 else g.squadra_id = p.squadra_avversaria_id end
      limit 1)
  );
$$;

/*
 * Set senza foglio ricavati dal foglio finale confermato, per ogni giocatrice: finale − somma dei set salvati.
 * - le righe derivate di un calcolo precedente si rifanno da capo;
 * - se mancano più set, la differenza va sull'ultimo (annotato);
 * - se i set salvati non tornano con il finale (differenza negativa, o nessun set mancante e differenza ≠ 0),
 *   il finale prevale: si corregge l'ultimo set, o se non basta si rimette tutto il finale sull'ultimo set.
 * Ritorna le annotazioni.
 */
create or replace function public.ricalcola_attacco_da_finale(p_finale uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  t tabellini%rowtype;
  s jsonb;
  v_lato text;
  v_nset int;
  v_mancanti int[];
  v_target int;
  v_note text[] := '{}';
  r record;
  e statistiche_attacco%rowtype;
begin
  select * into t from tabellini where id = p_finale and numero_set is null and stato = 'confermato';
  if not found then return v_note; end if;

  for s in select * from jsonb_array_elements(coalesce(t.json_letto -> 'squadre', '[]')) loop
    v_lato := s ->> 'lato';
    continue when v_lato is null or v_lato not in ('nostra', 'avversaria');

    -- numero di set giocati: dal riquadro "Punti vinti" del finale, altrimenti dai set della partita
    select coalesce(max(k::int), 0) into v_nset
      from jsonb_object_keys(case when jsonb_typeof(s -> 'punti_vinti_att_per_set') = 'object' then s -> 'punti_vinti_att_per_set' else '{}' end) k
     where k ~ '^[1-5]$';
    if v_nset = 0 then
      select count(*) into v_nset from set_partita where partita_id = t.partita_id;
    end if;
    v_nset := greatest(least(v_nset, 5), 1);

    delete from statistiche_attacco where partita_id = t.partita_id and squadra = v_lato and derivato;

    -- set di cui non c'è nessun foglio confermato per questa squadra
    select coalesce(array_agg(n order by n), '{}') into v_mancanti
      from generate_series(1, v_nset) n
     where not exists (select 1 from statistiche_attacco a where a.partita_id = t.partita_id and a.squadra = v_lato and a.numero_set = n);

    if cardinality(v_mancanti) > 1 then
      v_note := v_note || format('%s: set %s senza foglio, la differenza con il finale è tutta sul set %s',
        case when v_lato = 'nostra' then 'Nostra squadra' else 'Avversaria' end,
        array_to_string(v_mancanti, ', '), v_mancanti[cardinality(v_mancanti)]);
    end if;
    v_target := coalesce(v_mancanti[cardinality(v_mancanti)], v_nset);

    for r in
      with f as (
        select (x ->> 'numero')::int as numero, coalesce(x ->> 'nome', '') as nome,
               coalesce((x ->> 'tot')::int, 0) as tot, coalesce((x ->> 'err')::int, 0) as err,
               coalesce((x ->> 'mur')::int, 0) as mur, coalesce((x ->> 'pt')::int, 0) as pt
          from jsonb_array_elements(coalesce(s -> 'giocatrici', '[]')) x
         where (x ->> 'numero') ~ '^\d{1,2}$'
      ), a as (
        select numero_maglia::int as numero, max(nome) as nome, sum(tentativi)::int as tot, sum(errori)::int as err,
               sum(murati)::int as mur, sum(punti)::int as pt
          from statistiche_attacco where partita_id = t.partita_id and squadra = v_lato
         group by numero_maglia
      )
      select coalesce(f.numero, a.numero) as numero, coalesce(nullif(f.nome, ''), a.nome, '') as nome,
             coalesce(f.tot, 0) as f_tot, coalesce(f.err, 0) as f_err, coalesce(f.mur, 0) as f_mur, coalesce(f.pt, 0) as f_pt,
             coalesce(f.tot, 0) - coalesce(a.tot, 0) as d_tot, coalesce(f.err, 0) - coalesce(a.err, 0) as d_err,
             coalesce(f.mur, 0) - coalesce(a.mur, 0) as d_mur, coalesce(f.pt, 0) - coalesce(a.pt, 0) as d_pt
        from f full join a on a.numero = f.numero
    loop
      continue when r.d_tot = 0 and r.d_err = 0 and r.d_mur = 0 and r.d_pt = 0;

      if cardinality(v_mancanti) > 0 and least(r.d_tot, r.d_err, r.d_mur, r.d_pt) >= 0 then
        -- caso normale: la differenza è il set senza foglio
        insert into statistiche_attacco (partita_id, tabellino_id, squadra, numero_set, numero_maglia, nome, giocatrice_id,
                                         tentativi, errori, murati, punti, derivato)
        values (t.partita_id, t.id, v_lato, v_target, r.numero, r.nome, giocatrice_da_maglia(t.partita_id, v_lato, r.numero),
                r.d_tot, r.d_err, r.d_mur, r.d_pt, true);
        continue;
      end if;

      -- i set salvati non tornano con il finale: il finale prevale
      v_note := v_note || format('#%s %s: i set salvati non tornano con il finale, ricalcolato sul set %s', r.numero, r.nome, v_target);
      select * into e from statistiche_attacco
       where partita_id = t.partita_id and squadra = v_lato and numero_set = v_target and numero_maglia = r.numero;
      if found and least(e.tentativi + r.d_tot, e.errori + r.d_err, e.murati + r.d_mur, e.punti + r.d_pt) >= 0 then
        update statistiche_attacco
           set tentativi = e.tentativi + r.d_tot, errori = e.errori + r.d_err, murati = e.murati + r.d_mur, punti = e.punti + r.d_pt,
               derivato = true, tabellino_id = t.id, aggiornato_il = now()
         where id = e.id;
      elsif not found and least(r.d_tot, r.d_err, r.d_mur, r.d_pt) >= 0 then
        insert into statistiche_attacco (partita_id, tabellino_id, squadra, numero_set, numero_maglia, nome, giocatrice_id,
                                         tentativi, errori, murati, punti, derivato)
        values (t.partita_id, t.id, v_lato, v_target, r.numero, r.nome, giocatrice_da_maglia(t.partita_id, v_lato, r.numero),
                r.d_tot, r.d_err, r.d_mur, r.d_pt, true);
      else
        -- non basta correggere un set: resta solo il finale, tutto sull'ultimo set
        delete from statistiche_attacco where partita_id = t.partita_id and squadra = v_lato and numero_maglia = r.numero;
        if r.f_tot + r.f_err + r.f_mur + r.f_pt > 0 then
          insert into statistiche_attacco (partita_id, tabellino_id, squadra, numero_set, numero_maglia, nome, giocatrice_id,
                                           tentativi, errori, murati, punti, derivato)
          values (t.partita_id, t.id, v_lato, v_target, r.numero, r.nome, giocatrice_da_maglia(t.partita_id, v_lato, r.numero),
                  r.f_tot, r.f_err, r.f_mur, r.f_pt, true);
        end if;
      end if;
    end loop;
  end loop;
  return v_note;
end; $$;

/*
 * Conferma dello staff, con i dati eventualmente corretti a mano (stesso formato di json_letto).
 * Foglio di set N: le righe di quel set si sostituiscono (upsert, e via le maglie non più presenti).
 * Foglio finale: i set senza foglio si ricavano per differenza. Dopo ogni conferma, se c'è un finale confermato
 * le differenze si ricalcolano (un foglio di set arrivato dopo il finale prende il posto della riga derivata).
 * Si salvano solo le squadre presenti in p_dati: l'app toglie quella che non supera i controlli.
 */
create or replace function public.conferma_tabellino(p_tabellino uuid, p_dati jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t tabellini%rowtype;
  s jsonb;
  v_lato text;
  v_righe int := 0;
  v_n int;
  v_finale uuid;
  v_note text[] := '{}';
begin
  if not e_staff() then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  select * into t from tabellini where id = p_tabellino for update;
  if not found then
    raise exception 'Tabellino non trovato';
  end if;
  if jsonb_typeof(p_dati -> 'squadre') is distinct from 'array' then
    raise exception 'Dati del tabellino non validi';
  end if;

  update tabellini set stato = 'confermato', json_letto = p_dati, errore = null, confermato_il = now() where id = t.id;
  t.stato := 'confermato';

  if t.numero_set is not null then
    for s in select * from jsonb_array_elements(p_dati -> 'squadre') loop
      v_lato := s ->> 'lato';
      continue when v_lato is null or v_lato not in ('nostra', 'avversaria');
      -- maglie non più nel foglio (foto rifatta o correzione) e righe derivate del set: via
      delete from statistiche_attacco a
       where a.partita_id = t.partita_id and a.squadra = v_lato and a.numero_set = t.numero_set
         and (a.derivato or a.numero_maglia not in (
               select (x ->> 'numero')::int from jsonb_array_elements(coalesce(s -> 'giocatrici', '[]')) x where (x ->> 'numero') ~ '^\d{1,2}$'));
      insert into statistiche_attacco as a (partita_id, tabellino_id, squadra, numero_set, numero_maglia, nome, giocatrice_id,
                                            tentativi, errori, murati, punti, derivato)
      select t.partita_id, t.id, v_lato, t.numero_set, (x ->> 'numero')::int, coalesce(x ->> 'nome', ''),
             giocatrice_da_maglia(t.partita_id, v_lato, (x ->> 'numero')::int),
             greatest(coalesce((x ->> 'tot')::int, 0), 0), greatest(coalesce((x ->> 'err')::int, 0), 0),
             greatest(coalesce((x ->> 'mur')::int, 0), 0), greatest(coalesce((x ->> 'pt')::int, 0), 0), false
        from jsonb_array_elements(coalesce(s -> 'giocatrici', '[]')) x
       where (x ->> 'numero') ~ '^\d{1,2}$'
      on conflict (partita_id, squadra, numero_set, numero_maglia) do update
         set tabellino_id = excluded.tabellino_id, nome = excluded.nome, giocatrice_id = excluded.giocatrice_id,
             tentativi = excluded.tentativi, errori = excluded.errori, murati = excluded.murati, punti = excluded.punti,
             derivato = false, aggiornato_il = now();
      get diagnostics v_n = row_count;
      v_righe := v_righe + v_n;
    end loop;
  end if;

  -- un solo finale vale: quello confermato per ultimo
  select id into v_finale from tabellini
   where partita_id = t.partita_id and numero_set is null and stato = 'confermato'
   order by confermato_il desc nulls last, creato_il desc limit 1;
  if v_finale is not null then
    v_note := ricalcola_attacco_da_finale(v_finale);
  end if;
  if t.numero_set is null then
    select count(*) into v_righe from statistiche_attacco where partita_id = t.partita_id and tabellino_id = t.id;
  end if;

  update tabellini set note = nullif(array_to_string(v_note, E'\n'), '') where id = t.id;

  -- nel monitor admin (schermata Agente), come gli eventi dell'agente livescore
  insert into log_agente (agente, livello, evento, partita_id, messaggio, dettagli)
  values ('tabellino', case when cardinality(v_note) > 0 then 'avviso' else 'info' end, 'tabellino_confermato', t.partita_id,
          format('Tabellino %s confermato: %s righe%s',
                 coalesce('set ' || t.numero_set, 'finale'), v_righe,
                 case when cardinality(v_note) > 0 then ' · ' || array_to_string(v_note, '; ') else '' end),
          jsonb_build_object('tabellino_id', t.id, 'note', to_jsonb(v_note)));

  return jsonb_build_object('righe', v_righe, 'note', to_jsonb(v_note));
end; $$;

revoke execute on function public.conferma_tabellino(uuid, jsonb) from public, anon;
grant execute on function public.conferma_tabellino(uuid, jsonb) to authenticated;
-- interne: le usa solo conferma_tabellino
revoke execute on function public.ricalcola_attacco_da_finale(uuid) from public, anon, authenticated;
revoke execute on function public.giocatrice_da_maglia(uuid, text, int) from public, anon, authenticated;

commit;

-- Live in tempo reale: le statistiche compaiono appena lo staff conferma il foglio
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'statistiche_attacco'
  ) then
    alter publication supabase_realtime add table public.statistiche_attacco;
  end if;
end $$;
