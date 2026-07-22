import { readSettings, writeSettings, settingsPaths, validateClaudeDir } from '../lib/settings.js';
import { readState, writeState, getDeck, windowSlice, nextCursor, windowRange } from '../lib/rotation.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Advance the active spinner window to the next slice of the deck.
 *
 * Non-interactive by design: it rotates every dir that has a rotation deck
 * (or just the one given via --config-dir), so it's safe to wire to cron.
 *
 * @param {{ configDir?: string, daily?: boolean }} [opts]
 */
export async function rotateCommand(opts = {}) {
  const state = await readState();

  let dirs;
  if (opts.configDir) {
    await validateClaudeDir(opts.configDir);
    dirs = [opts.configDir];
  } else {
    dirs = Object.keys(state.decks ?? {});
  }

  if (dirs.length === 0) {
    console.log('Nothing is rotating yet. Run `bywords init --rotate` to set up a deck.');
    return;
  }

  let changed = false;
  const now = Date.now();

  for (const claudeDir of dirs) {
    const { settings: SETTINGS_PATH } = settingsPaths(claudeDir);
    const entry = getDeck(state, claudeDir);
    if (!entry) {
      console.log(`• ${SETTINGS_PATH}: not in rotation mode; run \`bywords init --rotate\`.`);
      continue;
    }

    const deckLen = entry.deck.length;
    if (entry.window >= deckLen) {
      console.log(
        `• ${SETTINGS_PATH}: window (${entry.window}) covers the whole deck (${deckLen}) — nothing to rotate.`,
      );
      continue;
    }

    if (opts.daily && entry.lastRotated) {
      const age = now - Date.parse(entry.lastRotated);
      if (Number.isFinite(age) && age < DAY_MS) {
        console.log(`• ${SETTINGS_PATH}: rotated less than a day ago — skipping (--daily).`);
        continue;
      }
    }

    const cursor = nextCursor(entry.cursor ?? 0, entry.window, deckLen);
    const verbs = windowSlice(entry.deck, cursor, entry.window);

    const settings = await readSettings(claudeDir);
    settings.spinnerVerbs = { mode: 'replace', verbs };
    await writeSettings(settings, claudeDir);

    entry.cursor = cursor;
    entry.lastRotated = new Date(now).toISOString();
    changed = true;

    const [from, to] = windowRange(cursor, entry.window, deckLen);
    console.log(`✓ ${SETTINGS_PATH}: window → #${from}..#${to} of ${deckLen}`);
  }

  if (changed) {
    await writeState(state);
    console.log('\nRestart Claude Code to see the rotated words.');
  }
}
