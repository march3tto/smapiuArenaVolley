-- Classifica calcolata dai risultati (regole FIPAV) invece che inserita a mano.
-- calcola_classifica() è il calcolo puro; aggiorna_classifica() lo scrive in classifiche (tabella, non vista: serve al Realtime).
-- Si ricalcola da solo quando cambiano partite, penalita_squadra o regole_classifica.

begin;

-- ---------- regole per stagione ----------

create table public.regole_classifica (
  stagione_id uuid primary key references public.stagioni(id) on delete cascade,
  punti_vittoria integer not null default 3,          -- 3-0 / 3-1
  punti_vittoria_tiebreak integer not null default 2, -- 3-2
  punti_sconfitta_tiebreak integer not null default 1, -- 2-3
  penalita_rinuncia integer not null default 1 check (penalita_rinuncia >= 0),
  criteri_parita text[] not null default array['vinte', 'quoziente_set', 'quoziente_punti', 'scontro_diretto'],
  aggiornato_il timestamptz not null default now(),
  constraint regole_classifica_criteri_check check (
    criteri_parita <@ array['vinte', 'quoziente_set', 'quoziente_punti', 'scontro_diretto']
  )
);
comment on table public.regole_classifica is 'Regole della classifica per stagione; senza riga valgono i valori di default (FIPAV)';
comment on column public.regole_classifica.penalita_rinuncia is 'Punti tolti alla squadra rinunciataria per ogni rinuncia';
comment on column public.regole_classifica.criteri_parita is 'Ordine dei criteri a parità di punti: vinte, quoziente_set, quoziente_punti, scontro_diretto';

alter table public.regole_classifica enable row level security;
create policy regole_classifica_lettura_pubblica on public.regole_classifica for select using (true);
create policy regole_classifica_scrittura_staff on public.regole_classifica for all using (e_staff()) with check (e_staff());

-- ---------- penalizzazioni manuali ----------

create table public.penalita_squadra (
  id uuid primary key default gen_random_uuid(),
  stagione_id uuid not null references public.stagioni(id) on delete cascade,
  girone text not null,
  squadra_id uuid not null references public.squadre(id),
  punti integer not null check (punti > 0),
  motivo text,
  data date not null default current_date,
  creato_il timestamptz not null default now()
);
comment on table public.penalita_squadra is 'Penalizzazioni federali in punti (oltre a quelle per rinuncia, calcolate dalle partite)';
create index penalita_squadra_stagione_idx on public.penalita_squadra (stagione_id, girone);

alter table public.penalita_squadra enable row level security;
create policy penalita_squadra_lettura_pubblica on public.penalita_squadra for select using (true);
create policy penalita_squadra_scrittura_staff on public.penalita_squadra for all using (e_staff()) with check (e_staff());

-- ---------- classifiche: statistiche complete ----------

alter table public.classifiche
  add column vinte_3_0_3_1 integer not null default 0,
  add column vinte_3_2 integer not null default 0,
  add column perse_2_3 integer not null default 0,
  add column perse_0_3_1_3 integer not null default 0,
  add column set_vinti integer not null default 0,
  add column set_persi integer not null default 0,
  add column quoziente_set numeric,
  add column punti_fatti integer not null default 0,
  add column punti_subiti integer not null default 0,
  add column quoziente_punti numeric,
  add column penalita integer not null default 0,
  add constraint classifiche_stagione_girone_squadra_key unique (stagione_id, girone, squadra_id);

comment on column public.classifiche.quoziente_set is 'set vinti / set persi; null se set persi = 0 (la squadra va davanti a parità)';
comment on column public.classifiche.quoziente_punti is 'punti fatti / punti subiti; null se punti subiti = 0';
comment on column public.classifiche.penalita is 'Punti di penalizzazione (rinunce + penalita_squadra), già tolti da punti';

-- ---------- calcolo ----------

create or replace function public.calcola_classifica(p_stagione uuid, p_girone text)
returns table (
  squadra_id uuid, nome_squadra text, nostra_squadra boolean, posizione integer, punti integer,
  giocate integer, vinte integer, perse integer, vinte_3_0_3_1 integer, vinte_3_2 integer, perse_2_3 integer, perse_0_3_1_3 integer,
  set_vinti integer, set_persi integer, quoziente_set numeric, punti_fatti integer, punti_subiti integer, quoziente_punti numeric,
  penalita integer
)
language plpgsql
stable
set search_path = public
as $$
declare
  v_criteri text[];
  v_criterio text;
  v_gruppo text := 'c.punti';
  v_gruppo_sd text;
  v_ordine text := 'c.punti desc';
begin
  select coalesce(r.criteri_parita, array['vinte', 'quoziente_set', 'quoziente_punti', 'scontro_diretto'])
    into v_criteri from (select 1) x left join regole_classifica r on r.stagione_id = p_stagione;

  -- ordinamento e gruppo dello scontro diretto (squadre pari su punti e sui criteri che lo precedono)
  foreach v_criterio in array v_criteri loop
    case v_criterio
      when 'vinte' then v_ordine := v_ordine || ', c.vinte desc'; v_gruppo := v_gruppo || ', c.vinte';
      when 'quoziente_set' then v_ordine := v_ordine || ', c.qs_chiave desc'; v_gruppo := v_gruppo || ', c.qs_chiave';
      when 'quoziente_punti' then v_ordine := v_ordine || ', c.qp_chiave desc'; v_gruppo := v_gruppo || ', c.qp_chiave';
      when 'scontro_diretto' then v_ordine := v_ordine || ', sd.punti_sd desc'; v_gruppo_sd := v_gruppo;
    end case;
  end loop;
  v_ordine := v_ordine || ', s.nome';

  return query execute format($sql$
    with regole as (
      select coalesce(r.punti_vittoria, 3) pv, coalesce(r.punti_vittoria_tiebreak, 2) pvt,
             coalesce(r.punti_sconfitta_tiebreak, 1) pst, coalesce(r.penalita_rinuncia, 1) pr
        from (select 1) x left join regole_classifica r on r.stagione_id = $1
    ),
    gare as (
      select p.squadra_casa_id, p.squadra_ospite_id, p.set_casa, p.set_ospite, p.rinuncia,
             (select coalesce(sum((e->>'casa')::int), 0) from jsonb_array_elements(coalesce(p.parziali, '[]')) e) pc,
             (select coalesce(sum((e->>'ospite')::int), 0) from jsonb_array_elements(coalesce(p.parziali, '[]')) e) po
        from partite p
       where p.stagione_id = $1 and p.girone = $2 and p.stato = 'conclusa'
         and p.squadra_casa_id is not null and p.squadra_ospite_id is not null
         and p.set_casa is not null and p.set_ospite is not null
    ),
    righe as (
      select squadra_casa_id squadra, squadra_ospite_id avversaria, set_casa sv, set_ospite sp, pc pf, po ps, rinuncia = 'casa' rinunciataria from gare
      union all
      select squadra_ospite_id, squadra_casa_id, set_ospite, set_casa, po, pc, rinuncia = 'ospite' from gare
    ),
    righe_punti as (
      select rg.*, case when rg.sv = 3 and rg.sp <= 1 then r.pv when rg.sv = 3 then r.pvt when rg.sv = 2 then r.pst else 0 end punti_gara
        from righe rg cross join regole r
    ),
    iscritte as (
      select distinct x squadra
        from partite p cross join lateral (values (p.squadra_casa_id), (p.squadra_ospite_id)) v(x)
       where p.stagione_id = $1 and p.girone = $2 and x is not null
    ),
    manuali as (
      select ps.squadra_id squadra, sum(ps.punti)::int punti
        from penalita_squadra ps where ps.stagione_id = $1 and ps.girone = $2 group by 1
    ),
    stat as (
      select i.squadra,
             count(rp.squadra)::int giocate,
             count(*) filter (where rp.sv = 3)::int vinte,
             count(*) filter (where rp.sp = 3)::int perse,
             count(*) filter (where rp.sv = 3 and rp.sp <= 1)::int v31,
             count(*) filter (where rp.sv = 3 and rp.sp = 2)::int v32,
             count(*) filter (where rp.sv = 2 and rp.sp = 3)::int p23,
             count(*) filter (where rp.sp = 3 and rp.sv <= 1)::int p13,
             coalesce(sum(rp.sv), 0)::int set_vinti, coalesce(sum(rp.sp), 0)::int set_persi,
             coalesce(sum(rp.pf), 0)::int punti_fatti, coalesce(sum(rp.ps), 0)::int punti_subiti,
             coalesce(sum(rp.punti_gara), 0)::int punti_gare,
             count(*) filter (where rp.rinunciataria)::int rinunce
        from iscritte i left join righe_punti rp on rp.squadra = i.squadra
       group by i.squadra
    ),
    calc as (
      select st.*,
             (st.rinunce * r.pr + coalesce(m.punti, 0))::int penalita,
             (st.punti_gare - st.rinunce * r.pr - coalesce(m.punti, 0))::int punti,
             case when st.set_persi > 0 then round(st.set_vinti::numeric / st.set_persi, 5) end qs,
             case when st.punti_subiti > 0 then round(st.punti_fatti::numeric / st.punti_subiti, 5) end qp,
             -- chiavi di ordinamento: con zero al denominatore la squadra va davanti (se ha vinto qualcosa)
             case when st.set_persi > 0 then st.set_vinti::numeric / st.set_persi when st.set_vinti > 0 then 1e9 else 0 end qs_chiave,
             case when st.punti_subiti > 0 then st.punti_fatti::numeric / st.punti_subiti when st.punti_fatti > 0 then 1e9 else 0 end qp_chiave
        from stat st cross join regole r left join manuali m on m.squadra = st.squadra
    ),
    sd as (
      -- punti negli scontri diretti tra le squadre ancora pari prima di questo criterio
      select c.squadra, coalesce(sum(rp.punti_gara) filter (where %2$s), 0)::int punti_sd
        from calc c
        left join righe_punti rp on rp.squadra = c.squadra
        left join calc c2 on c2.squadra = rp.avversaria
       group by c.squadra
    )
    select c.squadra, s.nome, s.nostra_squadra, (row_number() over (order by %1$s))::int,
           c.punti, c.giocate, c.vinte, c.perse, c.v31, c.v32, c.p23, c.p13,
           c.set_vinti, c.set_persi, c.qs, c.punti_fatti, c.punti_subiti, c.qp, c.penalita
      from calc c join squadre s on s.id = c.squadra join sd on sd.squadra = c.squadra
     order by 4
  $sql$,
    v_ordine,
    -- stesso gruppo: (punti, criteri precedenti) uguali per le due squadre
    case when v_gruppo_sd is null then 'false'
         else format('row(%s) = row(%s)', v_gruppo_sd, replace(v_gruppo_sd, 'c.', 'c2.')) end
  ) using p_stagione, p_girone;
end; $$;

-- Scrive la classifica calcolata in classifiche (righe aggiornate, non cancellate: il Realtime manda UPDATE)
create or replace function public.aggiorna_classifica(p_stagione uuid, p_girone text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_stagione is null or p_girone is null then
    return;
  end if;

  insert into classifiche as k (
    stagione_id, girone, squadra_id, nome_squadra, nostra_squadra, posizione, punti, giocate, vinte, perse,
    vinte_3_0_3_1, vinte_3_2, perse_2_3, perse_0_3_1_3, set_vinti, set_persi, quoziente_set,
    punti_fatti, punti_subiti, quoziente_punti, penalita, aggiornato_il
  )
  select p_stagione, p_girone, c.squadra_id, c.nome_squadra, c.nostra_squadra, c.posizione, c.punti, c.giocate, c.vinte, c.perse,
         c.vinte_3_0_3_1, c.vinte_3_2, c.perse_2_3, c.perse_0_3_1_3, c.set_vinti, c.set_persi, c.quoziente_set,
         c.punti_fatti, c.punti_subiti, c.quoziente_punti, c.penalita, now()
    from calcola_classifica(p_stagione, p_girone) c
  on conflict (stagione_id, girone, squadra_id) do update set
    nome_squadra = excluded.nome_squadra, nostra_squadra = excluded.nostra_squadra, posizione = excluded.posizione,
    punti = excluded.punti, giocate = excluded.giocate, vinte = excluded.vinte, perse = excluded.perse,
    vinte_3_0_3_1 = excluded.vinte_3_0_3_1, vinte_3_2 = excluded.vinte_3_2, perse_2_3 = excluded.perse_2_3,
    perse_0_3_1_3 = excluded.perse_0_3_1_3, set_vinti = excluded.set_vinti, set_persi = excluded.set_persi,
    quoziente_set = excluded.quoziente_set, punti_fatti = excluded.punti_fatti, punti_subiti = excluded.punti_subiti,
    quoziente_punti = excluded.quoziente_punti, penalita = excluded.penalita, aggiornato_il = now()
  where (k.posizione, k.punti, k.giocate, k.vinte, k.perse, k.set_vinti, k.set_persi, k.punti_fatti, k.punti_subiti, k.penalita, k.nome_squadra)
        is distinct from
        (excluded.posizione, excluded.punti, excluded.giocate, excluded.vinte, excluded.perse, excluded.set_vinti,
         excluded.set_persi, excluded.punti_fatti, excluded.punti_subiti, excluded.penalita, excluded.nome_squadra);

  -- squadre non più nel girone
  delete from classifiche k
   where k.stagione_id = p_stagione and k.girone = p_girone
     and (k.squadra_id is null or k.squadra_id not in (select c.squadra_id from calcola_classifica(p_stagione, p_girone) c));
end; $$;

revoke execute on function public.aggiorna_classifica(uuid, text) from public, anon, authenticated;

-- ---------- ricalcolo automatico ----------

create or replace function public.trg_ricalcola_classifica()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'regole_classifica' then
    perform aggiorna_classifica(g.stagione_id, g.girone)
       from (select distinct stagione_id, girone from partite
              where stagione_id = coalesce(new.stagione_id, old.stagione_id) and girone is not null) g;
    return null;
  end if;

  if tg_op <> 'INSERT' then
    perform aggiorna_classifica(old.stagione_id, old.girone);
  end if;
  if tg_op <> 'DELETE' and (tg_op = 'INSERT' or (old.stagione_id, old.girone) is distinct from (new.stagione_id, new.girone)) then
    perform aggiorna_classifica(new.stagione_id, new.girone);
  end if;
  return null;
end; $$;

create trigger trg_partite_classifica
  after insert or delete or update of stato, set_casa, set_ospite, parziali, rinuncia, squadra_casa_id, squadra_ospite_id, stagione_id, girone
  on public.partite
  for each row execute function public.trg_ricalcola_classifica();

create trigger trg_penalita_squadra_classifica
  after insert or delete or update on public.penalita_squadra
  for each row execute function public.trg_ricalcola_classifica();

create trigger trg_regole_classifica_classifica
  after insert or delete or update on public.regole_classifica
  for each row execute function public.trg_ricalcola_classifica();

-- ---------- primo calcolo e realtime ----------

select public.aggiorna_classifica(g.stagione_id, g.girone)
  from (select distinct stagione_id, girone from public.partite where girone is not null) g;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'classifiche') then
    alter publication supabase_realtime add table public.classifiche;
  end if;
end $$;

commit;
