import type { LiveEvent, Match, NewsItem, Player, SetScore, Sponsor, Standing, Venue, YouthTeam } from '@/types';
import { PLAYER_PHOTOS, SPONSOR_LOGOS } from './assets';

/*
 * Dati demo usati quando Supabase non è configurato (o una tabella è vuota).
 * Calendario, rosa e sponsor sono reali; risultato del 18/10, diretta, giovanili,
 * contatti e notizie sono di esempio.
 */

export const matches: Match[] = [
  { id: '7af4cf40-77dc-519d-8897-487b9a5c405c', giornata: 1, phase: 'andata', date: '2026-10-18T17:00:00+02:00', homeAway: 'trasferta', opponent: "Azimut Giorgione", venue: "Castelfranco Veneto (TV)", status: 'finished', ourSets: 3, oppSets: 1, sets: [{ our: 25, opp: 22 }, { our: 21, opp: 25 }, { our: 25, opp: 19 }, { our: 25, opp: 23 }] },
  { id: '5616abe1-c59b-59e1-bdec-3ddfc9efaad0', giornata: 2, phase: 'andata', date: '2026-10-25T17:00:00+01:00', homeAway: 'casa', opponent: "Tonno Callipo Calabria", venue: "Verona", status: 'scheduled', demoLive: true, youtubeLiveId: 'hdAwCmQj-98' },
  { id: '722f1300-eff3-55ca-9547-9e17c2eea7fc', giornata: 3, phase: 'andata', date: '2026-10-31T17:00:00+01:00', homeAway: 'trasferta', opponent: "CO.GE. Vesuvio Oplonti", venue: "Torre Annunziata (NA)", status: 'scheduled' },
  { id: '28f20e9f-83d8-5c02-bc17-8251b56d0fc0', giornata: 4, phase: 'andata', date: '2026-11-08T17:00:00+01:00', homeAway: 'casa', opponent: "Banca Annia Aduna Padova", venue: "Verona", status: 'scheduled' },
  { id: 'f643f1d5-1e1d-5dac-8a49-5a13a334f8d7', giornata: 5, phase: 'andata', date: '2026-11-14T17:00:00+01:00', homeAway: 'trasferta', opponent: "V&V Modena", venue: "Modena", status: 'scheduled' },
  { id: '9f5746dc-8719-56e9-ba11-27dd04d7d6e5', giornata: 6, phase: 'andata', date: '2026-11-22T17:00:00+01:00', homeAway: 'casa', opponent: "Zero5 Castellana Grotte", venue: "Verona", status: 'scheduled' },
  { id: 'b208f3b0-21c9-56df-81a0-563ccb2faed8', giornata: 7, phase: 'andata', date: '2026-11-28T17:00:00+01:00', homeAway: 'trasferta', opponent: "Olimpia di Navigazione Ravenna", venue: "Ravenna", status: 'scheduled' },
  { id: '0a73d2d4-7467-5115-96bd-019bc7f51b14', giornata: 8, phase: 'ritorno', date: '2026-12-06T17:00:00+01:00', homeAway: 'casa', opponent: "Azimut Giorgione", venue: "Verona", status: 'scheduled' },
  { id: 'cf83cdbf-f314-5f40-97e9-0ed55aaad62b', giornata: 9, phase: 'ritorno', date: '2026-12-13T17:00:00+01:00', homeAway: 'trasferta', opponent: "Tonno Callipo Calabria", venue: "Vibo Valentia", status: 'scheduled' },
  { id: '1b011601-7918-59b1-ae24-3bb03d5eb757', giornata: 10, phase: 'ritorno', date: '2026-12-20T17:00:00+01:00', homeAway: 'casa', opponent: "CO.GE. Vesuvio Oplonti", venue: "Verona", status: 'scheduled' },
  { id: '94003a13-e845-59e1-823c-53afec356453', giornata: 11, phase: 'ritorno', date: '2027-01-10T17:00:00+01:00', homeAway: 'trasferta', opponent: "Banca Annia Aduna Padova", venue: "Padova", status: 'scheduled' },
  { id: '5c121a11-f7ac-55e1-92ee-d961d323187d', giornata: 12, phase: 'ritorno', date: '2027-01-17T17:00:00+01:00', homeAway: 'casa', opponent: "V&V Modena", venue: "Verona", status: 'scheduled' },
  { id: 'c6314120-c6e1-52ec-9e2e-482b1472c592', giornata: 13, phase: 'ritorno', date: '2027-01-23T17:00:00+01:00', homeAway: 'trasferta', opponent: "Zero5 Castellana Grotte", venue: "Castellana Grotte (BA)", status: 'scheduled' },
  { id: '4c5708db-321e-5cd1-bf02-6190f0e46936', giornata: 14, phase: 'ritorno', date: '2027-01-31T17:00:00+01:00', homeAway: 'casa', opponent: "Olimpia di Navigazione Ravenna", venue: "Verona", status: 'scheduled' },
];

// Classifica di prova coerente con il risultato demo del 18/10
export const standings: Standing[] = [
  { team: 'Smapiù Arena Volley Team', position: 1, played: 1, won: 1, lost: 0, points: 3, isUs: true },
  { team: 'Azimut Giorgione', position: 2, played: 1, won: 0, lost: 1, points: 0, isUs: false },
  { team: 'Banca Annia Aduna Padova', position: 3, played: 0, won: 0, lost: 0, points: 0, isUs: false },
  { team: 'CO.GE. Vesuvio Oplonti', position: 4, played: 0, won: 0, lost: 0, points: 0, isUs: false },
  { team: 'Olimpia di Navigazione Ravenna', position: 5, played: 0, won: 0, lost: 0, points: 0, isUs: false },
  { team: 'Tonno Callipo Calabria', position: 6, played: 0, won: 0, lost: 0, points: 0, isUs: false },
  { team: 'V&V Modena', position: 7, played: 0, won: 0, lost: 0, points: 0, isUs: false },
  { team: 'Zero5 Castellana Grotte', position: 8, played: 0, won: 0, lost: 0, points: 0, isUs: false },
];

export const players: Player[] = [
  { id: '87959081-06cc-5461-8a8f-211733f42457', firstName: 'Beatrice', lastName: 'Giroldi', role: 'palleggiatrice', photo: PLAYER_PHOTOS['beatrice-giroldi'], bio: "Regista e capitana: è da lei che è partita la presentazione del roster per la Serie A3.", status: 'confermata', isCaptain: true },
  { id: '56edb0c1-9211-5edf-9073-44568d97c93c', firstName: 'Sofia', lastName: 'Grandi', role: 'palleggiatrice', photo: PLAYER_PHOTOS['sofia-grandi'], bio: "Confermata, completa il reparto delle palleggiatrici per il campionato di Serie A3.", status: 'confermata' },
  { id: 'e1aa6e63-2ed7-5659-8181-dcc5cb2aaa93', firstName: 'Nicole', lastName: 'Tellaroli', role: 'opposto', photo: PLAYER_PHOTOS['nicole-tellaroli'], bio: "Confermata come opposto della Smapiù Arena anche in Serie A3.", status: 'confermata' },
  { id: 'f6a4024e-6456-5768-ad0c-33f706e81ae3', firstName: 'Vittoria', lastName: 'Adami', role: 'opposto', photo: PLAYER_PHOTOS['vittoria-adami'], bio: "Classe 2007, dopo una prima stagione positiva in Serie B1 completa il reparto degli opposti.", status: 'confermata', born: 2007 },
  { id: 'feadcd4c-5126-5736-949d-cfe6f2f6c35d', firstName: 'Aurora', lastName: 'Piron', role: 'schiacciatrice', photo: PLAYER_PHOTOS['aurora-piron'], bio: "Classe 2007, confermata dopo la sua prima stagione positiva alla Smapiù Arena.", status: 'confermata', born: 2007 },
  { id: '80774d16-5320-5055-bcfb-11aa606dce90', firstName: 'Francesca', lastName: 'Trevisan', role: 'schiacciatrice', photo: PLAYER_PHOTOS['francesca-trevisan'], bio: "Nuovo martello della Smapiù Arena per la stagione 2026/27.", status: 'nuova' },
  { id: '3c3b9cb2-2e73-5b44-9f0f-99a26a151873', firstName: 'Alice', lastName: 'Trampus', role: 'schiacciatrice', photo: PLAYER_PHOTOS['alice-trampus'], bio: "Nuova schiacciatrice della Smapiù Arena.", status: 'nuova' },
  { id: 'cc4c93a0-18b9-5194-8207-3d9eb5aa206d', firstName: 'Anna', lastName: 'Riccato', role: 'centrale', photo: PLAYER_PHOTOS['anna-riccato'], bio: "Confermata nel reparto centrali per la stagione in Serie A3.", status: 'confermata' },
  { id: '1c6184a6-9093-541b-8abf-4e0fb0194494', firstName: 'Chiara', lastName: 'Murari', role: 'centrale', photo: PLAYER_PHOTOS['chiara-murari'], bio: "Giovane centrale, confermata dopo due stagioni positive in Serie B1.", status: 'confermata' },
  { id: 'efa900a8-c563-5d0b-9fd7-0f4652679d12', firstName: 'Sara', lastName: 'Bonini', role: 'centrale', photo: PLAYER_PHOTOS['sara-bonini'], bio: "Altra conferma importante nel reparto centrali.", status: 'confermata' },
  { id: '26ddbb30-be13-522c-aac4-e436ee909fbe', firstName: 'Valentina', lastName: 'Gatti', role: 'centrale', photo: PLAYER_PHOTOS['valentina-gatti'], bio: "Arriva a completare il reparto delle centrali per la Serie A3.", status: 'nuova' },
  { id: '8d723113-2ab7-599a-b3eb-6d229962345d', firstName: 'Isabella', lastName: 'Monaco', role: 'libero', photo: PLAYER_PHOTOS['isabella-monaco'], bio: "Nuovo innesto per il reparto dei liberi.", status: 'nuova' },
];

export const news: NewsItem[] = [
  { id: 'n1', title: 'Ecco il calendario della Serie A3 2026/27', category: 'Serie A3', date: '2026-09-28T10:00:00+02:00', image: 'https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=800&q=80', excerpt: 'Girone B: si parte il 18 ottobre in trasferta contro Azimut Giorgione, esordio in casa il 25 contro Tonno Callipo Calabria.' },
  { id: 'n2', title: 'Giroldi: «Pronte a dare tutto per questi colori»', category: 'Serie A3', date: '2026-09-25T10:00:00+02:00', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=80', excerpt: 'La capitana fa il punto della situazione in vista della fase calda del campionato.' },
  { id: 'n3', title: 'Presentata la maglia ufficiale Smapiù 2026/27', category: 'Società', date: '2026-09-20T10:00:00+02:00', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80', excerpt: "Tradizionali colori blu e giallo per la nuova divisa da gioco dell'Arena Volley Team." },
];

export const sponsors: Sponsor[] = [
  { id: 'a76d2bf9-d17e-5614-99a0-6823ebffb739', name: "Sitta", tier: 'title', logo: SPONSOR_LOGOS['sitta'], url: 'https://www.sittasrl.it' },
  { id: '671d41df-eef0-5413-b4e2-317321eb2f33', name: "Adami Group", tier: 'title', logo: SPONSOR_LOGOS['adami-group'] },
  { id: 'a325ebfe-378d-5491-b01f-a1d37720dd4a', name: "Smapiù", tier: 'title', logo: SPONSOR_LOGOS['smapiu'] },
  { id: '3c5541ba-8cea-5697-aa27-24f855e831d8', name: "T.M.W. Torneria Meccanica", tier: 'main', logo: SPONSOR_LOGOS['t-m-w-torneria-meccanica'], url: 'https://www.torneriatmw.it' },
  { id: '63a3b526-7757-55ed-8fd2-cce1f7d81e90', name: "Lippa", tier: 'main', logo: SPONSOR_LOGOS['lippa'] },
  { id: '9f35ecc2-d1be-50e3-a6eb-04bea20fecb3', name: "WindTre Avantgarde & Co", tier: 'sponsor', logo: SPONSOR_LOGOS['windtre-avantgarde-co'] },
  { id: 'ad1ff3c4-7407-5acc-9bbe-880183299adb', name: "Angelo Mazzi Costruzioni", tier: 'sponsor', logo: SPONSOR_LOGOS['angelo-mazzi-costruzioni'] },
  { id: '9a0f19a4-bcfd-559e-902e-73b093fd5e9a', name: "Baking", tier: 'sponsor', logo: SPONSOR_LOGOS['baking'] },
  { id: 'b9d2ab91-5787-55a1-9c53-407b4dbfe75d', name: "BCC Valpolicella Benaco", tier: 'sponsor', logo: SPONSOR_LOGOS['bcc-valpolicella-benaco'] },
  { id: '21359b07-9c02-521f-bf61-b88d1fed445b', name: "Pizzeria Bel Sito", tier: 'sponsor', logo: SPONSOR_LOGOS['pizzeria-bel-sito'] },
  { id: '79a542ea-330d-52bb-96bc-2fbdd9e6b1f2', name: "Belfanti", tier: 'sponsor', logo: SPONSOR_LOGOS['belfanti'], url: 'https://www.belfantisrl.com' },
  { id: '8ca8258d-edfe-5a20-9e6c-f1aaf8fc610d', name: "Bertolani Traslochi", tier: 'sponsor', logo: SPONSOR_LOGOS['bertolani-traslochi'] },
  { id: 'ff57cbe7-3a1f-5deb-8d65-43123bc34aeb', name: "Bevande Chiozzini", tier: 'sponsor', logo: SPONSOR_LOGOS['bevande-chiozzini'] },
  { id: 'def47680-87dc-5854-bbfe-a87e676be05d', name: "Cestaro", tier: 'sponsor', logo: SPONSOR_LOGOS['cestaro'], url: 'https://www.autocestaro.it' },
  { id: '4273b5ae-86f9-52d0-88d5-d12a54991843', name: "Delta Immobiliare", tier: 'sponsor', logo: SPONSOR_LOGOS['delta-immobiliare'], url: 'https://www.delta-immobiliare.com' },
  { id: '8840a769-4394-5c77-8e8b-dac4a1497bf5', name: "Effehotels", tier: 'sponsor', logo: SPONSOR_LOGOS['effehotels'] },
  { id: 'ff5fca28-87c9-56a9-b569-f017fee52ef3', name: "Etikmar", tier: 'sponsor', logo: SPONSOR_LOGOS['etikmar'], url: 'https://www.etikmar.com' },
  { id: '27731b4d-b191-5aaf-92d0-02ce2eef9ef1', name: "Flacon Plast", tier: 'sponsor', logo: SPONSOR_LOGOS['flacon-plast'], url: 'https://www.flaconplast.com' },
  { id: 'ca2f31e5-ddaf-5177-a93e-594f473d71bc', name: "Top Geffesport", tier: 'sponsor', logo: SPONSOR_LOGOS['top-geffesport'] },
  { id: '54f840e4-8655-595b-8ed3-9243dbb75489', name: "Ideal Zoo", tier: 'sponsor', logo: SPONSOR_LOGOS['ideal-zoo'] },
  { id: 'fc2ff58c-1c9b-5362-a32b-e67fbe4c6887', name: "Joma", tier: 'sponsor', logo: SPONSOR_LOGOS['joma'] },
  { id: '06dc3aa2-593b-5d23-8f2e-5d11ad277ec2', name: "MaSte Print", tier: 'sponsor', logo: SPONSOR_LOGOS['maste-print'] },
  { id: 'f04302ca-a7eb-555f-b3c5-959bb9217e1f', name: "Negri Termoidraulica", tier: 'sponsor', logo: SPONSOR_LOGOS['negri-termoidraulica'] },
  { id: 'e8045944-fad9-57e7-9fa7-ac85bff3a3c5', name: "Primo Round", tier: 'sponsor', logo: SPONSOR_LOGOS['primo-round'] },
  { id: 'cdd1d33d-5ec0-5fa2-ad7c-b433e90440f5', name: "Rigeneral-Pal", tier: 'sponsor', logo: SPONSOR_LOGOS['rigeneral-pal'] },
  { id: '4a71517d-c840-5108-a4fe-26777bc1d23c', name: "Carrozzeria Roveggia", tier: 'sponsor', logo: SPONSOR_LOGOS['carrozzeria-roveggia'] },
  { id: '6c5cdf99-caae-5ba8-b05c-207944cd9d76', name: "Farmacia Salutis", tier: 'sponsor', logo: SPONSOR_LOGOS['farmacia-salutis'] },
  { id: '06d8bc9a-1dbc-5d25-bc6d-a1b9c78173e5', name: "Studio Hita", tier: 'sponsor', logo: SPONSOR_LOGOS['studio-hita'] },
  { id: '96633139-3121-5b8f-abb6-b143c031c047', name: "Studio Protecno", tier: 'sponsor', logo: SPONSOR_LOGOS['studio-protecno'] },
  { id: '901b4b09-e34e-57d3-bdbb-923c1c02b841', name: "Tecmaut", tier: 'sponsor', logo: SPONSOR_LOGOS['tecmaut'] },
  { id: '34f4480c-c389-5970-8c1b-bf727b373322', name: "Tesi", tier: 'sponsor', logo: SPONSOR_LOGOS['tesi'] },
  { id: '9c75dfcb-3dd9-5313-86a8-88c61a394db7', name: "Autofficina Venturi", tier: 'sponsor', logo: SPONSOR_LOGOS['autofficina-venturi'] },
  { id: '80819d38-0ea7-59a8-9c3d-4d330025fb36', name: "Wolnet", tier: 'sponsor', logo: SPONSOR_LOGOS['wolnet'] },
  { id: 'd9894ef1-1f78-52d9-90df-59dfa1121162', name: "AGBD Associazione Sindrome di Down", tier: 'charity', logo: SPONSOR_LOGOS['agbd-associazione-sindrome-di-down'] },
  { id: 'ac501b57-1d48-5549-b180-7745f8de8378', name: "AVIS Castel d'Azzano", tier: 'charity', logo: SPONSOR_LOGOS['avis-castel-d-azzano'] },
];

// Giovanili: dati di esempio
export const youth: YouthTeam[] = [
  { id: 'u18', name: 'Under 18', short: 'U18', coach: 'Laura Bianchi', description: 'Campionato regionale Under 18 femminile.', training: 'Lun, Mer e Ven 18:30', gym: 'PalaArena, Verona', next: { opponent: 'Volley Villafranca', date: '2026-10-11T11:00:00+02:00', home: true }, last: { opponent: 'Pallavolo San Martino', our: 3, opp: 1 } },
  { id: 'u16', name: 'Under 16', short: 'U16', coach: 'Chiara Rossi', description: 'Campionato regionale Under 16 femminile.', training: 'Mar e Gio 17:30', gym: "Palasport Castel d'Azzano", next: { opponent: 'Volley Bussolengo', date: '2026-10-11T15:00:00+02:00', home: false }, last: { opponent: 'Volley Legnago', our: 2, opp: 3 } },
  { id: 'u14', name: 'Under 14', short: 'U14', coach: 'Elena Ferro', description: 'Campionato provinciale Under 14.', training: 'Lun e Gio 17:00', gym: "Palestra comunale, Castel d'Azzano", next: { opponent: 'Polisportiva Sona', date: '2026-10-17T16:00:00+02:00', home: true }, last: { opponent: 'Volley Pescantina', our: 3, opp: 0 } },
  { id: 'u12', name: 'Under 12', short: 'U12', coach: 'Sara Conti', description: 'Minivolley e primi tornei, per chi inizia.', training: 'Mer e Ven 16:30', gym: "Palestra comunale, Castel d'Azzano", next: { opponent: 'Raggruppamento provinciale', date: '2026-10-18T10:00:00+02:00', home: false }, last: null },
];

export const venues: Venue[] = [
  { name: 'Palazzetto dello sport “PalaRobbi”', address: 'Via Dante Alighieri, 37060 Castel d’Azzano VR', city: 'Castel d’Azzano', kind: 'palasport' },
  { name: 'Palestra Parrocchiale', address: 'Via Mascagni, 37060 Castel d’Azzano VR', city: 'Castel d’Azzano', kind: 'palestra' },
  { name: 'Palasport Vigasio', address: 'Via Alzeri, 37068 Vigasio VR', city: 'Vigasio', kind: 'palasport' },
  { name: 'Scuola Media Statale', address: 'Viale Edoardo Bassini 6, 37068 Vigasio VR', city: 'Vigasio', kind: 'palestra' },
  { name: 'Scuole Lenotti', address: 'Via Bacchiglione, Verona VR', city: 'Verona', kind: 'palestra' },
  { name: 'Scuola Media Pacinotti', address: 'Viale Andrea Palladio, 37138 Verona VR', city: 'Verona', kind: 'palestra' },
  { name: 'Scuole 6 Maggio Santa Lucia', address: 'Via Monsignor Bellomi 1, Verona VR', city: 'Verona', kind: 'palestra' },
  { name: 'Scuola Media Statale A. De Gasperi', address: 'Via S. Giovanni Bosco 10, 37057 Raldon VR', city: 'San Giovanni Lupatoto', kind: 'palestra' },
  { name: 'Scuola Primaria Giulio Ceroni', address: 'Via S. Giovanni Bosco 10, 37057 Raldon VR', city: 'San Giovanni Lupatoto', kind: 'palestra' },
  { name: 'Palestra Scuola Primaria Marconi', address: 'Via Leoncavallo, Pozzo VR', city: 'San Giovanni Lupatoto', kind: 'palestra' },
  { name: 'Scuola Media Leonardo da Vinci, I.C. 1', address: 'Via Cà dei Sordi 16, 37057 San Giovanni Lupatoto VR', city: 'San Giovanni Lupatoto', kind: 'palestra' },
  { name: 'Palalupatotina Gas e Luce', address: 'Via Monte Ortigara, 37057 San Giovanni Lupatoto VR', city: 'San Giovanni Lupatoto', kind: 'palasport' },
];

/** Stato iniziale della diretta demo (4° set) */
export const demoLive: { set: number; our: number; opp: number; history: SetScore[]; events: LiveEvent[] } = {
  set: 4,
  our: 18,
  opp: 15,
  history: [{ our: 25, opp: 23 }, { our: 18, opp: 25 }, { our: 25, opp: 21 }],
  events: [
    { id: 'e3', set: 4, our: 18, opp: 15, side: 'us', text: 'Muro vincente di Anna Riccato! Esplode il palazzetto!' },
    { id: 'e2', set: 4, our: 17, opp: 15, side: 'us', text: 'Attacco potente di Aurora Piron in diagonale.' },
    { id: 'e1', set: 4, our: 16, opp: 15, side: 'opp', text: 'Punto per le ospiti al centro.' },
  ],
};
