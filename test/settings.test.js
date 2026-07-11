import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readSettings,
  writeSettings,
  settingsPaths,
  fileExists,
} from '../src/lib/settings.js';

async function withDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'bywords-settings-'));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('readSettings returns {} when the file is missing', async () => {
  await withDir(async (dir) => {
    assert.deepEqual(await readSettings(dir), {});
  });
});

test('readSettings returns {} for an empty file', async () => {
  await withDir(async (dir) => {
    await writeFile(settingsPaths(dir).settings, '   \n');
    assert.deepEqual(await readSettings(dir), {});
  });
});

test('readSettings throws a clear error on invalid JSON', async () => {
  await withDir(async (dir) => {
    await writeFile(settingsPaths(dir).settings, '{ broken');
    await assert.rejects(() => readSettings(dir), /invalid JSON/);
  });
});

test('writeSettings preserves unrelated keys and backs up once', async () => {
  await withDir(async (dir) => {
    const { settings: path, backup } = settingsPaths(dir);
    await writeFile(path, JSON.stringify({ theme: 'dark', keep: [1, 2] }));

    const s = await readSettings(dir);
    s.spinnerVerbs = { mode: 'replace', verbs: ['a'] };
    await writeSettings(s, dir);

    const written = JSON.parse(await readFile(path, 'utf8'));
    assert.equal(written.theme, 'dark');
    assert.deepEqual(written.keep, [1, 2]);
    assert.deepEqual(written.spinnerVerbs.verbs, ['a']);

    assert.ok(await fileExists(backup));
    const backedUp = JSON.parse(await readFile(backup, 'utf8'));
    assert.equal(backedUp.spinnerVerbs, undefined); // backup is the pre-write state

    // a second write must not overwrite the original backup
    s.spinnerVerbs.verbs = ['b'];
    await writeSettings(s, dir);
    const backupAfter = JSON.parse(await readFile(backup, 'utf8'));
    assert.equal(backupAfter.spinnerVerbs, undefined);
  });
});
