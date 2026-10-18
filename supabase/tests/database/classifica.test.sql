-- Test pgTAP della classifica automatica (migrazioni 20261018000100-300): punti FIPAV, rinuncia, penalità,
-- validazione dei risultati e criteri a parità di punti.
-- Esecuzione in locale: supabase test db
-- Tutto avviene in una transazione annullata alla fine: nessun dato resta nel database.

begin;
create extension if not exists pgtap with schema extensions;

select plan(29);

-- ---------- dati di prova ----------

insert into public.stagioni (id, etichetta, corrente) values
  ('00000000-0000-4000-8000-00000000c001', 'Test classifica', false),
  ('00000000-0000-4000-8000-00000000c002', 'Test scontro diretto', false);

insert into public.squadre (nome)
select 'Test ' || t from unnest(array['A','B','C','D','E','F','G','H','P','Q','R','S','T','U','V','W','X','Y','Z','K','L1','L2','L4','L5']) t;

-- Gara conclusa tra due squadre di prova; set vinti ricavati dai parziali [[casa, ospite], ...]
create function pg_temp.gara(p_stagione uuid, p_girone text, p_casa text, p_ospite text, p_parziali int[][], p_rinuncia text default null)
returns uuid language plpgsql as $$
declare v_id uuid; v_parz jsonb;
begin
  select jsonb_agg(jsonb_build_object('set', i, 'casa', p_parziali[i][1], 'ospite', p_parziali[i][2]) order by i)
    into v_parz from generate_subscripts(p_parziali, 1) i;
  insert into public.partite (stagione_id, nostra_partita, girone, giornata, data_partita, squadra_casa_id, squadra_ospite_id,
                              stato, set_casa, set_ospite, parziali, rinuncia)
  values (p_stagione, false, p_girone, 1, now(),
          (select id from public.squadre where nome = 'Test ' || p_casa), (select id from public.squadre where nome = 'Test ' || p_ospite),
          'conclusa',
          (select count(*) from generate_subscripts(p_parziali, 1) i where p_parziali[i][1] > p_parziali[i][2]),
          (select count(*) from generate_subscripts(p_parziali, 1) i where p_parziali[i][2] > p_parziali[i][1]),
          v_parz, p_rinuncia)
  returning id into v_id;
  return v_id;
end $$;

create function pg_temp.riga(p_stagione uuid, p_girone text, p_squadra text)
returns public.classifiche language sql as $$
  select * from public.classifiche where stagione_id = p_stagione and girone = p_girone and nome_squadra = 'Test ' || p_squadra
$$;

create function pg_temp.ordine(p_stagione uuid, p_girone text)
returns text[] language sql as $$
  select array_agg(replace(nome_squadra, 'Test ', '') order by posizione) from public.classifiche where stagione_id = p_stagione and girone = p_girone
$$;

-- ---------- punti per risultato ----------

select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'PUNTI', 'A', 'B', array[[25,20],[25,20],[25,20]]);
select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'PUNTI', 'C', 'D', array[[25,20],[20,25],[25,20],[25,20]]);
select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'PUNTI', 'E', 'F', array[[25,20],[20,25],[25,20],[20,25],[15,10]]);

select is((pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'PUNTI', 'A')).punti, 3, '3-0: 3 punti alla vincente');
select is((pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'PUNTI', 'B')).punti, 0, '3-0: 0 punti alla perdente');
select is((pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'PUNTI', 'C')).punti, 3, '3-1: 3 punti alla vincente');
select is((pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'PUNTI', 'D')).punti, 0, '1-3: 0 punti alla perdente');
select is((pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'PUNTI', 'E')).punti, 2, '3-2: 2 punti alla vincente');
select is((pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'PUNTI', 'F')).punti, 1, '2-3: 1 punto alla perdente');

select is(
  (select array[vinte_3_0_3_1, vinte_3_2, perse_2_3, perse_0_3_1_3] from pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'PUNTI', 'C')),
  array[1, 0, 0, 0], 'C: una vittoria 3-0/3-1');
select is(
  (select array[vinte_3_0_3_1, vinte_3_2, perse_2_3, perse_0_3_1_3] from pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'PUNTI', 'F')),
  array[0, 0, 1, 0], 'F: una sconfitta 2-3');
select is(
  (select array[set_vinti, set_persi, punti_fatti, punti_subiti] from pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'PUNTI', 'E')),
  array[3, 2, 105, 100], 'E: set e punti fatti/subiti dai parziali');
select is((pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'PUNTI', 'E')).quoziente_set, 1.5::numeric, 'E: quoziente set 3/2');
select is((pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'PUNTI', 'A')).quoziente_set, null::numeric, 'A: quoziente set nullo con 0 set persi');

-- solo le gare concluse contano
insert into public.partite (stagione_id, nostra_partita, girone, giornata, data_partita, squadra_casa_id, squadra_ospite_id, stato, set_casa, set_ospite)
values ('00000000-0000-4000-8000-00000000c001', false, 'PUNTI', 2, now(),
        (select id from public.squadre where nome = 'Test A'), (select id from public.squadre where nome = 'Test C'), 'live', 2, 1);
select is((pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'PUNTI', 'A')).giocate, 1, 'una gara in diretta non conta in classifica');

-- ---------- rinuncia e penalità ----------

select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'RINUNCIA', 'G', 'H', array[[25,20],[25,20],[25,20]], 'ospite');

select is((pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'RINUNCIA', 'G')).punti, 3, 'rinuncia: 3 punti all''altra squadra');
select is((pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'RINUNCIA', 'H')).punti, -1, 'rinuncia: -1 punto alla rinunciataria (default)');
select is(
  (select array[set_vinti, set_persi, punti_fatti, punti_subiti, penalita] from pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'RINUNCIA', 'H')),
  array[0, 3, 0, 75, 1], 'rinuncia: gara persa 0-3 con parziali 0-25 (i parziali inseriti sono ignorati)');

insert into public.regole_classifica (stagione_id, penalita_rinuncia) values ('00000000-0000-4000-8000-00000000c001', 2);
select is((pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'RINUNCIA', 'H')).punti, -2, 'penalità per rinuncia configurabile per stagione');

insert into public.penalita_squadra (stagione_id, girone, squadra_id, punti, motivo)
values ('00000000-0000-4000-8000-00000000c001', 'PUNTI', (select id from public.squadre where nome = 'Test A'), 2, 'test');
select is(
  (select array[punti, penalita] from pg_temp.riga('00000000-0000-4000-8000-00000000c001', 'PUNTI', 'A')),
  array[1, 2], 'penalizzazione manuale tolta dai punti');

-- ---------- validazione ----------

select throws_ok($$ select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'ERR', 'A', 'B', array[[25,20],[25,20],[25,20],[20,25],[20,25],[20,25]]) $$,
  '23514', null, 'risultato 3-3 rifiutato');
select throws_ok($$ select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'ERR', 'A', 'B', array[[25,20],[25,20],[20,25]]) $$,
  '23514', null, 'risultato 2-1 (partita non finita) rifiutato');
select throws_ok($$ select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'ERR', 'A', 'B', array[[25,24],[25,20],[25,20]]) $$,
  '23514', null, 'set 25-24 rifiutato (servono 2 punti di scarto)');
select throws_ok($$ select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'ERR', 'A', 'B', array[[28,25],[25,20],[25,20]]) $$,
  '23514', null, 'set 28-25 rifiutato (ai vantaggi si chiude a +2)');
select throws_ok($$ select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'ERR', 'A', 'B', array[[25,20],[20,25],[25,20],[20,25],[15,14]]) $$,
  '23514', null, 'tie-break 15-14 rifiutato');
select throws_ok($$ select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'ERR', 'A', 'B', array[[25,20],[25,20],[25,20],[20,25]]) $$,
  '23514', null, 'set giocato dopo il 3° set vinto rifiutato');
select lives_ok($$ select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'OK', 'A', 'B', array[[27,25],[20,25],[25,23],[26,24]]) $$,
  'vantaggi validi (27-25) accettati');

-- ---------- parità di punti (criteri di default) ----------

-- P e Q a 4 punti: P con 2 vittorie, Q con 1
select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'VINTE', 'P', 'R', array[[25,20],[20,25],[25,20],[20,25],[15,10]]);
select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'VINTE', 'P', 'S', array[[25,20],[20,25],[25,20],[20,25],[15,10]]);
select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'VINTE', 'Q', 'R', array[[25,20],[25,20],[25,20]]);
select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'VINTE', 'S', 'Q', array[[25,20],[20,25],[25,20],[20,25],[15,10]]);
select is(pg_temp.ordine('00000000-0000-4000-8000-00000000c001', 'VINTE'), array['P', 'Q', 'S', 'R'], 'a pari punti conta il numero di gare vinte');

-- T e U a 3 punti e 1 vittoria: T non ha perso set (davanti), U 3-1; tra V e W (0 punti) W ha quoziente set migliore
select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'QSET', 'T', 'V', array[[25,20],[25,20],[25,20]]);
select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'QSET', 'U', 'W', array[[25,20],[20,25],[25,20],[25,20]]);
select is(pg_temp.ordine('00000000-0000-4000-8000-00000000c001', 'QSET'), array['T', 'U', 'W', 'V'], 'poi il quoziente set (set persi = 0 va davanti)');

-- X e Z: stessi punti, vittorie e set; X ha il quoziente punti migliore
select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'QPUNTI', 'Z', 'K', array[[25,23],[25,23],[25,23]]);
select pg_temp.gara('00000000-0000-4000-8000-00000000c001', 'QPUNTI', 'X', 'Y', array[[25,20],[25,20],[25,20]]);
select is((pg_temp.ordine('00000000-0000-4000-8000-00000000c001', 'QPUNTI'))[1:2], array['X', 'Z'], 'poi il quoziente punti');

-- ---------- scontro diretto e criteri configurabili ----------

-- L1, L2 e L5 a 3 punti con una vittoria: L1 ha battuto L2, ma L2 ha il quoziente set migliore
select pg_temp.gara('00000000-0000-4000-8000-00000000c002', 'SD', 'L1', 'L2', array[[25,20],[20,25],[25,20],[25,20]]);
select pg_temp.gara('00000000-0000-4000-8000-00000000c002', 'SD', 'L2', 'L4', array[[25,20],[25,20],[25,20]]);
select pg_temp.gara('00000000-0000-4000-8000-00000000c002', 'SD', 'L5', 'L1', array[[25,20],[25,20],[25,20]]);
select is(pg_temp.ordine('00000000-0000-4000-8000-00000000c002', 'SD'), array['L5', 'L2', 'L1', 'L4'],
  'criteri di default: decide il quoziente set prima dello scontro diretto');

insert into public.regole_classifica (stagione_id, criteri_parita) values ('00000000-0000-4000-8000-00000000c002', array['scontro_diretto', 'quoziente_set']);
select is(pg_temp.ordine('00000000-0000-4000-8000-00000000c002', 'SD'), array['L5', 'L1', 'L2', 'L4'],
  'scontro diretto per primo: L1 davanti a L2 (classifica ricalcolata al cambio delle regole)');

select * from finish();
rollback;
