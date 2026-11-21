-- Baseline: schema completo del database di produzione al 21 novembre 2026, generato con pg_dump (schema public)
-- più le parti fuori da public (trigger su auth.users, bucket e policy di storage, realtime, job pg_cron).
-- Sostituisce le 53 migration precedenti, archiviate in supabase/migrations_archivio/ (solo come storia: non vanno
-- più applicate). Le migration nuove si aggiungono dopo questa.
-- Non contiene dati né segreti: il segreto delle notifiche ('notifiche_segreto') sta nel Vault e in un database nuovo
-- va creato a mano con select vault.create_secret('<valore>', 'notifiche_segreto');

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema public;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 19.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--




--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--



--
-- Name: casa_trasferta; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.casa_trasferta AS ENUM (
    'casa',
    'trasferta'
);


ALTER TYPE public.casa_trasferta OWNER TO postgres;

--
-- Name: categoria_notizia; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.categoria_notizia AS ENUM (
    'societa',
    'prima_squadra',
    'giovanili',
    'sponsor'
);


ALTER TYPE public.categoria_notizia OWNER TO postgres;

--
-- Name: livello_sponsor; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.livello_sponsor AS ENUM (
    'gold',
    'silver',
    'bronze',
    'title sponsor',
    'main sponsor',
    'charity partner',
    'sponsor'
);


ALTER TYPE public.livello_sponsor OWNER TO postgres;

--
-- Name: livello_squadra; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.livello_squadra AS ENUM (
    'prima_squadra',
    'under12',
    'under14',
    'under16',
    'under18',
    'serie_b2',
    'serie_d'
);


ALTER TYPE public.livello_squadra OWNER TO postgres;

--
-- Name: ruolo_giocatrice; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ruolo_giocatrice AS ENUM (
    'palleggiatrice',
    'schiacciatrice',
    'centrale',
    'opposto',
    'libero'
);


ALTER TYPE public.ruolo_giocatrice OWNER TO postgres;

--
-- Name: ruolo_staff; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ruolo_staff AS ENUM (
    'allenatore',
    'allenatore_giovanili',
    'dirigente',
    'staff_sanitario'
);


ALTER TYPE public.ruolo_staff OWNER TO postgres;

--
-- Name: ruolo_utente; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ruolo_utente AS ENUM (
    'pubblico',
    'genitore',
    'staff',
    'admin'
);


ALTER TYPE public.ruolo_utente OWNER TO postgres;

--
-- Name: stato_partita; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.stato_partita AS ENUM (
    'programmata',
    'live',
    'conclusa',
    'rinviata'
);


ALTER TYPE public.stato_partita OWNER TO postgres;

--
-- Name: tipo_consenso; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_consenso AS ENUM (
    'informativa_privacy',
    'eta_14_anni',
    'marketing',
    'assistente_ai'
);


ALTER TYPE public.tipo_consenso OWNER TO postgres;

--
-- Name: tipo_media; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_media AS ENUM (
    'video',
    'podcast'
);


ALTER TYPE public.tipo_media OWNER TO postgres;

--
-- Name: aggiorna_classifica(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.aggiorna_classifica(p_stagione uuid, p_girone text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


ALTER FUNCTION public.aggiorna_classifica(p_stagione uuid, p_girone text) OWNER TO postgres;

--
-- Name: aggiorna_risultato_partita(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.aggiorna_risultato_partita() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


ALTER FUNCTION public.aggiorna_risultato_partita() OWNER TO postgres;

--
-- Name: allinea_casa_ospite(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.allinea_casa_ospite() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
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


ALTER FUNCTION public.allinea_casa_ospite() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: azioni_punto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.azioni_punto (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partita_id uuid NOT NULL,
    evento_id uuid NOT NULL,
    numero_set integer NOT NULL,
    squadra text NOT NULL,
    azione text NOT NULL,
    fase text NOT NULL,
    zona smallint,
    formazione_id uuid,
    giocatrice_id uuid,
    nome_giocatrice text,
    punteggio_nostro integer NOT NULL,
    punteggio_avversario integer NOT NULL,
    frase_ai boolean DEFAULT false NOT NULL,
    creato_il timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT azioni_punto_azione_check CHECK ((azione = ANY (ARRAY['schiacciata'::text, 'parallela'::text, 'mani_fuori'::text, 'pipe'::text, 'primo_tempo'::text, 'fast'::text, 'pallonetto'::text, 'ace'::text, 'muro'::text, 'battuta_out'::text, 'errore_avversario'::text]))),
    CONSTRAINT azioni_punto_fase_check CHECK ((fase = ANY (ARRAY['attacco'::text, 'difesa'::text]))),
    CONSTRAINT azioni_punto_squadra_check CHECK ((squadra = ANY (ARRAY['nostra'::text, 'avversaria'::text]))),
    CONSTRAINT azioni_punto_zona_check CHECK (((zona >= 1) AND (zona <= 6)))
);


ALTER TABLE public.azioni_punto OWNER TO postgres;

--
-- Name: applica_azione_giocatrice(public.azioni_punto, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.applica_azione_giocatrice(r public.azioni_punto, segno integer) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  update public.giocatrici
  set punti = greatest(0, coalesce(punti, 0) + segno),
      ace = greatest(0, coalesce(ace, 0) + case when r.azione = 'ace' then segno else 0 end),
      muri = greatest(0, coalesce(muri, 0) + case when r.azione = 'muro' then segno else 0 end)
  where r.squadra = 'nostra' and r.giocatrice_id is not null and id = r.giocatrice_id;
$$;


ALTER FUNCTION public.applica_azione_giocatrice(r public.azioni_punto, segno integer) OWNER TO postgres;

--
-- Name: attiva_partite_live(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.attiva_partite_live() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare n integer;
begin
  update partite
     set stato = 'live', aggiornato_il = now()
   where nostra_partita
     and stato = 'programmata'
     and data_partita <= now() + interval '15 minutes'
     and data_partita >  now() - interval '6 hours';
  get diagnostics n = row_count;
  return n;
end; $$;


ALTER FUNCTION public.attiva_partite_live() OWNER TO postgres;

--
-- Name: azioni_punto_statistiche(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.azioni_punto_statistiche() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.azioni_punto_statistiche() OWNER TO postgres;

--
-- Name: blocca_modifica_consensi(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.blocca_modifica_consensi() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  raise exception 'Il registro dei consensi non si modifica: inserire una nuova riga' using errcode = '42501';
end;
$$;


ALTER FUNCTION public.blocca_modifica_consensi() OWNER TO postgres;

--
-- Name: bordo_campo(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.bordo_campo() RETURNS TABLE(numero_gara integer, partita_id uuid, casa text, ospite text, nostra boolean, stato text, set_casa integer, set_ospite integer, parziali jsonb, testo text, aggiornato_il timestamp with time zone, giornata integer, girone text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with ultimo as (
    select distinct on (l.agente) l.agente, l.evento, l.dettagli
      from public.log_agente l
     where l.evento in ('avvio', 'finestra_aperta', 'finestra_chiusa', 'stop')
       and l.creato_il > now() - interval '12 hours'
     order by l.agente, l.creato_il desc, l.id desc
  ),
  gare as (
    select distinct (g.value)::int as numero_gara
      from ultimo u
      cross join lateral jsonb_array_elements_text(coalesce(u.dettagli->'gare', '[]'::jsonb)) g
     where u.evento = 'finestra_aperta'
       and exists (select 1 from public.log_agente b
                    where b.agente = u.agente and b.creato_il > now() - interval '15 minutes')
  )
  select * from (
    select distinct on (l.numero_gara)
      l.numero_gara                                              as g_numero,
      l.partita_id                                               as g_partita,
      l.dettagli->'tabellone'->>'casa'                           as g_casa,
      l.dettagli->'tabellone'->>'ospite'                         as g_ospite,
      coalesce((l.dettagli->'tabellone'->>'nostra')::boolean, false) as g_nostra,
      l.dettagli->'tabellone'->>'stato'                          as g_stato,
      coalesce((l.dettagli->'tabellone'->>'set_casa')::int, 0)   as g_set_casa,
      coalesce((l.dettagli->'tabellone'->>'set_ospite')::int, 0) as g_set_ospite,
      coalesce(l.dettagli->'tabellone'->'parziali', '[]'::jsonb) as g_parziali,
      public.tabellone_testo(l.dettagli->'tabellone')            as g_testo,
      l.creato_il                                                as g_quando,
      p.giornata                                                 as g_giornata,
      p.girone::text                                             as g_girone
    from public.log_agente l
    join gare g on g.numero_gara = l.numero_gara
    left join public.partite p on p.id = l.partita_id
    where l.evento in ('aggiornamento', 'correzione')
      and l.dettagli ? 'tabellone'
      and l.creato_il > now() - interval '12 hours'
    order by l.numero_gara, l.creato_il desc, l.id desc
  ) t
  -- prima la nostra, poi le gare in corso, poi le concluse (le più recenti prima)
  order by t.g_nostra desc, (t.g_stato = 'conclusa'), t.g_quando desc
$$;


ALTER FUNCTION public.bordo_campo() OWNER TO postgres;

--
-- Name: calcola_classifica(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calcola_classifica(p_stagione uuid, p_girone text) RETURNS TABLE(squadra_id uuid, nome_squadra text, nostra_squadra boolean, posizione integer, punti integer, giocate integer, vinte integer, perse integer, vinte_3_0_3_1 integer, vinte_3_2 integer, perse_2_3 integer, perse_0_3_1_3 integer, set_vinti integer, set_persi integer, quoziente_set numeric, punti_fatti integer, punti_subiti integer, quoziente_punti numeric, penalita integer)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $_$
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
end; $_$;


ALTER FUNCTION public.calcola_classifica(p_stagione uuid, p_girone text) OWNER TO postgres;

--
-- Name: cerca_conoscenza(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cerca_conoscenza(query text, limite integer DEFAULT 5) RETURNS TABLE(titolo text, testo text, url_origine text, tipo text, rank real)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  q_testo text := left(trim(coalesce(query, '')), 500);
  n integer := least(greatest(coalesce(limite, 5), 1), 10);
  q tsquery;
  q_or tsquery;
  parole text;
begin
  if q_testo = '' then
    return;
  end if;

  q := websearch_to_tsquery('italian'::regconfig, q_testo);

  -- lessemi già normalizzati in italiano, messi in OR (apici e backslash tolti: niente sintassi tsquery dall'utente)
  select string_agg(distinct '''' || regexp_replace(l, '[''\\]', '', 'g') || '''', ' | ')
    into parole
    from unnest(tsvector_to_array(to_tsvector('italian'::regconfig, q_testo))) as l
   where regexp_replace(l, '[''\\]', '', 'g') <> '';
  q_or := case when parole is null then null else parole::tsquery end;

  if q is null or numnode(q) = 0 then
    return;
  end if;

  for pass in 1..2 loop
    return query
      with risultati as (
        select c.titolo, c.testo, c.url_origine, coalesce(f.tipo, 'manuale') as tipo,
               ts_rank(c.ricerca, case when pass = 1 then q else q_or end, 1) as rank
          from conoscenza c
          left join fonti f on f.id = c.fonte_id
         where (c.fonte_id is null or f.attiva)
           and c.ricerca @@ (case when pass = 1 then q else q_or end)
        union all
        select d.domanda, d.risposta, null::text, 'faq',
               -- a parità di pertinenza la FAQ curata vince sul testo del sito
               ts_rank(d.ricerca, case when pass = 1 then q else q_or end, 1) * 1.2
          from faq d
         where d.attiva
           and d.ricerca @@ (case when pass = 1 then q else q_or end)
      )
      select r.titolo, r.testo, r.url_origine, r.tipo, r.rank::real
        from risultati r
       order by r.rank desc
       limit n;

    exit when found or q_or is null;
  end loop;
end;
$$;


ALTER FUNCTION public.cerca_conoscenza(query text, limite integer) OWNER TO postgres;

--
-- Name: FUNCTION cerca_conoscenza(query text, limite integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.cerca_conoscenza(query text, limite integer) IS 'Ricerca full-text italiana su conoscenza e faq attive per l''assistente AI (AND, poi OR se non trova nulla)';


--
-- Name: conferma_tabellino(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.conferma_tabellino(p_tabellino uuid, p_dati jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
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
end; $_$;


ALTER FUNCTION public.conferma_tabellino(p_tabellino uuid, p_dati jsonb) OWNER TO postgres;

--
-- Name: consuma_domanda_assistente(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.consuma_domanda_assistente(limite integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
  n integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  insert into uso_assistente (utente_id, giorno, domande)
  values (auth.uid(), oggi, 1)
  on conflict (utente_id, giorno)
  do update set domande = uso_assistente.domande + 1
  returning domande into n;

  return n <= limite;
end;
$$;


ALTER FUNCTION public.consuma_domanda_assistente(limite integer) OWNER TO postgres;

--
-- Name: crea_profilo_nuovo_utente(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.crea_profilo_nuovo_utente() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  -- il ruolo è fisso: raw_user_meta_data arriva dal client e non va mai usato per il ruolo
  insert into public.profili (id, nome_completo, ruolo)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), nullif(trim(new.raw_user_meta_data->>'name'), '')),
    'pubblico'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION public.crea_profilo_nuovo_utente() OWNER TO postgres;

--
-- Name: e_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.e_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.profili where id = auth.uid() and ruolo = 'admin');
$$;


ALTER FUNCTION public.e_admin() OWNER TO postgres;

--
-- Name: e_staff(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.e_staff() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.profili where id = auth.uid() and ruolo in ('staff', 'admin'));
$$;


ALTER FUNCTION public.e_staff() OWNER TO postgres;

--
-- Name: giocatrice_da_maglia(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.giocatrice_da_maglia(p_partita uuid, p_squadra text, p_numero integer) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


ALTER FUNCTION public.giocatrice_da_maglia(p_partita uuid, p_squadra text, p_numero integer) OWNER TO postgres;

--
-- Name: giocatrici_anno_nascita(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.giocatrici_anno_nascita() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if new.data_nascita is not null then
    new.anno_nascita := extract(year from new.data_nascita)::smallint;
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.giocatrici_anno_nascita() OWNER TO postgres;

--
-- Name: giocatrici_squadra_predefinita(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.giocatrici_squadra_predefinita() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if new.squadra_id is null then
    select id into new.squadra_id from squadre where nostra_squadra limit 1;
  end if;
  return new;
end $$;


ALTER FUNCTION public.giocatrici_squadra_predefinita() OWNER TO postgres;

--
-- Name: imposta_aggiornato_il(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.imposta_aggiornato_il() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.aggiornato_il := now();
  return new;
end;
$$;


ALTER FUNCTION public.imposta_aggiornato_il() OWNER TO postgres;

--
-- Name: imposta_ruolo_utente(uuid, public.ruolo_utente); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.imposta_ruolo_utente(p_utente uuid, p_ruolo public.ruolo_utente) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'Accesso richiesto' using errcode = '42501';
  end if;
  if not public.e_staff() then
    raise exception 'Solo staff e admin possono modificare i ruoli' using errcode = '42501';
  end if;
  -- le regole su chi può assegnare cosa sono in proteggi_ruolo_profilo (auth.uid() resta quello del chiamante)
  update profili set ruolo = p_ruolo where id = p_utente;
  if not found then
    raise exception 'Utente non trovato' using errcode = 'P0002';
  end if;
end;
$$;


ALTER FUNCTION public.imposta_ruolo_utente(p_utente uuid, p_ruolo public.ruolo_utente) OWNER TO postgres;

--
-- Name: invia_notifica_push(text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.invia_notifica_push(p_tipo text, p_id uuid) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_segreto text;
begin
  select decrypted_secret into v_segreto from vault.decrypted_secrets where name = 'notifiche_segreto';
  if v_segreto is null then
    raise warning 'notifiche push: segreto notifiche_segreto mancante nel Vault, % % non inviata', p_tipo, p_id;
    return null;
  end if;

  return net.http_post(
    url := 'https://ruqwpjxpmebiejdndoxd.supabase.co/functions/v1/invia-notifica',
    body := jsonb_build_object('tipo', p_tipo, 'id', p_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notifiche-segreto', v_segreto),
    timeout_milliseconds := 15000
  );
end; $$;


ALTER FUNCTION public.invia_notifica_push(p_tipo text, p_id uuid) OWNER TO postgres;

--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.e_admin();
$$;


ALTER FUNCTION public.is_admin() OWNER TO postgres;

--
-- Name: is_staff(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_staff() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.e_staff();
$$;


ALTER FUNCTION public.is_staff() OWNER TO postgres;

--
-- Name: libera_dispositivo_push(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.libera_dispositivo_push(p_token text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
begin
  if auth.uid() is null then
    raise exception 'Accesso richiesto';
  end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[^\]]{1,200}\]$' then
    raise exception 'Token push non valido';
  end if;
  delete from public.dispositivi_push where token = p_token and user_id <> auth.uid();
end; $_$;


ALTER FUNCTION public.libera_dispositivo_push(p_token text) OWNER TO postgres;

--
-- Name: notifica_game_day(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notifica_game_day() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


ALTER FUNCTION public.notifica_game_day() OWNER TO postgres;

--
-- Name: notifica_prepartite(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notifica_prepartite() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


ALTER FUNCTION public.notifica_prepartite() OWNER TO postgres;

--
-- Name: partite_lette_agente(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.partite_lette_agente(giorni integer DEFAULT 3) RETURNS TABLE(partita_id uuid, ultimo_aggiornamento timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select l.partita_id, max(l.creato_il) as ultimo_aggiornamento
  from public.log_agente l
  where l.partita_id is not null
    and l.evento in ('aggiornamento', 'correzione')
    and l.creato_il >= now() - make_interval(days => least(greatest(giorni, 1), 14))
  group by l.partita_id
$$;


ALTER FUNCTION public.partite_lette_agente(giorni integer) OWNER TO postgres;

--
-- Name: FUNCTION partite_lette_agente(giorni integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.partite_lette_agente(giorni integer) IS 'Partite con aggiornamenti dell''agente livescore negli ultimi N giorni (max 14): solo id e ora, per la home.';


--
-- Name: preferenze_push_token(text, boolean, boolean, boolean, boolean, boolean, boolean, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.preferenze_push_token(p_token text, p_attive boolean, p_inizio boolean, p_set boolean, p_finale boolean, p_contenuti boolean, p_game_day boolean DEFAULT NULL::boolean, p_mvp boolean DEFAULT NULL::boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
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
end; $_$;


ALTER FUNCTION public.preferenze_push_token(p_token text, p_attive boolean, p_inizio boolean, p_set boolean, p_finale boolean, p_contenuti boolean, p_game_day boolean, p_mvp boolean) OWNER TO postgres;

--
-- Name: proteggi_ruolo_profilo(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.proteggi_ruolo_profilo() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if new.ruolo is distinct from 'pubblico' then
      raise exception 'Un profilo nasce sempre con ruolo pubblico' using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.ruolo = 'admin' and not exists (select 1 from profili where ruolo = 'admin' and id <> old.id) then
      raise exception 'Impossibile eliminare l''ultimo admin' using errcode = '42501';
    end if;
    return old;
  end if;

  -- UPDATE
  if new.id is distinct from old.id then
    raise exception 'L''id del profilo non si può modificare' using errcode = '42501';
  end if;
  if new.ruolo is not distinct from old.ruolo then
    return new;
  end if;

  -- con un utente collegato (app, RPC, API): regole dell'app. Senza auth.uid() (SQL Editor, service role) è consentito.
  if v_uid is not null then
    if new.id = v_uid then
      raise exception 'Non puoi modificare il tuo ruolo' using errcode = '42501';
    end if;
    if new.ruolo = 'admin' then
      raise exception 'Il ruolo admin si assegna solo dal pannello Supabase' using errcode = '42501';
    end if;
    if old.ruolo = 'admin' then
      raise exception 'Il ruolo di un admin si modifica solo dal pannello Supabase' using errcode = '42501';
    end if;
    if public.e_admin() then
      null; -- pubblico, genitore, staff
    elsif public.e_staff() then
      if old.ruolo not in ('pubblico', 'genitore') or new.ruolo not in ('pubblico', 'genitore') then
        raise exception 'Lo staff può assegnare solo i ruoli pubblico e genitore' using errcode = '42501';
      end if;
    else
      raise exception 'Non autorizzato a modificare i ruoli' using errcode = '42501';
    end if;
  end if;

  if old.ruolo = 'admin' and not exists (select 1 from profili where ruolo = 'admin' and id <> old.id) then
    raise exception 'Impossibile declassare l''ultimo admin' using errcode = '42501';
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.proteggi_ruolo_profilo() OWNER TO postgres;

--
-- Name: punteggi_agente(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.punteggi_agente(p_minuti integer DEFAULT 5) RETURNS TABLE(numero_gara integer, partita_id uuid, casa text, ospite text, nostra boolean, stato text, set_casa integer, set_ospite integer, parziali jsonb, testo text, aggiornato_il timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select * from (
    select distinct on (l.numero_gara)
      l.numero_gara                                              as g_numero,
      l.partita_id                                               as g_partita,
      l.dettagli->'tabellone'->>'casa'                           as g_casa,
      l.dettagli->'tabellone'->>'ospite'                         as g_ospite,
      coalesce((l.dettagli->'tabellone'->>'nostra')::boolean, false) as g_nostra,
      l.dettagli->'tabellone'->>'stato'                          as g_stato,
      coalesce((l.dettagli->'tabellone'->>'set_casa')::int, 0)   as g_set_casa,
      coalesce((l.dettagli->'tabellone'->>'set_ospite')::int, 0) as g_set_ospite,
      coalesce(l.dettagli->'tabellone'->'parziali', '[]'::jsonb) as g_parziali,
      public.tabellone_testo(l.dettagli->'tabellone')            as g_testo,
      l.creato_il                                                as g_quando
    from public.log_agente l
    where l.evento in ('aggiornamento', 'correzione')
      and l.dettagli ? 'tabellone'
      and l.numero_gara is not null
      and l.creato_il > now() - make_interval(mins => least(greatest(coalesce(p_minuti, 5), 1), 720))
    order by l.numero_gara, l.creato_il desc, l.id desc
  ) t
  order by t.g_nostra desc, (t.g_stato = 'conclusa'), t.g_quando desc
$$;


ALTER FUNCTION public.punteggi_agente(p_minuti integer) OWNER TO postgres;

--
-- Name: registra_push_token(text, text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.registra_push_token(p_token text, p_piattaforma text DEFAULT NULL::text, p_categoria_giovanile_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
begin
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[^\]]{1,200}\]$' then
    raise exception 'Token push non valido';
  end if;

  insert into push_token (token, utente_id, categoria_giovanile_id, piattaforma)
  values (p_token, auth.uid(), p_categoria_giovanile_id, left(p_piattaforma, 20))
  on conflict (token) do update
     set utente_id = excluded.utente_id,
         categoria_giovanile_id = excluded.categoria_giovanile_id,
         piattaforma = excluded.piattaforma,
         attivo = true,
         aggiornato_il = now();
end; $_$;


ALTER FUNCTION public.registra_push_token(p_token text, p_piattaforma text, p_categoria_giovanile_id uuid) OWNER TO postgres;

--
-- Name: ricalcola_attacco_da_finale(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ricalcola_attacco_da_finale(p_finale uuid) RETURNS text[]
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
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
end; $_$;


ALTER FUNCTION public.ricalcola_attacco_da_finale(p_finale uuid) OWNER TO postgres;

--
-- Name: sestetti_set_controlla(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sestetti_set_controlla() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  c record;
begin
  select partita_id, squadra, ruolo into c from formazioni_partita where id = new.convocata_id;
  if c.partita_id is distinct from new.partita_id or c.squadra is distinct from new.squadra then
    raise exception 'La giocatrice non è a referto per questa partita e squadra' using errcode = '23514';
  end if;
  if new.zona is null then
    if c.ruolo is distinct from 'libero' then
      raise exception 'Come libero si possono scegliere solo le giocatrici con ruolo Libero' using errcode = '23514';
    end if;
    if (select count(*) from sestetti_set s
        where s.partita_id = new.partita_id and s.numero_set = new.numero_set and s.squadra = new.squadra
          and s.zona is null and s.id <> new.id) >= 2 then
      raise exception 'Al massimo 2 liberi per set e squadra' using errcode = '23514';
    end if;
  end if;
  new.aggiornato_il := now();
  return new;
end;
$$;


ALTER FUNCTION public.sestetti_set_controlla() OWNER TO postgres;

--
-- Name: set_valido(integer, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_valido(p_numero integer, p_casa integer, p_ospite integer) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  select p_casa >= 0 and p_ospite >= 0
     and greatest(p_casa, p_ospite) = greatest(case when p_numero = 5 then 15 else 25 end, least(p_casa, p_ospite) + 2);
$$;


ALTER FUNCTION public.set_valido(p_numero integer, p_casa integer, p_ospite integer) OWNER TO postgres;

--
-- Name: tabellone_testo(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tabellone_testo(t jsonb) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  select case
    when t->>'stato' = 'conclusa' then
      format('%s %s-%s %s · finale (%s)', t->>'casa', t->>'set_casa', t->>'set_ospite', t->>'ospite',
             (select string_agg(format('%s-%s', x->>'casa', x->>'ospite'), ' ' order by (x->>'set')::int)
                from jsonb_array_elements(coalesce(t->'parziali', '[]')) x))
    when jsonb_array_length(coalesce(t->'parziali', '[]')) = 0 then
      format('%s - %s · in corso', t->>'casa', t->>'ospite')
    else (
      select format('%s %s-%s %s · %s° set (%s-%s)', t->>'casa', u->>'casa', u->>'ospite', t->>'ospite',
                    u->>'set', t->>'set_casa', t->>'set_ospite')
        from jsonb_array_elements(t->'parziali') u
       order by (u->>'set')::int desc limit 1)
  end
$$;


ALTER FUNCTION public.tabellone_testo(t jsonb) OWNER TO postgres;

--
-- Name: trg_notifica_mvp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_notifica_mvp() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if exists (select 1 from partite p where p.id = new.partita_id and p.nostra_partita and p.casa_trasferta = 'casa' and p.stato = 'live')
     and (select count(*) from set_partita s where s.partita_id = new.partita_id and s.completato) >= 2 then
    perform invia_notifica_push('mvp', new.partita_id);
  end if;
  return null;
end; $$;


ALTER FUNCTION public.trg_notifica_mvp() OWNER TO postgres;

--
-- Name: trg_notifica_push(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_notifica_push() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_tipo text := tg_argv[0];
begin
  if tg_table_name = 'media' then
    v_tipo := new.tipo::text;
  end if;
  perform invia_notifica_push(v_tipo, new.id);
  return null;
end; $$;


ALTER FUNCTION public.trg_notifica_push() OWNER TO postgres;

--
-- Name: trg_ricalcola_classifica(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_ricalcola_classifica() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


ALTER FUNCTION public.trg_ricalcola_classifica() OWNER TO postgres;

--
-- Name: utente_da_identita(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.utente_da_identita(p_provider text, p_provider_id text) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select user_id from auth.identities where provider = p_provider and provider_id = p_provider_id limit 1;
$$;


ALTER FUNCTION public.utente_da_identita(p_provider text, p_provider_id text) OWNER TO postgres;

--
-- Name: valida_risultato_partita(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.valida_risultato_partita() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_set record;
  v_n integer;
  v_vinti_casa integer := 0;
  v_vinti_ospite integer := 0;
  v_ultimo_casa boolean;
begin
  if new.campionato_id is null and new.girone is null then
    return new;
  end if;

  -- rinuncia: gara persa 0-3 con parziali 0-25, la penalizzazione la applica la classifica
  if new.rinuncia is not null then
    new.stato := 'conclusa';
    new.set_casa := case when new.rinuncia = 'casa' then 0 else 3 end;
    new.set_ospite := case when new.rinuncia = 'casa' then 3 else 0 end;
    new.parziali := (
      select jsonb_agg(jsonb_build_object('set', i,
        'casa', case when new.rinuncia = 'casa' then 0 else 25 end,
        'ospite', case when new.rinuncia = 'casa' then 25 else 0 end) order by i)
      from generate_series(1, 3) i
    );
    if new.nostra_partita and new.casa_trasferta is not null then
      new.nostri_set_vinti := case when new.casa_trasferta = 'casa' then new.set_casa else new.set_ospite end;
      new.set_vinti_avversario := case when new.casa_trasferta = 'casa' then new.set_ospite else new.set_casa end;
    end if;
    return new;
  end if;

  if new.stato <> 'conclusa' then
    return new;
  end if;

  if new.set_casa is null or new.set_ospite is null
     or greatest(new.set_casa, new.set_ospite) <> 3 or least(new.set_casa, new.set_ospite) > 2 then
    raise exception 'Risultato non valido: %-% (ammessi 3-0, 3-1, 3-2 e inversi)', new.set_casa, new.set_ospite
      using errcode = 'check_violation';
  end if;

  -- parziali facoltativi; se ci sono devono essere coerenti con il risultato
  if new.parziali is null or jsonb_array_length(new.parziali) = 0 then
    return new;
  end if;
  v_n := jsonb_array_length(new.parziali);
  if v_n <> new.set_casa + new.set_ospite then
    raise exception 'Parziali non coerenti: % set per un risultato %-%', v_n, new.set_casa, new.set_ospite
      using errcode = 'check_violation';
  end if;

  for v_set in
    select (e->>'set')::int as numero, (e->>'casa')::int as casa, (e->>'ospite')::int as ospite,
           row_number() over (order by (e->>'set')::int) as ordine
      from jsonb_array_elements(new.parziali) e
  loop
    if v_set.numero is distinct from v_set.ordine::int or v_set.casa is null or v_set.ospite is null
       or not set_valido(v_set.numero, v_set.casa, v_set.ospite) then
      raise exception 'Set % non valido: %-%', coalesce(v_set.numero, v_set.ordine::int), v_set.casa, v_set.ospite
        using errcode = 'check_violation';
    end if;
    if v_set.casa > v_set.ospite then v_vinti_casa := v_vinti_casa + 1; else v_vinti_ospite := v_vinti_ospite + 1; end if;
    v_ultimo_casa := v_set.casa > v_set.ospite;
  end loop;

  -- i set vinti devono tornare e l'ultimo set lo vince chi vince la partita
  if v_vinti_casa <> new.set_casa or v_vinti_ospite <> new.set_ospite or v_ultimo_casa <> (new.set_casa = 3) then
    raise exception 'Parziali non coerenti con il risultato %-%', new.set_casa, new.set_ospite
      using errcode = 'check_violation';
  end if;
  return new;
end; $$;


ALTER FUNCTION public.valida_risultato_partita() OWNER TO postgres;

--
-- Name: voti_mvp_partita(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.voti_mvp_partita(p_partita uuid) RETURNS TABLE(giocatrice_id uuid, voti bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select v.giocatrice_id, count(*) as voti
  from public.voti_mvp v
  where v.partita_id = p_partita
  group by v.giocatrice_id;
$$;


ALTER FUNCTION public.voti_mvp_partita(p_partita uuid) OWNER TO postgres;

--
-- Name: voto_mvp_valido(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.voto_mvp_valido(p_partita uuid, p_giocatrice uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1 from public.formazioni_partita f
    join public.partite p on p.id = f.partita_id
    where f.partita_id = p_partita and f.giocatrice_id = p_giocatrice
      and (p.stato = 'conclusa'
        or (p.stato = 'live'
          and (select count(*) from public.set_partita s where s.partita_id = p.id and s.completato) >= 2))
  );
$$;


ALTER FUNCTION public.voto_mvp_valido(p_partita uuid, p_giocatrice uuid) OWNER TO postgres;

--
-- Name: account_eliminati; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_eliminati (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    utente_eliminato_id uuid,
    provider text[] DEFAULT '{}'::text[] NOT NULL,
    origine text NOT NULL,
    codice_conferma text NOT NULL,
    eliminato_il timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_eliminati_origine_check CHECK ((origine = ANY (ARRAY['app'::text, 'facebook_callback'::text, 'staff'::text])))
);


ALTER TABLE public.account_eliminati OWNER TO postgres;

--
-- Name: album_foto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.album_foto (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titolo text NOT NULL,
    url_copertina text,
    data_scatto date,
    pubblicato boolean DEFAULT false NOT NULL,
    consenso_verificato boolean DEFAULT false NOT NULL,
    CONSTRAINT album_foto_pubblicato_con_consenso CHECK (((NOT pubblicato) OR consenso_verificato))
);


ALTER TABLE public.album_foto OWNER TO postgres;

--
-- Name: statistiche_attacco; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.statistiche_attacco (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partita_id uuid NOT NULL,
    tabellino_id uuid,
    squadra text NOT NULL,
    numero_set smallint NOT NULL,
    numero_maglia smallint NOT NULL,
    nome text DEFAULT ''::text NOT NULL,
    giocatrice_id uuid,
    tentativi integer DEFAULT 0 NOT NULL,
    errori integer DEFAULT 0 NOT NULL,
    murati integer DEFAULT 0 NOT NULL,
    punti integer DEFAULT 0 NOT NULL,
    derivato boolean DEFAULT false NOT NULL,
    aggiornato_il timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT statistiche_attacco_errori_check CHECK ((errori >= 0)),
    CONSTRAINT statistiche_attacco_murati_check CHECK ((murati >= 0)),
    CONSTRAINT statistiche_attacco_numero_maglia_check CHECK (((numero_maglia >= 0) AND (numero_maglia <= 99))),
    CONSTRAINT statistiche_attacco_numero_set_check CHECK (((numero_set >= 1) AND (numero_set <= 5))),
    CONSTRAINT statistiche_attacco_punti_check CHECK ((punti >= 0)),
    CONSTRAINT statistiche_attacco_squadra_check CHECK ((squadra = ANY (ARRAY['nostra'::text, 'avversaria'::text]))),
    CONSTRAINT statistiche_attacco_tentativi_check CHECK ((tentativi >= 0))
);


ALTER TABLE public.statistiche_attacco OWNER TO postgres;

--
-- Name: attacco_giocatrici_partita; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.attacco_giocatrici_partita WITH (security_invoker='true') AS
 SELECT partita_id,
    squadra,
    numero_maglia,
    (array_agg(giocatrice_id) FILTER (WHERE (giocatrice_id IS NOT NULL)))[1] AS giocatrice_id,
    max(nome) AS nome,
    (sum(tentativi))::integer AS tentativi,
    (sum(errori))::integer AS errori,
    (sum(murati))::integer AS murati,
    (sum(punti))::integer AS punti,
    (round(((100.0 * (sum(punti))::numeric) / (NULLIF(sum(tentativi), 0))::numeric)))::integer AS pt_perc
   FROM public.statistiche_attacco
  GROUP BY partita_id, squadra, numero_maglia;


ALTER VIEW public.attacco_giocatrici_partita OWNER TO postgres;

--
-- Name: campionati; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campionati (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    federazione text,
    logo_url text,
    creato_il timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campionati OWNER TO postgres;

--
-- Name: categorie_giovanili; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorie_giovanili (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    descrizione text,
    ordine integer DEFAULT 0
);


ALTER TABLE public.categorie_giovanili OWNER TO postgres;

--
-- Name: classifiche; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classifiche (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stagione_id uuid NOT NULL,
    girone text,
    nome_squadra text NOT NULL,
    nostra_squadra boolean DEFAULT false NOT NULL,
    posizione integer NOT NULL,
    giocate integer DEFAULT 0 NOT NULL,
    vinte integer DEFAULT 0 NOT NULL,
    perse integer DEFAULT 0 NOT NULL,
    punti integer DEFAULT 0 NOT NULL,
    aggiornato_il timestamp with time zone DEFAULT now() NOT NULL,
    squadra_id uuid,
    vinte_3_0_3_1 integer DEFAULT 0 NOT NULL,
    vinte_3_2 integer DEFAULT 0 NOT NULL,
    perse_2_3 integer DEFAULT 0 NOT NULL,
    perse_0_3_1_3 integer DEFAULT 0 NOT NULL,
    set_vinti integer DEFAULT 0 NOT NULL,
    set_persi integer DEFAULT 0 NOT NULL,
    quoziente_set numeric,
    punti_fatti integer DEFAULT 0 NOT NULL,
    punti_subiti integer DEFAULT 0 NOT NULL,
    quoziente_punti numeric,
    penalita integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.classifiche OWNER TO postgres;

--
-- Name: COLUMN classifiche.quoziente_set; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classifiche.quoziente_set IS 'set vinti / set persi; null se set persi = 0 (la squadra va davanti a parità)';


--
-- Name: COLUMN classifiche.quoziente_punti; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classifiche.quoziente_punti IS 'punti fatti / punti subiti; null se punti subiti = 0';


--
-- Name: COLUMN classifiche.penalita; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classifiche.penalita IS 'Punti di penalizzazione (rinunce + penalita_squadra), già tolti da punti';


--
-- Name: conoscenza; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conoscenza (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fonte_id uuid,
    posizione integer DEFAULT 0 NOT NULL,
    titolo text NOT NULL,
    testo text NOT NULL,
    url_origine text,
    aggiornato_il timestamp with time zone DEFAULT now() NOT NULL,
    ricerca tsvector GENERATED ALWAYS AS ((setweight(to_tsvector('italian'::regconfig, COALESCE(titolo, ''::text)), 'A'::"char") || setweight(to_tsvector('italian'::regconfig, COALESCE(testo, ''::text)), 'B'::"char"))) STORED,
    CONSTRAINT conoscenza_testo_check CHECK ((length(testo) <= 20000))
);


ALTER TABLE public.conoscenza OWNER TO postgres;

--
-- Name: TABLE conoscenza; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.conoscenza IS 'Blocchi di testo per l''assistente AI: dallo script di ingestione (fonte_id) o scritti a mano (fonte_id nullo)';


--
-- Name: COLUMN conoscenza.posizione; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.conoscenza.posizione IS 'Ordine del blocco all''interno della fonte';


--
-- Name: consensi_utente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consensi_utente (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    utente_id uuid NOT NULL,
    tipo public.tipo_consenso NOT NULL,
    concesso boolean NOT NULL,
    versione_informativa text NOT NULL,
    origine text DEFAULT 'app'::text NOT NULL,
    provider_accesso text,
    creato_il timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT consensi_utente_origine_check CHECK ((origine = ANY (ARRAY['app'::text, 'staff'::text]))),
    CONSTRAINT consensi_utente_provider_accesso_check CHECK ((provider_accesso = ANY (ARRAY['email'::text, 'apple'::text, 'google'::text, 'facebook'::text]))),
    CONSTRAINT consensi_utente_versione_informativa_check CHECK (((length(versione_informativa) >= 1) AND (length(versione_informativa) <= 40)))
);


ALTER TABLE public.consensi_utente OWNER TO postgres;

--
-- Name: consensi_utente_attuali; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.consensi_utente_attuali WITH (security_invoker='true') AS
 SELECT DISTINCT ON (utente_id, tipo) utente_id,
    tipo,
    concesso,
    versione_informativa,
    origine,
    provider_accesso,
    creato_il
   FROM public.consensi_utente
  ORDER BY utente_id, tipo, creato_il DESC, id DESC;


ALTER VIEW public.consensi_utente_attuali OWNER TO postgres;

--
-- Name: convenzioni; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.convenzioni (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    promozione text NOT NULL,
    url_logo text,
    url_sito text,
    ordine integer DEFAULT 0 NOT NULL,
    attiva boolean DEFAULT true NOT NULL,
    creato_il timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.convenzioni OWNER TO postgres;

--
-- Name: demo_diretta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.demo_diretta (
    chiave text NOT NULL,
    stato jsonb NOT NULL,
    versione bigint NOT NULL,
    aggiornato_il timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.demo_diretta OWNER TO postgres;

--
-- Name: TABLE demo_diretta; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.demo_diretta IS 'Stato della partita demo condivisa (punteggio e formazioni), separato dalle partite vere.';


--
-- Name: dispositivi_push; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dispositivi_push (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    piattaforma text NOT NULL,
    attive boolean DEFAULT true NOT NULL,
    game_day boolean DEFAULT true NOT NULL,
    inizio_partita boolean DEFAULT true NOT NULL,
    voto_mvp boolean DEFAULT true NOT NULL,
    fine_set boolean DEFAULT true NOT NULL,
    risultato_finale boolean DEFAULT true NOT NULL,
    contenuti boolean DEFAULT true NOT NULL,
    categoria_giovanile_id uuid,
    creato_il timestamp with time zone DEFAULT now() NOT NULL,
    aggiornato_il timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dispositivi_push_piattaforma_check CHECK ((piattaforma = ANY (ARRAY['ios'::text, 'android'::text]))),
    CONSTRAINT dispositivi_push_token_check CHECK ((token ~ '^Expo(nent)?PushToken\[[^\]]{1,200}\]$'::text))
);


ALTER TABLE public.dispositivi_push OWNER TO postgres;

--
-- Name: TABLE dispositivi_push; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.dispositivi_push IS 'Token Expo dei dispositivi degli utenti con accesso; invia-notifica legge solo le righe con attive = true';


--
-- Name: COLUMN dispositivi_push.attive; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dispositivi_push.attive IS 'Interruttore Notifiche di Impostazioni per questo dispositivo';


--
-- Name: eventi_live; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.eventi_live (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partita_id uuid NOT NULL,
    numero_set integer NOT NULL,
    punteggio_nostro integer NOT NULL,
    punteggio_avversario integer NOT NULL,
    descrizione text NOT NULL,
    creato_il timestamp with time zone DEFAULT now() NOT NULL,
    squadra text,
    fonte text,
    CONSTRAINT eventi_live_squadra_check CHECK ((squadra = ANY (ARRAY['nostra'::text, 'avversaria'::text])))
);


ALTER TABLE public.eventi_live OWNER TO postgres;

--
-- Name: COLUMN eventi_live.squadra; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.eventi_live.squadra IS 'Squadra a cui si riferisce la riga di cronaca (null nelle righe vecchie: si deduce dal punteggio)';


--
-- Name: COLUMN eventi_live.fonte; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.eventi_live.fonte IS 'agente = punto scritto dall''agente livescore; null = inserito dall''app';


--
-- Name: faq; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faq (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    domanda text NOT NULL,
    risposta text NOT NULL,
    categoria text,
    attiva boolean DEFAULT true NOT NULL,
    ordine integer DEFAULT 0 NOT NULL,
    aggiornato_il timestamp with time zone DEFAULT now() NOT NULL,
    ricerca tsvector GENERATED ALWAYS AS ((setweight(to_tsvector('italian'::regconfig, COALESCE(domanda, ''::text)), 'A'::"char") || setweight(to_tsvector('italian'::regconfig, COALESCE(risposta, ''::text)), 'B'::"char"))) STORED,
    CONSTRAINT faq_domanda_check CHECK (((length(TRIM(BOTH FROM domanda)) >= 3) AND (length(TRIM(BOTH FROM domanda)) <= 500))),
    CONSTRAINT faq_risposta_check CHECK (((length(TRIM(BOTH FROM risposta)) >= 1) AND (length(TRIM(BOTH FROM risposta)) <= 5000)))
);


ALTER TABLE public.faq OWNER TO postgres;

--
-- Name: TABLE faq; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.faq IS 'Domande frequenti curate dall''admin, usate dall''assistente AI';


--
-- Name: fonti; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fonti (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    url text,
    nome text NOT NULL,
    tipo text DEFAULT 'sito'::text NOT NULL,
    frequenza_ore integer DEFAULT 24 NOT NULL,
    ultimo_fetch timestamp with time zone,
    ultimo_esito text,
    attiva boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fonti_frequenza_ore_check CHECK (((frequenza_ore >= 1) AND (frequenza_ore <= 8760))),
    CONSTRAINT fonti_nome_check CHECK ((length(TRIM(BOTH FROM nome)) > 0)),
    CONSTRAINT fonti_tipo_check CHECK ((tipo = ANY (ARRAY['sito'::text, 'pdf'::text, 'manuale'::text]))),
    CONSTRAINT fonti_url_check CHECK ((url ~ '^https?://'::text)),
    CONSTRAINT fonti_url_obbligatorio CHECK (((tipo = 'manuale'::text) OR (url IS NOT NULL)))
);


ALTER TABLE public.fonti OWNER TO postgres;

--
-- Name: TABLE fonti; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.fonti IS 'Fonti della base di conoscenza dell''assistente (siti, pdf, testi manuali). Solo admin.';


--
-- Name: COLUMN fonti.frequenza_ore; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fonti.frequenza_ore IS 'Ogni quante ore lo script di ingestione riscarica la fonte';


--
-- Name: COLUMN fonti.ultimo_esito; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.fonti.ultimo_esito IS 'Esito dell''ultima ingestione (ok / messaggio di errore), scritto dallo script';


--
-- Name: formazioni_partita; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.formazioni_partita (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partita_id uuid NOT NULL,
    squadra text NOT NULL,
    giocatrice_id uuid,
    numero_maglia integer,
    nome text NOT NULL,
    ruolo public.ruolo_giocatrice,
    capitana boolean DEFAULT false NOT NULL,
    zona integer,
    ordine integer DEFAULT 0 NOT NULL,
    creato_il timestamp with time zone DEFAULT now() NOT NULL,
    libero boolean DEFAULT false NOT NULL,
    CONSTRAINT formazioni_partita_numero_maglia_check CHECK (((numero_maglia >= 0) AND (numero_maglia <= 99))),
    CONSTRAINT formazioni_partita_squadra_check CHECK ((squadra = ANY (ARRAY['nostra'::text, 'avversaria'::text]))),
    CONSTRAINT formazioni_partita_zona_check CHECK (((zona >= 1) AND (zona <= 6)))
);


ALTER TABLE public.formazioni_partita OWNER TO postgres;

--
-- Name: foto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.foto (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    album_id uuid NOT NULL,
    url_immagine text NOT NULL,
    ordine integer DEFAULT 0
);


ALTER TABLE public.foto OWNER TO postgres;

--
-- Name: gare_campionato_backup; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gare_campionato_backup (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campionato_id uuid NOT NULL,
    stagione_id uuid,
    girone text NOT NULL,
    numero_gara integer NOT NULL,
    giornata integer NOT NULL,
    fase text NOT NULL,
    data_partita timestamp with time zone NOT NULL,
    squadra_casa_id uuid NOT NULL,
    squadra_ospite_id uuid NOT NULL,
    partita_id uuid,
    stato public.stato_partita DEFAULT 'programmata'::public.stato_partita NOT NULL,
    set_casa integer,
    set_ospite integer,
    parziali jsonb,
    url_a3live text,
    fonte text DEFAULT 'federvolley.it'::text,
    creato_il timestamp with time zone DEFAULT now() NOT NULL,
    aggiornato_il timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gare_campionato_check CHECK ((squadra_casa_id <> squadra_ospite_id)),
    CONSTRAINT gare_campionato_fase_check CHECK ((fase = ANY (ARRAY['andata'::text, 'ritorno'::text]))),
    CONSTRAINT gare_campionato_giornata_check CHECK (((giornata >= 1) AND (giornata <= 30))),
    CONSTRAINT gare_campionato_set_casa_check CHECK (((set_casa >= 0) AND (set_casa <= 3))),
    CONSTRAINT gare_campionato_set_ospite_check CHECK (((set_ospite >= 0) AND (set_ospite <= 3)))
);


ALTER TABLE public.gare_campionato_backup OWNER TO postgres;

--
-- Name: TABLE gare_campionato_backup; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.gare_campionato_backup IS 'Backup del calendario del girone importato in partite (migrazione 20261018000100): da eliminare';


--
-- Name: COLUMN gare_campionato_backup.parziali; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gare_campionato_backup.parziali IS 'Parziali dal punto di vista della squadra di casa: [{"set":1,"casa":25,"ospite":19}, ...]';


--
-- Name: giocatrici; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.giocatrici (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stagione_id uuid NOT NULL,
    livello_squadra public.livello_squadra DEFAULT 'prima_squadra'::public.livello_squadra NOT NULL,
    categoria_giovanile_id uuid,
    nome text NOT NULL,
    cognome text NOT NULL,
    numero_maglia integer,
    ruolo public.ruolo_giocatrice,
    foto_url text,
    bio text,
    attiva boolean DEFAULT true NOT NULL,
    ordine integer DEFAULT 0,
    data_nascita date,
    altezza_cm smallint,
    punti integer,
    ace integer,
    muri integer,
    capitana boolean DEFAULT false NOT NULL,
    squadra_id uuid NOT NULL,
    anno_nascita smallint,
    consenso_foto boolean DEFAULT false NOT NULL,
    consenso_foto_data date,
    consenso_foto_note text,
    CONSTRAINT giocatrici_ace_check CHECK ((ace >= 0)),
    CONSTRAINT giocatrici_altezza_cm_check CHECK (((altezza_cm >= 100) AND (altezza_cm <= 230))),
    CONSTRAINT giocatrici_anno_nascita_check CHECK (((anno_nascita >= 1950) AND (anno_nascita <= 2020))),
    CONSTRAINT giocatrici_consenso_foto_con_data CHECK (((NOT consenso_foto) OR (consenso_foto_data IS NOT NULL))),
    CONSTRAINT giocatrici_foto_bio_solo_con_consenso CHECK ((consenso_foto OR ((foto_url IS NULL) AND (bio IS NULL)))),
    CONSTRAINT giocatrici_muri_check CHECK ((muri >= 0)),
    CONSTRAINT giocatrici_punti_check CHECK ((punti >= 0))
);


ALTER TABLE public.giocatrici OWNER TO postgres;

--
-- Name: COLUMN giocatrici.consenso_foto; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.giocatrici.consenso_foto IS 'Liberatoria per foto e bio (dei genitori per le minorenni). Senza consenso foto_url e bio devono essere vuote (vincolo giocatrici_foto_bio_solo_con_consenso): per revocarla svuotare prima foto e bio.';


--
-- Name: log_agente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.log_agente (
    id bigint NOT NULL,
    creato_il timestamp with time zone DEFAULT now() NOT NULL,
    agente text NOT NULL,
    livello text DEFAULT 'info'::text NOT NULL,
    evento text NOT NULL,
    partita_id uuid,
    numero_gara integer,
    messaggio text NOT NULL,
    dettagli jsonb,
    CONSTRAINT log_agente_livello_check CHECK ((livello = ANY (ARRAY['info'::text, 'avviso'::text, 'errore'::text])))
);


ALTER TABLE public.log_agente OWNER TO postgres;

--
-- Name: TABLE log_agente; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.log_agente IS 'Eventi dell''agente livescore a3live (mac, zima): avvio, finestra aperta/chiusa, aggiornamenti scritti, battito, feed fermo, errori. Pulizia automatica dopo 60 giorni.';


--
-- Name: COLUMN log_agente.evento; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.log_agente.evento IS 'avvio, stop, attesa, finestra_aperta, finestra_chiusa, aggiornamento, correzione, battito, feed_fermo, feed_ripartito, feed_mancante, errore';


--
-- Name: log_agente_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.log_agente ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.log_agente_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: media; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo public.tipo_media NOT NULL,
    titolo text NOT NULL,
    riferimento_esterno text NOT NULL,
    url_immagine_copertina text,
    etichetta text,
    pubblicato_il timestamp with time zone DEFAULT now() NOT NULL,
    pubblicato boolean DEFAULT true NOT NULL
);


ALTER TABLE public.media OWNER TO postgres;

--
-- Name: notifiche_inviate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifiche_inviate (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo text NOT NULL,
    riferimento_id uuid,
    chiave text NOT NULL,
    destinatari integer,
    inviata_il timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifiche_inviate_tipo_check CHECK ((tipo = ANY (ARRAY['game_day'::text, 'prepartita'::text, 'inizio'::text, 'mvp'::text, 'fine_set'::text, 'notizia'::text, 'video'::text, 'podcast'::text])))
);


ALTER TABLE public.notifiche_inviate OWNER TO postgres;

--
-- Name: notizie; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notizie (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titolo text NOT NULL,
    categoria public.categoria_notizia DEFAULT 'societa'::public.categoria_notizia NOT NULL,
    corpo text,
    url_immagine_copertina text,
    autore text,
    pubblicato_il timestamp with time zone DEFAULT now() NOT NULL,
    pubblicata boolean DEFAULT true NOT NULL,
    fonte text,
    CONSTRAINT notizie_fonte_check CHECK ((fonte = ANY (ARRAY['instagram'::text, 'sito_web'::text, 'app'::text])))
);


ALTER TABLE public.notizie OWNER TO postgres;

--
-- Name: COLUMN notizie.fonte; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notizie.fonte IS 'Da dove viene la notizia: instagram, sito_web o app (null = nessuna etichetta)';


--
-- Name: partite; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partite (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stagione_id uuid NOT NULL,
    livello_squadra public.livello_squadra DEFAULT 'prima_squadra'::public.livello_squadra NOT NULL,
    categoria_giovanile_id uuid,
    avversario text,
    casa_trasferta public.casa_trasferta,
    sede text,
    data_partita timestamp with time zone NOT NULL,
    girone text,
    stato public.stato_partita DEFAULT 'programmata'::public.stato_partita NOT NULL,
    nostri_set_vinti integer,
    set_vinti_avversario integer,
    id_video_youtube_live text,
    creato_il timestamp with time zone DEFAULT now() NOT NULL,
    aggiornato_il timestamp with time zone DEFAULT now() NOT NULL,
    logo_avversario_url text,
    logo_smapiuarenavolley_url text,
    giornata integer,
    fase text,
    opponent_logo_url text,
    campionato_id uuid,
    squadra_avversaria_id uuid,
    url_a3live text,
    parziali jsonb,
    stato_a3live text,
    letto_a3live_il timestamp with time zone,
    numero_gara integer,
    squadra_casa_id uuid,
    squadra_ospite_id uuid,
    set_casa integer,
    set_ospite integer,
    rinuncia text,
    nostra_partita boolean DEFAULT true NOT NULL,
    CONSTRAINT partite_fase_check CHECK ((fase = ANY (ARRAY['andata'::text, 'ritorno'::text]))),
    CONSTRAINT partite_nostra_o_neutra CHECK (((nostra_partita AND (avversario IS NOT NULL) AND (casa_trasferta IS NOT NULL)) OR ((NOT nostra_partita) AND (squadra_casa_id IS NOT NULL) AND (squadra_ospite_id IS NOT NULL)))),
    CONSTRAINT partite_rinuncia_check CHECK ((rinuncia = ANY (ARRAY['casa'::text, 'ospite'::text]))),
    CONSTRAINT partite_set_casa_check CHECK (((set_casa >= 0) AND (set_casa <= 3))),
    CONSTRAINT partite_set_ospite_check CHECK (((set_ospite >= 0) AND (set_ospite <= 3))),
    CONSTRAINT partite_squadre_diverse CHECK (((squadra_casa_id IS DISTINCT FROM squadra_ospite_id) OR (squadra_casa_id IS NULL)))
);


ALTER TABLE public.partite OWNER TO postgres;

--
-- Name: COLUMN partite.url_a3live; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.partite.url_a3live IS 'Pagina della gara su a3live.federvolley.it (es. https://a3live.federvolley.it/gara/100006); letta dall''agente risultati';


--
-- Name: COLUMN partite.parziali; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.partite.parziali IS 'Parziali dal punto di vista della squadra di casa: [{"set":1,"casa":25,"ospite":19}, ...]';


--
-- Name: COLUMN partite.stato_a3live; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.partite.stato_a3live IS 'Ultimo status letto sulla pagina a3live (upcoming / live / finished)';


--
-- Name: COLUMN partite.letto_a3live_il; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.partite.letto_a3live_il IS 'Ultima lettura riuscita della pagina a3live';


--
-- Name: COLUMN partite.rinuncia; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.partite.rinuncia IS 'Squadra rinunciataria: gara persa 0-3 (parziali 0-25) con penalizzazione in classifica';


--
-- Name: COLUMN partite.nostra_partita; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.partite.nostra_partita IS 'false = gara del girone tra due avversarie (solo calendario e classifica)';


--
-- Name: penalita_squadra; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.penalita_squadra (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stagione_id uuid NOT NULL,
    girone text NOT NULL,
    squadra_id uuid NOT NULL,
    punti integer NOT NULL,
    motivo text,
    data date DEFAULT CURRENT_DATE NOT NULL,
    creato_il timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT penalita_squadra_punti_check CHECK ((punti > 0))
);


ALTER TABLE public.penalita_squadra OWNER TO postgres;

--
-- Name: TABLE penalita_squadra; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.penalita_squadra IS 'Penalizzazioni federali in punti (oltre a quelle per rinuncia, calcolate dalle partite)';


--
-- Name: profili; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profili (
    id uuid NOT NULL,
    nome_completo text,
    ruolo public.ruolo_utente DEFAULT 'pubblico'::public.ruolo_utente NOT NULL,
    categoria_giovanile_id uuid,
    creato_il timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.profili OWNER TO postgres;

--
-- Name: promo_sponsor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promo_sponsor (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sponsor_id uuid NOT NULL,
    titolo text NOT NULL,
    url_immagine text,
    url_video text,
    attiva boolean DEFAULT true NOT NULL,
    attiva_dal date,
    attiva_al date
);


ALTER TABLE public.promo_sponsor OWNER TO postgres;

--
-- Name: pubblicita; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pubblicita (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titolo text NOT NULL,
    sottotitolo text,
    testo text,
    url_immagine text,
    url_link text,
    etichetta_link text,
    ordine integer DEFAULT 0 NOT NULL,
    attiva boolean DEFAULT true NOT NULL,
    creato_il timestamp with time zone DEFAULT now() NOT NULL,
    frequenza_minuti integer DEFAULT 30 NOT NULL,
    CONSTRAINT pubblicita_frequenza_minuti_check CHECK ((frequenza_minuti > 0))
);


ALTER TABLE public.pubblicita OWNER TO postgres;

--
-- Name: punti_giocatrici_partita; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.punti_giocatrici_partita WITH (security_invoker='true') AS
 SELECT partita_id,
    giocatrice_id,
    max(nome_giocatrice) AS nome_giocatrice,
    count(*) AS punti,
    count(*) FILTER (WHERE (azione = 'ace'::text)) AS ace,
    count(*) FILTER (WHERE (azione = 'muro'::text)) AS muri,
    count(*) FILTER (WHERE ((fase = 'attacco'::text) AND (azione <> 'ace'::text))) AS attacchi
   FROM public.azioni_punto
  WHERE ((squadra = 'nostra'::text) AND (giocatrice_id IS NOT NULL))
  GROUP BY partita_id, giocatrice_id;


ALTER VIEW public.punti_giocatrici_partita OWNER TO postgres;

--
-- Name: push_token; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.push_token (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    utente_id uuid,
    categoria_giovanile_id uuid,
    piattaforma text,
    attivo boolean DEFAULT true NOT NULL,
    creato_il timestamp with time zone DEFAULT now() NOT NULL,
    aggiornato_il timestamp with time zone DEFAULT now() NOT NULL,
    notifiche_attive boolean DEFAULT true NOT NULL,
    inizio_partita boolean DEFAULT true NOT NULL,
    fine_set boolean DEFAULT true NOT NULL,
    risultato_finale boolean DEFAULT true NOT NULL,
    contenuti boolean DEFAULT true NOT NULL,
    game_day boolean DEFAULT true NOT NULL,
    voto_mvp boolean DEFAULT true NOT NULL
);


ALTER TABLE public.push_token OWNER TO postgres;

--
-- Name: COLUMN push_token.notifiche_attive; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.push_token.notifiche_attive IS 'Interruttore generale di Impostazioni: false = nessuna notifica';


--
-- Name: COLUMN push_token.inizio_partita; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.push_token.inizio_partita IS 'Promemoria pre-partita e inizio partita';


--
-- Name: COLUMN push_token.fine_set; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.push_token.fine_set IS 'Fine di ogni set (tranne quello decisivo)';


--
-- Name: COLUMN push_token.risultato_finale; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.push_token.risultato_finale IS 'Set decisivo con il risultato finale';


--
-- Name: COLUMN push_token.contenuti; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.push_token.contenuti IS 'Nuove news, video e podcast';


--
-- Name: COLUMN push_token.game_day; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.push_token.game_day IS 'Game day: 4 ore prima delle partite della prima squadra';


--
-- Name: COLUMN push_token.voto_mvp; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.push_token.voto_mvp IS 'Apertura del voto MVP (inizio del 3° set, partite in casa)';


--
-- Name: regole_classifica; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.regole_classifica (
    stagione_id uuid NOT NULL,
    punti_vittoria integer DEFAULT 3 NOT NULL,
    punti_vittoria_tiebreak integer DEFAULT 2 NOT NULL,
    punti_sconfitta_tiebreak integer DEFAULT 1 NOT NULL,
    penalita_rinuncia integer DEFAULT 1 NOT NULL,
    criteri_parita text[] DEFAULT ARRAY['vinte'::text, 'quoziente_set'::text, 'quoziente_punti'::text, 'scontro_diretto'::text] NOT NULL,
    aggiornato_il timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT regole_classifica_criteri_check CHECK ((criteri_parita <@ ARRAY['vinte'::text, 'quoziente_set'::text, 'quoziente_punti'::text, 'scontro_diretto'::text])),
    CONSTRAINT regole_classifica_penalita_rinuncia_check CHECK ((penalita_rinuncia >= 0))
);


ALTER TABLE public.regole_classifica OWNER TO postgres;

--
-- Name: TABLE regole_classifica; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.regole_classifica IS 'Regole della classifica per stagione; senza riga valgono i valori di default (FIPAV)';


--
-- Name: COLUMN regole_classifica.penalita_rinuncia; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.regole_classifica.penalita_rinuncia IS 'Punti tolti alla squadra rinunciataria per ogni rinuncia';


--
-- Name: COLUMN regole_classifica.criteri_parita; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.regole_classifica.criteri_parita IS 'Ordine dei criteri a parità di punti: vinte, quoziente_set, quoziente_punti, scontro_diretto';


--
-- Name: set_partita; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.set_partita (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partita_id uuid NOT NULL,
    numero_set integer NOT NULL,
    punti_nostri integer DEFAULT 0 NOT NULL,
    punti_avversario integer DEFAULT 0 NOT NULL,
    completato boolean DEFAULT false NOT NULL,
    primo_servizio text,
    CONSTRAINT set_partita_primo_servizio_check CHECK ((primo_servizio = ANY (ARRAY['nostra'::text, 'avversaria'::text])))
);


ALTER TABLE public.set_partita OWNER TO postgres;

--
-- Name: COLUMN set_partita.primo_servizio; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.set_partita.primo_servizio IS 'Squadra al servizio sullo 0-0 del set (nostra/avversaria); null = regola predefinita';


--
-- Name: sponsor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sponsor (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    url_logo text,
    url_sito text,
    livello public.livello_sponsor DEFAULT 'bronze'::public.livello_sponsor NOT NULL,
    attivo boolean DEFAULT true NOT NULL,
    ordine integer DEFAULT 0
);


ALTER TABLE public.sponsor OWNER TO postgres;

--
-- Name: squadre; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.squadre (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    citta text,
    provincia text,
    nostra_squadra boolean DEFAULT false NOT NULL,
    allenatore text,
    logo_url text,
    campionato_id uuid,
    girone text,
    creato_il timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.squadre OWNER TO postgres;

--
-- Name: staff; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    cognome text NOT NULL,
    ruolo public.ruolo_staff NOT NULL,
    categoria_giovanile_id uuid,
    foto_url text,
    bio text,
    attivo boolean DEFAULT true NOT NULL,
    ordine integer DEFAULT 0,
    qualifica text
);


ALTER TABLE public.staff OWNER TO postgres;

--
-- Name: stagioni; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stagioni (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    etichetta text NOT NULL,
    corrente boolean DEFAULT false NOT NULL
);


ALTER TABLE public.stagioni OWNER TO postgres;

--
-- Name: stato_agenti; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.stato_agenti WITH (security_invoker='on') AS
 SELECT DISTINCT ON (agente) agente,
    creato_il AS ultimo_segnale,
    evento AS ultimo_evento,
    livello AS ultimo_livello,
    messaggio AS ultimo_messaggio
   FROM public.log_agente
  ORDER BY agente, creato_il DESC;


ALTER VIEW public.stato_agenti OWNER TO postgres;

--
-- Name: tabellini; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tabellini (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partita_id uuid NOT NULL,
    numero_set smallint,
    percorso_immagine text NOT NULL,
    stato text DEFAULT 'in_attesa'::text NOT NULL,
    json_letto jsonb,
    errore text,
    note text,
    caricato_da uuid DEFAULT auth.uid(),
    creato_il timestamp with time zone DEFAULT now() NOT NULL,
    confermato_il timestamp with time zone,
    CONSTRAINT tabellini_numero_set_check CHECK (((numero_set >= 1) AND (numero_set <= 5))),
    CONSTRAINT tabellini_stato_check CHECK ((stato = ANY (ARRAY['in_attesa'::text, 'letto'::text, 'confermato'::text, 'errore'::text])))
);


ALTER TABLE public.tabellini OWNER TO postgres;

--
-- Name: uso_assistente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.uso_assistente (
    utente_id uuid NOT NULL,
    giorno date DEFAULT ((now() AT TIME ZONE 'Europe/Rome'::text))::date NOT NULL,
    domande integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.uso_assistente OWNER TO postgres;

--
-- Name: TABLE uso_assistente; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.uso_assistente IS 'Domande fatte all''assistente AI per utente e giorno (ora italiana): base del limite giornaliero. Nessun testo salvato.';


--
-- Name: voti_mvp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.voti_mvp (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partita_id uuid NOT NULL,
    utente_id uuid DEFAULT auth.uid() NOT NULL,
    giocatrice_id uuid NOT NULL,
    creato_il timestamp with time zone DEFAULT now() NOT NULL,
    aggiornato_il timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.voti_mvp OWNER TO postgres;

--
-- Name: account_eliminati account_eliminati_codice_conferma_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_eliminati
    ADD CONSTRAINT account_eliminati_codice_conferma_key UNIQUE (codice_conferma);


--
-- Name: account_eliminati account_eliminati_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_eliminati
    ADD CONSTRAINT account_eliminati_pkey PRIMARY KEY (id);


--
-- Name: album_foto album_foto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.album_foto
    ADD CONSTRAINT album_foto_pkey PRIMARY KEY (id);


--
-- Name: azioni_punto azioni_punto_evento_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.azioni_punto
    ADD CONSTRAINT azioni_punto_evento_id_key UNIQUE (evento_id);


--
-- Name: azioni_punto azioni_punto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.azioni_punto
    ADD CONSTRAINT azioni_punto_pkey PRIMARY KEY (id);


--
-- Name: campionati campionati_nome_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campionati
    ADD CONSTRAINT campionati_nome_key UNIQUE (nome);


--
-- Name: campionati campionati_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campionati
    ADD CONSTRAINT campionati_pkey PRIMARY KEY (id);


--
-- Name: categorie_giovanili categorie_giovanili_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorie_giovanili
    ADD CONSTRAINT categorie_giovanili_pkey PRIMARY KEY (id);


--
-- Name: classifiche classifiche_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classifiche
    ADD CONSTRAINT classifiche_pkey PRIMARY KEY (id);


--
-- Name: classifiche classifiche_stagione_girone_squadra_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classifiche
    ADD CONSTRAINT classifiche_stagione_girone_squadra_key UNIQUE (stagione_id, girone, squadra_id);


--
-- Name: classifiche classifiche_stagione_id_girone_nome_squadra_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classifiche
    ADD CONSTRAINT classifiche_stagione_id_girone_nome_squadra_key UNIQUE (stagione_id, girone, nome_squadra);


--
-- Name: conoscenza conoscenza_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conoscenza
    ADD CONSTRAINT conoscenza_pkey PRIMARY KEY (id);


--
-- Name: consensi_utente consensi_utente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consensi_utente
    ADD CONSTRAINT consensi_utente_pkey PRIMARY KEY (id);


--
-- Name: convenzioni convenzioni_nome_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.convenzioni
    ADD CONSTRAINT convenzioni_nome_key UNIQUE (nome);


--
-- Name: convenzioni convenzioni_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.convenzioni
    ADD CONSTRAINT convenzioni_pkey PRIMARY KEY (id);


--
-- Name: demo_diretta demo_diretta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demo_diretta
    ADD CONSTRAINT demo_diretta_pkey PRIMARY KEY (chiave);


--
-- Name: dispositivi_push dispositivi_push_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dispositivi_push
    ADD CONSTRAINT dispositivi_push_pkey PRIMARY KEY (id);


--
-- Name: dispositivi_push dispositivi_push_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dispositivi_push
    ADD CONSTRAINT dispositivi_push_token_key UNIQUE (token);


--
-- Name: eventi_live eventi_live_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eventi_live
    ADD CONSTRAINT eventi_live_pkey PRIMARY KEY (id);


--
-- Name: faq faq_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faq
    ADD CONSTRAINT faq_pkey PRIMARY KEY (id);


--
-- Name: fonti fonti_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fonti
    ADD CONSTRAINT fonti_pkey PRIMARY KEY (id);


--
-- Name: fonti fonti_url_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fonti
    ADD CONSTRAINT fonti_url_key UNIQUE (url);


--
-- Name: formazioni_partita formazioni_partita_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formazioni_partita
    ADD CONSTRAINT formazioni_partita_pkey PRIMARY KEY (id);


--
-- Name: foto foto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.foto
    ADD CONSTRAINT foto_pkey PRIMARY KEY (id);


--
-- Name: gare_campionato_backup gare_campionato_campionato_id_numero_gara_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gare_campionato_backup
    ADD CONSTRAINT gare_campionato_campionato_id_numero_gara_key UNIQUE (campionato_id, numero_gara);


--
-- Name: gare_campionato_backup gare_campionato_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gare_campionato_backup
    ADD CONSTRAINT gare_campionato_pkey PRIMARY KEY (id);


--
-- Name: giocatrici giocatrici_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.giocatrici
    ADD CONSTRAINT giocatrici_pkey PRIMARY KEY (id);


--
-- Name: log_agente log_agente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_agente
    ADD CONSTRAINT log_agente_pkey PRIMARY KEY (id);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: notifiche_inviate notifiche_inviate_chiave_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifiche_inviate
    ADD CONSTRAINT notifiche_inviate_chiave_key UNIQUE (chiave);


--
-- Name: notifiche_inviate notifiche_inviate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifiche_inviate
    ADD CONSTRAINT notifiche_inviate_pkey PRIMARY KEY (id);


--
-- Name: notizie notizie_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notizie
    ADD CONSTRAINT notizie_pkey PRIMARY KEY (id);


--
-- Name: partite partite_campionato_numero_gara_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partite
    ADD CONSTRAINT partite_campionato_numero_gara_key UNIQUE (campionato_id, numero_gara);


--
-- Name: partite partite_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partite
    ADD CONSTRAINT partite_pkey PRIMARY KEY (id);


--
-- Name: penalita_squadra penalita_squadra_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penalita_squadra
    ADD CONSTRAINT penalita_squadra_pkey PRIMARY KEY (id);


--
-- Name: profili profili_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profili
    ADD CONSTRAINT profili_pkey PRIMARY KEY (id);


--
-- Name: promo_sponsor promo_sponsor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_sponsor
    ADD CONSTRAINT promo_sponsor_pkey PRIMARY KEY (id);


--
-- Name: pubblicita pubblicita_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pubblicita
    ADD CONSTRAINT pubblicita_pkey PRIMARY KEY (id);


--
-- Name: pubblicita pubblicita_titolo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pubblicita
    ADD CONSTRAINT pubblicita_titolo_key UNIQUE (titolo);


--
-- Name: push_token push_token_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_token
    ADD CONSTRAINT push_token_pkey PRIMARY KEY (id);


--
-- Name: push_token push_token_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_token
    ADD CONSTRAINT push_token_token_key UNIQUE (token);


--
-- Name: regole_classifica regole_classifica_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regole_classifica
    ADD CONSTRAINT regole_classifica_pkey PRIMARY KEY (stagione_id);


--
-- Name: set_partita set_partita_partita_id_numero_set_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.set_partita
    ADD CONSTRAINT set_partita_partita_id_numero_set_key UNIQUE (partita_id, numero_set);


--
-- Name: set_partita set_partita_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.set_partita
    ADD CONSTRAINT set_partita_pkey PRIMARY KEY (id);


--
-- Name: sponsor sponsor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sponsor
    ADD CONSTRAINT sponsor_pkey PRIMARY KEY (id);


--
-- Name: squadre squadre_nome_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.squadre
    ADD CONSTRAINT squadre_nome_key UNIQUE (nome);


--
-- Name: squadre squadre_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.squadre
    ADD CONSTRAINT squadre_pkey PRIMARY KEY (id);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: stagioni stagioni_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stagioni
    ADD CONSTRAINT stagioni_pkey PRIMARY KEY (id);


--
-- Name: statistiche_attacco statistiche_attacco_partita_id_squadra_numero_set_numero_ma_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statistiche_attacco
    ADD CONSTRAINT statistiche_attacco_partita_id_squadra_numero_set_numero_ma_key UNIQUE (partita_id, squadra, numero_set, numero_maglia);


--
-- Name: statistiche_attacco statistiche_attacco_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statistiche_attacco
    ADD CONSTRAINT statistiche_attacco_pkey PRIMARY KEY (id);


--
-- Name: tabellini tabellini_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tabellini
    ADD CONSTRAINT tabellini_pkey PRIMARY KEY (id);


--
-- Name: uso_assistente uso_assistente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uso_assistente
    ADD CONSTRAINT uso_assistente_pkey PRIMARY KEY (utente_id, giorno);


--
-- Name: voti_mvp voti_mvp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voti_mvp
    ADD CONSTRAINT voti_mvp_pkey PRIMARY KEY (id);


--
-- Name: voti_mvp voti_mvp_un_voto; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voti_mvp
    ADD CONSTRAINT voti_mvp_un_voto UNIQUE (partita_id, utente_id);


--
-- Name: azioni_punto_giocatrice_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX azioni_punto_giocatrice_idx ON public.azioni_punto USING btree (giocatrice_id);


--
-- Name: azioni_punto_partita_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX azioni_punto_partita_idx ON public.azioni_punto USING btree (partita_id);


--
-- Name: conoscenza_fonte_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conoscenza_fonte_idx ON public.conoscenza USING btree (fonte_id, posizione);


--
-- Name: conoscenza_ricerca_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conoscenza_ricerca_idx ON public.conoscenza USING gin (ricerca);


--
-- Name: consensi_utente_utente_tipo_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consensi_utente_utente_tipo_idx ON public.consensi_utente USING btree (utente_id, tipo, creato_il DESC);


--
-- Name: dispositivi_push_attive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX dispositivi_push_attive_idx ON public.dispositivi_push USING btree (attive);


--
-- Name: dispositivi_push_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX dispositivi_push_user_id_idx ON public.dispositivi_push USING btree (user_id);


--
-- Name: faq_ordine_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX faq_ordine_idx ON public.faq USING btree (ordine);


--
-- Name: faq_ricerca_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX faq_ricerca_idx ON public.faq USING gin (ricerca);


--
-- Name: formazioni_partita_giocatrice_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX formazioni_partita_giocatrice_key ON public.formazioni_partita USING btree (partita_id, giocatrice_id) WHERE (giocatrice_id IS NOT NULL);


--
-- Name: formazioni_partita_libero_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX formazioni_partita_libero_key ON public.formazioni_partita USING btree (partita_id, squadra) WHERE libero;


--
-- Name: formazioni_partita_partita_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX formazioni_partita_partita_idx ON public.formazioni_partita USING btree (partita_id);


--
-- Name: formazioni_partita_zona_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX formazioni_partita_zona_key ON public.formazioni_partita USING btree (partita_id, squadra, zona) WHERE (zona IS NOT NULL);


--
-- Name: gare_campionato_casa_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX gare_campionato_casa_idx ON public.gare_campionato_backup USING btree (squadra_casa_id);


--
-- Name: gare_campionato_giornata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX gare_campionato_giornata_idx ON public.gare_campionato_backup USING btree (campionato_id, girone, giornata);


--
-- Name: gare_campionato_ospite_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX gare_campionato_ospite_idx ON public.gare_campionato_backup USING btree (squadra_ospite_id);


--
-- Name: gare_campionato_partita_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX gare_campionato_partita_idx ON public.gare_campionato_backup USING btree (partita_id);


--
-- Name: gare_campionato_stagione_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX gare_campionato_stagione_idx ON public.gare_campionato_backup USING btree (stagione_id);


--
-- Name: giocatrici_una_capitana; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX giocatrici_una_capitana ON public.giocatrici USING btree (stagione_id, livello_squadra, categoria_giovanile_id) NULLS NOT DISTINCT WHERE capitana;


--
-- Name: idx_eventi_live_partita; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_eventi_live_partita ON public.eventi_live USING btree (partita_id, creato_il DESC);


--
-- Name: idx_giocatrici_categoria; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_giocatrici_categoria ON public.giocatrici USING btree (categoria_giovanile_id);


--
-- Name: idx_giocatrici_livello; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_giocatrici_livello ON public.giocatrici USING btree (livello_squadra);


--
-- Name: idx_giocatrici_squadra; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_giocatrici_squadra ON public.giocatrici USING btree (squadra_id);


--
-- Name: idx_notizie_pubblicate; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notizie_pubblicate ON public.notizie USING btree (pubblicata, pubblicato_il DESC);


--
-- Name: idx_partite_data; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_partite_data ON public.partite USING btree (data_partita);


--
-- Name: idx_partite_stato; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_partite_stato ON public.partite USING btree (stato);


--
-- Name: idx_staff_categoria; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staff_categoria ON public.staff USING btree (categoria_giovanile_id);


--
-- Name: log_agente_creato_il_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX log_agente_creato_il_idx ON public.log_agente USING btree (creato_il DESC);


--
-- Name: log_agente_finestra_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX log_agente_finestra_idx ON public.log_agente USING btree (agente, creato_il DESC) WHERE (evento = ANY (ARRAY['avvio'::text, 'finestra_aperta'::text, 'finestra_chiusa'::text, 'stop'::text]));


--
-- Name: log_agente_partita_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX log_agente_partita_idx ON public.log_agente USING btree (partita_id, creato_il DESC) WHERE (partita_id IS NOT NULL);


--
-- Name: log_agente_punteggi_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX log_agente_punteggi_idx ON public.log_agente USING btree (numero_gara, creato_il DESC) WHERE (evento = ANY (ARRAY['aggiornamento'::text, 'correzione'::text]));


--
-- Name: partite_girone_giornata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX partite_girone_giornata_idx ON public.partite USING btree (stagione_id, girone, giornata);


--
-- Name: penalita_squadra_stagione_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX penalita_squadra_stagione_idx ON public.penalita_squadra USING btree (stagione_id, girone);


--
-- Name: push_token_categoria_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX push_token_categoria_idx ON public.push_token USING btree (categoria_giovanile_id) WHERE attivo;


--
-- Name: squadre_una_sola_nostra; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX squadre_una_sola_nostra ON public.squadre USING btree (nostra_squadra) WHERE nostra_squadra;


--
-- Name: statistiche_attacco_giocatrice_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX statistiche_attacco_giocatrice_idx ON public.statistiche_attacco USING btree (giocatrice_id);


--
-- Name: tabellini_partita_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tabellini_partita_idx ON public.tabellini USING btree (partita_id, creato_il DESC);


--
-- Name: voti_mvp_giocatrice_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX voti_mvp_giocatrice_idx ON public.voti_mvp USING btree (giocatrice_id);


--
-- Name: voti_mvp_partita_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX voti_mvp_partita_idx ON public.voti_mvp USING btree (partita_id);


--
-- Name: voti_mvp_utente_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX voti_mvp_utente_idx ON public.voti_mvp USING btree (utente_id);


--
-- Name: azioni_punto trg_azioni_punto_statistiche; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_azioni_punto_statistiche AFTER INSERT OR DELETE OR UPDATE ON public.azioni_punto FOR EACH ROW EXECUTE FUNCTION public.azioni_punto_statistiche();


--
-- Name: conoscenza trg_conoscenza_aggiornato_il; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_conoscenza_aggiornato_il BEFORE UPDATE ON public.conoscenza FOR EACH ROW EXECUTE FUNCTION public.imposta_aggiornato_il();


--
-- Name: consensi_utente trg_consensi_append_only; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_consensi_append_only BEFORE UPDATE ON public.consensi_utente FOR EACH ROW EXECUTE FUNCTION public.blocca_modifica_consensi();


--
-- Name: faq trg_faq_aggiornato_il; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_faq_aggiornato_il BEFORE UPDATE ON public.faq FOR EACH ROW EXECUTE FUNCTION public.imposta_aggiornato_il();


--
-- Name: giocatrici trg_giocatrici_anno_nascita; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_giocatrici_anno_nascita BEFORE INSERT OR UPDATE OF data_nascita, anno_nascita ON public.giocatrici FOR EACH ROW EXECUTE FUNCTION public.giocatrici_anno_nascita();


--
-- Name: giocatrici trg_giocatrici_squadra_predefinita; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_giocatrici_squadra_predefinita BEFORE INSERT ON public.giocatrici FOR EACH ROW EXECUTE FUNCTION public.giocatrici_squadra_predefinita();


--
-- Name: media trg_media_notifica_ins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_media_notifica_ins AFTER INSERT ON public.media FOR EACH ROW WHEN (new.pubblicato) EXECUTE FUNCTION public.trg_notifica_push('media');


--
-- Name: media trg_media_notifica_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_media_notifica_upd AFTER UPDATE OF pubblicato ON public.media FOR EACH ROW WHEN ((new.pubblicato AND (NOT old.pubblicato))) EXECUTE FUNCTION public.trg_notifica_push('media');


--
-- Name: notizie trg_notizie_notifica_ins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_notizie_notifica_ins AFTER INSERT ON public.notizie FOR EACH ROW WHEN (new.pubblicata) EXECUTE FUNCTION public.trg_notifica_push('notizia');


--
-- Name: notizie trg_notizie_notifica_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_notizie_notifica_upd AFTER UPDATE OF pubblicata ON public.notizie FOR EACH ROW WHEN ((new.pubblicata AND (NOT old.pubblicata))) EXECUTE FUNCTION public.trg_notifica_push('notizia');


--
-- Name: partite trg_partite_allinea_casa_ospite; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_partite_allinea_casa_ospite BEFORE INSERT OR UPDATE ON public.partite FOR EACH ROW EXECUTE FUNCTION public.allinea_casa_ospite();


--
-- Name: partite trg_partite_classifica; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_partite_classifica AFTER INSERT OR DELETE OR UPDATE OF stato, set_casa, set_ospite, parziali, rinuncia, squadra_casa_id, squadra_ospite_id, stagione_id, girone ON public.partite FOR EACH ROW EXECUTE FUNCTION public.trg_ricalcola_classifica();


--
-- Name: partite trg_partite_notifica_inizio_ins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_partite_notifica_inizio_ins AFTER INSERT ON public.partite FOR EACH ROW WHEN ((new.nostra_partita AND (new.stato = 'live'::public.stato_partita))) EXECUTE FUNCTION public.trg_notifica_push('inizio');


--
-- Name: partite trg_partite_notifica_inizio_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_partite_notifica_inizio_upd AFTER UPDATE OF stato ON public.partite FOR EACH ROW WHEN ((new.nostra_partita AND (new.stato = 'live'::public.stato_partita) AND (old.stato <> 'live'::public.stato_partita))) EXECUTE FUNCTION public.trg_notifica_push('inizio');


--
-- Name: partite trg_partite_valida_risultato; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_partite_valida_risultato BEFORE INSERT OR UPDATE ON public.partite FOR EACH ROW EXECUTE FUNCTION public.valida_risultato_partita();


--
-- Name: penalita_squadra trg_penalita_squadra_classifica; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_penalita_squadra_classifica AFTER INSERT OR DELETE OR UPDATE ON public.penalita_squadra FOR EACH ROW EXECUTE FUNCTION public.trg_ricalcola_classifica();


--
-- Name: profili trg_proteggi_ruolo; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_proteggi_ruolo BEFORE INSERT OR DELETE OR UPDATE ON public.profili FOR EACH ROW EXECUTE FUNCTION public.proteggi_ruolo_profilo();


--
-- Name: regole_classifica trg_regole_classifica_classifica; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_regole_classifica_classifica AFTER INSERT OR DELETE OR UPDATE ON public.regole_classifica FOR EACH ROW EXECUTE FUNCTION public.trg_ricalcola_classifica();


--
-- Name: set_partita trg_set_partita_notifica_ins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_partita_notifica_ins AFTER INSERT ON public.set_partita FOR EACH ROW WHEN (new.completato) EXECUTE FUNCTION public.trg_notifica_push('fine_set');


--
-- Name: set_partita trg_set_partita_notifica_mvp_ins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_partita_notifica_mvp_ins AFTER INSERT ON public.set_partita FOR EACH ROW WHEN (new.completato) EXECUTE FUNCTION public.trg_notifica_mvp();


--
-- Name: set_partita trg_set_partita_notifica_mvp_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_partita_notifica_mvp_upd AFTER UPDATE OF completato ON public.set_partita FOR EACH ROW WHEN ((new.completato AND (NOT old.completato))) EXECUTE FUNCTION public.trg_notifica_mvp();


--
-- Name: set_partita trg_set_partita_notifica_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_partita_notifica_upd AFTER UPDATE OF completato ON public.set_partita FOR EACH ROW WHEN ((new.completato AND (NOT old.completato))) EXECUTE FUNCTION public.trg_notifica_push('fine_set');


--
-- Name: set_partita trg_set_partita_risultato; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_partita_risultato AFTER INSERT OR DELETE OR UPDATE ON public.set_partita FOR EACH ROW EXECUTE FUNCTION public.aggiorna_risultato_partita();


--
-- Name: azioni_punto azioni_punto_evento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.azioni_punto
    ADD CONSTRAINT azioni_punto_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.eventi_live(id) ON DELETE CASCADE;


--
-- Name: azioni_punto azioni_punto_giocatrice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.azioni_punto
    ADD CONSTRAINT azioni_punto_giocatrice_id_fkey FOREIGN KEY (giocatrice_id) REFERENCES public.giocatrici(id) ON DELETE SET NULL;


--
-- Name: azioni_punto azioni_punto_partita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.azioni_punto
    ADD CONSTRAINT azioni_punto_partita_id_fkey FOREIGN KEY (partita_id) REFERENCES public.partite(id) ON DELETE CASCADE;


--
-- Name: classifiche classifiche_squadra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classifiche
    ADD CONSTRAINT classifiche_squadra_id_fkey FOREIGN KEY (squadra_id) REFERENCES public.squadre(id);


--
-- Name: classifiche classifiche_stagione_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classifiche
    ADD CONSTRAINT classifiche_stagione_id_fkey FOREIGN KEY (stagione_id) REFERENCES public.stagioni(id) ON DELETE CASCADE;


--
-- Name: conoscenza conoscenza_fonte_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conoscenza
    ADD CONSTRAINT conoscenza_fonte_id_fkey FOREIGN KEY (fonte_id) REFERENCES public.fonti(id) ON DELETE CASCADE;


--
-- Name: consensi_utente consensi_utente_utente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consensi_utente
    ADD CONSTRAINT consensi_utente_utente_id_fkey FOREIGN KEY (utente_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: dispositivi_push dispositivi_push_categoria_giovanile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dispositivi_push
    ADD CONSTRAINT dispositivi_push_categoria_giovanile_id_fkey FOREIGN KEY (categoria_giovanile_id) REFERENCES public.categorie_giovanili(id) ON DELETE SET NULL;


--
-- Name: dispositivi_push dispositivi_push_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dispositivi_push
    ADD CONSTRAINT dispositivi_push_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: eventi_live eventi_live_partita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eventi_live
    ADD CONSTRAINT eventi_live_partita_id_fkey FOREIGN KEY (partita_id) REFERENCES public.partite(id) ON DELETE CASCADE;


--
-- Name: formazioni_partita formazioni_partita_giocatrice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formazioni_partita
    ADD CONSTRAINT formazioni_partita_giocatrice_id_fkey FOREIGN KEY (giocatrice_id) REFERENCES public.giocatrici(id) ON DELETE SET NULL;


--
-- Name: formazioni_partita formazioni_partita_partita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formazioni_partita
    ADD CONSTRAINT formazioni_partita_partita_id_fkey FOREIGN KEY (partita_id) REFERENCES public.partite(id) ON DELETE CASCADE;


--
-- Name: foto foto_album_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.foto
    ADD CONSTRAINT foto_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.album_foto(id) ON DELETE CASCADE;


--
-- Name: gare_campionato_backup gare_campionato_campionato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gare_campionato_backup
    ADD CONSTRAINT gare_campionato_campionato_id_fkey FOREIGN KEY (campionato_id) REFERENCES public.campionati(id);


--
-- Name: gare_campionato_backup gare_campionato_partita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gare_campionato_backup
    ADD CONSTRAINT gare_campionato_partita_id_fkey FOREIGN KEY (partita_id) REFERENCES public.partite(id) ON DELETE SET NULL;


--
-- Name: gare_campionato_backup gare_campionato_squadra_casa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gare_campionato_backup
    ADD CONSTRAINT gare_campionato_squadra_casa_id_fkey FOREIGN KEY (squadra_casa_id) REFERENCES public.squadre(id);


--
-- Name: gare_campionato_backup gare_campionato_squadra_ospite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gare_campionato_backup
    ADD CONSTRAINT gare_campionato_squadra_ospite_id_fkey FOREIGN KEY (squadra_ospite_id) REFERENCES public.squadre(id);


--
-- Name: gare_campionato_backup gare_campionato_stagione_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gare_campionato_backup
    ADD CONSTRAINT gare_campionato_stagione_id_fkey FOREIGN KEY (stagione_id) REFERENCES public.stagioni(id);


--
-- Name: giocatrici giocatrici_categoria_giovanile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.giocatrici
    ADD CONSTRAINT giocatrici_categoria_giovanile_id_fkey FOREIGN KEY (categoria_giovanile_id) REFERENCES public.categorie_giovanili(id);


--
-- Name: giocatrici giocatrici_squadra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.giocatrici
    ADD CONSTRAINT giocatrici_squadra_id_fkey FOREIGN KEY (squadra_id) REFERENCES public.squadre(id) ON DELETE RESTRICT;


--
-- Name: giocatrici giocatrici_stagione_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.giocatrici
    ADD CONSTRAINT giocatrici_stagione_id_fkey FOREIGN KEY (stagione_id) REFERENCES public.stagioni(id) ON DELETE CASCADE;


--
-- Name: log_agente log_agente_partita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_agente
    ADD CONSTRAINT log_agente_partita_id_fkey FOREIGN KEY (partita_id) REFERENCES public.partite(id) ON DELETE SET NULL;


--
-- Name: partite partite_campionato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partite
    ADD CONSTRAINT partite_campionato_id_fkey FOREIGN KEY (campionato_id) REFERENCES public.campionati(id) ON DELETE SET NULL;


--
-- Name: partite partite_categoria_giovanile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partite
    ADD CONSTRAINT partite_categoria_giovanile_id_fkey FOREIGN KEY (categoria_giovanile_id) REFERENCES public.categorie_giovanili(id);


--
-- Name: partite partite_squadra_avversaria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partite
    ADD CONSTRAINT partite_squadra_avversaria_id_fkey FOREIGN KEY (squadra_avversaria_id) REFERENCES public.squadre(id);


--
-- Name: partite partite_squadra_casa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partite
    ADD CONSTRAINT partite_squadra_casa_id_fkey FOREIGN KEY (squadra_casa_id) REFERENCES public.squadre(id);


--
-- Name: partite partite_squadra_ospite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partite
    ADD CONSTRAINT partite_squadra_ospite_id_fkey FOREIGN KEY (squadra_ospite_id) REFERENCES public.squadre(id);


--
-- Name: partite partite_stagione_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partite
    ADD CONSTRAINT partite_stagione_id_fkey FOREIGN KEY (stagione_id) REFERENCES public.stagioni(id) ON DELETE CASCADE;


--
-- Name: penalita_squadra penalita_squadra_squadra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penalita_squadra
    ADD CONSTRAINT penalita_squadra_squadra_id_fkey FOREIGN KEY (squadra_id) REFERENCES public.squadre(id);


--
-- Name: penalita_squadra penalita_squadra_stagione_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.penalita_squadra
    ADD CONSTRAINT penalita_squadra_stagione_id_fkey FOREIGN KEY (stagione_id) REFERENCES public.stagioni(id) ON DELETE CASCADE;


--
-- Name: profili profili_categoria_giovanile_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profili
    ADD CONSTRAINT profili_categoria_giovanile_fk FOREIGN KEY (categoria_giovanile_id) REFERENCES public.categorie_giovanili(id);


--
-- Name: profili profili_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profili
    ADD CONSTRAINT profili_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: promo_sponsor promo_sponsor_sponsor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_sponsor
    ADD CONSTRAINT promo_sponsor_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.sponsor(id) ON DELETE CASCADE;


--
-- Name: push_token push_token_categoria_giovanile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_token
    ADD CONSTRAINT push_token_categoria_giovanile_id_fkey FOREIGN KEY (categoria_giovanile_id) REFERENCES public.categorie_giovanili(id) ON DELETE SET NULL;


--
-- Name: push_token push_token_utente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_token
    ADD CONSTRAINT push_token_utente_id_fkey FOREIGN KEY (utente_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: regole_classifica regole_classifica_stagione_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regole_classifica
    ADD CONSTRAINT regole_classifica_stagione_id_fkey FOREIGN KEY (stagione_id) REFERENCES public.stagioni(id) ON DELETE CASCADE;


--
-- Name: set_partita set_partita_partita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.set_partita
    ADD CONSTRAINT set_partita_partita_id_fkey FOREIGN KEY (partita_id) REFERENCES public.partite(id) ON DELETE CASCADE;


--
-- Name: squadre squadre_campionato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.squadre
    ADD CONSTRAINT squadre_campionato_id_fkey FOREIGN KEY (campionato_id) REFERENCES public.campionati(id);


--
-- Name: staff staff_categoria_giovanile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_categoria_giovanile_id_fkey FOREIGN KEY (categoria_giovanile_id) REFERENCES public.categorie_giovanili(id);


--
-- Name: statistiche_attacco statistiche_attacco_giocatrice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statistiche_attacco
    ADD CONSTRAINT statistiche_attacco_giocatrice_id_fkey FOREIGN KEY (giocatrice_id) REFERENCES public.giocatrici(id) ON DELETE SET NULL;


--
-- Name: statistiche_attacco statistiche_attacco_partita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statistiche_attacco
    ADD CONSTRAINT statistiche_attacco_partita_id_fkey FOREIGN KEY (partita_id) REFERENCES public.partite(id) ON DELETE CASCADE;


--
-- Name: statistiche_attacco statistiche_attacco_tabellino_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statistiche_attacco
    ADD CONSTRAINT statistiche_attacco_tabellino_id_fkey FOREIGN KEY (tabellino_id) REFERENCES public.tabellini(id) ON DELETE SET NULL;


--
-- Name: tabellini tabellini_caricato_da_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tabellini
    ADD CONSTRAINT tabellini_caricato_da_fkey FOREIGN KEY (caricato_da) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: tabellini tabellini_partita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tabellini
    ADD CONSTRAINT tabellini_partita_id_fkey FOREIGN KEY (partita_id) REFERENCES public.partite(id) ON DELETE CASCADE;


--
-- Name: uso_assistente uso_assistente_utente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uso_assistente
    ADD CONSTRAINT uso_assistente_utente_id_fkey FOREIGN KEY (utente_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: voti_mvp voti_mvp_giocatrice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voti_mvp
    ADD CONSTRAINT voti_mvp_giocatrice_id_fkey FOREIGN KEY (giocatrice_id) REFERENCES public.giocatrici(id) ON DELETE CASCADE;


--
-- Name: voti_mvp voti_mvp_partita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voti_mvp
    ADD CONSTRAINT voti_mvp_partita_id_fkey FOREIGN KEY (partita_id) REFERENCES public.partite(id) ON DELETE CASCADE;


--
-- Name: voti_mvp voti_mvp_utente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.voti_mvp
    ADD CONSTRAINT voti_mvp_utente_id_fkey FOREIGN KEY (utente_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: account_eliminati; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.account_eliminati ENABLE ROW LEVEL SECURITY;

--
-- Name: account_eliminati account_eliminati_lettura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY account_eliminati_lettura_staff ON public.account_eliminati FOR SELECT TO authenticated USING (public.e_staff());


--
-- Name: album_foto; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.album_foto ENABLE ROW LEVEL SECURITY;

--
-- Name: album_foto album_foto_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY album_foto_lettura_pubblica ON public.album_foto FOR SELECT USING ((pubblicato OR public.e_staff()));


--
-- Name: album_foto album_foto_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY album_foto_scrittura_staff ON public.album_foto USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: azioni_punto; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.azioni_punto ENABLE ROW LEVEL SECURITY;

--
-- Name: azioni_punto azioni_punto_lettura; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY azioni_punto_lettura ON public.azioni_punto FOR SELECT USING (true);


--
-- Name: azioni_punto azioni_punto_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY azioni_punto_scrittura_staff ON public.azioni_punto USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: campionati; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.campionati ENABLE ROW LEVEL SECURITY;

--
-- Name: campionati campionati_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY campionati_lettura_pubblica ON public.campionati FOR SELECT USING (true);


--
-- Name: campionati campionati_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY campionati_scrittura_staff ON public.campionati USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: categorie_giovanili; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.categorie_giovanili ENABLE ROW LEVEL SECURITY;

--
-- Name: categorie_giovanili categorie_giovanili_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categorie_giovanili_lettura_pubblica ON public.categorie_giovanili FOR SELECT USING (true);


--
-- Name: categorie_giovanili categorie_giovanili_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categorie_giovanili_scrittura_staff ON public.categorie_giovanili USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: classifiche; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.classifiche ENABLE ROW LEVEL SECURITY;

--
-- Name: classifiche classifiche_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY classifiche_lettura_pubblica ON public.classifiche FOR SELECT USING (true);


--
-- Name: classifiche classifiche_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY classifiche_scrittura_staff ON public.classifiche USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: conoscenza; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.conoscenza ENABLE ROW LEVEL SECURITY;

--
-- Name: conoscenza conoscenza_eliminazione_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY conoscenza_eliminazione_admin ON public.conoscenza FOR DELETE TO authenticated USING (( SELECT public.e_admin() AS e_admin));


--
-- Name: conoscenza conoscenza_inserimento_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY conoscenza_inserimento_admin ON public.conoscenza FOR INSERT TO authenticated WITH CHECK (( SELECT public.e_admin() AS e_admin));


--
-- Name: conoscenza conoscenza_lettura; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY conoscenza_lettura ON public.conoscenza FOR SELECT TO authenticated, anon USING (true);


--
-- Name: conoscenza conoscenza_modifica_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY conoscenza_modifica_admin ON public.conoscenza FOR UPDATE TO authenticated USING (( SELECT public.e_admin() AS e_admin)) WITH CHECK (( SELECT public.e_admin() AS e_admin));


--
-- Name: consensi_utente; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.consensi_utente ENABLE ROW LEVEL SECURITY;

--
-- Name: consensi_utente consensi_utente_inserimento_self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consensi_utente_inserimento_self ON public.consensi_utente FOR INSERT TO authenticated WITH CHECK (((utente_id = auth.uid()) AND (origine = 'app'::text)));


--
-- Name: consensi_utente consensi_utente_lettura; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consensi_utente_lettura ON public.consensi_utente FOR SELECT TO authenticated USING (((utente_id = auth.uid()) OR public.e_staff()));


--
-- Name: convenzioni; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.convenzioni ENABLE ROW LEVEL SECURITY;

--
-- Name: convenzioni convenzioni_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY convenzioni_lettura_pubblica ON public.convenzioni FOR SELECT USING ((attiva OR public.e_staff()));


--
-- Name: convenzioni convenzioni_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY convenzioni_scrittura_staff ON public.convenzioni USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: demo_diretta; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.demo_diretta ENABLE ROW LEVEL SECURITY;

--
-- Name: demo_diretta demo_diretta: inserimento admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "demo_diretta: inserimento admin" ON public.demo_diretta FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: demo_diretta demo_diretta: lettura; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "demo_diretta: lettura" ON public.demo_diretta FOR SELECT TO authenticated, anon USING (true);


--
-- Name: demo_diretta demo_diretta: modifica admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "demo_diretta: modifica admin" ON public.demo_diretta FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: dispositivi_push; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.dispositivi_push ENABLE ROW LEVEL SECURITY;

--
-- Name: dispositivi_push dispositivi_push_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY dispositivi_push_delete ON public.dispositivi_push FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: dispositivi_push dispositivi_push_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY dispositivi_push_insert ON public.dispositivi_push FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: dispositivi_push dispositivi_push_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY dispositivi_push_select ON public.dispositivi_push FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: dispositivi_push dispositivi_push_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY dispositivi_push_update ON public.dispositivi_push FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: eventi_live; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.eventi_live ENABLE ROW LEVEL SECURITY;

--
-- Name: eventi_live eventi_live_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY eventi_live_lettura_pubblica ON public.eventi_live FOR SELECT USING (true);


--
-- Name: eventi_live eventi_live_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY eventi_live_scrittura_staff ON public.eventi_live USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: faq; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;

--
-- Name: faq faq_eliminazione_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY faq_eliminazione_admin ON public.faq FOR DELETE TO authenticated USING (( SELECT public.e_admin() AS e_admin));


--
-- Name: faq faq_inserimento_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY faq_inserimento_admin ON public.faq FOR INSERT TO authenticated WITH CHECK (( SELECT public.e_admin() AS e_admin));


--
-- Name: faq faq_lettura; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY faq_lettura ON public.faq FOR SELECT TO authenticated, anon USING ((attiva OR ( SELECT public.e_admin() AS e_admin)));


--
-- Name: faq faq_modifica_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY faq_modifica_admin ON public.faq FOR UPDATE TO authenticated USING (( SELECT public.e_admin() AS e_admin)) WITH CHECK (( SELECT public.e_admin() AS e_admin));


--
-- Name: fonti; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.fonti ENABLE ROW LEVEL SECURITY;

--
-- Name: fonti fonti_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY fonti_admin ON public.fonti TO authenticated USING (( SELECT public.e_admin() AS e_admin)) WITH CHECK (( SELECT public.e_admin() AS e_admin));


--
-- Name: formazioni_partita; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.formazioni_partita ENABLE ROW LEVEL SECURITY;

--
-- Name: formazioni_partita formazioni_partita_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY formazioni_partita_lettura_pubblica ON public.formazioni_partita FOR SELECT USING (true);


--
-- Name: formazioni_partita formazioni_partita_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY formazioni_partita_scrittura_staff ON public.formazioni_partita USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: foto; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.foto ENABLE ROW LEVEL SECURITY;

--
-- Name: foto foto_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY foto_lettura_pubblica ON public.foto FOR SELECT USING ((public.e_staff() OR (EXISTS ( SELECT 1
   FROM public.album_foto a
  WHERE ((a.id = foto.album_id) AND a.pubblicato)))));


--
-- Name: foto foto_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY foto_scrittura_staff ON public.foto USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: gare_campionato_backup; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.gare_campionato_backup ENABLE ROW LEVEL SECURITY;

--
-- Name: gare_campionato_backup gare_campionato_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY gare_campionato_lettura_pubblica ON public.gare_campionato_backup FOR SELECT USING (true);


--
-- Name: gare_campionato_backup gare_campionato_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY gare_campionato_scrittura_staff ON public.gare_campionato_backup USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: giocatrici; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.giocatrici ENABLE ROW LEVEL SECURITY;

--
-- Name: giocatrici giocatrici_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY giocatrici_lettura_pubblica ON public.giocatrici FOR SELECT USING (true);


--
-- Name: giocatrici giocatrici_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY giocatrici_scrittura_staff ON public.giocatrici USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: log_agente; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.log_agente ENABLE ROW LEVEL SECURITY;

--
-- Name: log_agente log_agente_lettura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY log_agente_lettura_staff ON public.log_agente FOR SELECT TO authenticated USING (public.e_staff());


--
-- Name: media; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

--
-- Name: media media_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY media_lettura_pubblica ON public.media FOR SELECT USING (((pubblicato = true) OR public.e_staff()));


--
-- Name: media media_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY media_scrittura_staff ON public.media USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: notifiche_inviate; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifiche_inviate ENABLE ROW LEVEL SECURITY;

--
-- Name: notifiche_inviate notifiche_inviate_lettura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifiche_inviate_lettura_staff ON public.notifiche_inviate FOR SELECT USING (public.e_staff());


--
-- Name: notizie; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notizie ENABLE ROW LEVEL SECURITY;

--
-- Name: notizie notizie_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notizie_lettura_pubblica ON public.notizie FOR SELECT USING (((pubblicata = true) OR public.e_staff()));


--
-- Name: notizie notizie_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notizie_scrittura_staff ON public.notizie USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: partite; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.partite ENABLE ROW LEVEL SECURITY;

--
-- Name: partite partite_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY partite_lettura_pubblica ON public.partite FOR SELECT USING (true);


--
-- Name: partite partite_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY partite_scrittura_staff ON public.partite USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: penalita_squadra; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.penalita_squadra ENABLE ROW LEVEL SECURITY;

--
-- Name: penalita_squadra penalita_squadra_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY penalita_squadra_lettura_pubblica ON public.penalita_squadra FOR SELECT USING (true);


--
-- Name: penalita_squadra penalita_squadra_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY penalita_squadra_scrittura_staff ON public.penalita_squadra USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: profili; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profili ENABLE ROW LEVEL SECURITY;

--
-- Name: profili profili_lettura_self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profili_lettura_self ON public.profili FOR SELECT USING (((id = auth.uid()) OR public.e_staff()));


--
-- Name: profili profili_scrittura_self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profili_scrittura_self ON public.profili FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: promo_sponsor; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.promo_sponsor ENABLE ROW LEVEL SECURITY;

--
-- Name: promo_sponsor promo_sponsor_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY promo_sponsor_lettura_pubblica ON public.promo_sponsor FOR SELECT USING (true);


--
-- Name: promo_sponsor promo_sponsor_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY promo_sponsor_scrittura_staff ON public.promo_sponsor USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: pubblicita; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pubblicita ENABLE ROW LEVEL SECURITY;

--
-- Name: pubblicita pubblicita_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pubblicita_lettura_pubblica ON public.pubblicita FOR SELECT USING ((attiva OR public.e_staff()));


--
-- Name: pubblicita pubblicita_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY pubblicita_scrittura_staff ON public.pubblicita USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: push_token; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.push_token ENABLE ROW LEVEL SECURITY;

--
-- Name: push_token push_token_lettura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY push_token_lettura_staff ON public.push_token FOR SELECT USING (public.e_staff());


--
-- Name: regole_classifica; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.regole_classifica ENABLE ROW LEVEL SECURITY;

--
-- Name: regole_classifica regole_classifica_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY regole_classifica_lettura_pubblica ON public.regole_classifica FOR SELECT USING (true);


--
-- Name: regole_classifica regole_classifica_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY regole_classifica_scrittura_staff ON public.regole_classifica USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: set_partita; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.set_partita ENABLE ROW LEVEL SECURITY;

--
-- Name: set_partita set_partita_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY set_partita_lettura_pubblica ON public.set_partita FOR SELECT USING (true);


--
-- Name: set_partita set_partita_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY set_partita_scrittura_staff ON public.set_partita USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: sponsor; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sponsor ENABLE ROW LEVEL SECURITY;

--
-- Name: sponsor sponsor_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sponsor_lettura_pubblica ON public.sponsor FOR SELECT USING (true);


--
-- Name: sponsor sponsor_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sponsor_scrittura_staff ON public.sponsor USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: squadre; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.squadre ENABLE ROW LEVEL SECURITY;

--
-- Name: squadre squadre_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY squadre_lettura_pubblica ON public.squadre FOR SELECT USING (true);


--
-- Name: squadre squadre_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY squadre_scrittura_staff ON public.squadre USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: staff; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

--
-- Name: staff staff_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY staff_lettura_pubblica ON public.staff FOR SELECT USING (true);


--
-- Name: staff staff_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY staff_scrittura_staff ON public.staff USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: stagioni; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stagioni ENABLE ROW LEVEL SECURITY;

--
-- Name: stagioni stagioni_lettura_pubblica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stagioni_lettura_pubblica ON public.stagioni FOR SELECT USING (true);


--
-- Name: stagioni stagioni_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stagioni_scrittura_staff ON public.stagioni USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: statistiche_attacco; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.statistiche_attacco ENABLE ROW LEVEL SECURITY;

--
-- Name: statistiche_attacco statistiche_attacco_lettura; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY statistiche_attacco_lettura ON public.statistiche_attacco FOR SELECT USING (true);


--
-- Name: statistiche_attacco statistiche_attacco_scrittura_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY statistiche_attacco_scrittura_staff ON public.statistiche_attacco TO authenticated USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: tabellini; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tabellini ENABLE ROW LEVEL SECURITY;

--
-- Name: tabellini tabellini_staff; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tabellini_staff ON public.tabellini TO authenticated USING (public.e_staff()) WITH CHECK (public.e_staff());


--
-- Name: uso_assistente; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.uso_assistente ENABLE ROW LEVEL SECURITY;

--
-- Name: uso_assistente uso_assistente: lettura propria; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "uso_assistente: lettura propria" ON public.uso_assistente FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = utente_id));


--
-- Name: voti_mvp; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.voti_mvp ENABLE ROW LEVEL SECURITY;

--
-- Name: voti_mvp voti_mvp_cancellazione; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY voti_mvp_cancellazione ON public.voti_mvp FOR DELETE TO authenticated USING ((utente_id = ( SELECT auth.uid() AS uid)));


--
-- Name: voti_mvp voti_mvp_inserimento; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY voti_mvp_inserimento ON public.voti_mvp FOR INSERT TO authenticated WITH CHECK (((utente_id = ( SELECT auth.uid() AS uid)) AND public.voto_mvp_valido(partita_id, giocatrice_id)));


--
-- Name: voti_mvp voti_mvp_lettura_propri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY voti_mvp_lettura_propri ON public.voti_mvp FOR SELECT TO authenticated USING ((utente_id = ( SELECT auth.uid() AS uid)));


--
-- Name: voti_mvp voti_mvp_modifica; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY voti_mvp_modifica ON public.voti_mvp FOR UPDATE TO authenticated USING ((utente_id = ( SELECT auth.uid() AS uid))) WITH CHECK (((utente_id = ( SELECT auth.uid() AS uid)) AND public.voto_mvp_valido(partita_id, giocatrice_id)));


-- Aggiunto a mano: su un database nuovo i default privileges di Supabase danno ALL su ogni tabella, sequenza e
-- funzione appena creata ad anon, authenticated e service_role, e pg_dump non revoca ciò che non elenca. Senza
-- questa revoca si perderebbero i privilegi per colonna (es. data_nascita di giocatrici leggibile da anon) e le
-- revoke sulle funzioni. I GRANT che seguono ricreano esattamente i privilegi della produzione.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, service_role;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION aggiorna_classifica(p_stagione uuid, p_girone text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.aggiorna_classifica(p_stagione uuid, p_girone text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.aggiorna_classifica(p_stagione uuid, p_girone text) TO service_role;


--
-- Name: FUNCTION aggiorna_risultato_partita(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.aggiorna_risultato_partita() FROM PUBLIC;
GRANT ALL ON FUNCTION public.aggiorna_risultato_partita() TO service_role;


--
-- Name: FUNCTION allinea_casa_ospite(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.allinea_casa_ospite() TO anon;
GRANT ALL ON FUNCTION public.allinea_casa_ospite() TO authenticated;
GRANT ALL ON FUNCTION public.allinea_casa_ospite() TO service_role;


--
-- Name: TABLE azioni_punto; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.azioni_punto TO anon;
GRANT ALL ON TABLE public.azioni_punto TO authenticated;
GRANT ALL ON TABLE public.azioni_punto TO service_role;


--
-- Name: FUNCTION applica_azione_giocatrice(r public.azioni_punto, segno integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.applica_azione_giocatrice(r public.azioni_punto, segno integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.applica_azione_giocatrice(r public.azioni_punto, segno integer) TO service_role;


--
-- Name: FUNCTION attiva_partite_live(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.attiva_partite_live() FROM PUBLIC;
GRANT ALL ON FUNCTION public.attiva_partite_live() TO service_role;


--
-- Name: FUNCTION azioni_punto_statistiche(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.azioni_punto_statistiche() FROM PUBLIC;
GRANT ALL ON FUNCTION public.azioni_punto_statistiche() TO service_role;


--
-- Name: FUNCTION blocca_modifica_consensi(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.blocca_modifica_consensi() FROM PUBLIC;
GRANT ALL ON FUNCTION public.blocca_modifica_consensi() TO service_role;


--
-- Name: FUNCTION bordo_campo(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.bordo_campo() FROM PUBLIC;
GRANT ALL ON FUNCTION public.bordo_campo() TO anon;
GRANT ALL ON FUNCTION public.bordo_campo() TO authenticated;
GRANT ALL ON FUNCTION public.bordo_campo() TO service_role;


--
-- Name: FUNCTION calcola_classifica(p_stagione uuid, p_girone text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.calcola_classifica(p_stagione uuid, p_girone text) TO anon;
GRANT ALL ON FUNCTION public.calcola_classifica(p_stagione uuid, p_girone text) TO authenticated;
GRANT ALL ON FUNCTION public.calcola_classifica(p_stagione uuid, p_girone text) TO service_role;


--
-- Name: FUNCTION cerca_conoscenza(query text, limite integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.cerca_conoscenza(query text, limite integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.cerca_conoscenza(query text, limite integer) TO anon;
GRANT ALL ON FUNCTION public.cerca_conoscenza(query text, limite integer) TO authenticated;
GRANT ALL ON FUNCTION public.cerca_conoscenza(query text, limite integer) TO service_role;


--
-- Name: FUNCTION conferma_tabellino(p_tabellino uuid, p_dati jsonb); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.conferma_tabellino(p_tabellino uuid, p_dati jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.conferma_tabellino(p_tabellino uuid, p_dati jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.conferma_tabellino(p_tabellino uuid, p_dati jsonb) TO service_role;


--
-- Name: FUNCTION consuma_domanda_assistente(limite integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.consuma_domanda_assistente(limite integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.consuma_domanda_assistente(limite integer) TO authenticated;
GRANT ALL ON FUNCTION public.consuma_domanda_assistente(limite integer) TO service_role;


--
-- Name: FUNCTION crea_profilo_nuovo_utente(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.crea_profilo_nuovo_utente() FROM PUBLIC;
GRANT ALL ON FUNCTION public.crea_profilo_nuovo_utente() TO service_role;


--
-- Name: FUNCTION e_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.e_admin() TO anon;
GRANT ALL ON FUNCTION public.e_admin() TO authenticated;
GRANT ALL ON FUNCTION public.e_admin() TO service_role;


--
-- Name: FUNCTION e_staff(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.e_staff() TO anon;
GRANT ALL ON FUNCTION public.e_staff() TO authenticated;
GRANT ALL ON FUNCTION public.e_staff() TO service_role;


--
-- Name: FUNCTION giocatrice_da_maglia(p_partita uuid, p_squadra text, p_numero integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.giocatrice_da_maglia(p_partita uuid, p_squadra text, p_numero integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.giocatrice_da_maglia(p_partita uuid, p_squadra text, p_numero integer) TO service_role;


--
-- Name: FUNCTION giocatrici_anno_nascita(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.giocatrici_anno_nascita() TO anon;
GRANT ALL ON FUNCTION public.giocatrici_anno_nascita() TO authenticated;
GRANT ALL ON FUNCTION public.giocatrici_anno_nascita() TO service_role;


--
-- Name: FUNCTION giocatrici_squadra_predefinita(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.giocatrici_squadra_predefinita() TO anon;
GRANT ALL ON FUNCTION public.giocatrici_squadra_predefinita() TO authenticated;
GRANT ALL ON FUNCTION public.giocatrici_squadra_predefinita() TO service_role;


--
-- Name: FUNCTION imposta_aggiornato_il(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.imposta_aggiornato_il() FROM PUBLIC;
GRANT ALL ON FUNCTION public.imposta_aggiornato_il() TO service_role;


--
-- Name: FUNCTION imposta_ruolo_utente(p_utente uuid, p_ruolo public.ruolo_utente); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.imposta_ruolo_utente(p_utente uuid, p_ruolo public.ruolo_utente) FROM PUBLIC;
GRANT ALL ON FUNCTION public.imposta_ruolo_utente(p_utente uuid, p_ruolo public.ruolo_utente) TO authenticated;
GRANT ALL ON FUNCTION public.imposta_ruolo_utente(p_utente uuid, p_ruolo public.ruolo_utente) TO service_role;


--
-- Name: FUNCTION invia_notifica_push(p_tipo text, p_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.invia_notifica_push(p_tipo text, p_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.invia_notifica_push(p_tipo text, p_id uuid) TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- Name: FUNCTION is_staff(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_staff() TO anon;
GRANT ALL ON FUNCTION public.is_staff() TO authenticated;
GRANT ALL ON FUNCTION public.is_staff() TO service_role;


--
-- Name: FUNCTION libera_dispositivo_push(p_token text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.libera_dispositivo_push(p_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.libera_dispositivo_push(p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.libera_dispositivo_push(p_token text) TO service_role;


--
-- Name: FUNCTION notifica_game_day(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.notifica_game_day() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notifica_game_day() TO service_role;


--
-- Name: FUNCTION notifica_prepartite(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.notifica_prepartite() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notifica_prepartite() TO service_role;


--
-- Name: FUNCTION partite_lette_agente(giorni integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.partite_lette_agente(giorni integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.partite_lette_agente(giorni integer) TO anon;
GRANT ALL ON FUNCTION public.partite_lette_agente(giorni integer) TO authenticated;
GRANT ALL ON FUNCTION public.partite_lette_agente(giorni integer) TO service_role;


--
-- Name: FUNCTION preferenze_push_token(p_token text, p_attive boolean, p_inizio boolean, p_set boolean, p_finale boolean, p_contenuti boolean, p_game_day boolean, p_mvp boolean); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.preferenze_push_token(p_token text, p_attive boolean, p_inizio boolean, p_set boolean, p_finale boolean, p_contenuti boolean, p_game_day boolean, p_mvp boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.preferenze_push_token(p_token text, p_attive boolean, p_inizio boolean, p_set boolean, p_finale boolean, p_contenuti boolean, p_game_day boolean, p_mvp boolean) TO anon;
GRANT ALL ON FUNCTION public.preferenze_push_token(p_token text, p_attive boolean, p_inizio boolean, p_set boolean, p_finale boolean, p_contenuti boolean, p_game_day boolean, p_mvp boolean) TO authenticated;
GRANT ALL ON FUNCTION public.preferenze_push_token(p_token text, p_attive boolean, p_inizio boolean, p_set boolean, p_finale boolean, p_contenuti boolean, p_game_day boolean, p_mvp boolean) TO service_role;


--
-- Name: FUNCTION proteggi_ruolo_profilo(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.proteggi_ruolo_profilo() FROM PUBLIC;
GRANT ALL ON FUNCTION public.proteggi_ruolo_profilo() TO service_role;


--
-- Name: FUNCTION punteggi_agente(p_minuti integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.punteggi_agente(p_minuti integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.punteggi_agente(p_minuti integer) TO anon;
GRANT ALL ON FUNCTION public.punteggi_agente(p_minuti integer) TO authenticated;
GRANT ALL ON FUNCTION public.punteggi_agente(p_minuti integer) TO service_role;


--
-- Name: FUNCTION registra_push_token(p_token text, p_piattaforma text, p_categoria_giovanile_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.registra_push_token(p_token text, p_piattaforma text, p_categoria_giovanile_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.registra_push_token(p_token text, p_piattaforma text, p_categoria_giovanile_id uuid) TO anon;
GRANT ALL ON FUNCTION public.registra_push_token(p_token text, p_piattaforma text, p_categoria_giovanile_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.registra_push_token(p_token text, p_piattaforma text, p_categoria_giovanile_id uuid) TO service_role;


--
-- Name: FUNCTION ricalcola_attacco_da_finale(p_finale uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.ricalcola_attacco_da_finale(p_finale uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.ricalcola_attacco_da_finale(p_finale uuid) TO service_role;


--
-- Name: FUNCTION sestetti_set_controlla(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sestetti_set_controlla() TO anon;
GRANT ALL ON FUNCTION public.sestetti_set_controlla() TO authenticated;
GRANT ALL ON FUNCTION public.sestetti_set_controlla() TO service_role;


--
-- Name: FUNCTION set_valido(p_numero integer, p_casa integer, p_ospite integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_valido(p_numero integer, p_casa integer, p_ospite integer) TO anon;
GRANT ALL ON FUNCTION public.set_valido(p_numero integer, p_casa integer, p_ospite integer) TO authenticated;
GRANT ALL ON FUNCTION public.set_valido(p_numero integer, p_casa integer, p_ospite integer) TO service_role;


--
-- Name: FUNCTION tabellone_testo(t jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.tabellone_testo(t jsonb) TO anon;
GRANT ALL ON FUNCTION public.tabellone_testo(t jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.tabellone_testo(t jsonb) TO service_role;


--
-- Name: FUNCTION trg_notifica_mvp(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.trg_notifica_mvp() FROM PUBLIC;
GRANT ALL ON FUNCTION public.trg_notifica_mvp() TO service_role;


--
-- Name: FUNCTION trg_notifica_push(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.trg_notifica_push() FROM PUBLIC;
GRANT ALL ON FUNCTION public.trg_notifica_push() TO service_role;


--
-- Name: FUNCTION trg_ricalcola_classifica(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trg_ricalcola_classifica() TO anon;
GRANT ALL ON FUNCTION public.trg_ricalcola_classifica() TO authenticated;
GRANT ALL ON FUNCTION public.trg_ricalcola_classifica() TO service_role;


--
-- Name: FUNCTION utente_da_identita(p_provider text, p_provider_id text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.utente_da_identita(p_provider text, p_provider_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.utente_da_identita(p_provider text, p_provider_id text) TO service_role;


--
-- Name: FUNCTION valida_risultato_partita(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.valida_risultato_partita() TO anon;
GRANT ALL ON FUNCTION public.valida_risultato_partita() TO authenticated;
GRANT ALL ON FUNCTION public.valida_risultato_partita() TO service_role;


--
-- Name: FUNCTION voti_mvp_partita(p_partita uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.voti_mvp_partita(p_partita uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.voti_mvp_partita(p_partita uuid) TO anon;
GRANT ALL ON FUNCTION public.voti_mvp_partita(p_partita uuid) TO authenticated;
GRANT ALL ON FUNCTION public.voti_mvp_partita(p_partita uuid) TO service_role;


--
-- Name: FUNCTION voto_mvp_valido(p_partita uuid, p_giocatrice uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.voto_mvp_valido(p_partita uuid, p_giocatrice uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.voto_mvp_valido(p_partita uuid, p_giocatrice uuid) TO authenticated;
GRANT ALL ON FUNCTION public.voto_mvp_valido(p_partita uuid, p_giocatrice uuid) TO service_role;


--
-- Name: TABLE account_eliminati; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.account_eliminati TO service_role;
GRANT SELECT ON TABLE public.account_eliminati TO authenticated;


--
-- Name: TABLE album_foto; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.album_foto TO anon;
GRANT ALL ON TABLE public.album_foto TO authenticated;
GRANT ALL ON TABLE public.album_foto TO service_role;


--
-- Name: TABLE statistiche_attacco; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.statistiche_attacco TO anon;
GRANT ALL ON TABLE public.statistiche_attacco TO authenticated;
GRANT ALL ON TABLE public.statistiche_attacco TO service_role;


--
-- Name: TABLE attacco_giocatrici_partita; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.attacco_giocatrici_partita TO anon;
GRANT ALL ON TABLE public.attacco_giocatrici_partita TO authenticated;
GRANT ALL ON TABLE public.attacco_giocatrici_partita TO service_role;


--
-- Name: TABLE campionati; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.campionati TO anon;
GRANT ALL ON TABLE public.campionati TO authenticated;
GRANT ALL ON TABLE public.campionati TO service_role;


--
-- Name: TABLE categorie_giovanili; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.categorie_giovanili TO anon;
GRANT ALL ON TABLE public.categorie_giovanili TO authenticated;
GRANT ALL ON TABLE public.categorie_giovanili TO service_role;


--
-- Name: TABLE classifiche; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.classifiche TO anon;
GRANT ALL ON TABLE public.classifiche TO authenticated;
GRANT ALL ON TABLE public.classifiche TO service_role;


--
-- Name: TABLE conoscenza; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.conoscenza TO anon;
GRANT SELECT,INSERT,DELETE,MAINTAIN,UPDATE ON TABLE public.conoscenza TO authenticated;
GRANT ALL ON TABLE public.conoscenza TO service_role;


--
-- Name: TABLE consensi_utente; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.consensi_utente TO service_role;
GRANT SELECT ON TABLE public.consensi_utente TO authenticated;


--
-- Name: COLUMN consensi_utente.utente_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(utente_id) ON TABLE public.consensi_utente TO authenticated;


--
-- Name: COLUMN consensi_utente.tipo; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(tipo) ON TABLE public.consensi_utente TO authenticated;


--
-- Name: COLUMN consensi_utente.concesso; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(concesso) ON TABLE public.consensi_utente TO authenticated;


--
-- Name: COLUMN consensi_utente.versione_informativa; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(versione_informativa) ON TABLE public.consensi_utente TO authenticated;


--
-- Name: COLUMN consensi_utente.provider_accesso; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(provider_accesso) ON TABLE public.consensi_utente TO authenticated;


--
-- Name: TABLE consensi_utente_attuali; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.consensi_utente_attuali TO service_role;
GRANT SELECT ON TABLE public.consensi_utente_attuali TO authenticated;


--
-- Name: TABLE convenzioni; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.convenzioni TO anon;
GRANT ALL ON TABLE public.convenzioni TO authenticated;
GRANT ALL ON TABLE public.convenzioni TO service_role;


--
-- Name: TABLE demo_diretta; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.demo_diretta TO anon;
GRANT ALL ON TABLE public.demo_diretta TO authenticated;
GRANT ALL ON TABLE public.demo_diretta TO service_role;


--
-- Name: TABLE dispositivi_push; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.dispositivi_push TO authenticated;
GRANT ALL ON TABLE public.dispositivi_push TO service_role;


--
-- Name: TABLE eventi_live; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.eventi_live TO anon;
GRANT ALL ON TABLE public.eventi_live TO authenticated;
GRANT ALL ON TABLE public.eventi_live TO service_role;


--
-- Name: TABLE faq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.faq TO anon;
GRANT SELECT,INSERT,DELETE,MAINTAIN,UPDATE ON TABLE public.faq TO authenticated;
GRANT ALL ON TABLE public.faq TO service_role;


--
-- Name: TABLE fonti; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,MAINTAIN,UPDATE ON TABLE public.fonti TO authenticated;
GRANT ALL ON TABLE public.fonti TO service_role;


--
-- Name: TABLE formazioni_partita; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.formazioni_partita TO anon;
GRANT ALL ON TABLE public.formazioni_partita TO authenticated;
GRANT ALL ON TABLE public.formazioni_partita TO service_role;


--
-- Name: TABLE foto; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.foto TO anon;
GRANT ALL ON TABLE public.foto TO authenticated;
GRANT ALL ON TABLE public.foto TO service_role;


--
-- Name: TABLE gare_campionato_backup; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.gare_campionato_backup TO anon;
GRANT ALL ON TABLE public.gare_campionato_backup TO authenticated;
GRANT ALL ON TABLE public.gare_campionato_backup TO service_role;


--
-- Name: TABLE giocatrici; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE public.giocatrici TO anon;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE public.giocatrici TO authenticated;
GRANT ALL ON TABLE public.giocatrici TO service_role;


--
-- Name: COLUMN giocatrici.id; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(id) ON TABLE public.giocatrici TO anon;
GRANT SELECT(id) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.stagione_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(stagione_id) ON TABLE public.giocatrici TO anon;
GRANT SELECT(stagione_id) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.livello_squadra; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(livello_squadra) ON TABLE public.giocatrici TO anon;
GRANT SELECT(livello_squadra) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.categoria_giovanile_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(categoria_giovanile_id) ON TABLE public.giocatrici TO anon;
GRANT SELECT(categoria_giovanile_id) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.nome; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(nome) ON TABLE public.giocatrici TO anon;
GRANT SELECT(nome) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.cognome; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(cognome) ON TABLE public.giocatrici TO anon;
GRANT SELECT(cognome) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.numero_maglia; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(numero_maglia) ON TABLE public.giocatrici TO anon;
GRANT SELECT(numero_maglia) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.ruolo; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(ruolo) ON TABLE public.giocatrici TO anon;
GRANT SELECT(ruolo) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.foto_url; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(foto_url) ON TABLE public.giocatrici TO anon;
GRANT SELECT(foto_url) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.bio; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(bio) ON TABLE public.giocatrici TO anon;
GRANT SELECT(bio) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.attiva; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(attiva) ON TABLE public.giocatrici TO anon;
GRANT SELECT(attiva) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.ordine; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(ordine) ON TABLE public.giocatrici TO anon;
GRANT SELECT(ordine) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.altezza_cm; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(altezza_cm) ON TABLE public.giocatrici TO anon;
GRANT SELECT(altezza_cm) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.punti; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(punti) ON TABLE public.giocatrici TO anon;
GRANT SELECT(punti) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.ace; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(ace) ON TABLE public.giocatrici TO anon;
GRANT SELECT(ace) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.muri; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(muri) ON TABLE public.giocatrici TO anon;
GRANT SELECT(muri) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.capitana; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(capitana) ON TABLE public.giocatrici TO anon;
GRANT SELECT(capitana) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.squadra_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(squadra_id) ON TABLE public.giocatrici TO anon;
GRANT SELECT(squadra_id) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.anno_nascita; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(anno_nascita) ON TABLE public.giocatrici TO anon;
GRANT SELECT(anno_nascita) ON TABLE public.giocatrici TO authenticated;


--
-- Name: COLUMN giocatrici.consenso_foto; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(consenso_foto) ON TABLE public.giocatrici TO anon;
GRANT SELECT(consenso_foto) ON TABLE public.giocatrici TO authenticated;


--
-- Name: TABLE log_agente; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.log_agente TO anon;
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.log_agente TO authenticated;
GRANT ALL ON TABLE public.log_agente TO service_role;


--
-- Name: SEQUENCE log_agente_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.log_agente_id_seq TO anon;
GRANT ALL ON SEQUENCE public.log_agente_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.log_agente_id_seq TO service_role;


--
-- Name: TABLE media; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.media TO anon;
GRANT ALL ON TABLE public.media TO authenticated;
GRANT ALL ON TABLE public.media TO service_role;


--
-- Name: TABLE notifiche_inviate; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notifiche_inviate TO anon;
GRANT ALL ON TABLE public.notifiche_inviate TO authenticated;
GRANT ALL ON TABLE public.notifiche_inviate TO service_role;


--
-- Name: TABLE notizie; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notizie TO anon;
GRANT ALL ON TABLE public.notizie TO authenticated;
GRANT ALL ON TABLE public.notizie TO service_role;


--
-- Name: TABLE partite; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.partite TO anon;
GRANT ALL ON TABLE public.partite TO authenticated;
GRANT ALL ON TABLE public.partite TO service_role;


--
-- Name: TABLE penalita_squadra; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.penalita_squadra TO anon;
GRANT ALL ON TABLE public.penalita_squadra TO authenticated;
GRANT ALL ON TABLE public.penalita_squadra TO service_role;


--
-- Name: TABLE profili; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,MAINTAIN ON TABLE public.profili TO anon;
GRANT SELECT,MAINTAIN ON TABLE public.profili TO authenticated;
GRANT ALL ON TABLE public.profili TO service_role;


--
-- Name: COLUMN profili.nome_completo; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(nome_completo) ON TABLE public.profili TO authenticated;


--
-- Name: COLUMN profili.categoria_giovanile_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(categoria_giovanile_id) ON TABLE public.profili TO authenticated;


--
-- Name: TABLE promo_sponsor; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.promo_sponsor TO anon;
GRANT ALL ON TABLE public.promo_sponsor TO authenticated;
GRANT ALL ON TABLE public.promo_sponsor TO service_role;


--
-- Name: TABLE pubblicita; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pubblicita TO anon;
GRANT ALL ON TABLE public.pubblicita TO authenticated;
GRANT ALL ON TABLE public.pubblicita TO service_role;


--
-- Name: TABLE punti_giocatrici_partita; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.punti_giocatrici_partita TO anon;
GRANT ALL ON TABLE public.punti_giocatrici_partita TO authenticated;
GRANT ALL ON TABLE public.punti_giocatrici_partita TO service_role;


--
-- Name: TABLE push_token; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.push_token TO anon;
GRANT ALL ON TABLE public.push_token TO authenticated;
GRANT ALL ON TABLE public.push_token TO service_role;


--
-- Name: TABLE regole_classifica; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.regole_classifica TO anon;
GRANT ALL ON TABLE public.regole_classifica TO authenticated;
GRANT ALL ON TABLE public.regole_classifica TO service_role;


--
-- Name: TABLE set_partita; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.set_partita TO anon;
GRANT ALL ON TABLE public.set_partita TO authenticated;
GRANT ALL ON TABLE public.set_partita TO service_role;


--
-- Name: TABLE sponsor; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sponsor TO anon;
GRANT ALL ON TABLE public.sponsor TO authenticated;
GRANT ALL ON TABLE public.sponsor TO service_role;


--
-- Name: TABLE squadre; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.squadre TO anon;
GRANT ALL ON TABLE public.squadre TO authenticated;
GRANT ALL ON TABLE public.squadre TO service_role;


--
-- Name: TABLE staff; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.staff TO anon;
GRANT ALL ON TABLE public.staff TO authenticated;
GRANT ALL ON TABLE public.staff TO service_role;


--
-- Name: TABLE stagioni; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stagioni TO anon;
GRANT ALL ON TABLE public.stagioni TO authenticated;
GRANT ALL ON TABLE public.stagioni TO service_role;


--
-- Name: TABLE stato_agenti; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stato_agenti TO authenticated;
GRANT ALL ON TABLE public.stato_agenti TO service_role;


--
-- Name: TABLE tabellini; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tabellini TO anon;
GRANT ALL ON TABLE public.tabellini TO authenticated;
GRANT ALL ON TABLE public.tabellini TO service_role;


--
-- Name: TABLE uso_assistente; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.uso_assistente TO anon;
GRANT ALL ON TABLE public.uso_assistente TO authenticated;
GRANT ALL ON TABLE public.uso_assistente TO service_role;


--
-- Name: TABLE voti_mvp; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.voti_mvp TO anon;
GRANT ALL ON TABLE public.voti_mvp TO authenticated;
GRANT ALL ON TABLE public.voti_mvp TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--



--
-- PostgreSQL database dump complete
--



-- ---------- fuori dallo schema public ----------

-- trigger su auth.users
CREATE TRIGGER trg_crea_profilo AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.crea_profilo_nuovo_utente();

-- bucket di storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('brand', 'brand', true, null, null) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('convenzioni', 'convenzioni', true, null, null) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('giovanili', 'giovanili', true, null, null) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('loghi', 'loghi', true, null, null) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('news', 'news', true, null, null) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('opponents', 'opponents', true, null, null) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('players', 'players', true, null, null) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('pubblicita', 'pubblicita', true, null, null) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('sponsor', 'sponsor', false, null, null) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('sponsors', 'sponsors', true, null, null) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('tabellini', 'tabellini', false, 10485760, '{image/jpeg,image/png,image/heic,image/webp}'::text[]) on conflict (id) do nothing;

-- policy di storage
create policy news_storage_eliminazione_staff on storage.objects as PERMISSIVE for DELETE to authenticated
  using (((bucket_id = 'news'::text) AND public.e_staff()));
create policy news_storage_inserimento_staff on storage.objects as PERMISSIVE for INSERT to authenticated
  with check (((bucket_id = 'news'::text) AND public.e_staff()));
create policy news_storage_lettura_staff on storage.objects as PERMISSIVE for SELECT to authenticated
  using (((bucket_id = 'news'::text) AND public.e_staff()));
create policy news_storage_modifica_staff on storage.objects as PERMISSIVE for UPDATE to authenticated
  using (((bucket_id = 'news'::text) AND public.e_staff()))
  with check (((bucket_id = 'news'::text) AND public.e_staff()));
create policy tabellini_storage_staff on storage.objects as PERMISSIVE for ALL to authenticated
  using (((bucket_id = 'tabellini'::text) AND public.e_staff()))
  with check (((bucket_id = 'tabellini'::text) AND public.e_staff()));

-- realtime
alter publication supabase_realtime add table public.azioni_punto;
alter publication supabase_realtime add table public.classifiche;
alter publication supabase_realtime add table public.eventi_live;
alter publication supabase_realtime add table public.formazioni_partita;
alter publication supabase_realtime add table public.log_agente;
alter publication supabase_realtime add table public.partite;
alter publication supabase_realtime add table public.set_partita;
alter publication supabase_realtime add table public.statistiche_attacco;

-- job pg_cron
select cron.schedule('attiva-partite-live', '* * * * *', 'select public.attiva_partite_live();');
select cron.schedule('notifiche-game-day', '*/5 * * * *', 'select public.notifica_game_day();');
select cron.schedule('notifiche-prepartita', '*/5 * * * *', 'select public.notifica_prepartite();');
select cron.schedule('pulizia-account-eliminati', '15 3 * * *', 'delete from public.account_eliminati where eliminato_il < now() - interval ''3 years''');
select cron.schedule('pulizia-log-agente', '30 3 * * *', 'delete from public.log_agente where creato_il < now() - interval ''60 days''');
