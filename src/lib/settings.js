import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

export const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');
export const BACKUP_PATH = `${SETTINGS_PATH}.bak`;

export async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function readSettings() {
  if (!(await fileExists(SETTINGS_PATH))) return {};
  const content = await readFile(SETTINGS_PATH, 'utf8');
  if (!content.trim()) return {};
  return JSON.parse(content);
}

export async function writeSettings(settings) {
  await mkdir(dirname(SETTINGS_PATH), { recursive: true });
  if ((await fileExists(SETTINGS_PATH)) && !(await fileExists(BACKUP_PATH))) {
    const original = await readFile(SETTINGS_PATH, 'utf8');
    await writeFile(BACKUP_PATH, original);
  }
  await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
}
