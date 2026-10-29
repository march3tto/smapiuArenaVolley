-- Il libero può stare in una zona dello Starting Six (es. al posto di una schiacciatrice in difesa):
-- via i vincoli che lo tenevano in panchina, nel referto e nel sestetto per set.

begin;

alter table public.formazioni_partita drop constraint if exists formazioni_libero_non_titolare;
alter table public.formazioni_partita drop constraint if exists formazioni_libero_in_panchina;

create or replace function public.sestetti_set_controlla()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  c record;
begin
  select partita_id, squadra, ruolo into c from formazioni_partita where id = new.convocata_id;
  if c.partita_id is distinct from new.partita_id or c.squadra is distinct from new.squadra then
    raise exception 'La giocatrice non è a referto per questa partita e squadra' using errcode = '23514';
  end if;
  if new.zona is null then
    if c.ruolo is distinct from 'libero' then
      raise exception 'Come libero si possono scegliere solo le giocatrici con ruolo Libero' using errcode = '23514';
    end if;
    if (select count(*) from sestetti_set s
        where s.partita_id = new.partita_id and s.numero_set = new.numero_set and s.squadra = new.squadra
          and s.zona is null and s.id <> new.id) >= 2 then
      raise exception 'Al massimo 2 liberi per set e squadra' using errcode = '23514';
    end if;
  end if;
  new.aggiornato_il := now();
  return new;
end;
$$;

commit;
