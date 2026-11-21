-- Test pgTAP dei sestetti per set e della diretta scritta solo dall'admin (migration 20261025000200_sestetti_set).
-- Esecuzione: supabase test db
-- Tutto avviene in una transazione annullata alla fine: nessun dato resta nel database.

begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- ---------- dati di prova ----------

-- b1 admin, b2 staff, b3 utente qualsiasi
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000b1', 'admin-sestetti@test.local', 'authenticated', 'authenticated', '{}'),
  ('00000000-0000-4000-8000-0000000000b2', 'staff-sestetti@test.local', 'authenticated', 'authenticated', '{}'),
  ('00000000-0000-4000-8000-0000000000b3', 'tifoso-sestetti@test.local', 'authenticated', 'authenticated', '{}');
update public.profili set ruolo = 'admin' where id = '00000000-0000-4000-8000-0000000000b1';
update public.profili set ruolo = 'staff' where id = '00000000-0000-4000-8000-0000000000b2';

insert into public.stagioni (id, etichetta, corrente) values ('00000000-0000-4000-8000-00000000d001', 'Test sestetti', false);
insert into public.partite (id, stagione_id, nostra_partita, data_partita) values
  ('00000000-0000-4000-8000-00000000d101', '00000000-0000-4000-8000-00000000d001', false, now()),
  ('00000000-0000-4000-8000-00000000d102', '00000000-0000-4000-8000-00000000d001', false, now());

-- referto della partita d101: 6 titolari, 3 liberi e una riserva per la nostra squadra, 1 giocatrice avversaria
insert into public.formazioni_partita (id, partita_id, squadra, numero_maglia, nome, ruolo, ordine) values
  ('00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-00000000d101', 'nostra', 1, 'Palleggio', 'palleggiatrice', 0),
  ('00000000-0000-4000-8000-00000000e002', '00000000-0000-4000-8000-00000000d101', 'nostra', 2, 'Banda Uno', 'schiacciatrice', 1),
  ('00000000-0000-4000-8000-00000000e003', '00000000-0000-4000-8000-00000000d101', 'nostra', 3, 'Centro Uno', 'centrale', 2),
  ('00000000-0000-4000-8000-00000000e004', '00000000-0000-4000-8000-00000000d101', 'nostra', 4, 'Opposto', 'opposto', 3),
  ('00000000-0000-4000-8000-00000000e005', '00000000-0000-4000-8000-00000000d101', 'nostra', 5, 'Banda Due', 'schiacciatrice', 4),
  ('00000000-0000-4000-8000-00000000e006', '00000000-0000-4000-8000-00000000d101', 'nostra', 6, 'Centro Due', 'centrale', 5),
  ('00000000-0000-4000-8000-00000000e007', '00000000-0000-4000-8000-00000000d101', 'nostra', 7, 'Libero Uno', 'libero', 6),
  ('00000000-0000-4000-8000-00000000e008', '00000000-0000-4000-8000-00000000d101', 'nostra', 8, 'Libero Due', 'libero', 7),
  ('00000000-0000-4000-8000-00000000e009', '00000000-0000-4000-8000-00000000d101', 'nostra', 9, 'Libero Tre', 'libero', 8),
  ('00000000-0000-4000-8000-00000000e010', '00000000-0000-4000-8000-00000000d101', 'avversaria', 10, 'Ospite', 'centrale', 0),
  ('00000000-0000-4000-8000-00000000e011', '00000000-0000-4000-8000-00000000d101', 'nostra', 11, 'Riserva', 'schiacciatrice', 9);

-- ---------- admin ----------

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}';

select lives_ok($$
  insert into public.sestetti_set (partita_id, numero_set, squadra, zona, convocata_id)
  select '00000000-0000-4000-8000-00000000d101', 1, 'nostra', z, ('00000000-0000-4000-8000-00000000e00' || z)::uuid
  from generate_series(1, 6) z
$$, 'admin: inserisce il sestetto del 1° set');
select is((select count(*)::int from public.sestetti_set where partita_id = '00000000-0000-4000-8000-00000000d101'), 6,
  'sei titolari nel 1° set');

select throws_ok($$ insert into public.sestetti_set (partita_id, numero_set, squadra, zona, convocata_id)
                    values ('00000000-0000-4000-8000-00000000d101', 1, 'nostra', 1, '00000000-0000-4000-8000-00000000e011') $$, '23505', null,
  'una sola titolare per zona');
select throws_ok($$ insert into public.sestetti_set (partita_id, numero_set, squadra, zona, convocata_id) values
                    ('00000000-0000-4000-8000-00000000d101', 2, 'nostra', 1, '00000000-0000-4000-8000-00000000e001'),
                    ('00000000-0000-4000-8000-00000000d101', 2, 'nostra', 2, '00000000-0000-4000-8000-00000000e001') $$, '23505', null,
  'una riga per giocatrice nello stesso set');
select lives_ok($$ insert into public.sestetti_set (partita_id, numero_set, squadra, zona, convocata_id)
                    values ('00000000-0000-4000-8000-00000000d101', 2, 'nostra', 1, '00000000-0000-4000-8000-00000000e007') $$,
  'il libero può andare in zona');
delete from public.sestetti_set where partita_id = '00000000-0000-4000-8000-00000000d101' and numero_set = 2;
select throws_ok($$ insert into public.sestetti_set (partita_id, numero_set, squadra, zona, convocata_id)
                    values ('00000000-0000-4000-8000-00000000d101', 2, 'nostra', null, '00000000-0000-4000-8000-00000000e003') $$, '23514', null,
  'libero solo con ruolo Libero');
select throws_ok($$ insert into public.sestetti_set (partita_id, numero_set, squadra, zona, convocata_id)
                    values ('00000000-0000-4000-8000-00000000d102', 1, 'nostra', 1, '00000000-0000-4000-8000-00000000e001') $$, '23514', null,
  'la giocatrice deve essere a referto per la stessa partita');
select throws_ok($$ insert into public.sestetti_set (partita_id, numero_set, squadra, zona, convocata_id)
                    values ('00000000-0000-4000-8000-00000000d101', 1, 'avversaria', 1, '00000000-0000-4000-8000-00000000e001') $$, '23514', null,
  'la giocatrice deve essere della stessa squadra');

select lives_ok($$ insert into public.sestetti_set (partita_id, numero_set, squadra, zona, convocata_id) values
                   ('00000000-0000-4000-8000-00000000d101', 1, 'nostra', null, '00000000-0000-4000-8000-00000000e007'),
                   ('00000000-0000-4000-8000-00000000d101', 1, 'nostra', null, '00000000-0000-4000-8000-00000000e008') $$,
  'due liberi nello stesso set');
select throws_ok($$ insert into public.sestetti_set (partita_id, numero_set, squadra, zona, convocata_id)
                    values ('00000000-0000-4000-8000-00000000d101', 1, 'nostra', null, '00000000-0000-4000-8000-00000000e009') $$, '23514', null,
  'al massimo 2 liberi per set e squadra');

-- scambio di zone (I ↔ II) col salvataggio in un colpo solo, come fa l'app
select lives_ok($$ select public.salva_sestetto('00000000-0000-4000-8000-00000000d101', 1::smallint, 'nostra', '[
  {"zona": 2, "convocata_id": "00000000-0000-4000-8000-00000000e001"}, {"zona": 1, "convocata_id": "00000000-0000-4000-8000-00000000e002"},
  {"zona": 3, "convocata_id": "00000000-0000-4000-8000-00000000e003"}, {"zona": 4, "convocata_id": "00000000-0000-4000-8000-00000000e004"},
  {"zona": 5, "convocata_id": "00000000-0000-4000-8000-00000000e005"}, {"zona": 6, "convocata_id": "00000000-0000-4000-8000-00000000e006"},
  {"zona": null, "convocata_id": "00000000-0000-4000-8000-00000000e007"}, {"zona": null, "convocata_id": "00000000-0000-4000-8000-00000000e008"}
]'::jsonb) $$, 'salva_sestetto: scambio di due titolari');
select is((select zona from public.sestetti_set where convocata_id = '00000000-0000-4000-8000-00000000e002' and numero_set = 1), 1::smallint,
  'salva_sestetto: la schiacciatrice ora è in zona I');
select throws_ok($$ select public.salva_sestetto('00000000-0000-4000-8000-00000000d101', 1::smallint, 'nostra', '[
  {"zona": 1, "convocata_id": "00000000-0000-4000-8000-00000000e001"}, {"zona": null, "convocata_id": "00000000-0000-4000-8000-00000000e003"}
]'::jsonb) $$, '23514', null, 'salva_sestetto: con una riga non valida non salva niente');
select is((select count(*)::int from public.sestetti_set where partita_id = '00000000-0000-4000-8000-00000000d101'), 8,
  'salva_sestetto: dopo l''errore il sestetto è quello di prima');

reset role;

-- ---------- staff ----------

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}';

select throws_ok($$ insert into public.sestetti_set (partita_id, numero_set, squadra, zona, convocata_id)
                    values ('00000000-0000-4000-8000-00000000d101', 2, 'nostra', 1, '00000000-0000-4000-8000-00000000e001') $$, '42501', null,
  'staff: non scrive i sestetti');
select throws_ok($$ insert into public.eventi_live (partita_id, numero_set, punteggio_nostro, punteggio_avversario, descrizione)
                    values ('00000000-0000-4000-8000-00000000d101', 1, 1, 0, 'Punto') $$, '42501', null,
  'staff: non assegna punti');
select throws_ok($$ select public.salva_sestetto('00000000-0000-4000-8000-00000000d101', 1::smallint, 'nostra', '[
  {"zona": 1, "convocata_id": "00000000-0000-4000-8000-00000000e001"}]'::jsonb) $$, '42501', null,
  'staff: non usa salva_sestetto');
select is((select count(*)::int from public.sestetti_set where partita_id = '00000000-0000-4000-8000-00000000d101'), 8,
  'staff: legge i sestetti, che restano quelli dell''admin');

-- ---------- utente pubblico ----------

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000b3","role":"authenticated"}';

-- con la RLS la cancellazione non dà errore: semplicemente non tocca nessuna riga
delete from public.sestetti_set where partita_id = '00000000-0000-4000-8000-00000000d101';
select is((select count(*)::int from public.sestetti_set where partita_id = '00000000-0000-4000-8000-00000000d101'), 8,
  'pubblico: legge i sestetti ma non li cancella');

set local role anon;
select is((select count(*)::int from public.sestetti_set where partita_id = '00000000-0000-4000-8000-00000000d101'), 8,
  'anonimo: legge i sestetti');

select * from finish();
rollback;
