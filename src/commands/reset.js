import { readSettings, writeSettings, fileExists, settingsPaths } from '../lib/settings.js';
import { confirm, closePrompt } from '../lib/prompt.js';
import { readState, writeState, getDeck, clearDeck } from '../lib/rotation.js';

export async function resetCommand(claudeDir) {
  const { settings: SETTINGS_PATH } = settingsPaths(claudeDir);

  const state = await readState();
  const hasDeck = !!getDeck(state, claudeDir);

  if (!(await fileExists(SETTINGS_PATH))) {
    if (hasDeck) {
      clearDeck(state, claudeDir);
      await writeState(state);
      console.log('✓ Cleared the rotation deck.');
    }
    console.log(`No settings file at ${SETTINGS_PATH} — nothing else to reset.`);
    return;
  }

  const settings = await readSettings(claudeDir);
  if (!settings.spinnerVerbs && !hasDeck) {
    console.log('spinnerVerbs is not set — nothing to reset.');
    return;
  }

  console.log(`This will remove spinnerVerbs from ${SETTINGS_PATH}${hasDeck ? ' and clear the rotation deck' : ''}.`);
  const proceed = await confirm('Continue?', false);
  closePrompt();
  if (!proceed) {
    console.log('Aborted.');
    return;
  }

  delete settings.spinnerVerbs;
  await writeSettings(settings, claudeDir);
  if (hasDeck) {
    clearDeck(state, claudeDir);
    await writeState(state);
  }
  console.log(`✓ Removed spinnerVerbs from ${SETTINGS_PATH}${hasDeck ? ' and cleared the rotation deck' : ''}`);
}
