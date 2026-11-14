-- Diretta automatica: le nostre partite passano in live 15 minuti prima dell'orario d'inizio (prima erano 5).
-- Il cron attiva-partite-live (ogni minuto) resta invariato; con il passaggio in live parte anche la notifica "Si comincia!".

create or replace function public.attiva_partite_live()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  update partite
     set stato = 'live', aggiornato_il = now()
   where nostra_partita
     and stato = 'programmata'
     and data_partita <= now() + interval '15 minutes'
     and data_partita >  now() - interval '6 hours';
  get diagnostics n = row_count;
  return n;
end; $$;

revoke execute on function public.attiva_partite_live() from public, anon, authenticated;
