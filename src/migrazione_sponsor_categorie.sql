-- ============================================================
-- Sponsor: categorie come sul sito (Title, Main, Sponsor, Charity)
-- Eseguire UNA volta nell'SQL Editor, PRIMA di importare sponsors.csv
-- ============================================================
-- La tabella sponsors ha gia' il campo per l'immagine: logo_url (text).
-- Qui si allinea solo l'enum dei livelli alle categorie del sito:
--   gold   -> title    (Title sponsor)
--   silver -> main     (Main sponsor)
--   bronze -> sponsor  (Sponsor)
--   + nuovo valore charity (Charity partner)
-- Rinominare un valore mantiene i dati esistenti e il default della colonna.

alter type sponsor_tier rename value 'gold'   to 'title';
alter type sponsor_tier rename value 'silver' to 'main';
alter type sponsor_tier rename value 'bronze' to 'sponsor';
alter type sponsor_tier add value if not exists 'charity';

-- Dopo aver caricato i loghi nel bucket pubblico "sponsor" e importato sponsors.csv,
-- trasformare i percorsi relativi in URL pubblici:
-- update sponsors
--   set logo_url = 'https://<tuo-progetto>.supabase.co/storage/v1/object/public/' || logo_url
--   where logo_url not like 'http%';
