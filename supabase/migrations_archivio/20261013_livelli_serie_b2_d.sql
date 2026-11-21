-- Squadre regionali Serie B2 (ex Serie C) e Serie D: nuovi livelli e categorie.
-- Le giocatrici restano legate alla nostra squadra (squadre.nostra_squadra) e alla stagione corrente,
-- ma con un livello diverso da 'prima_squadra' non compaiono nella rosa della tab Squadra.
-- I valori enum aggiunti vanno usati in una transazione successiva: le giocatrici sono in 20261013_giocatrici_serie_b2_d.sql.

alter type public.livello_squadra add value if not exists 'serie_b2';
alter type public.livello_squadra add value if not exists 'serie_d';

insert into public.categorie_giovanili (nome, descrizione, ordine)
select v.nome, null, v.ordine
from (values ('Serie B2', 5), ('Serie D', 6)) as v(nome, ordine)
where not exists (select 1 from public.categorie_giovanili c where c.nome = v.nome);
