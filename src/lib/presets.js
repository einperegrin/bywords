import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { validatePreset } from './validate.js';

export const BUILTIN_PRESETS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'presets',
);

/**
 * Directory where users can drop their own preset files. Survives package
 * upgrades (unlike the bundled presets/ dir). Overridable for tests/scripts
 * via BYWORDS_PRESETS_DIR; otherwise follows XDG ($XDG_CONFIG_HOME or ~/.config).
 */
export function userPresetsDir() {
  if (process.env.BYWORDS_PRESETS_DIR) return process.env.BYWORDS_PRESETS_DIR;
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(base, 'bywords', 'presets');
}

/** Absolute path where a user preset with the given id lives. */
export function userPresetPath(id) {
  return join(userPresetsDir(), `${id}.json`);
}

async function dirExists(p) {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function listPresetFiles(dir) {
  const files = await readdir(dir);
  return files.filter((f) => f.endsWith('.json') && f !== 'schema.json').sort();
}

/**
 * Read and validate every preset file from the bundled and user directories,
 * without throwing. Each entry carries its source, file and validation errors.
 * User files with the same id as a builtin come later and win.
 */
export async function auditPresets() {
  const sources = [{ dir: BUILTIN_PRESETS_DIR, source: 'builtin' }];
  const userDir = userPresetsDir();
  if (await dirExists(userDir)) sources.push({ dir: userDir, source: 'user' });

  const results = [];
  for (const { dir, source } of sources) {
    for (const file of await listPresetFiles(dir)) {
      const path = join(dir, file);
      let preset;
      try {
        preset = JSON.parse(await readFile(path, 'utf8'));
      } catch {
        results.push({ file, path, source, preset: null, errors: ['file is not valid JSON'] });
        continue;
      }
      const errors = validatePreset(preset);
      const expectedId = file.replace(/\.json$/, '');
      if (errors.length === 0 && preset.id !== expectedId) {
        errors.push(`id "${preset.id}" must match filename "${expectedId}"`);
      }
      results.push({ file, path, source, preset, errors });
    }
  }
  return results;
}

/**
 * Load usable presets. A malformed bundled preset is a packaging bug and throws;
 * a malformed user preset is skipped with a warning so one bad file can't block
 * the rest.
 */
export async function loadPresets() {
  const results = await auditPresets();
  const byId = new Map();
  for (const r of results) {
    if (r.errors.length > 0) {
      if (r.source === 'builtin') {
        throw new Error(`Bundled preset ${r.file} is invalid: ${r.errors[0]}`);
      }
      process.stderr.write(`Warning: skipping invalid preset ${r.path}: ${r.errors[0]}\n`);
      continue;
    }
    byId.set(r.preset.id, r.preset);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function presetLanguages(preset) {
  return [...new Set(preset.items.flatMap((i) => Object.keys(i.translations)))].sort();
}

/** Number of items in the preset that have no translation for `lang`. */
export function missingTranslationCount(preset, lang) {
  return preset.items.filter((i) => !(lang in i.translations)).length;
}
