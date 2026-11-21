-- Tabellino anche nella partita demo (Impostazioni > Partita demo), per provare foto, lettura AI e conferma senza una partita vera.
-- La demo vive solo nell'app (src/data/mock.ts, demoMatch): tabellini e statistiche_attacco però puntano a public.partite,
-- quindi serve una riga con lo stesso id. È "parcheggiata" e non compare da nessuna parte:
--   - nostra_partita = false: l'app legge solo le nostre partite (loadAll), niente notifica di inizio né allineamento casa/ospite;
--   - girone e campionato null: niente giornate, nessun ricalcolo della classifica, nessuna validazione del risultato;
--   - stagione della Serie A3: il numero di maglia si abbina alla nostra rosa (giocatrice_da_maglia).
-- Le righe del tabellino della demo si cancellano con "Ricomincia la demo" (solo admin).

insert into public.partite (id, stagione_id, livello_squadra, avversario, casa_trasferta, sede, data_partita, stato, nostra_partita, squadra_avversaria_id)
select '995345a4-6a09-4e6c-882e-0e82bc0fe19c', s.id, 'prima_squadra', 'Azimut Giorgione (demo)', 'casa', 'Partita demo',
       '2026-10-25T17:00:00+01:00', 'programmata', false,
       (select id from public.squadre where id = 'be9f96ba-33af-475f-a0e1-4f270a2a1a52')
  from public.stagioni s
 where s.id = '8297620b-09bf-4245-b18f-05008765aca4'
on conflict (id) do nothing;
