import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePreset } from '../src/lib/validate.js';

const valid = {
  id: 'fr-verbs',
  language: 'fr',
  name: 'French verbs',
  items: [{ term: 'être', translations: { en: 'to be' } }],
};

test('accepts a valid preset', () => {
  assert.deepEqual(validatePreset(valid), []);
});

test('rejects a non-object', () => {
  assert.equal(validatePreset(null).length, 1);
  assert.equal(validatePreset([]).length, 1);
});

test('rejects bad id and language', () => {
  const errs = validatePreset({ ...valid, id: 'Bad_Id', language: 'eng' });
  assert.ok(errs.some((e) => e.includes('id')));
  assert.ok(errs.some((e) => e.includes('language')));
});

test('requires a non-empty items array', () => {
  assert.ok(validatePreset({ ...valid, items: [] }).some((e) => e.includes('items')));
  assert.ok(validatePreset({ ...valid, items: 'x' }).some((e) => e.includes('items')));
});

test('validates item shape', () => {
  const errs = validatePreset({
    ...valid,
    items: [{ term: '', translations: {} }],
  });
  assert.ok(errs.some((e) => e.includes('term')));
  assert.ok(errs.some((e) => e.includes('translations')));
});

test('rejects non-2-letter translation keys and empty values', () => {
  const errs = validatePreset({
    ...valid,
    items: [{ term: 'x', translations: { eng: 'e', ru: '' } }],
  });
  assert.ok(errs.some((e) => e.includes('"eng"')));
  assert.ok(errs.some((e) => e.includes('.ru')));
});

test('rejects unknown properties', () => {
  assert.ok(validatePreset({ ...valid, extra: 1 }).some((e) => e.includes('unknown')));
  assert.ok(
    validatePreset({ ...valid, items: [{ term: 'x', translations: { en: 'y' }, foo: 1 }] }).some(
      (e) => e.includes('unknown'),
    ),
  );
});
