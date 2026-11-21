-- Una sola stagione "corrente".
-- Oggi nel DB ci sono tre stagioni con corrente = true:
--   de000001-...  "2026/27"               -> rosa, calendario, classifica, diretta
--   8f9d99dd-...  "Pre-season schedule"   -> solo l'amichevole con Alta Fratte PD A2
--   8297620b-...  "A3 Femminile Girone B" -> vuota
-- L'app sceglieva la prima a caso e mostrava Squadra e Classifica vuote.
-- Da eseguire in Supabase > SQL Editor.

begin;

-- 1. l'amichevole pre-campionato entra nella stagione 2026/27 (girone null = amichevole)
update public.partite
set stagione_id = 'de000001-0000-4000-8000-000000000001'
where stagione_id = '8f9d99dd-c63c-4e74-9628-738d7dabc870';

-- 2. resta corrente solo la 2026/27
update public.stagioni
set corrente = (id = 'de000001-0000-4000-8000-000000000001');

-- 3. il DB impedisce di avere di nuovo due stagioni correnti
create unique index if not exists stagioni_una_sola_corrente
  on public.stagioni (corrente)
  where corrente;

commit;

-- 4. diretta in tempo reale: le tabelle devono essere nella pubblicazione supabase_realtime.
--    Se una riga dà "already member of publication", quella tabella è già a posto.
-- alter publication supabase_realtime add table public.partite;
-- alter publication supabase_realtime add table public.set_partita;
-- alter publication supabase_realtime add table public.eventi_live;
