import { readSettings, writeSettings, fileExists, settingsPaths } from '../lib/settings.js';
import { mergeVerbs } from '../lib/format.js';
import { confirm, closePrompt } from '../lib/prompt.js';
import { selectVerbs } from './init.js';

/**
 * Add a preset's words to the list bywords already wrote, keeping the existing
 * ones. Always stays in `replace` mode — the built-in verbs are never mixed in.
 *
 * @param {string} claudeDir
 * @param {{ preset?: string, lang?: string, format?: string, yes?: boolean }} [opts]
 */
export async function addCommand(claudeDir, opts = {}) {
  const { settings: SETTINGS_PATH, backup: BACKUP_PATH } = settingsPaths(claudeDir);

  const settings = await readSettings(claudeDir);
  const existing = Array.isArray(settings.spinnerVerbs?.verbs)
    ? settings.spinnerVerbs.verbs
    : [];

  const { verbs: incoming } = await selectVerbs(opts);
  const { merged, added } = mergeVerbs(existing, incoming);

  console.log(
    `\nAdding ${added} new word(s) to the ${existing.length} already set → ${merged.length} total.`,
  );
  if (added === 0) {
    closePrompt();
    console.log('Nothing new to add.');
    return;
  }

  console.log(`\nTarget: ${SETTINGS_PATH}`);
  let proceed = true;
  if (!opts.yes) proceed = await confirm('Write?', true);
  closePrompt();
  if (!proceed) {
    console.log('Aborted.');
    return;
  }

  const hadBackupBefore = await fileExists(BACKUP_PATH);
  settings.spinnerVerbs = { mode: 'replace', verbs: merged };
  await writeSettings(settings, claudeDir);

  if (!hadBackupBefore && (await fileExists(BACKUP_PATH))) {
    console.log(`\n✓ Backed up existing settings to ${BACKUP_PATH}`);
  }
  console.log(`✓ Wrote ${merged.length} spinnerVerbs to ${SETTINGS_PATH}`);
  console.log('\nRestart Claude Code to see the new spinner words.');
}
