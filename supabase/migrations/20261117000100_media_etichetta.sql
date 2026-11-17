-- media: "etichetta_durata" diventa "etichetta". Il campo non contiene più solo la durata ma un'etichetta libera
-- (es. "Highlights", "Intervista", "12:30"), mostrata accanto a VIDEO/PODCAST e usata come titolo della notifica push.
-- Nessuna vista o funzione del database usa la colonna: la leggono l'app e le funzioni assistente e invia-notifica.
-- Rieseguibile: in produzione la colonna era già stata rinominata a mano.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'media' and column_name = 'etichetta_durata') then
    alter table public.media rename column etichetta_durata to etichetta;
  end if;
end $$;
