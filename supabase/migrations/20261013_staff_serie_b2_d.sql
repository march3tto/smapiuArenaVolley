-- Staff tecnico Serie B2 e Serie D 2026/27 (dal sito ufficiale), legato alla categoria giovanile.
-- Richiede 20261013_livelli_serie_b2_d.sql. Rieseguibile: salta chi è già presente nella stessa categoria.

insert into public.staff (nome, cognome, ruolo, qualifica, categoria_giovanile_id, attivo, ordine)
select v.nome, v.cognome, v.ruolo::public.ruolo_staff, v.qualifica, c.id, true, v.ordine
from (values
  ('Serie B2', 'Pasqualino', 'Leone', 'allenatore_giovanili', '1° Allenatore', 1),
  ('Serie B2', 'Marco', 'Zordan', 'allenatore_giovanili', '2° Allenatore', 2),
  ('Serie B2', 'Federico', 'Molinaroli', 'dirigente', 'Accompagnatore Ufficiale', 3),
  ('Serie D', 'Luca', 'Beltrame', 'allenatore_giovanili', '1° Allenatore', 1),
  ('Serie D', 'Mattia', 'Donato', 'allenatore_giovanili', '2° Allenatore', 2)
) as v(categoria, nome, cognome, ruolo, qualifica, ordine)
join public.categorie_giovanili c on c.nome = v.categoria
where not exists (
  select 1 from public.staff s
  where s.categoria_giovanile_id = c.id and s.nome = v.nome and s.cognome = v.cognome
);
