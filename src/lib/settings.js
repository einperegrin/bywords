import { readFile, writeFile, rename, mkdir, access, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

export const DEFAULT_CLAUDE_DIR = join(homedir(), '.claude');

export function settingsPaths(claudeDir) {
  const settings = join(claudeDir, 'settings.json');
  return { settings, backup: `${settings}.bak` };
}

export async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function discoverClaudeDirs() {
  const home = homedir();
  let entries;
  try {
    entries = await readdir(home, { withFileTypes: true });
  } catch {
    return [DEFAULT_CLAUDE_DIR];
  }
  const dirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith('.claude'))
    .map((e) => join(home, e.name))
    .sort();
  return dirs.length > 0 ? dirs : [DEFAULT_CLAUDE_DIR];
}

export async function readSettings(claudeDir = DEFAULT_CLAUDE_DIR) {
  const { settings: path } = settingsPaths(claudeDir);
  if (!(await fileExists(path))) return {};
  const content = await readFile(path, 'utf8');
  if (!content.trim()) return {};
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`${path} contains invalid JSON. Fix or delete it and try again.`);
  }
}

export async function writeSettings(settings, claudeDir = DEFAULT_CLAUDE_DIR) {
  const { settings: path, backup } = settingsPaths(claudeDir);
  await mkdir(dirname(path), { recursive: true });
  if ((await fileExists(path)) && !(await fileExists(backup))) {
    const original = await readFile(path, 'utf8');
    await writeFile(backup, original);
  }
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(settings, null, 2) + '\n');
  await rename(tmp, path);
}
