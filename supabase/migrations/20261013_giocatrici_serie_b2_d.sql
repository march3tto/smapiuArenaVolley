-- Rose Serie B2 e Serie D 2026/27 (dal sito ufficiale): nome, numero di maglia e data di nascita.
-- Richiede 20261013_livelli_serie_b2_d.sql. Rieseguibile: salta le giocatrici già presenti nello stesso livello.

begin;

with squadra as (
  select id from public.squadre where nostra_squadra
), stagione as (
  -- la stagione corrente che contiene già la rosa della prima squadra
  select g.stagione_id as id
  from public.giocatrici g join public.squadre s on s.id = g.squadra_id and s.nostra_squadra
  where g.livello_squadra = 'prima_squadra'
  limit 1
), rosa (livello, categoria, ordine, numero, nome, cognome, nascita) as (
  values
    ('serie_b2', 'Serie B2', 1, 7, 'Matilda', 'Aurenghi', '2009-04-28'),
    ('serie_b2', 'Serie B2', 2, 18, 'Gaia', 'Bissolo', '2008-02-06'),
    ('serie_b2', 'Serie B2', 3, 1, 'Irene', 'Ciotti', '2010-05-08'),
    ('serie_b2', 'Serie B2', 4, 8, 'Elisa', 'Fusa', '2009-09-04'),
    ('serie_b2', 'Serie B2', 5, 5, 'Matilde', 'Galetti', '2008-12-17'),
    ('serie_b2', 'Serie B2', 6, 9, 'Alexa', 'Hubacech', '2009-05-03'),
    ('serie_b2', 'Serie B2', 7, 14, 'Emma', 'Iannone', '2011-04-20'),
    ('serie_b2', 'Serie B2', 8, 19, 'Irene', 'Lenzi', '2010-09-15'),
    ('serie_b2', 'Serie B2', 9, 12, 'Maddalena', 'Molinaroli', '2009-11-10'),
    ('serie_b2', 'Serie B2', 10, 10, 'Teresa Ifeoma', 'Okonji', '2009-10-03'),
    ('serie_b2', 'Serie B2', 11, 15, 'Desiree', 'Raffa', '2010-05-24'),
    ('serie_b2', 'Serie B2', 12, 16, 'Anna', 'Sabato', '2010-12-10'),
    ('serie_b2', 'Serie B2', 13, 4, 'Greta', 'Schiavo', '2008-02-04'),
    ('serie_b2', 'Serie B2', 14, 13, 'Alessia', 'Stefanoni', '2009-07-26'),
    ('serie_d', 'Serie D', 1, 5, 'Desiree', 'Benaglia', '2010-12-29'),
    ('serie_d', 'Serie D', 2, 3, 'Stella', 'Berti', '2010-09-20'),
    ('serie_d', 'Serie D', 3, 9, 'Noemi', 'Bolla', '2010-03-09'),
    ('serie_d', 'Serie D', 4, 8, 'Antonella', 'Capasso', '2010-07-01'),
    ('serie_d', 'Serie D', 5, 4, 'Martina', 'Fusini', '2010-10-04'),
    ('serie_d', 'Serie D', 6, 10, 'Mia', 'Genovese', '2011-12-12'),
    ('serie_d', 'Serie D', 7, 17, 'Emma', 'Iannone', '2011-04-20'),
    ('serie_d', 'Serie D', 8, 2, 'Anita', 'Mazzi', '2011-05-05'),
    ('serie_d', 'Serie D', 9, 18, 'Alice', 'Murari', '2010-06-27'),
    ('serie_d', 'Serie D', 10, 6, 'Chiara', 'Nuvolini', '2011-06-18'),
    ('serie_d', 'Serie D', 11, 13, 'Lucrezia', 'Pasut', '2011-07-13'),
    ('serie_d', 'Serie D', 12, 7, 'Maddalena', 'Poletto', '2011-07-11'),
    ('serie_d', 'Serie D', 13, 11, 'Martina', 'Zamboni', '2011-03-11')
)
insert into public.giocatrici (stagione_id, squadra_id, livello_squadra, categoria_giovanile_id, nome, cognome, numero_maglia, data_nascita, anno_nascita, ordine, attiva)
select st.id, sq.id, r.livello::public.livello_squadra, c.id, r.nome, r.cognome, r.numero, r.nascita::date, extract(year from r.nascita::date)::smallint, r.ordine, true
from rosa r
cross join squadra sq
cross join stagione st
join public.categorie_giovanili c on c.nome = r.categoria
where not exists (
  select 1 from public.giocatrici g
  where g.livello_squadra = r.livello::public.livello_squadra and g.nome = r.nome and g.cognome = r.cognome
);

commit;
