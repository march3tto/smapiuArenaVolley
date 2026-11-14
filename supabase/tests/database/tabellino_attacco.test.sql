-- Test pgTAP del tabellino d'attacco (migrazione 20261114000200_tabellino_attacco).
-- Esecuzione: supabase test db
-- Valori reali: Smapiù Arena – Azimut Giorgione, 1ª giornata, 3-0 (Pt e Tot dal tabellino; Err e Mur di prova, coerenti tra i fogli).
-- Set 1 + Set 2 + foglio finale (senza il foglio del set 3) devono dare esattamente il set 3.
-- Tutto avviene in una transazione annullata alla fine: nessun dato resta nel database.

begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- ---------- dati di prova ----------

-- c1 staff, c2 utente qualsiasi
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000c1', 'staff-tabellino@test.local', 'authenticated', 'authenticated', '{}'),
  ('00000000-0000-4000-8000-0000000000c2', 'tifoso-tabellino@test.local', 'authenticated', 'authenticated', '{}');
update public.profili set ruolo = 'staff' where id = '00000000-0000-4000-8000-0000000000c1';

insert into public.stagioni (id, etichetta, corrente) values ('00000000-0000-4000-8000-00000000f001', 'Test tabellino', false);
insert into public.partite (id, stagione_id, nostra_partita, data_partita) values
  ('00000000-0000-4000-8000-00000000f101', '00000000-0000-4000-8000-00000000f001', false, now());

insert into public.tabellini (id, partita_id, numero_set, percorso_immagine, stato, caricato_da) values
  ('00000000-0000-4000-8000-00000000f201', '00000000-0000-4000-8000-00000000f101', 1, 'test/set1.jpg', 'letto', null),
  ('00000000-0000-4000-8000-00000000f202', '00000000-0000-4000-8000-00000000f101', 2, 'test/set2.jpg', 'letto', null),
  ('00000000-0000-4000-8000-00000000f203', '00000000-0000-4000-8000-00000000f101', null, 'test/finale.jpg', 'letto', null),
  ('00000000-0000-4000-8000-00000000f204', '00000000-0000-4000-8000-00000000f101', 3, 'test/set3.jpg', 'letto', null);

-- fogli come li manda l'app dopo la revisione (solo la nostra squadra)
create temp table fogli (nome text primary key, dati jsonb);
insert into fogli values
  ('set1', '{"tipo_foglio":"set","numero_set":1,"squadre":[{"nome":"SMAPIU ARENA","lato":"nostra","giocatrici":[
     {"numero":2,"nome":"Riccato","tot":6,"err":1,"mur":0,"pt":4},
     {"numero":17,"nome":"Tellaroli","tot":12,"err":2,"mur":1,"pt":2},
     {"numero":12,"nome":"Trampus","tot":5,"err":0,"mur":1,"pt":2},
     {"numero":13,"nome":"Trevisan","tot":9,"err":1,"mur":0,"pt":3},
     {"numero":10,"nome":"Bonini","tot":2,"err":0,"mur":0,"pt":0}],
     "totali":{"tot":34,"err":4,"mur":2,"pt":11},"punti_vinti_att_per_set":{"1":11}}]}'),
  ('set2', '{"tipo_foglio":"set","numero_set":2,"squadre":[{"nome":"SMAPIU ARENA","lato":"nostra","giocatrici":[
     {"numero":2,"nome":"Riccato","tot":10,"err":1,"mur":1,"pt":4},
     {"numero":17,"nome":"Tellaroli","tot":11,"err":1,"mur":1,"pt":3},
     {"numero":12,"nome":"Trampus","tot":6,"err":0,"mur":0,"pt":4},
     {"numero":13,"nome":"Trevisan","tot":11,"err":2,"mur":1,"pt":2},
     {"numero":10,"nome":"Bonini","tot":1,"err":0,"mur":0,"pt":1},
     {"numero":14,"nome":"Giroldi","tot":2,"err":0,"mur":0,"pt":2}],
     "totali":{"tot":41,"err":4,"mur":3,"pt":16},"punti_vinti_att_per_set":{"1":11,"2":16}}]}'),
  ('finale', '{"tipo_foglio":"finale","numero_set":null,"squadre":[{"nome":"SMAPIU ARENA","lato":"nostra","giocatrici":[
     {"numero":2,"nome":"Riccato","tot":21,"err":2,"mur":1,"pt":12},
     {"numero":17,"nome":"Tellaroli","tot":42,"err":5,"mur":4,"pt":11},
     {"numero":12,"nome":"Trampus","tot":21,"err":1,"mur":2,"pt":10},
     {"numero":13,"nome":"Trevisan","tot":33,"err":4,"mur":2,"pt":8},
     {"numero":10,"nome":"Bonini","tot":4,"err":0,"mur":0,"pt":2},
     {"numero":14,"nome":"Giroldi","tot":3,"err":0,"mur":1,"pt":2}],
     "totali":{"tot":124,"err":12,"mur":10,"pt":45},"punti_vinti_att_per_set":{"1":11,"2":16,"3":18}}]}'),
  ('set3', '{"tipo_foglio":"set","numero_set":3,"squadre":[{"nome":"SMAPIU ARENA","lato":"nostra","giocatrici":[
     {"numero":2,"nome":"Riccato","tot":5,"err":0,"mur":0,"pt":4},
     {"numero":17,"nome":"Tellaroli","tot":19,"err":2,"mur":2,"pt":6},
     {"numero":12,"nome":"Trampus","tot":10,"err":1,"mur":1,"pt":4},
     {"numero":13,"nome":"Trevisan","tot":13,"err":1,"mur":1,"pt":3},
     {"numero":10,"nome":"Bonini","tot":1,"err":0,"mur":0,"pt":1},
     {"numero":14,"nome":"Giroldi","tot":1,"err":0,"mur":1,"pt":0}],
     "totali":{"tot":49,"err":4,"mur":5,"pt":18},"punti_vinti_att_per_set":{"1":11,"2":16,"3":18}}]}');
grant select on fogli to authenticated;

-- set 3 atteso (numero, tot, err, mur, pt, derivato)
create temp table atteso_set3 as
select * from (values (2, 5, 0, 0, 4), (17, 19, 2, 2, 6), (12, 10, 1, 1, 4), (13, 13, 1, 1, 3), (10, 1, 0, 0, 1), (14, 1, 0, 1, 0))
  v(numero, tot, err, mur, pt);
grant select on atteso_set3 to authenticated;

-- ---------- utente qualsiasi ----------

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}';

select throws_ok($$ select public.conferma_tabellino('00000000-0000-4000-8000-00000000f201', (select dati from fogli where nome = 'set1')) $$,
  '42501', null, 'tifoso: non può confermare un tabellino');
select is((select count(*)::int from public.tabellini), 0, 'tifoso: non vede i tabellini');
select throws_ok($$ insert into public.statistiche_attacco (partita_id, squadra, numero_set, numero_maglia)
                    values ('00000000-0000-4000-8000-00000000f101', 'nostra', 1, 99) $$, '42501', null,
  'tifoso: non scrive le statistiche');

-- ---------- staff ----------

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';

select lives_ok($$ select public.conferma_tabellino('00000000-0000-4000-8000-00000000f201', (select dati from fogli where nome = 'set1')) $$,
  'staff: conferma il foglio del set 1');
select lives_ok($$ select public.conferma_tabellino('00000000-0000-4000-8000-00000000f202', (select dati from fogli where nome = 'set2')) $$,
  'staff: conferma il foglio del set 2');
-- stesso foglio rifotografato: stesse righe, nessun doppione
select lives_ok($$ select public.conferma_tabellino('00000000-0000-4000-8000-00000000f201', (select dati from fogli where nome = 'set1')) $$,
  'staff: riconferma del set 1');
select is((select count(*)::int from public.statistiche_attacco where numero_set = 1), 5, 'set 1: 5 righe anche dopo la riconferma');

select is((public.conferma_tabellino('00000000-0000-4000-8000-00000000f203', (select dati from fogli where nome = 'finale')) -> 'note'),
  '[]'::jsonb, 'staff: conferma del finale, nessuna annotazione');

select is((select count(*)::int from public.statistiche_attacco where numero_set = 3), 6, 'set 3 ricavato: 6 giocatrici');
select ok((select bool_and(derivato) from public.statistiche_attacco where numero_set = 3), 'set 3: righe derivate dal finale');
select is(
  (select count(*)::int from atteso_set3 e
     join public.statistiche_attacco a on a.numero_set = 3 and a.squadra = 'nostra' and a.numero_maglia = e.numero
    where a.tentativi = e.tot and a.errori = e.err and a.murati = e.mur and a.punti = e.pt),
  6, 'set 3 per differenza = set 3 del tabellino (Pt/Tot/Err/Mur di tutte)');
select is((select sum(punti)::int from public.statistiche_attacco where numero_set = 3), 18, 'set 3: 18 punti in attacco');
select is((select sum(tentativi)::int from public.statistiche_attacco where numero_set = 3), 49, 'set 3: 49 attacchi');

select is((select punti from public.attacco_giocatrici_partita where numero_maglia = 2), 12, 'vista: Riccato 12 punti in partita');
select is((select pt_perc from public.attacco_giocatrici_partita where numero_maglia = 2), 57, 'vista: Riccato Pt% 57 (12/21)');

-- il foglio del set 3 arriva dopo il finale: prende il posto delle righe derivate, i totali non cambiano
select public.conferma_tabellino('00000000-0000-4000-8000-00000000f204', (select dati from fogli where nome = 'set3'));
select is((select count(*)::int from public.statistiche_attacco where derivato), 0, 'set 3 dal foglio: nessuna riga derivata');
select is((select sum(punti)::int from public.attacco_giocatrici_partita where partita_id = '00000000-0000-4000-8000-00000000f101'), 45,
  'partita: 45 punti in attacco');

-- seconda partita: solo il set 1 (con Riccato a 13 punti, più del finale) e il finale
reset role;
insert into public.partite (id, stagione_id, nostra_partita, data_partita) values
  ('00000000-0000-4000-8000-00000000f102', '00000000-0000-4000-8000-00000000f001', false, now());
insert into public.tabellini (id, partita_id, numero_set, percorso_immagine, stato) values
  ('00000000-0000-4000-8000-00000000f211', '00000000-0000-4000-8000-00000000f102', 1, 'test/b-set1.jpg', 'letto'),
  ('00000000-0000-4000-8000-00000000f213', '00000000-0000-4000-8000-00000000f102', null, 'test/b-finale.jpg', 'letto');
set local role authenticated;
select public.conferma_tabellino('00000000-0000-4000-8000-00000000f211',
  jsonb_set((select dati from fogli where nome = 'set1'), '{squadre,0,giocatrici,0}', '{"numero":2,"nome":"Riccato","tot":6,"err":1,"mur":0,"pt":13}'));
create temp table esito_b as
select public.conferma_tabellino('00000000-0000-4000-8000-00000000f213', (select dati from fogli where nome = 'finale')) as r;

select ok((select r -> 'note' ->> 0 like '%set 2, 3 senza foglio%' from esito_b), 'più set mancanti: differenza sull''ultimo, annotata');
select is((select count(*)::int from public.statistiche_attacco where partita_id = '00000000-0000-4000-8000-00000000f102' and numero_set = 2), 0,
  'più set mancanti: niente righe sul set 2');
select is((select punti from public.attacco_giocatrici_partita where partita_id = '00000000-0000-4000-8000-00000000f102' and numero_maglia = 2), 12,
  'set salvati incoerenti: il finale prevale (Riccato 12)');

select * from finish();
rollback;
