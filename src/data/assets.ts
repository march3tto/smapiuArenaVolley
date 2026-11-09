/* File generato: tutte le immagini locali incluse nell'app (usate dai dati demo). */

export const LOGO_AVT: number = require('../../assets/brand/avt-logo-white.png');
export const LOGO_BRAND: number = require('../../assets/brand/avt-smapiu-logo.png');
export const LOGO_BRAND_LIGHT: number = require('../../assets/brand/avt-smapiu-logo-light.png');
/** Loghi dei campionati, per slug del nome (tabella campionati) */
export const COMPETITION_LOGOS: Record<string, number> = {
  'serie-a3-femminile': require('../../assets/competitions/serie-a3-femminile.png'),
};
/** Varianti per la modalità chiara (stesso slug); senza variante si usa il logo normale */
export const COMPETITION_LOGOS_LIGHT: Record<string, number> = {
  'serie-a3-femminile': require('../../assets/competitions/serie-a3-femminile-light.png'),
};

export const LOGO_SMAPIU: number = require('../../assets/brand/smapiu-white.png');
/** Emblema FIPAV (solo il simbolo, senza scritta): pulsanti della diretta */
export const LOGO_FIPAV: number = require('../../assets/brand/fipav.png');
/** Foto di squadra della pagina Organigramma */
/** Foto della pagina Storia */
export const STORIA_PHOTO: number = require('../../assets/brand/storia.jpg');
/** Foto della pagina Albo d'oro */
export const ALBO_PHOTO: number = require('../../assets/brand/albo-oro.jpg');
/** Foto della pagina Palestre */
export const PALESTRE_PHOTO: number = require('../../assets/brand/palestre.jpg');
/** Foto della pagina Safeguarding */
export const SAFEGUARDING_PHOTO: number = require('../../assets/brand/safeguarding.jpg');
/** Foto della pagina Arena Volley Card */
export const CARD_PHOTO: number = require('../../assets/brand/arena-card.jpg');
export const ORGANIGRAMMA_PHOTO: number = require('../../assets/brand/organigramma.jpg');
/** Foto dell'Arena della schermata di accesso */
export const LOGIN_PHOTO: number = require('../../assets/brand/login-bg.jpg');
/** Immagine della schermata di caricamento all'avvio */
export const LOADING_IMAGE: number = require('../../assets/brand/caricamento.jpg');
/** Pallone 3D della schermata di caricamento: 36 fotogrammi in griglia 6x6 (generato da scripts/ball-sprite.py) */
export const BALL_SPRITE: number = require('../../assets/brand/ball-sprite.png');

export const SPONSOR_LOGOS: Record<string, number> = {
  'adami-group': require('../../assets/sponsors/adami-group.png'),
  'agbd-associazione-sindrome-di-down': require('../../assets/sponsors/agbd-associazione-sindrome-di-down.png'),
  'angelo-mazzi-costruzioni': require('../../assets/sponsors/angelo-mazzi-costruzioni.png'),
  'autofficina-venturi': require('../../assets/sponsors/autofficina-venturi.png'),
  'avis-castel-d-azzano': require('../../assets/sponsors/avis-castel-d-azzano.png'),
  'baking': require('../../assets/sponsors/baking.png'),
  'bcc-valpolicella-benaco': require('../../assets/sponsors/bcc-valpolicella-benaco.png'),
  'belfanti': require('../../assets/sponsors/belfanti.png'),
  'bertolani-traslochi': require('../../assets/sponsors/bertolani-traslochi.png'),
  'bevande-chiozzini': require('../../assets/sponsors/bevande-chiozzini.png'),
  'carrozzeria-roveggia': require('../../assets/sponsors/carrozzeria-roveggia.png'),
  'cestaro': require('../../assets/sponsors/cestaro.png'),
  'delta-immobiliare': require('../../assets/sponsors/delta-immobiliare.png'),
  'effehotels': require('../../assets/sponsors/effehotels.png'),
  'etikmar': require('../../assets/sponsors/etikmar.png'),
  'farmacia-salutis': require('../../assets/sponsors/farmacia-salutis.png'),
  'flacon-plast': require('../../assets/sponsors/flacon-plast.png'),
  'ideal-zoo': require('../../assets/sponsors/ideal-zoo.png'),
  'joma': require('../../assets/sponsors/joma.png'),
  'lippa': require('../../assets/sponsors/lippa.png'),
  'maste-print': require('../../assets/sponsors/maste-print.png'),
  'negri-termoidraulica': require('../../assets/sponsors/negri-termoidraulica.png'),
  'pizzeria-bel-sito': require('../../assets/sponsors/pizzeria-bel-sito.png'),
  'primo-round': require('../../assets/sponsors/primo-round.png'),
  'rigeneral-pal': require('../../assets/sponsors/rigeneral-pal.png'),
  'sitta': require('../../assets/sponsors/sitta.png'),
  'smapiu': require('../../assets/sponsors/smapiu.png'),
  'studio-hita': require('../../assets/sponsors/studio-hita.png'),
  'studio-protecno': require('../../assets/sponsors/studio-protecno.png'),
  't-m-w-torneria-meccanica': require('../../assets/sponsors/t-m-w-torneria-meccanica.png'),
  'tecmaut': require('../../assets/sponsors/tecmaut.png'),
  'tesi': require('../../assets/sponsors/tesi.png'),
  'top-geffesport': require('../../assets/sponsors/top-geffesport.png'),
  'windtre-avantgarde-co': require('../../assets/sponsors/windtre-avantgarde-co.png'),
  'wolnet': require('../../assets/sponsors/wolnet.png'),
};

/** Foto dello staff tecnico, per slug del nome (usate se staff.foto_url è vuoto) */
export const STAFF_PHOTOS: Record<string, number> = {
  'andrea-zappaterra': require('../../assets/staff/andrea-zappaterra.jpg'),
  'simone-morari': require('../../assets/staff/simone-morari.jpg'),
  'lara-visona': require('../../assets/staff/lara-visona.jpg'),
  'barbara-bertollo': require('../../assets/staff/barbara-bertollo.jpg'),
};

/** Loghi delle squadre avversarie, per slug del nome (usati se in partite.logo_avversario_url non c'è un URL) */
export const OPPONENT_LOGOS: Record<string, number> = {
  'azimut-giorgione': require('../../assets/opponents/azimut-giorgione.jpg'),
  'banca-annia-aduna-padova': require('../../assets/opponents/banca-annia-aduna-padova.jpg'),
  // nome ufficiale della squadra (tabella squadre), stesso logo
  'banca-annia-aduna-women': require('../../assets/opponents/banca-annia-aduna-padova.jpg'),
  'co-ge-vesuvio-oplonti': require('../../assets/opponents/co-ge-vesuvio-oplonti.jpg'),
  'olimpia-di-navigazione-ravenna': require('../../assets/opponents/olimpia-di-navigazione-ravenna.jpg'),
  'tonno-callipo-calabria': require('../../assets/opponents/tonno-callipo-calabria.jpg'),
  'v-v-modena': require('../../assets/opponents/v-v-modena.png'),
  'zero5-castellana-grotte': require('../../assets/opponents/zero5-castellana-grotte.jpg'),
};

