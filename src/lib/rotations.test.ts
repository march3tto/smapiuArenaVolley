// Test delle regole di rotazione: npm test (node --test, Node 24 esegue direttamente i .ts)
// i tipi di node:test arrivano con Expo (@types/node): solo per questo file, l'app non usa i globali di Node
/// <reference types="node" />
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { PlayerRole } from '@/types';
import {
  allRotations, firstServer, onCourt, p1Lineup, pointWinners, rotate, rotateN, rotationName, rotationState, validateLineup,
  type ScoredEvent, type Zones,
} from './rotations.ts';

// P1 classico: zona 1 palleggiatrice, 2 schiacciatrice, 3 centrale, 4 opposto, 5 schiacciatrice, 6 centrale
const ROLES: Record<string, PlayerRole> = {
  pal: 'palleggiatrice', s1: 'schiacciatrice', c1: 'centrale', opp: 'opposto', s2: 'schiacciatrice', c2: 'centrale',
  lib: 'libero', lib2: 'libero', pal2: 'palleggiatrice', ris: 'schiacciatrice',
};
const roleOf = (id: string) => ROLES[id];
const P1: Zones = ['pal', 's1', 'c1', 'opp', 's2', 'c2'];

describe('rotazioni', () => {
  test('una rotazione: la zona II va al servizio', () => {
    assert.deepEqual(rotate(P1), ['s1', 'c1', 'opp', 's2', 'c2', 'pal']);
  });

  test('da P1 classico: P1, P6, P5, P4, P3, P2 e ritorno a P1', () => {
    assert.deepEqual(allRotations(P1).map((z) => rotationName(z, roleOf)), ['P1', 'P6', 'P5', 'P4', 'P3', 'P2']);
    assert.deepEqual(rotateN(P1, 6), [...P1]);
  });

  test('schema P1 dai ruoli, in qualsiasi ordine di inserimento', () => {
    const players = ['c1', 'opp', 's1', 'c2', 'pal', 's2'].map((id) => ({ id, role: ROLES[id] }));
    const p1 = p1Lineup(players);
    assert.deepEqual(p1, ['pal', 's1', 'c1', 'opp', 's2', 'c2']);
    assert.equal(rotationName(p1!, roleOf), 'P1');
    assert.deepEqual(validateLineup(p1!, [], roleOf), []);
  });

  test('schema P1 solo con i ruoli del 5-1', () => {
    const twoSetters = ['pal', 'pal2', 's1', 's2', 'c1', 'c2'].map((id) => ({ id, role: ROLES[id] }));
    assert.equal(p1Lineup(twoSetters), null);
    assert.equal(p1Lineup([{ id: 'x', role: null }, ...twoSetters.slice(1)]), null);
    assert.equal(p1Lineup(twoSetters.slice(0, 5)), null);
  });

  test('senza palleggiatrice la rotazione non ha nome', () => {
    assert.equal(rotationName(['s1', 'c1', 'opp', 's2', 'c2', null], roleOf), null);
  });
});

describe('libero', () => {
  test('in P1 sostituisce la centrale in zona 6, anche al servizio', () => {
    for (const weServe of [true, false]) {
      const v = onCourt(P1, roleOf, 'lib', weServe);
      assert.deepEqual(v.libero, { zone: 6, replaced: 'c2' });
      assert.equal(v.zones[5], 'lib');
    }
  });

  test('in P5 sostituisce l\'altra centrale in zona 1 solo se riceviamo', () => {
    const p5 = rotateN(P1, 2);
    assert.equal(rotationName(p5, roleOf), 'P5');
    assert.equal(p5[0], 'c1');
    assert.deepEqual(onCourt(p5, roleOf, 'lib', false).libero, { zone: 1, replaced: 'c1' });
    // al servizio batte la centrale
    const serving = onCourt(p5, roleOf, 'lib', true);
    assert.equal(serving.libero, null);
    assert.equal(serving.zones[0], 'c1');
  });

  test('esce quando la centrale torna in prima linea (zona 4)', () => {
    const p2 = rotateN(P1, 5);
    assert.equal(rotationName(p2, roleOf), 'P2');
    assert.equal(p2[3], 'c1');
    const v = onCourt(p2, roleOf, 'lib', false);
    assert.equal(v.zones[3], 'c1');
    assert.deepEqual(v.libero, { zone: 1, replaced: 'c2' });
  });

  test('senza libero il sestetto resta com\'è', () => {
    assert.deepEqual(onCourt(P1, roleOf, null, false), { zones: [...P1], libero: null });
  });
});

describe('punti e rotazioni', () => {
  const ev = (our: number, opp: number, side: 'us' | 'opp', set = 1): ScoredEvent => ({ set, our, opp, side });

  test('primo servizio avversario: il primo punto vinto da noi produce 1 rotazione nostra', () => {
    assert.deepEqual(rotationState('opp', ['us']), { usRotations: 1, oppRotations: 0, serving: 'us' });
  });

  test('ruota solo chi vince il punto in ricezione', () => {
    // serviamo noi: punto loro (cambio palla), punto nostro (cambio palla), punto nostro al servizio, punto loro (cambio palla)
    assert.deepEqual(rotationState('us', ['opp', 'us', 'us', 'opp']), { usRotations: 1, oppRotations: 2, serving: 'opp' });
  });

  test('vincitori dalla cronaca: ordine di gioco, righe ripetute saltate, solo il set richiesto', () => {
    // cronaca dalla più recente come nell'app; il cambio campo ripete il punteggio del punto
    const events = [ev(2, 1, 'us'), ev(1, 1, 'opp'), ev(1, 1, 'opp'), ev(1, 0, 'us'), ev(5, 3, 'opp', 2)];
    assert.deepEqual(pointWinners(events, 1), ['us', 'opp', 'us']);
  });

  test('cronaca con punti mancanti: nessuna rotazione inventata', () => {
    const winners = pointWinners([ev(1, 0, 'us'), ev(3, 1, 'opp')], 1);
    assert.deepEqual(winners, ['us', null, 'opp']);
    assert.deepEqual(rotationState('us', winners), { usRotations: 0, oppRotations: 0, serving: 'opp' });
  });
});

describe('primo servizio (alternanza FIPAV)', () => {
  test('senza scelte: 1° set noi, poi si alterna fino al tie-break', () => {
    assert.deepEqual([1, 2, 3, 4, 5].map((s) => firstServer(s, {})), ['us', 'opp', 'us', 'opp', 'us']);
  });

  test('chi serve per primo nel set 1 riceve per primo nel set 2', () => {
    assert.equal(firstServer(2, { 1: 'opp' }), 'us');
  });

  test('la scelta dell\'admin vince sulla regola, e la regola riparte da lì', () => {
    assert.equal(firstServer(2, { 1: 'us', 2: 'us' }), 'us');
    assert.equal(firstServer(3, { 2: 'us' }), 'opp');
    assert.equal(firstServer(5, { 5: 'opp' }), 'opp');
  });
});

describe('validazione del sestetto', () => {
  const levels = (zones: Zones, liberos: string[] = []) => validateLineup(zones, liberos, roleOf).map((i) => i.level);

  test('P1 classico con un libero: nessun problema', () => {
    assert.deepEqual(validateLineup(P1, ['lib'], roleOf), []);
  });

  test('diagonali errate → avviso, non errore', () => {
    // centrale e schiacciatrice scambiate: diagonali II–V e III–VI sbagliate
    assert.deepEqual(levels(['pal', 'c1', 's1', 'opp', 's2', 'c2']), ['avviso', 'avviso']);
  });

  test('libero in zona (al posto di una schiacciatrice) → nessun errore', () => {
    const issues = validateLineup(['pal', 'lib', 'c1', 'opp', 's2', 'c2'], ['lib'], roleOf);
    assert.ok(!issues.some((i) => i.level === 'errore'));
  });

  test('due palleggiatrici → avviso "schema 4-2/6-2?"', () => {
    const issues = validateLineup(['pal', 's1', 'c1', 'pal2', 's2', 'c2'], [], roleOf);
    assert.deepEqual(issues.map((i) => i.level), ['avviso']);
    assert.match(issues[0].message, /4-2\/6-2/);
  });

  test('sestetto incompleto o con doppioni → errore', () => {
    assert.deepEqual(levels(['pal', 's1', 'c1', 'opp', 's2', null]), ['errore']);
    assert.ok(levels(['pal', 'pal', 'c1', 'opp', 's2', 'c2']).includes('errore'));
  });

  test('libero senza ruolo Libero o più di 2 liberi → errore', () => {
    assert.deepEqual(levels(P1, ['ris']), ['errore']);
    assert.deepEqual(levels(P1, ['lib', 'lib2', 'lib']), ['errore']);
  });
});
