import {
  loadPresets,
  presetLanguages,
  missingTranslationCount,
} from '../lib/presets.js';
import {
  readSettings,
  writeSettings,
  fileExists,
  settingsPaths,
} from '../lib/settings.js';
import { FORMATS, renderPreset, renderItem } from '../lib/format.js';
import { selectFromList, confirm, closePrompt } from '../lib/prompt.js';
import {
  readState,
  writeState,
  setDeck,
  clearDeck,
  windowSlice,
  shuffle,
  DEFAULT_WINDOW,
} from '../lib/rotation.js';

/** Parse and validate a --window value, falling back to the default. */
export function resolveWindow(value) {
  if (value === undefined) return DEFAULT_WINDOW;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`--window must be a positive integer, got "${value}".`);
  }
  return n;
}

/**
 * Run the preset / language / format selection flow (interactive unless the
 * matching flags are supplied) and return the rendered verbs. Shared by `init`
 * and `add`. Does not read or write settings, and does not close the prompt.
 *
 * @param {{ preset?: string, lang?: string, format?: string, yes?: boolean }} [opts]
 * @returns {Promise<{ verbs: string[], preset: object }>}
 */
export async function selectVerbs(opts = {}) {
  const presets = await loadPresets();
  if (presets.length === 0) {
    console.error('No presets available.');
    process.exit(1);
  }

  // Preset
  let preset;
  if (opts.preset) {
    preset = presets.find((p) => p.id === opts.preset);
    if (!preset) {
      const ids = presets.map((p) => p.id).join(', ');
      throw new Error(`Unknown preset "${opts.preset}". Available: ${ids}`);
    }
  } else {
    console.log('Available presets:');
    preset = await selectFromList(
      'Pick a preset',
      presets.map((p) => ({ label: `${p.id} — ${p.name}`, value: p })),
    );
  }

  if (preset.items.length === 0) {
    console.error(`Preset "${preset.id}" has no items.`);
    process.exit(1);
  }

  // Translation language
  const langs = presetLanguages(preset);
  let translationLang;
  if (opts.lang) {
    if (!langs.includes(opts.lang)) {
      throw new Error(
        `Preset "${preset.id}" has no "${opts.lang}" translations. Available: ${langs.join(', ')}`,
      );
    }
    translationLang = opts.lang;
  } else if (langs.length === 1) {
    translationLang = langs[0];
    if (!opts.yes) console.log(`\nTranslation language: ${translationLang}`);
  } else {
    console.log('\nAvailable translation languages:');
    translationLang = await selectFromList('Pick a translation language', langs);
  }

  const missing = missingTranslationCount(preset, translationLang);
  if (missing > 0) {
    console.log(
      `\nNote: ${missing} of ${preset.items.length} items have no "${translationLang}" translation; ` +
        'the original term is shown for those.',
    );
  }

  // Format
  let formatId;
  const sample = preset.items[0];
  if (opts.format) {
    if (!FORMATS.some((f) => f.id === opts.format)) {
      const ids = FORMATS.map((f) => f.id).join(', ');
      throw new Error(`Unknown format "${opts.format}". Available: ${ids}`);
    }
    formatId = opts.format;
  } else {
    console.log('\nDisplay format:');
    formatId = await selectFromList(
      'Pick a format',
      FORMATS.map((f) => ({
        label: `${f.label}  (e.g. "${renderItem(sample, translationLang, f.id)}")`,
        value: f.id,
      })),
    );
  }

  return { verbs: renderPreset(preset, translationLang, formatId), preset };
}

/**
 * @param {string | string[]} claudeDirs One or more Claude config directories.
 * @param {{ preset?: string, lang?: string, format?: string, yes?: boolean,
 *           rotate?: boolean, window?: string, shuffle?: boolean }} [opts]
 */
export async function initCommand(claudeDirs, opts = {}) {
  const dirs = Array.isArray(claudeDirs) ? claudeDirs : [claudeDirs];

  const { verbs } = await selectVerbs(opts);

  // In rotation mode the full list becomes a deck; only a window of it is
  // written to spinnerVerbs at a time, and `bywords rotate` advances it.
  const rotate = !!opts.rotate;
  const window = rotate ? resolveWindow(opts.window) : 0;
  const deck = rotate && opts.shuffle ? shuffle(verbs) : verbs;
  const active = rotate ? windowSlice(deck, 0, window) : verbs;

  if (rotate) {
    if (window >= deck.length) {
      console.log(
        `\nNote: window (${window}) is ≥ the deck (${deck.length}); every word stays visible and rotate is a no-op.`,
      );
    }
    console.log(`\nDeck of ${deck.length}, showing a window of ${active.length}.`);
    console.log(`Preview (first 3 of ${active.length} in view):`);
  } else {
    console.log(`\nPreview (first 3 of ${active.length}):`);
  }
  for (const v of active.slice(0, 3)) console.log(`  ${v}`);

  console.log(`\nTarget${dirs.length > 1 ? 's' : ''} (replaces any words currently set):`);
  for (const dir of dirs) console.log(`  ${settingsPaths(dir).settings}`);

  let proceed = true;
  if (!opts.yes) proceed = await confirm('Write?', true);
  closePrompt();
  if (!proceed) {
    console.log('Aborted.');
    return;
  }

  const state = await readState();
  const now = new Date().toISOString();

  for (const claudeDir of dirs) {
    const { settings: SETTINGS_PATH, backup: BACKUP_PATH } = settingsPaths(claudeDir);
    const settings = await readSettings(claudeDir);
    const hadBackupBefore = await fileExists(BACKUP_PATH);
    settings.spinnerVerbs = { mode: 'replace', verbs: active };
    await writeSettings(settings, claudeDir);

    if (rotate) {
      setDeck(state, claudeDir, { deck, window, cursor: 0, shuffled: !!opts.shuffle, lastRotated: now });
    } else {
      // A plain init replaces everything, so any prior rotation deck is stale.
      clearDeck(state, claudeDir);
    }

    if (!hadBackupBefore && (await fileExists(BACKUP_PATH))) {
      console.log(`✓ Backed up existing settings to ${BACKUP_PATH}`);
    }
    if (rotate) {
      console.log(`✓ Wrote a window of ${active.length} (deck of ${deck.length}) to ${SETTINGS_PATH}`);
    } else {
      console.log(`✓ Wrote ${active.length} spinnerVerbs to ${SETTINGS_PATH}`);
    }
  }

  await writeState(state);

  if (rotate) {
    console.log('\nRun `bywords rotate` to advance the window. Restart Claude Code to see changes.');
  } else {
    console.log('\nRestart Claude Code to see the new spinner words.');
  }
}
