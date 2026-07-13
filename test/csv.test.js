import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, csvToPreset } from '../src/lib/csv.js';
import { validatePreset } from '../src/lib/validate.js';

test('parses simple rows', () => {
  assert.deepEqual(parseCsv('a,b\n1,2\n'), [
    ['a', 'b'],
    ['1', '2'],
  ]);
});

test('handles quoted fields with commas and newlines', () => {
  const rows = parseCsv('term,en\n"a, b","x\ny"\n');
  assert.deepEqual(rows, [
    ['term', 'en'],
    ['a, b', 'x\ny'],
  ]);
});

test('handles escaped quotes', () => {
  assert.deepEqual(parseCsv('"say ""hi"""\n'), [['say "hi"']]);
});

test('handles CRLF line endings', () => {
  assert.deepEqual(parseCsv('a,b\r\n1,2\r\n'), [
    ['a', 'b'],
    ['1', '2'],
  ]);
});

test('builds a valid preset from CSV', () => {
  const csv = 'term,en,ru\nhablar,to speak,говорить\nser,to be,быть\n';
  const { preset, warnings } = csvToPreset(csv, { id: 'es-x', language: 'es', name: 'X' });
  assert.deepEqual(warnings, []);
  assert.equal(preset.items.length, 2);
  assert.deepEqual(preset.items[0], {
    term: 'hablar',
    translations: { en: 'to speak', ru: 'говорить' },
  });
  assert.deepEqual(validatePreset(preset), []);
});

test('skips rows with empty term or no translations, with warnings', () => {
  const csv = 'term,en\nhablar,to speak\n,orphan\nser,\n';
  const { preset, warnings } = csvToPreset(csv, { id: 'es-x', language: 'es', name: 'X' });
  assert.equal(preset.items.length, 1);
  assert.equal(warnings.length, 2);
});

test('ignores non-language header columns', () => {
  const csv = 'term,en,notes\nhablar,to speak,verb\n';
  const { preset } = csvToPreset(csv, { id: 'es-x', language: 'es', name: 'X' });
  assert.deepEqual(preset.items[0].translations, { en: 'to speak' });
});

test('throws without a term column', () => {
  assert.throws(() => csvToPreset('a,en\n1,x\n', { id: 'x', language: 'es', name: 'X' }), /term/);
});

test('throws without a language column', () => {
  assert.throws(() => csvToPreset('term,notes\na,b\n', { id: 'x', language: 'es', name: 'X' }), /language column/);
});
