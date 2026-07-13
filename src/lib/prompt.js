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

export async function confirm(question, defaultYes = true) {
  const label = defaultYes ? 'Y/n' : 'y/N';
  const raw = (await ask(`${question} [${label}]: `)).trim().toLowerCase();
  if (!raw) return defaultYes;
  return raw === 'y' || raw === 'yes';
}
