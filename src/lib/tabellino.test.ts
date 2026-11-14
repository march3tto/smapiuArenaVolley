// Test dei controlli di coerenza del tabellino: npm test
// Valori reali: Smapiù Arena – Azimut Giorgione, 1ª giornata, 3-0 (Pt e Tot; Err e Mur di prova, coerenti tra i fogli).
// Il calcolo per differenza (Set 1 + Set 2 + finale → Set 3) è nel database: supabase/tests/database/tabellino_attacco.test.sql
/// <reference types="node" />
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { controlla, eNostra, intero, normalizza, somma } from '../../supabase/functions/_shared/tabellino.ts';

const g = (numero: number, nome: string, pt: number, tot: number, err = 0, mur = 0) => ({ numero, nome, tot, err, mur, pt });

const SET1 = [g(2, 'Riccato', 4, 6, 1), g(17, 'Tellaroli', 2, 12, 2, 1), g(12, 'Trampus', 2, 5, 0, 1), g(13, 'Trevisan', 3, 9, 1), g(10, 'Bonini', 0, 2)];
const SET2 = [g(2, 'Riccato', 4, 10, 1, 1), g(17, 'Tellaroli', 3, 11, 1, 1), g(12, 'Trampus', 4, 6), g(13, 'Trevisan', 2, 11, 2, 1), g(10, 'Bonini', 1, 1), g(14, 'Giroldi', 2, 2)];
const SET3 = [g(2, 'Riccato', 4, 5), g(17, 'Tellaroli', 6, 19, 2, 2), g(12, 'Trampus', 4, 10, 1, 1), g(13, 'Trevisan', 3, 13, 1, 1), g(10, 'Bonini', 1, 1), g(14, 'Giroldi', 0, 1, 0, 1)];
const FINALE = [g(2, 'Riccato', 12, 21, 2, 1), g(17, 'Tellaroli', 11, 42, 5, 4), g(12, 'Trampus', 10, 21, 1, 2), g(13, 'Trevisan', 8, 33, 4, 2), g(10, 'Bonini', 2, 4), g(14, 'Giroldi', 2, 3, 0, 1)];
const PUNTI_VINTI = { 1: 11, 2: 16, 3: 18 };

function foglio(numeroSet: number | null, giocatrici: ReturnType<typeof g>[], totali = somma(giocatrici)) {
  return {
    tipo_foglio: numeroSet ? 'set' : 'finale',
    numero_set: numeroSet,
    squadre: [{ nome: 'SMAPIU ARENA', lato: 'nostra', giocatrici, totali, punti_vinti_att_per_set: PUNTI_VINTI }],
  };
}

describe('tabellino: lettura', () => {
  test('"." e celle vuote valgono 0', () => {
    assert.equal(intero('.'), 0);
    assert.equal(intero(''), 0);
    assert.equal(intero('12'), 12);
    assert.equal(intero(7), 7);
  });

  test('la nostra squadra si riconosce dal nome', () => {
    assert.ok(eNostra('SMAPIU ARENA VOLLEY TEAM'));
    assert.ok(eNostra('Smapiù Arena'));
    assert.ok(!eNostra('AZIMUT GIORGIONE'));
    // il lato lo decide il nome, non il modello
    const t = normalizza({ tipo_foglio: 'set', numero_set: 1, squadre: [{ nome: 'Arena Volley', lato: 'avversaria', giocatrici: [] }] });
    assert.equal(t.squadre[0].lato, 'nostra');
  });

  test('le giocatrici senza dati d\'attacco sono escluse', () => {
    const t = normalizza(foglio(1, [...SET1, { numero: 14, nome: 'Giroldi', tot: '.', err: '.', mur: '.', pt: '.' } as never]));
    assert.equal(t.squadre[0].giocatrici.length, 5);
  });

  test('foglio senza numero di set valido = finale', () => {
    assert.equal(normalizza({ tipo_foglio: 'set', numero_set: 9, squadre: [] }).tipo_foglio, 'finale');
  });
});

describe('tabellino: controlli di coerenza', () => {
  test('i tre fogli di set e il finale tornano', () => {
    for (const [n, righe, tot] of [[1, SET1, 11], [2, SET2, 16], [3, SET3, 18]] as const) {
      const t = normalizza(foglio(n, [...righe]));
      assert.equal(t.squadre[0].totali.pt, tot);
      assert.equal(controlla(t).messaggio, null, `set ${n}`);
    }
    const fin = normalizza(foglio(null, FINALE));
    assert.deepEqual(fin.squadre[0].totali, { tot: 124, err: 12, mur: 10, pt: 45 });
    assert.equal(controlla(fin).messaggio, null);
  });

  test('somma dei set = finale, giocatrice per giocatrice', () => {
    for (const f of FINALE) {
      const sets = [SET1, SET2, SET3].map((s) => s.find((x) => x.numero === f.numero)).filter((x) => !!x);
      assert.deepEqual(somma(sets), { tot: f.tot, err: f.err, mur: f.mur, pt: f.pt }, f.nome);
    }
  });

  test('una cifra letta male blocca il salvataggio con un messaggio leggibile', () => {
    // Riccato letta 3 invece di 4: somma 44, totale 45
    const righe = FINALE.map((x) => (x.numero === 2 ? { ...x, pt: 11 } : x));
    const esito = controlla(normalizza(foglio(null, righe, { tot: 124, err: 12, mur: 10, pt: 45 })));
    assert.deepEqual(esito.nostra, ['somma punti 44 ≠ totale 45']);
    assert.match(esito.messaggio ?? '', /somma punti 44 ≠ totale 45.*rifai la foto più dritta/);
  });

  test('foglio di set: totale ≠ Punti vinti Att del set', () => {
    const t = normalizza({ ...foglio(2, SET2), squadre: [{ ...foglio(2, SET2).squadre[0], punti_vinti_att_per_set: { 1: 11, 2: 15 } }] });
    assert.deepEqual(controlla(t).nostra, ['totale punti 16 ≠ Punti vinti Att del set 2 (15)']);
  });

  test('errore solo sull\'avversaria: la nostra resta valida', () => {
    const t = normalizza({
      ...foglio(1, SET1),
      squadre: [
        foglio(1, SET1).squadre[0],
        { nome: 'AZIMUT GIORGIONE', giocatrici: [g(5, 'Rossi', 3, 8)], totali: { tot: 8, err: 0, mur: 0, pt: 4 }, punti_vinti_att_per_set: { 1: 4 } },
      ],
    });
    const esito = controlla(t);
    assert.deepEqual(esito.nostra, []);
    assert.deepEqual(esito.avversaria, ['somma punti 3 ≠ totale 4']);
  });
});
