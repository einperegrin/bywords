import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  presetLanguages,
  missingTranslationCount,
  loadPresets,
  auditPresets,
} from '../src/lib/presets.js';

test('presetLanguages returns the sorted union of translation keys', () => {
  const preset = {
    items: [
      { term: 'a', translations: { ru: 'а', en: 'a' } },
      { term: 'b', translations: { en: 'b' } },
    ],
  };
  assert.deepEqual(presetLanguages(preset), ['en', 'ru']);
});

test('missingTranslationCount counts items lacking a language', () => {
  const preset = {
    items: [
      { term: 'a', translations: { en: 'a' } },
      { term: 'b', translations: { ru: 'б' } },
    ],
  };
  assert.equal(missingTranslationCount(preset, 'en'), 1);
  assert.equal(missingTranslationCount(preset, 'en') + missingTranslationCount(preset, 'ru'), 2);
});

test('bundled presets are all valid and loadable', async () => {
  delete process.env.BYWORDS_PRESETS_DIR;
  const results = await auditPresets();
  assert.ok(results.length >= 1);
  for (const r of results) assert.deepEqual(r.errors, [], `${r.file}: ${r.errors.join('; ')}`);
  const presets = await loadPresets();
  assert.ok(presets.some((p) => p.id === 'es-top100-verbs'));
});

test('user presets directory is merged in', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bywords-presets-'));
  process.env.BYWORDS_PRESETS_DIR = dir;
  try {
    await writeFile(
      join(dir, 'de-test.json'),
      JSON.stringify({
        id: 'de-test',
        language: 'de',
        name: 'German test',
        items: [{ term: 'sein', translations: { en: 'to be' } }],
      }),
    );
    const presets = await loadPresets();
    assert.ok(presets.some((p) => p.id === 'de-test'));
  } finally {
    delete process.env.BYWORDS_PRESETS_DIR;
    await rm(dir, { recursive: true, force: true });
  }
});

test('an invalid user preset is skipped, not fatal', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bywords-presets-'));
  process.env.BYWORDS_PRESETS_DIR = dir;
  const origWrite = process.stderr.write;
  process.stderr.write = () => true; // swallow the warning
  try {
    await writeFile(join(dir, 'broken.json'), '{ not json');
    const presets = await loadPresets();
    assert.ok(presets.some((p) => p.id === 'es-top100-verbs'));
  } finally {
    process.stderr.write = origWrite;
    delete process.env.BYWORDS_PRESETS_DIR;
    await rm(dir, { recursive: true, force: true });
  }
});
