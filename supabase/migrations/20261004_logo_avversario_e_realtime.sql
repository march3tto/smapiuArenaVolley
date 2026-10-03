-- Pulizia dopo l'unione con la nuova app.
-- Da eseguire in Supabase > SQL Editor.

begin;

-- 1. partite ha due colonne per lo stesso dato (logo_avversario_url e opponent_logo_url,
--    quest'ultima aggiunta da una migrazione pensata per lo schema in inglese).
--    L'app legge logo_avversario_url (e opponent_logo_url solo come riserva):
--    si copia il dato e si elimina il doppione.
update public.partite
set logo_avversario_url = opponent_logo_url
where logo_avversario_url is null and opponent_logo_url is not null;

alter table public.partite drop column if exists opponent_logo_url;

commit;

-- 2. Diretta in tempo reale: le tabelle devono essere nella pubblicazione supabase_realtime.
--    Se una riga dà "already member of publication", quella tabella è già a posto.
-- alter publication supabase_realtime add table public.partite;
-- alter publication supabase_realtime add table public.set_partita;
-- alter publication supabase_realtime add table public.eventi_live;
