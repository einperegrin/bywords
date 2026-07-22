import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  windowSlice,
  nextCursor,
  shuffle,
  readState,
  writeState,
  getDeck,
} from '../src/lib/rotation.js';
import { resolveWindow, initCommand } from '../src/commands/init.js';
import { rotateCommand } from '../src/commands/rotate.js';
import { addCommand } from '../src/commands/add.js';
import { readSettings } from '../src/lib/settings.js';

// --- pure helpers -----------------------------------------------------------

test('windowSlice returns a constant-size window and wraps at the end', () => {
  const deck = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual(windowSlice(deck, 0, 2), ['a', 'b']);
  assert.deepEqual(windowSlice(deck, 3, 2), ['d', 'e']);
  assert.deepEqual(windowSlice(deck, 4, 3), ['e', 'a', 'b']); // wraps
});

test('windowSlice returns the whole deck when the window covers it', () => {
  const deck = ['a', 'b'];
  assert.deepEqual(windowSlice(deck, 0, 5), ['a', 'b']);
  assert.deepEqual(windowSlice([], 0, 3), []);
});

test('nextCursor advances by the window and wraps; no-op when window ≥ deck', () => {
  assert.equal(nextCursor(0, 4, 10), 4);
  assert.equal(nextCursor(8, 4, 10), 2); // 12 % 10
  assert.equal(nextCursor(0, 10, 10), 0);
  assert.equal(nextCursor(0, 3, 0), 0);
});

test('shuffle keeps the same multiset and does not mutate the input', () => {
  const input = ['a', 'b', 'c', 'd'];
  const out = shuffle(input);
  assert.deepEqual(input, ['a', 'b', 'c', 'd']);
  assert.deepEqual([...out].sort(), ['a', 'b', 'c', 'd']);
});

test('resolveWindow validates and defaults', () => {
  assert.equal(resolveWindow(undefined), 15);
  assert.equal(resolveWindow('4'), 4);
  assert.throws(() => resolveWindow('0'), /positive integer/);
  assert.throws(() => resolveWindow('x'), /positive integer/);
});

// --- state round-trip -------------------------------------------------------

async function withEnv(fn) {
  const root = await mkdtemp(join(tmpdir(), 'bywords-rot-'));
  const claudeDir = join(root, '.claude');
  const stateDir = join(root, 'state');
  const presetsDir = join(root, 'presets');
  await mkdir(claudeDir, { recursive: true });
  await mkdir(presetsDir, { recursive: true });
  const saved = { s: process.env.BYWORDS_STATE_DIR, p: process.env.BYWORDS_PRESETS_DIR };
  process.env.BYWORDS_STATE_DIR = stateDir;
  process.env.BYWORDS_PRESETS_DIR = presetsDir;
  const log = console.log;
  console.log = () => {};
  try {
    await fn({ claudeDir, presetsDir });
  } finally {
    console.log = log;
    process.env.BYWORDS_STATE_DIR = saved.s;
    process.env.BYWORDS_PRESETS_DIR = saved.p;
    await rm(root, { recursive: true, force: true });
  }
}

function makePreset(id, terms) {
  return JSON.stringify({
    id,
    language: 'es',
    name: id,
    items: terms.map((t) => ({ term: t, translations: { en: t } })),
  });
}

test('readState/writeState round-trip', async () => {
  await withEnv(async () => {
    const state = await readState();
    assert.deepEqual(state.decks, {});
    state.decks['/x'] = { deck: ['a'], window: 1, cursor: 0 };
    await writeState(state);
    const again = await readState();
    assert.deepEqual(again.decks['/x'].deck, ['a']);
  });
});

// --- full lifecycle through the commands ------------------------------------

test('init --rotate writes a window and remembers the deck', async () => {
  await withEnv(async ({ claudeDir, presetsDir }) => {
    const terms = Array.from({ length: 10 }, (_, i) => `w${i}`);
    await writeFile(join(presetsDir, 'deck.json'), makePreset('deck', terms));

    await initCommand(claudeDir, {
      preset: 'deck',
      lang: 'en',
      format: 'term-only',
      yes: true,
      rotate: true,
      window: '4',
    });

    const s = await readSettings(claudeDir);
    assert.deepEqual(s.spinnerVerbs.verbs, ['w0', 'w1', 'w2', 'w3']);
    const entry = getDeck(await readState(), claudeDir);
    assert.equal(entry.deck.length, 10);
    assert.equal(entry.window, 4);
    assert.equal(entry.cursor, 0);
  });
});

test('rotate advances the window and wraps around the deck', async () => {
  await withEnv(async ({ claudeDir, presetsDir }) => {
    const terms = Array.from({ length: 10 }, (_, i) => `w${i}`);
    await writeFile(join(presetsDir, 'deck.json'), makePreset('deck', terms));
    await initCommand(claudeDir, {
      preset: 'deck', lang: 'en', format: 'term-only', yes: true, rotate: true, window: '4',
    });

    await rotateCommand({ configDir: claudeDir });
    assert.deepEqual((await readSettings(claudeDir)).spinnerVerbs.verbs, ['w4', 'w5', 'w6', 'w7']);

    await rotateCommand({ configDir: claudeDir });
    // cursor 8, wraps: w8, w9, w0, w1
    assert.deepEqual((await readSettings(claudeDir)).spinnerVerbs.verbs, ['w8', 'w9', 'w0', 'w1']);
    assert.equal(getDeck(await readState(), claudeDir).cursor, 8);
  });
});

test('rotate --daily is a no-op right after init', async () => {
  await withEnv(async ({ claudeDir, presetsDir }) => {
    const terms = Array.from({ length: 6 }, (_, i) => `w${i}`);
    await writeFile(join(presetsDir, 'deck.json'), makePreset('deck', terms));
    await initCommand(claudeDir, {
      preset: 'deck', lang: 'en', format: 'term-only', yes: true, rotate: true, window: '2',
    });
    await rotateCommand({ configDir: claudeDir, daily: true });
    assert.equal(getDeck(await readState(), claudeDir).cursor, 0); // unchanged
  });
});

test('add extends the deck without moving the cursor', async () => {
  await withEnv(async ({ claudeDir, presetsDir }) => {
    await writeFile(join(presetsDir, 'deck.json'), makePreset('deck', ['w0', 'w1', 'w2', 'w3']));
    await writeFile(join(presetsDir, 'more.json'), makePreset('more', ['x0', 'x1']));
    await initCommand(claudeDir, {
      preset: 'deck', lang: 'en', format: 'term-only', yes: true, rotate: true, window: '2',
    });

    await addCommand(claudeDir, { preset: 'more', lang: 'en', format: 'term-only', yes: true });

    const entry = getDeck(await readState(), claudeDir);
    assert.deepEqual(entry.deck, ['w0', 'w1', 'w2', 'w3', 'x0', 'x1']);
    assert.equal(entry.cursor, 0);
    assert.deepEqual((await readSettings(claudeDir)).spinnerVerbs.verbs, ['w0', 'w1']);
  });
});

test('plain init clears a prior rotation deck', async () => {
  await withEnv(async ({ claudeDir, presetsDir }) => {
    await writeFile(join(presetsDir, 'deck.json'), makePreset('deck', ['w0', 'w1', 'w2', 'w3']));
    await initCommand(claudeDir, {
      preset: 'deck', lang: 'en', format: 'term-only', yes: true, rotate: true, window: '2',
    });
    assert.ok(getDeck(await readState(), claudeDir));

    await initCommand(claudeDir, { preset: 'deck', lang: 'en', format: 'term-only', yes: true });
    assert.equal(getDeck(await readState(), claudeDir), null);
    assert.equal((await readSettings(claudeDir)).spinnerVerbs.verbs.length, 4);
  });
});
