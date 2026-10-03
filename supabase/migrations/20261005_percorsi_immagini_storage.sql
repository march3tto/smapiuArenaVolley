-- Copertine delle notizie: come giocatrici.foto_url, il campo contiene il percorso "news/<file>"
-- (bucket "news"). L'app usa l'immagine inclusa con lo stesso nome file, altrimenti il file nello Storage.

update public.notizie
set url_immagine_copertina = 'news/' || regexp_replace(url_immagine_copertina, '^.*/', '')
where url_immagine_copertina is not null
  and url_immagine_copertina !~ '^news/';

-- Foto giocatrici: il bucket si chiama "players", non "giocatrici"
update public.giocatrici
set foto_url = 'players/' || regexp_replace(foto_url, '^.*/', '')
where foto_url ~ '^giocatrici/';

-- Loghi sponsor: bucket pubblico "sponsors" (il vecchio "sponsor" resta privato)
update public.sponsor
set url_logo = 'sponsors/' || regexp_replace(url_logo, '^.*/', '')
where url_logo ~ '^sponsor/';

-- Loghi avversarie: file nel bucket "opponents" con lo slug del nome squadra
update public.partite p
set logo_avversario_url = 'opponents/' || o.name
from storage.objects o
where o.bucket_id = 'opponents'
  and regexp_replace(o.name, '\.[a-z]+$', '') = trim(both '-' from regexp_replace(lower(p.avversario), '[^a-z0-9]+', '-', 'g'))
  and p.logo_avversario_url is null;
