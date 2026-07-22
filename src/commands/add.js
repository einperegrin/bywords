import { readSettings, writeSettings, fileExists, settingsPaths } from '../lib/settings.js';
import { mergeVerbs } from '../lib/format.js';
import { confirm, closePrompt } from '../lib/prompt.js';
import { selectVerbs } from './init.js';
import { readState, writeState, getDeck, setDeck, windowSlice } from '../lib/rotation.js';

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

  const state = await readState();
  let stateChanged = false;

  for (const claudeDir of dirs) {
    const { settings: SETTINGS_PATH, backup: BACKUP_PATH } = settingsPaths(claudeDir);
    const settings = await readSettings(claudeDir);
    const entry = getDeck(state, claudeDir);

    // In rotation mode the deck (not the visible window) is the source of truth,
    // so new words extend the deck and the current window is re-rendered.
    const existing = entry
      ? entry.deck
      : Array.isArray(settings.spinnerVerbs?.verbs)
        ? settings.spinnerVerbs.verbs
        : [];
    const { merged, added } = mergeVerbs(existing, incoming);

    if (added === 0) {
      const what = entry ? `deck` : `list`;
      console.log(`• ${SETTINGS_PATH}: nothing new to add (${existing.length} already in the ${what}).`);
      continue;
    }

    const hadBackupBefore = await fileExists(BACKUP_PATH);
    if (entry) {
      entry.deck = merged;
      settings.spinnerVerbs = { mode: 'replace', verbs: windowSlice(merged, entry.cursor ?? 0, entry.window) };
      setDeck(state, claudeDir, entry);
      stateChanged = true;
    } else {
      settings.spinnerVerbs = { mode: 'replace', verbs: merged };
    }
    await writeSettings(settings, claudeDir);

    if (!hadBackupBefore && (await fileExists(BACKUP_PATH))) {
      console.log(`✓ Backed up existing settings to ${BACKUP_PATH}`);
    }
    if (entry) {
      console.log(`✓ Deck now ${merged.length} words at ${SETTINGS_PATH} (+${added}); window unchanged.`);
    } else {
      console.log(`✓ Wrote ${merged.length} spinnerVerbs to ${SETTINGS_PATH} (+${added})`);
    }
  }

  if (stateChanged) await writeState(state);
  console.log('\nRestart Claude Code to see the new spinner words.');
}
