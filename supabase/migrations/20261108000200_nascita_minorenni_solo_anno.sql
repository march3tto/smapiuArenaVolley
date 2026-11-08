-- Vista pubblica delle giocatrici: data di nascita completa solo per le maggiorenni.
-- Alle minorenni (B2, D, giovanili) la vista restituisce solo l'anno: la data completa resta nella tabella giocatrici,
-- leggibile solo dallo staff. La maggiore età si calcola a ogni lettura (current_date), quindi la data compare da sola
-- dal giorno del diciottesimo compleanno. Con solo l'anno (senza data) non c'è nulla da nascondere.
-- Stesse colonne, stesso ordine e stessi tipi della vista originale (20261016000200_consensi_e_foto.sql).

create or replace view public.giocatrici_pubbliche with (security_invoker = false) as
select
  g.id,
  g.stagione_id,
  g.squadra_id,
  s.nostra_squadra,
  g.livello_squadra,
  g.categoria_giovanile_id,
  g.nome,
  g.cognome,
  g.numero_maglia,
  g.ruolo,
  case when g.consenso_foto then g.foto_url end as foto_url,
  case when g.consenso_foto then g.bio end as bio,
  g.consenso_foto,
  g.attiva,
  g.ordine,
  case when g.data_nascita <= (current_date - interval '18 years')::date then g.data_nascita end as data_nascita,
  coalesce(g.anno_nascita, extract(year from g.data_nascita)::smallint) as anno_nascita,
  g.altezza_cm,
  g.punti,
  g.ace,
  g.muri,
  g.capitana
from public.giocatrici g
join public.squadre s on s.id = g.squadra_id;

revoke all on public.giocatrici_pubbliche from anon, authenticated;
grant select on public.giocatrici_pubbliche to anon, authenticated;
