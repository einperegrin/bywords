import { readSettings, writeSettings, fileExists, settingsPaths } from '../lib/settings.js';
import { mergeVerbs } from '../lib/format.js';
import { confirm, closePrompt } from '../lib/prompt.js';
import { selectVerbs } from './init.js';

/**
 * Add a preset's words to the list bywords already wrote, keeping the existing
 * ones. Always stays in `replace` mode — the built-in verbs are never mixed in.
 *
 * @param {string | string[]} claudeDirs One or more Claude config directories.
 * @param {{ preset?: string, lang?: string, format?: string, yes?: boolean }} [opts]
 */
export async function addCommand(claudeDirs, opts = {}) {
  const dirs = Array.isArray(claudeDirs) ? claudeDirs : [claudeDirs];

  const { verbs: incoming } = await selectVerbs(opts);

  console.log(`\nAdding ${incoming.length} word(s) to the words already set in:`);
  for (const dir of dirs) console.log(`  ${settingsPaths(dir).settings}`);

  let proceed = true;
  if (!opts.yes) proceed = await confirm('Write?', true);
  closePrompt();
  if (!proceed) {
    console.log('Aborted.');
    return;
  }

  for (const claudeDir of dirs) {
    const { settings: SETTINGS_PATH, backup: BACKUP_PATH } = settingsPaths(claudeDir);
    const settings = await readSettings(claudeDir);
    const existing = Array.isArray(settings.spinnerVerbs?.verbs)
      ? settings.spinnerVerbs.verbs
      : [];
    const { merged, added } = mergeVerbs(existing, incoming);

    if (added === 0) {
      console.log(`• ${SETTINGS_PATH}: nothing new to add (${existing.length} already set).`);
      continue;
    }

    const hadBackupBefore = await fileExists(BACKUP_PATH);
    settings.spinnerVerbs = { mode: 'replace', verbs: merged };
    await writeSettings(settings, claudeDir);

    if (!hadBackupBefore && (await fileExists(BACKUP_PATH))) {
      console.log(`✓ Backed up existing settings to ${BACKUP_PATH}`);
    }
    console.log(`✓ Wrote ${merged.length} spinnerVerbs to ${SETTINGS_PATH} (+${added})`);
  }
  console.log('\nRestart Claude Code to see the new spinner words.');
}
