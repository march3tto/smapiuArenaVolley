-- Nuovi sponsor (livello "sponsor"), dopo quelli esistenti nell'ordine.
-- I loghi sono i .png di questa cartella, da caricare nel bucket pubblico "sponsors" con lo stesso nome:
-- l'app li legge da url_logo = 'sponsors/<file>.png'. Eseguire dopo il caricamento, altrimenti i loghi non si vedono.
-- Idempotente: uno sponsor con lo stesso nome non viene inserito due volte.

insert into public.sponsor (nome, url_logo, livello, attivo, ordine)
select v.nome, v.url_logo, 'sponsor', true, v.ordine
from (values
  ('Veneta Imballaggi', 'sponsors/veneta-imballaggi.png', 36),
  ('Time System', 'sponsors/time-system.png', 37),
  ('Scaligera Arredamenti', 'sponsors/scaligera-arredamenti.png', 38),
  ('Sordo Auto', 'sponsors/sordo-auto.png', 39),
  ('Rainoldi', 'sponsors/rainoldi.png', 40),
  ('Primamano', 'sponsors/primamano.png', 41),
  ('Elena D''Iseppi', 'sponsors/elena-d-iseppi.png', 42),
  ('Marco De Biaggi', 'sponsors/marco-de-biaggi.png', 43),
  ('Majedo', 'sponsors/majedo.png', 44),
  ('Magalini', 'sponsors/magalini.png', 45),
  ('Lineapack', 'sponsors/lineapack.png', 46),
  ('Leonardi "Benne"', 'sponsors/leonardi-benne.png', 47),
  ('Gelmini', 'sponsors/gelmini.png', 48),
  ('EsseGi', 'sponsors/essegi.png', 49),
  ('Ilmur Verona', 'sponsors/ilmur-verona.png', 50),
  ('G&P Formazione', 'sponsors/g-p-formazione.png', 51),
  ('Dolce Sicilia', 'sponsors/dolce-sicilia.png', 52),
  ('Connectlife', 'sponsors/connectlife.png', 53),
  ('Ca'' Fontana', 'sponsors/ca-fontana.png', 54)
) as v(nome, url_logo, ordine)
where not exists (select 1 from public.sponsor s where lower(s.nome) = lower(v.nome));
