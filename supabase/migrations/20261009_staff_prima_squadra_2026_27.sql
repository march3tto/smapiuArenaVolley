-- Staff tecnico reale della prima squadra (Serie A3 2026/27).
-- Le righe di prova della prima squadra vengono disattivate, non cancellate.
update public.staff
set attivo = false
where categoria_giovanile_id is null
  and (nome, cognome) in (('Roberto','Sartori'), ('Luca','Bernardi'), ('Giorgio','Mantovani'), ('Carla','Benedetti'));

-- foto_url vuota: l'app usa la foto inclusa (assets/staff/<nome-cognome>.jpg)
insert into public.staff (nome, cognome, ruolo, qualifica, attivo, ordine)
values
  ('Andrea', 'Zappaterra', 'allenatore', 'Primo Allenatore', true, 1),
  ('Simone', 'Morari', 'allenatore', 'Secondo Allenatore', true, 2),
  ('Lara', 'Visonà', 'staff_sanitario', 'Fisioterapista', true, 3),
  ('Barbara', 'Bertollo', 'staff_sanitario', 'Massaggiatrice', true, 4);
