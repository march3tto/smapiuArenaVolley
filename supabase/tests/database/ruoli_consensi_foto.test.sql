-- Test pgTAP di ruoli, consensi, foto e registro cancellazioni (migration 20261016000100-300).
-- Esecuzione in locale: supabase test db  (richiede lo schema base, vedi docs/gdpr/README.md)
-- Tutto avviene in una transazione annullata alla fine: nessun dato resta nel database.

begin;
create extension if not exists pgtap with schema extensions;

select plan(37);

-- ---------- dati di prova ----------

-- a1 diventerà admin, a2 staff, a3 si registra chiedendo il ruolo admin nei metadata, a4 utente qualsiasi
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin@test.local', 'authenticated', 'authenticated', '{"full_name":"Admin Prova"}'),
  ('00000000-0000-4000-8000-0000000000a2', 'staff@test.local', 'authenticated', 'authenticated', '{"name":"Staff Prova"}'),
  ('00000000-0000-4000-8000-0000000000a3', 'furbo@test.local', 'authenticated', 'authenticated', '{"full_name":"Utente Furbo","role":"admin","ruolo":"admin"}'),
  ('00000000-0000-4000-8000-0000000000a4', 'tifoso@test.local', 'authenticated', 'authenticated', '{}');

select is((select ruolo::text from public.profili where id = '00000000-0000-4000-8000-0000000000a3'), 'pubblico',
  'signup con role/ruolo admin nei metadata: profilo pubblico');
select is((select nome_completo from public.profili where id = '00000000-0000-4000-8000-0000000000a3'), 'Utente Furbo',
  'signup: nome_completo da full_name');
select is((select nome_completo from public.profili where id = '00000000-0000-4000-8000-0000000000a2'), 'Staff Prova',
  'signup: nome_completo da name se manca full_name');
select is((select count(*)::int from public.profili where id::text like '00000000-0000-4000-8000-0000000000a%' and ruolo <> 'pubblico'), 0,
  'tutti i nuovi profili nascono pubblico');

-- ruoli assegnati come da SQL Editor (senza auth.uid())
-- (eventuali admin già presenti nel database non cambiano l'esito dei test)
select lives_ok($$ update public.profili set ruolo = 'admin' where id = '00000000-0000-4000-8000-0000000000a1' $$,
  'da SQL Editor si può assegnare admin');
update public.profili set ruolo = 'staff' where id = '00000000-0000-4000-8000-0000000000a2';

select throws_ok($$ insert into public.profili (id, ruolo) values (gen_random_uuid(), 'admin') $$, '42501', null,
  'nessun profilo nasce con un ruolo diverso da pubblico, neanche da SQL');

-- ---------- utente pubblico (a3) ----------

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}';

select throws_ok($$ update public.profili set ruolo = 'admin' where id = auth.uid() $$, '42501', null,
  'pubblico: non può darsi il ruolo admin');
select throws_ok($$ update public.profili set ruolo = 'staff' where id = auth.uid() $$, '42501', null,
  'pubblico: non può darsi il ruolo staff');
select throws_ok($$ update public.profili set ruolo = 'admin' where id = '00000000-0000-4000-8000-0000000000a4' $$, '42501', null,
  'pubblico: non può cambiare il ruolo di altri');
select throws_ok($$ insert into public.profili (id, nome_completo) values (gen_random_uuid(), 'X') $$, '42501', null,
  'pubblico: non può inserire profili');
select throws_ok($$ delete from public.profili where id = auth.uid() $$, '42501', null,
  'pubblico: non può cancellare profili');
select lives_ok($$ update public.profili set nome_completo = 'Nome Nuovo' where id = auth.uid() $$,
  'pubblico: può cambiare il proprio nome');
select throws_ok($$ select public.imposta_ruolo_utente('00000000-0000-4000-8000-0000000000a4', 'genitore') $$, '42501', null,
  'pubblico: non può usare imposta_ruolo_utente');

-- consensi
select lives_ok($$ insert into public.consensi_utente (utente_id, tipo, concesso, versione_informativa, provider_accesso)
                   values (auth.uid(), 'informativa_privacy', true, '2026-10-v1', 'email') $$,
  'consensi: inserimento delle proprie righe');
select throws_ok($$ insert into public.consensi_utente (utente_id, tipo, concesso, versione_informativa)
                    values ('00000000-0000-4000-8000-0000000000a4', 'marketing', true, '2026-10-v1') $$, '42501', null,
  'consensi: niente righe a nome di altri');
select throws_ok($$ insert into public.consensi_utente (utente_id, tipo, concesso, versione_informativa, origine)
                    values (auth.uid(), 'marketing', true, '2026-10-v1', 'staff') $$, '42501', null,
  'consensi: origine non impostabile dal client');
select throws_ok($$ update public.consensi_utente set concesso = false where utente_id = auth.uid() $$, '42501', null,
  'consensi: niente update');
select throws_ok($$ delete from public.consensi_utente where utente_id = auth.uid() $$, '42501', null,
  'consensi: niente delete');
select throws_ok($$ insert into public.account_eliminati (utente_eliminato_id, origine, codice_conferma) values (auth.uid(), 'app', 'X') $$, '42501', null,
  'account_eliminati: nessuna scrittura dal client');

reset role;
-- due scelte marketing in momenti diversi (dal client creato_il non è impostabile)
insert into public.consensi_utente (utente_id, tipo, concesso, versione_informativa, creato_il) values
  ('00000000-0000-4000-8000-0000000000a3', 'marketing', true, '2026-10-v1', now() - interval '1 day'),
  ('00000000-0000-4000-8000-0000000000a3', 'marketing', false, '2026-10-v1', now()),
  ('00000000-0000-4000-8000-0000000000a4', 'marketing', true, '2026-10-v1', now());

select throws_ok($$ update public.consensi_utente set concesso = true $$, '42501', null,
  'consensi: append-only anche da SQL');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}';

select is((select concesso from public.consensi_utente_attuali where tipo = 'marketing'), false,
  'consensi_utente_attuali: vale l''ultima scelta (revoca)');
select is((select count(*)::int from public.consensi_utente where utente_id <> auth.uid()), 0,
  'consensi: un utente non vede quelli degli altri');

-- ---------- staff (a2) ----------

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}';

select lives_ok($$ select public.imposta_ruolo_utente('00000000-0000-4000-8000-0000000000a4', 'genitore') $$,
  'staff: può assegnare genitore');
select is((select ruolo::text from public.profili where id = '00000000-0000-4000-8000-0000000000a4'), 'genitore',
  'staff: ruolo genitore assegnato');
select throws_ok($$ select public.imposta_ruolo_utente('00000000-0000-4000-8000-0000000000a4', 'staff') $$, '42501', null,
  'staff: non può assegnare staff');
select throws_ok($$ select public.imposta_ruolo_utente('00000000-0000-4000-8000-0000000000a4', 'admin') $$, '42501', null,
  'staff: non può assegnare admin');
select throws_ok($$ select public.imposta_ruolo_utente(auth.uid(), 'pubblico') $$, '42501', null,
  'staff: non può cambiare il proprio ruolo');

-- ---------- admin (a1) ----------

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}';

select lives_ok($$ select public.imposta_ruolo_utente('00000000-0000-4000-8000-0000000000a4', 'staff') $$,
  'admin: può assegnare staff');
select throws_ok($$ select public.imposta_ruolo_utente('00000000-0000-4000-8000-0000000000a3', 'admin') $$, '42501', null,
  'admin: non può assegnare admin dall''app');
select throws_ok($$ update public.profili set ruolo = 'admin' where id = '00000000-0000-4000-8000-0000000000a3' $$, '42501', null,
  'admin: niente update diretto del ruolo');

-- ---------- ultimo admin ----------

reset role;
select throws_ok(
  $$ update public.profili set ruolo = 'pubblico' where ruolo = 'admin' $$, '42501', null,
  'l''ultimo admin non si può declassare');

-- ---------- giocatrici e album ----------

insert into public.stagioni (id, etichetta) values ('00000000-0000-4000-8000-0000000000b1', 'Test');
insert into public.squadre (id, nome, nostra_squadra) values ('00000000-0000-4000-8000-0000000000c1', 'Squadra test', true);
insert into public.giocatrici (id, stagione_id, squadra_id, nome, cognome, foto_url, bio, consenso_foto, consenso_foto_data) values
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000c1', 'Senza', 'Liberatoria', 'players/a.jpg', 'bio a', false, null),
  ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000c1', 'Con', 'Liberatoria', 'players/b.jpg', 'bio b', true, current_date);
insert into public.album_foto (id, titolo, pubblicato, consenso_verificato) values
  ('00000000-0000-4000-8000-0000000000e1', 'Bozza', false, false),
  ('00000000-0000-4000-8000-0000000000e2', 'Pubblicato', true, true);
insert into public.foto (album_id, url_immagine) values
  ('00000000-0000-4000-8000-0000000000e1', 'x.jpg'),
  ('00000000-0000-4000-8000-0000000000e2', 'y.jpg');

select throws_ok($$ insert into public.album_foto (titolo, pubblicato) values ('No', true) $$, '23514', null,
  'album: non si pubblica senza consenso verificato');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select is((select count(*)::int from public.giocatrici where id in ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000d2')), 0,
  'giocatrici: tabella non leggibile dal pubblico');
select is((select coalesce(foto_url, 'null') || '|' || coalesce(bio, 'null') from public.giocatrici_pubbliche where id = '00000000-0000-4000-8000-0000000000d1'), 'null|null',
  'giocatrici_pubbliche: senza consenso foto e bio nulle');
select is((select foto_url || '|' || bio from public.giocatrici_pubbliche where id = '00000000-0000-4000-8000-0000000000d2'), 'players/b.jpg|bio b',
  'giocatrici_pubbliche: con consenso foto e bio visibili');
select ok(not has_table_privilege('anon', 'public.giocatrici_pubbliche', 'INSERT,UPDATE,DELETE')
          and not has_table_privilege('authenticated', 'public.giocatrici_pubbliche', 'INSERT,UPDATE,DELETE'),
  'giocatrici_pubbliche: sola lettura');
select is((select string_agg(a.titolo || ':' || (select count(*) from public.foto f where f.album_id = a.id), ',') from public.album_foto a
           where a.id in ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000e2')), 'Pubblicato:1',
  'album e foto: il pubblico vede solo gli album pubblicati');

reset role;
select * from finish();
rollback;
