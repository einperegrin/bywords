import { loadPresets, presetLanguages } from '../lib/presets.js';
import {
  readSettings,
  writeSettings,
  fileExists,
  settingsPaths,
} from '../lib/settings.js';
import { FORMATS, renderPreset, renderItem } from '../lib/format.js';
import { selectFromList, confirm, closePrompt } from '../lib/prompt.js';

export async function initCommand(claudeDir) {
  const { settings: SETTINGS_PATH, backup: BACKUP_PATH } = settingsPaths(claudeDir);

  const presets = await loadPresets();
  if (presets.length === 0) {
    console.error('No presets available.');
    process.exit(1);
  }

  console.log('Available presets:');
  const preset = await selectFromList(
    'Pick a preset',
    presets.map((p) => ({ label: `${p.id} — ${p.name}`, value: p })),
  );

  const langs = presetLanguages(preset);
  let translationLang;
  if (langs.length === 1) {
    translationLang = langs[0];
    console.log(`\nTranslation language: ${translationLang}`);
  } else {
    console.log('\nAvailable translation languages:');
    translationLang = await selectFromList('Pick a translation language', langs);
  }

  console.log('\nDisplay format:');
  const sample = preset.items[0];
  const formatId = await selectFromList(
    'Pick a format',
    FORMATS.map((f) => ({
      label: `${f.label}  (e.g. "${renderItem(sample, translationLang, f.id)}")`,
      value: f.id,
    })),
  );

  const verbs = renderPreset(preset, translationLang, formatId);
  console.log(`\nPreview (first 3 of ${verbs.length}):`);
  for (const v of verbs.slice(0, 3)) console.log(`  ${v}`);

  console.log(`\nTarget: ${SETTINGS_PATH}`);
  const proceed = await confirm('Write?', true);
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
