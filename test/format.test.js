import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderItem, renderPreset, FORMATS } from '../src/lib/format.js';

const item = { term: 'hablar', translations: { en: 'to speak', ru: 'говорить' } };

test('renders each format', () => {
  assert.equal(renderItem(item, 'en', 'term-translation'), 'hablar — to speak');
  assert.equal(renderItem(item, 'en', 'translation-term'), 'to speak — hablar');
  assert.equal(renderItem(item, 'en', 'term-only'), 'hablar');
});

test('falls back to the term when the language is missing', () => {
  assert.equal(renderItem(item, 'de', 'term-translation'), 'hablar — hablar');
});

test('unknown format throws', () => {
  assert.throws(() => renderItem(item, 'en', 'nope'), /Unknown format/);
});

test('every declared format id renders', () => {
  for (const f of FORMATS) {
    assert.equal(typeof renderItem(item, 'en', f.id), 'string');
  }
});

test('renderPreset maps every item', () => {
  const preset = { items: [item, { term: 'ser', translations: { en: 'to be' } }] };
  assert.deepEqual(renderPreset(preset, 'en', 'term-only'), ['hablar', 'ser']);
});
