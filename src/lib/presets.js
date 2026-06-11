import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PRESETS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'presets');

export async function loadPresets() {
  const files = await readdir(PRESETS_DIR);
  const presets = [];
  for (const file of files) {
    if (!file.endsWith('.json') || file === 'schema.json') continue;
    const content = await readFile(join(PRESETS_DIR, file), 'utf8');
    try {
      presets.push(JSON.parse(content));
    } catch {
      throw new Error(`Preset file ${file} contains invalid JSON.`);
    }
  }
  return presets.sort((a, b) => a.id.localeCompare(b.id));
}

export function presetLanguages(preset) {
  return [...new Set(preset.items.flatMap((i) => Object.keys(i.translations)))].sort();
}
