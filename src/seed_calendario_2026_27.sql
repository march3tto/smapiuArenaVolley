-- Seed calendario Serie A3 femminile 2026/27, Girone B
-- Orari: placeholder 17:00 (ora italiana), da aggiornare con quelli ufficiali.
begin;
insert into seasons (id, label, is_current) values ('1a7216e2-ce88-5262-9f53-679da005349e', '2026/27', true) on conflict (id) do nothing;
insert into matches (id, season_id, team_level, opponent_name, home_away, venue, match_date, girone, status) values
  ('7af4cf40-77dc-519d-8897-487b9a5c405c', '1a7216e2-ce88-5262-9f53-679da005349e', 'prima_squadra', 'Azimut Giorgione', 'trasferta', 'Castelfranco Veneto (TV)', '2026-10-18T17:00:00+02:00', 'Girone B', 'scheduled'),
  ('5616abe1-c59b-59e1-bdec-3ddfc9efaad0', '1a7216e2-ce88-5262-9f53-679da005349e', 'prima_squadra', 'Tonno Callipo Calabria', 'casa', 'Verona', '2026-10-25T17:00:00+01:00', 'Girone B', 'scheduled'),
  ('722f1300-eff3-55ca-9547-9e17c2eea7fc', '1a7216e2-ce88-5262-9f53-679da005349e', 'prima_squadra', 'CO.GE. Vesuvio Oplonti', 'trasferta', 'Torre Annunziata (NA)', '2026-10-31T17:00:00+01:00', 'Girone B', 'scheduled'),
  ('28f20e9f-83d8-5c02-bc17-8251b56d0fc0', '1a7216e2-ce88-5262-9f53-679da005349e', 'prima_squadra', 'Banca Annia Aduna Padova', 'casa', 'Verona', '2026-11-08T17:00:00+01:00', 'Girone B', 'scheduled'),
  ('f643f1d5-1e1d-5dac-8a49-5a13a334f8d7', '1a7216e2-ce88-5262-9f53-679da005349e', 'prima_squadra', 'V&V Modena', 'trasferta', 'Modena', '2026-11-14T17:00:00+01:00', 'Girone B', 'scheduled'),
  ('9f5746dc-8719-56e9-ba11-27dd04d7d6e5', '1a7216e2-ce88-5262-9f53-679da005349e', 'prima_squadra', 'Zero5 Castellana Grotte', 'casa', 'Verona', '2026-11-22T17:00:00+01:00', 'Girone B', 'scheduled'),
  ('b208f3b0-21c9-56df-81a0-563ccb2faed8', '1a7216e2-ce88-5262-9f53-679da005349e', 'prima_squadra', 'Olimpia di Navigazione Ravenna', 'trasferta', 'Ravenna', '2026-11-28T17:00:00+01:00', 'Girone B', 'scheduled'),
  ('0a73d2d4-7467-5115-96bd-019bc7f51b14', '1a7216e2-ce88-5262-9f53-679da005349e', 'prima_squadra', 'Azimut Giorgione', 'casa', 'Verona', '2026-12-06T17:00:00+01:00', 'Girone B', 'scheduled'),
  ('cf83cdbf-f314-5f40-97e9-0ed55aaad62b', '1a7216e2-ce88-5262-9f53-679da005349e', 'prima_squadra', 'Tonno Callipo Calabria', 'trasferta', 'Vibo Valentia', '2026-12-13T17:00:00+01:00', 'Girone B', 'scheduled'),
  ('1b011601-7918-59b1-ae24-3bb03d5eb757', '1a7216e2-ce88-5262-9f53-679da005349e', 'prima_squadra', 'CO.GE. Vesuvio Oplonti', 'casa', 'Verona', '2026-12-20T17:00:00+01:00', 'Girone B', 'scheduled'),
  ('94003a13-e845-59e1-823c-53afec356453', '1a7216e2-ce88-5262-9f53-679da005349e', 'prima_squadra', 'Banca Annia Aduna Padova', 'trasferta', 'Padova', '2027-01-10T17:00:00+01:00', 'Girone B', 'scheduled'),
  ('5c121a11-f7ac-55e1-92ee-d961d323187d', '1a7216e2-ce88-5262-9f53-679da005349e', 'prima_squadra', 'V&V Modena', 'casa', 'Verona', '2027-01-17T17:00:00+01:00', 'Girone B', 'scheduled'),
  ('c6314120-c6e1-52ec-9e2e-482b1472c592', '1a7216e2-ce88-5262-9f53-679da005349e', 'prima_squadra', 'Zero5 Castellana Grotte', 'trasferta', 'Castellana Grotte (BA)', '2027-01-23T17:00:00+01:00', 'Girone B', 'scheduled'),
  ('4c5708db-321e-5cd1-bf02-6190f0e46936', '1a7216e2-ce88-5262-9f53-679da005349e', 'prima_squadra', 'Olimpia di Navigazione Ravenna', 'casa', 'Verona', '2027-01-31T17:00:00+01:00', 'Girone B', 'scheduled')
on conflict (id) do nothing;
insert into standings (id, season_id, girone, team_name, is_our_team, position, played, won, lost, points) values
  ('6c6e47e0-5237-5268-958e-dfc03eec1e85', '1a7216e2-ce88-5262-9f53-679da005349e', 'Girone B', 'Smapiù Arena Volley Team', true, 1, 0, 0, 0, 0),
  ('1a51b21a-f5be-5fe8-86b3-2efe49c3206d', '1a7216e2-ce88-5262-9f53-679da005349e', 'Girone B', 'Azimut Giorgione', false, 2, 0, 0, 0, 0),
  ('48925955-0e7e-5bae-9390-2a2993f9ca6f', '1a7216e2-ce88-5262-9f53-679da005349e', 'Girone B', 'Banca Annia Aduna Padova', false, 3, 0, 0, 0, 0),
  ('f967121a-fd4d-5cee-9c19-6ae70c2e3b47', '1a7216e2-ce88-5262-9f53-679da005349e', 'Girone B', 'CO.GE. Vesuvio Oplonti', false, 4, 0, 0, 0, 0),
  ('5f09c702-6acf-51fe-8b7a-83f6efc22e9f', '1a7216e2-ce88-5262-9f53-679da005349e', 'Girone B', 'Olimpia di Navigazione Ravenna', false, 5, 0, 0, 0, 0),
  ('eb975f1d-ac33-5894-964f-bf15b4afa677', '1a7216e2-ce88-5262-9f53-679da005349e', 'Girone B', 'Tonno Callipo Calabria', false, 6, 0, 0, 0, 0),
  ('6e15b103-9122-5ee0-8903-c2f36715a6b4', '1a7216e2-ce88-5262-9f53-679da005349e', 'Girone B', 'V&V Modena', false, 7, 0, 0, 0, 0),
  ('d135977f-de1b-55c4-8f8a-0daf8e70696b', '1a7216e2-ce88-5262-9f53-679da005349e', 'Girone B', 'Zero5 Castellana Grotte', false, 8, 0, 0, 0, 0)
on conflict (id) do nothing;
commit;
