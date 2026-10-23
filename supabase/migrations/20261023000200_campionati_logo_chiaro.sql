-- Logo del campionato per la modalità chiara: URL completo o percorso "bucket/file" nello Storage.
-- Se vuoto l'app usa la variante inclusa (assets/competitions/<slug>-light.png), solo quando anche logo_url è vuoto.

alter table public.campionati add column if not exists logo_chiaro_url text;

update public.campionati
set logo_chiaro_url = 'loghi/ChatGPT Image 18 ott 2026, 14_02_50.png'
where nome = 'Serie A3 Femminile' and logo_chiaro_url is null;
