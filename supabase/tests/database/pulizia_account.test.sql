-- Test pgTAP della pulizia automatica degli account senza consensi (migration 20261124000000).
-- Esecuzione in locale: supabase test db
-- Tutto avviene in una transazione annullata alla fine: nessun dato resta nel database.

begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- b1 vecchio senza consensi (da eliminare), b2 vecchio con informativa accettata, b3 recente senza consensi,
-- b4 vecchio con informativa di una versione precedente, b5 staff vecchio senza consensi,
-- b6 vecchio con solo marketing (come chi entra con Apple e cambia le impostazioni senza completare l'onboarding)
insert into auth.users (id, email, aud, role, created_at) values
  ('00000000-0000-4000-8000-0000000000b1', 'vecchio@test.local', 'authenticated', 'authenticated', now() - interval '8 days'),
  ('00000000-0000-4000-8000-0000000000b2', 'completo@test.local', 'authenticated', 'authenticated', now() - interval '30 days'),
  ('00000000-0000-4000-8000-0000000000b3', 'recente@test.local', 'authenticated', 'authenticated', now() - interval '2 days'),
  ('00000000-0000-4000-8000-0000000000b4', 'aggiornare@test.local', 'authenticated', 'authenticated', now() - interval '60 days'),
  ('00000000-0000-4000-8000-0000000000b5', 'staff@test.local', 'authenticated', 'authenticated', now() - interval '60 days'),
  ('00000000-0000-4000-8000-0000000000b6', 'apple@test.local', 'authenticated', 'authenticated', now() - interval '10 days');

insert into public.consensi_utente (utente_id, tipo, concesso, versione_informativa, provider_accesso) values
  ('00000000-0000-4000-8000-0000000000b2', 'informativa_privacy', true, '2026-10-v2', 'email'),
  ('00000000-0000-4000-8000-0000000000b2', 'eta_14_anni', true, '2026-10-v2', 'email'),
  ('00000000-0000-4000-8000-0000000000b4', 'informativa_privacy', true, '2020-01-v1', 'email'),
  ('00000000-0000-4000-8000-0000000000b6', 'marketing', true, '2026-10-v2', 'apple');

update public.profili set ruolo = 'staff' where id = '00000000-0000-4000-8000-0000000000b5';

select is(
  (select count(*)::int from public.account_eliminati where origine = 'automatica'
     and utente_eliminato_id::text like '00000000-0000-4000-8000-0000000000b%'), 0, 'prima della pulizia nessun registro');

select public.elimina_account_senza_consensi();

select ok(not exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000000b1'),
  'account vecchio senza consensi eliminato');
select ok(not exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000000b6'),
  'account vecchio con solo marketing eliminato');
select ok(not exists (select 1 from public.consensi_utente where utente_id = '00000000-0000-4000-8000-0000000000b6'),
  'consensi eliminati a cascata');
select ok(exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000000b2'),
  'account con informativa accettata conservato');
select ok(exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000000b3'),
  'account recente conservato');
select ok(exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000000b4'),
  'account con informativa di una versione precedente conservato');
select ok(exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000000b5'),
  'staff mai eliminato');
select is(
  (select count(*)::int from public.account_eliminati where origine = 'automatica'
     and utente_eliminato_id in ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000b6')
     and codice_conferma ~ '^[0-9A-F]{16}$'), 2, 'una riga anonima nel registro per ogni account eliminato');

select * from finish();
rollback;
