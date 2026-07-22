import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileExists } from './settings.js';

/** Default number of words kept in the active spinner window. */
export const DEFAULT_WINDOW = 15;

const STATE_VERSION = 1;

/**
 * Directory holding bywords' own state (a sibling of the user presets dir).
 * Overridable via BYWORDS_STATE_DIR for tests/scripts; otherwise follows XDG.
 */
export function stateDir() {
  if (process.env.BYWORDS_STATE_DIR) return process.env.BYWORDS_STATE_DIR;
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(base, 'bywords');
}

export function stateFilePath() {
  return join(stateDir(), 'rotation.json');
}

/** Read the rotation state, returning an empty shell when absent or unreadable. */
export async function readState() {
  const path = stateFilePath();
  if (!(await fileExists(path))) return { version: STATE_VERSION, decks: {} };
  const content = await readFile(path, 'utf8');
  if (!content.trim()) return { version: STATE_VERSION, decks: {} };
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`${path} contains invalid JSON. Fix or delete it and try again.`);
  }
  if (!parsed || typeof parsed !== 'object' || typeof parsed.decks !== 'object') {
    return { version: STATE_VERSION, decks: {} };
  }
  return parsed;
}

/** Atomically write the rotation state. */
export async function writeState(state) {
  const path = stateFilePath();
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(state, null, 2) + '\n');
  await rename(tmp, path);
}

/** The rotation entry for a Claude config dir, or null if it isn't rotating. */
export function getDeck(state, claudeDir) {
  const entry = state.decks?.[claudeDir];
  return entry && Array.isArray(entry.deck) ? entry : null;
}

export function setDeck(state, claudeDir, entry) {
  state.decks ??= {};
  state.decks[claudeDir] = entry;
}

/** Drop the rotation entry for a dir. Returns true if something was removed. */
export function clearDeck(state, claudeDir) {
  if (state.decks && claudeDir in state.decks) {
    delete state.decks[claudeDir];
    return true;
  }
  return false;
}

/**
 * The window of `size` words starting at `cursor`, wrapping around the end of
 * the deck so windows stay a constant size and eventually cover everything.
 * When the window is at least as large as the deck, the whole deck is returned.
 */
export function windowSlice(deck, cursor, size) {
  if (deck.length === 0) return [];
  if (size >= deck.length) return [...deck];
  const out = [];
  for (let i = 0; i < size; i++) out.push(deck[(cursor + i) % deck.length]);
  return out;
}

/** The cursor after advancing one window. A no-op when the window covers the deck. */
export function nextCursor(cursor, size, deckLen) {
  if (deckLen === 0 || size >= deckLen) return 0;
  return (cursor + size) % deckLen;
}

/** Fisher–Yates shuffle into a new array; leaves the input untouched. */
export function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
