import { readSettings, writeSettings, fileExists, settingsPaths } from '../lib/settings.js';
import { confirm, closePrompt } from '../lib/prompt.js';

export async function resetCommand(claudeDir) {
  const { settings: SETTINGS_PATH } = settingsPaths(claudeDir);

  if (!(await fileExists(SETTINGS_PATH))) {
    console.log(`No settings file at ${SETTINGS_PATH} — nothing to reset.`);
    return;
  }

  const settings = await readSettings(claudeDir);
  if (!settings.spinnerVerbs) {
    console.log('spinnerVerbs is not set — nothing to reset.');
    return;
  }

  console.log(`This will remove spinnerVerbs from ${SETTINGS_PATH}.`);
  const proceed = await confirm('Continue?', false);
  closePrompt();
  if (!proceed) {
    console.log('Aborted.');
    return;
  }

  delete settings.spinnerVerbs;
  await writeSettings(settings, claudeDir);
  console.log(`✓ Removed spinnerVerbs from ${SETTINGS_PATH}`);
}
