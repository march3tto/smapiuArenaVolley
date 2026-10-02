-- ============================================================
-- Partite: giornata, andata/ritorno e logo avversaria
-- Eseguire PRIMA di (re)importare matches.csv
-- ============================================================
alter table matches add column if not exists giornata int;
alter table matches add column if not exists fase text check (fase in ('andata', 'ritorno'));
alter table matches add column if not exists opponent_logo_url text;  -- logo della squadra avversaria (Storage)

-- La diretta in home compare solo se esiste una partita con status = 'live':
--   update matches set status = 'live' where id = '<id partita>';
-- e torna nascosta quando la partita passa a 'finished'.

-- Se hai gia' importato matches.csv senza queste colonne, puoi valorizzarle
-- reimportando il nuovo matches.csv (stessi id) oppure con:
-- update matches m set giornata = v.g, fase = v.f
-- from (values ('<id>', 1, 'andata') /* ... */) as v(id, g, f) where m.id = v.id::uuid;
