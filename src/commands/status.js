import { readSettings, settingsPaths } from '../lib/settings.js';

export async function statusCommand(claudeDir) {
  const { settings: SETTINGS_PATH } = settingsPaths(claudeDir);
  console.log(`Config: ${SETTINGS_PATH}`);

  const settings = await readSettings(claudeDir);
  const sv = settings.spinnerVerbs;
  if (!sv) {
    console.log('spinnerVerbs: not configured (run `bywords init`).');
    return;
  }

  const verbs = Array.isArray(sv.verbs) ? sv.verbs : [];
  console.log(`mode:  ${sv.mode ?? '(unset)'}`);
  console.log(`verbs: ${verbs.length}`);
  for (const v of verbs.slice(0, 5)) console.log(`  ${v}`);
  if (verbs.length > 5) console.log(`  … and ${verbs.length - 5} more`);
}
