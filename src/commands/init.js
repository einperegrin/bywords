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

/**
 * @param {string} claudeDir
 * @param {{ preset?: string, lang?: string, format?: string, yes?: boolean }} [opts]
 */
export async function initCommand(claudeDir, opts = {}) {
  const { settings: SETTINGS_PATH, backup: BACKUP_PATH } = settingsPaths(claudeDir);

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

  const verbs = renderPreset(preset, translationLang, formatId);
  console.log(`\nPreview (first 3 of ${verbs.length}):`);
  for (const v of verbs.slice(0, 3)) console.log(`  ${v}`);

  console.log(`\nTarget: ${SETTINGS_PATH}`);
  let proceed = true;
  if (!opts.yes) proceed = await confirm('Write?', true);
  closePrompt();
  if (!proceed) {
    console.log('Aborted.');
    return;
  }

  const hadBackupBefore = await fileExists(BACKUP_PATH);
  const settings = await readSettings(claudeDir);
  settings.spinnerVerbs = { mode: 'replace', verbs };
  await writeSettings(settings, claudeDir);

  if (!hadBackupBefore && (await fileExists(BACKUP_PATH))) {
    console.log(`\n✓ Backed up existing settings to ${BACKUP_PATH}`);
  }
  console.log(`✓ Wrote ${verbs.length} spinnerVerbs to ${SETTINGS_PATH}`);
  console.log('\nRestart Claude Code to see the new spinner words.');
}
