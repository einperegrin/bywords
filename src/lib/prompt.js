import readline from 'node:readline';
import { stdin, stdout } from 'node:process';

let rl;
let iter;

function init() {
  if (!rl) {
    rl = readline.createInterface({ input: stdin, output: stdout });
    iter = rl[Symbol.asyncIterator]();
  }
}

export function closePrompt() {
  if (rl) {
    rl.close();
    rl = undefined;
    iter = undefined;
  }
}

async function ask(prompt) {
  init();
  stdout.write(prompt);
  const { value, done } = await iter.next();
  if (done) throw new Error('Input stream closed unexpectedly');
  return value;
}

export async function question(prompt) {
  return (await ask(prompt)).trim();
}

export async function selectFromList(question, options, { defaultIndex = 0 } = {}) {
  const normalized = options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o));
  for (let i = 0; i < normalized.length; i++) {
    console.log(`  ${i + 1}) ${normalized[i].label}`);
  }
  const defaultNum = defaultIndex + 1;
  while (true) {
    const raw = (await ask(`${question} [${defaultNum}]: `)).trim();
    const n = raw === '' ? defaultNum : Number(raw);
    if (Number.isInteger(n) && n >= 1 && n <= normalized.length) {
      return normalized[n - 1].value;
    }
    console.log(`  Pick a number between 1 and ${normalized.length}.`);
  }
}

/**
 * Parse a multi-select answer into sorted, unique 1-based indices.
 * Accepts comma-separated numbers, ranges ("1-3"), and "all"/"a"/"*".
 * Returns null if the input is empty or references an out-of-range number.
 */
export function parseSelection(raw, max) {
  if (raw === 'all' || raw === 'a' || raw === '*') {
    return Array.from({ length: max }, (_, i) => i + 1);
  }
  const set = new Set();
  for (const part of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      let a = Number(range[1]);
      let b = Number(range[2]);
      if (a > b) [a, b] = [b, a];
      for (let n = a; n <= b; n++) {
        if (n < 1 || n > max) return null;
        set.add(n);
      }
    } else if (/^\d+$/.test(part)) {
      const n = Number(part);
      if (n < 1 || n > max) return null;
      set.add(n);
    } else {
      return null;
    }
  }
  return set.size > 0 ? [...set].sort((x, y) => x - y) : null;
}

/**
 * Pure state transition for the checkbox UI. Given the current
 * `{ cursor, selected }` and an action, returns the next state plus a `done`
 * flag (true when the user confirmed). Exported so the key handling can be
 * unit-tested without a TTY; selectManyFromList drives it with real keystrokes.
 *
 * @param {{ cursor: number, selected: Set<number> }} state
 * @param {'up'|'down'|'space'|'all'|'return'} action
 * @param {number} count number of options
 */
export function reduceCheckbox(state, action, count) {
  const { cursor } = state;
  const selected = new Set(state.selected);
  switch (action) {
    case 'up':
      return { cursor: (cursor - 1 + count) % count, selected, done: false };
    case 'down':
      return { cursor: (cursor + 1) % count, selected, done: false };
    case 'space':
      if (selected.has(cursor)) selected.delete(cursor);
      else selected.add(cursor);
      return { cursor, selected, done: false };
    case 'all':
      if (selected.size === count) selected.clear();
      else for (let i = 0; i < count; i++) selected.add(i);
      return { cursor, selected, done: false };
    case 'return':
      if (selected.size === 0) selected.add(cursor); // confirm with nothing checked picks the row
      return { cursor, selected, done: true };
    default:
      return { cursor, selected, done: false };
  }
}

/**
 * Interactive checkbox multi-select. Returns an array of the chosen `value`s.
 *
 * On a TTY: ↑/↓ move, space toggles, "a" toggles all, enter confirms.
 * Without a TTY (pipes, tests) it falls back to a single line of
 * comma/range/"all" input parsed by parseSelection.
 *
 * @param {string} question
 * @param {Array<string | { label: string, value: any }>} options
 * @param {{ preselect?: number[] }} [opts] indices to check by default
 */
export async function selectManyFromList(question, options, { preselect = [] } = {}) {
  const items = options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o));

  if (!stdin.isTTY) {
    const hint = preselect.length ? preselect.map((i) => i + 1).join(',') : 'all';
    while (true) {
      const raw = (await ask(`${question} (e.g. 1,3 or 1-3 or "all") [${hint}]: `)).trim().toLowerCase();
      const picks = parseSelection(raw === '' ? hint : raw, items.length);
      if (picks) return picks.map((i) => items[i - 1].value);
      console.log(`  Enter numbers between 1 and ${items.length}, e.g. "1,3", "1-3", or "all".`);
    }
  }

  let state = {
    cursor: 0,
    selected: new Set(preselect.filter((i) => i >= 0 && i < items.length)),
  };
  let rendered = 0;
  const hint = '  ↑/↓ move · space toggle · a all · enter confirm';

  const draw = (first) => {
    if (!first) stdout.write(`\x1b[${rendered}A`);
    const lines = [question];
    items.forEach((it, i) => {
      const box = state.selected.has(i) ? '[x]' : '[ ]';
      const pointer = i === state.cursor ? '\x1b[36m>\x1b[0m' : ' ';
      const label = i === state.cursor ? `\x1b[36m${it.label}\x1b[0m` : it.label;
      lines.push(`${pointer} ${box} ${label}`);
    });
    lines.push(hint);
    stdout.write(lines.map((l) => `\x1b[2K${l}`).join('\n') + '\n');
    rendered = lines.length;
  };

  const wasRaw = Boolean(stdin.isRaw);
  readline.emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  stdout.write('\x1b[?25l'); // hide cursor
  draw(true);

  return new Promise((resolve) => {
    const finish = (result) => {
      stdin.removeListener('keypress', onKey);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      stdout.write('\x1b[?25h'); // restore cursor
      resolve(result);
    };
    const onKey = (str, key) => {
      if (!key) return;
      if (key.ctrl && key.name === 'c') {
        finish([]);
        closePrompt();
        process.exit(130);
      }
      const action =
        str === 'a' ? 'all' : ['up', 'down', 'space', 'return'].includes(key.name) ? key.name : null;
      if (!action) return;
      state = reduceCheckbox(state, action, items.length);
      if (state.done) {
        finish([...state.selected].sort((a, b) => a - b).map((i) => items[i].value));
      } else {
        draw();
      }
    };
    stdin.on('keypress', onKey);
  });
}

export async function confirm(question, defaultYes = true) {
  const label = defaultYes ? 'Y/n' : 'y/N';
  const raw = (await ask(`${question} [${label}]: `)).trim().toLowerCase();
  if (!raw) return defaultYes;
  return raw === 'y' || raw === 'yes';
}
