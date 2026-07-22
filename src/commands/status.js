import { readSettings, settingsPaths } from '../lib/settings.js';
import { readState, getDeck } from '../lib/rotation.js';

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

  const state = await readState();
  const entry = getDeck(state, claudeDir);
  if (entry) {
    const deckLen = entry.deck.length;
    const cursor = entry.cursor ?? 0;
    const from = cursor + 1;
    const to = ((cursor + entry.window - 1) % deckLen) + 1;
    console.log(`deck:  ${deckLen} words${entry.shuffled ? ' (shuffled)' : ''}`);
    console.log(`window: ${verbs.length} — #${from}..#${to} of ${deckLen}`);
    if (entry.lastRotated) console.log(`rotated: ${entry.lastRotated}`);
  } else {
    console.log(`verbs: ${verbs.length}`);
  }

  for (const v of verbs.slice(0, 5)) console.log(`  ${v}`);
  if (verbs.length > 5) console.log(`  … and ${verbs.length - 5} more`);
}
