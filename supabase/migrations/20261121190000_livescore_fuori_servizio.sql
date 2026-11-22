--
-- Livescore FIPAV fuori servizio.
--
-- Caso del 21/11/2026: federvolley.it e a3live mostravano 0-0 per gare iniziate da un'ora e mezza, e l'agente
-- (vivo, col battito ogni 5') leggeva "programmata" senza mai scrivere un punteggio. Il problema era a monte,
-- nel feed FIPAV, ma l'app non se ne accorgeva: BORDO CAMPO diceva "inizio previsto alle 18:00" e nella Live
-- il punteggio restava fermo, senza modo di inserirlo a mano.
--
-- Regola (FUORI_SERVIZIO_MIN = 15 minuti, sia per gli orari sia per il silenzio):
--   * gara in programma con l'orario d'inizio passato da oltre 15' e nessun punteggio letto;
--   * gara in corso il cui ultimo punteggio letto è più vecchio di 15' (tra un set e l'altro passano ~3').
--     Se l'ultimo tabellone letto dice ancora "programmata" vale solo dopo 15' dall'orario d'inizio:
--     un tabellone 0-0 letto mezz'ora prima del fischio non è un feed fermo.
-- In questi casi:
--   1. bordo_campo() restituisce stato 'fuori_servizio' e il testo "… · livescore FIPAV fuori servizio";
--   2. livescore_fuori_servizio(partita) dice all'app che per la nostra partita l'admin può tornare
--      a inserire il punteggio a mano. Vale anche se l'agente è spento o non risponde (nessun punteggio
--      negli ultimi 15'). I tabelloni ancora "programmata" non contano come punteggio: sono proprio
--      quello che il feed fermo restituiva. Appena l'agente riscrive un punteggio il controllo torna falso:
--      il punteggio ufficiale riprende il posto di quello inserito a mano (l'agente riscrive set_partita).
--

create or replace function public.bordo_campo()
returns table (
  numero_gara integer,
  partita_id uuid,
  casa text,
  ospite text,
  nostra boolean,
  stato text,
  set_casa integer,
  set_ospite integer,
  parziali jsonb,
  testo text,
  aggiornato_il timestamptz,
  giornata integer,
  girone text
)
language sql
stable
security definer
set search_path = public
as $$
  with ultimo as (
    select distinct on (l.agente) l.agente, l.evento, l.dettagli
      from public.log_agente l
     where l.evento in ('avvio', 'finestra_aperta', 'finestra_chiusa', 'stop')
       and l.creato_il > now() - interval '12 hours'
     order by l.agente, l.creato_il desc, l.id desc
  ),
  gare as (
    select distinct (g.value)::int as numero_gara
      from ultimo u
      cross join lateral jsonb_array_elements_text(coalesce(u.dettagli->'gare', '[]'::jsonb)) g
     where u.evento = 'finestra_aperta'
       and exists (select 1 from public.log_agente b
                    where b.agente = u.agente and b.creato_il > now() - interval '15 minutes')
  ),
  -- ultimo punteggio letto dall'agente per ogni gara della finestra
  punteggi as (
    select distinct on (l.numero_gara)
      l.numero_gara                                              as g_numero,
      l.partita_id                                               as g_partita,
      l.dettagli->'tabellone'->>'casa'                           as g_casa,
      l.dettagli->'tabellone'->>'ospite'                         as g_ospite,
      coalesce((l.dettagli->'tabellone'->>'nostra')::boolean, false) as g_nostra,
      l.dettagli->'tabellone'->>'stato'                          as g_stato,
      coalesce((l.dettagli->'tabellone'->>'set_casa')::int, 0)   as g_set_casa,
      coalesce((l.dettagli->'tabellone'->>'set_ospite')::int, 0) as g_set_ospite,
      coalesce(l.dettagli->'tabellone'->'parziali', '[]'::jsonb) as g_parziali,
      public.tabellone_testo(l.dettagli->'tabellone')            as g_testo,
      l.creato_il                                                as g_quando,
      p.giornata                                                 as g_giornata,
      p.girone::text                                             as g_girone,
      p.data_partita                                             as g_inizio
    from public.log_agente l
    join gare g on g.numero_gara = l.numero_gara
    left join public.partite p on p.id = l.partita_id
    where l.evento in ('aggiornamento', 'correzione')
      and l.dettagli ? 'tabellone'
      and l.creato_il > now() - interval '12 hours'
    order by l.numero_gara, l.creato_il desc, l.id desc
  ),
  -- ultimo punteggio fermo da oltre 15'; se dice ancora "programmata", solo a 15' passati dall'orario d'inizio
  -- (orario sconosciuto: si resta "programmata", non si dà l'allarme)
  punteggi_fermi as (
    select s.*,
           s.g_stato is distinct from 'conclusa'
             and s.g_quando < now() - interval '15 minutes'
             and (s.g_stato is distinct from 'programmata'
                  or coalesce(now() > s.g_inizio + interval '15 minutes', false)) as g_fermo
      from punteggi s
  ),
  -- gare della finestra senza ancora un punteggio: la partita in calendario più vicina a oggi con quel numero
  in_programma as (
    select g.numero_gara as g_numero, p.*
      from gare g
      cross join lateral (
        select p.id, p.data_partita, p.giornata, p.girone::text as girone, p.nostra_partita,
               case when p.nostra_partita
                    then case when p.casa_trasferta = 'casa' then n.nome else p.avversario end
                    else sc.nome end as nome_casa,
               case when p.nostra_partita
                    then case when p.casa_trasferta = 'casa' then p.avversario else n.nome end
                    else so.nome end as nome_ospite
          from public.partite p
          left join public.squadre sc on sc.id = p.squadra_casa_id
          left join public.squadre so on so.id = p.squadra_ospite_id
          left join lateral (select s.nome from public.squadre s where s.nostra_squadra order by s.creato_il limit 1) n on true
         where p.numero_gara = g.numero_gara
           and p.data_partita between now() - interval '1 day' and now() + interval '1 day'
         order by abs(extract(epoch from p.data_partita - now()))
         limit 1
      ) p
     where not exists (select 1 from punteggi s where s.g_numero = g.numero_gara)
  ),
  righe as (
    -- gara col feed fermo da oltre 15': il livescore non si aggiorna più
    select s.g_numero, s.g_partita, s.g_casa, s.g_ospite, s.g_nostra,
           case when s.g_fermo then 'fuori_servizio' else s.g_stato end as g_stato,
           s.g_set_casa, s.g_set_ospite, s.g_parziali,
           case when s.g_fermo
                then s.g_testo || ' · livescore FIPAV fuori servizio' || case when s.g_nostra then ', punteggio nella Live' else '' end
                else s.g_testo end as g_testo,
           s.g_quando, s.g_giornata, s.g_girone
      from punteggi_fermi s
    union all
    -- gara in programma: dopo 15' dall'orario senza punteggi il feed è fuori servizio
    select
      i.g_numero,
      i.id,
      i.nome_casa,
      i.nome_ospite,
      i.nostra_partita,
      case when now() > i.data_partita + interval '15 minutes' then 'fuori_servizio' else 'programmata' end,
      0,
      0,
      '[]'::jsonb,
      case when now() > i.data_partita + interval '15 minutes'
           then format('%s - %s · livescore FIPAV fuori servizio%s', i.nome_casa, i.nome_ospite,
                       case when i.nostra_partita then ', punteggio nella Live' else '' end)
           else format('%s - %s · %s alle %s', i.nome_casa, i.nome_ospite,
                       case when now() < i.data_partita then 'inizia' else 'inizio previsto' end,
                       to_char(i.data_partita at time zone 'Europe/Rome', 'HH24:MI')) end,
      i.data_partita,
      i.giornata,
      i.girone
    from in_programma i
  )
  select * from righe t
  order by t.g_nostra desc,
           case t.g_stato when 'conclusa' then 3 when 'programmata' then 2 when 'fuori_servizio' then 1 else 0 end,
           -- in programma: prima quella che inizia prima; le altre: le più recenti prima
           case when t.g_stato = 'programmata' then t.g_quando end asc,
           t.g_quando desc
$$;

comment on function public.bordo_campo() is
  'Striscia BORDO CAMPO: gare della giornata seguita dall''agente. stato: live, conclusa, programmata, fuori_servizio (feed FIPAV fermo da oltre 15'' o gara iniziata da oltre 15'' senza punteggi).';


-- Nostra partita in diretta senza punteggi dall'agente da oltre 15' (feed FIPAV fermo o agente spento):
-- l'admin può inserire il punteggio a mano dalla Live. I tabelloni "programmata" non contano come punteggio.
create or replace function public.livescore_fuori_servizio(p_partita uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.partite p
     where p.id = p_partita
       and p.nostra_partita
       and p.stato = 'live'
       and now() > p.data_partita + interval '15 minutes'
       and not exists (
         select 1 from public.log_agente l
          where (l.partita_id = p.id or (p.numero_gara is not null and l.numero_gara = p.numero_gara))
            and l.evento in ('aggiornamento', 'correzione')
            and (l.dettagli->'tabellone'->>'stato') is distinct from 'programmata'
            and l.creato_il > now() - interval '15 minutes')
  )
$$;

comment on function public.livescore_fuori_servizio(uuid) is
  'true se la nostra partita è live, iniziata da oltre 15'' e l''agente non scrive punteggi da 15'': la Live riattiva l''inserimento manuale per l''admin.';

revoke all on function public.livescore_fuori_servizio(uuid) from public;
grant execute on function public.livescore_fuori_servizio(uuid) to anon, authenticated, service_role;
