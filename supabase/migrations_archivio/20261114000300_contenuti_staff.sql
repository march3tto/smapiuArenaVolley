-- Gestione contenuti dall'app (Altro > Gestione contenuti): lo staff carica le copertine delle news nel bucket "news".
-- notizie e media hanno già le policy notizie_scrittura_staff / media_scrittura_staff (e_staff()); mancavano quelle
-- dello Storage: senza, l'upload dall'app viene rifiutato (finora le copertine le caricava lo script con la service role).
-- Il bucket resta pubblico in lettura (URL pubblici), la scrittura è solo dello staff.

begin;

insert into storage.buckets (id, name, public)
values ('news', 'news', true)
on conflict (id) do nothing;

-- upsert (x-upsert) ha bisogno anche di select e update
drop policy if exists news_storage_lettura_staff on storage.objects;
create policy news_storage_lettura_staff on storage.objects
  for select to authenticated using (bucket_id = 'news' and public.e_staff());

drop policy if exists news_storage_inserimento_staff on storage.objects;
create policy news_storage_inserimento_staff on storage.objects
  for insert to authenticated with check (bucket_id = 'news' and public.e_staff());

drop policy if exists news_storage_modifica_staff on storage.objects;
create policy news_storage_modifica_staff on storage.objects
  for update to authenticated using (bucket_id = 'news' and public.e_staff()) with check (bucket_id = 'news' and public.e_staff());

drop policy if exists news_storage_eliminazione_staff on storage.objects;
create policy news_storage_eliminazione_staff on storage.objects
  for delete to authenticated using (bucket_id = 'news' and public.e_staff());

-- copertine dei video/podcast caricate dall'app: stesso bucket, cartella media/
-- (nessuna policy in più: il controllo è sul bucket)

commit;
