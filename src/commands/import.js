import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { csvToPreset } from '../lib/csv.js';
import { validatePreset } from '../lib/validate.js';
import { userPresetPath } from '../lib/presets.js';
import { fileExists } from '../lib/settings.js';
import { question, confirm, closePrompt } from '../lib/prompt.js';

function slugify(s) {
  const slug = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'imported';
}

async function askLanguage() {
  for (;;) {
    const a = (await question('Language being learned (2-letter ISO code, e.g. es): ')).toLowerCase();
    if (/^[a-z]{2}$/.test(a)) return a;
    console.log('  Enter a 2-letter code like es, fr, de.');
  }
}

/**
 * @param {string} file  path to a CSV file (header: term,<lang>,<lang>…)
 * @param {{ id?: string, language?: string, name?: string, yes?: boolean }} [opts]
 */
export async function importCommand(file, opts = {}) {
  if (!file) throw new Error('Usage: bywords import <file.csv> [--id <id>] [--language <code>] [--name <name>]');
  if (!(await fileExists(file))) throw new Error(`File not found: ${file}`);

  const text = await readFile(file, 'utf8');
  const id = slugify(opts.id || basename(file).replace(/\.[^.]+$/, ''));
  const name = opts.name || `Imported: ${id}`;

  let language = opts.language;
  if (language && !/^[a-z]{2}$/.test(language)) {
    throw new Error(`--language must be a 2-letter ISO 639-1 code, got "${language}".`);
  }
  if (!language) language = await askLanguage();

  const { preset, warnings } = csvToPreset(text, { id, language, name });
  for (const w of warnings) console.log(`  ${w}`);

  const errors = validatePreset(preset);
  if (errors.length > 0) {
    closePrompt();
    throw new Error(`Could not build a valid preset from ${file}:\n  - ${errors.slice(0, 5).join('\n  - ')}`);
  }

  const target = userPresetPath(id);
  if (await fileExists(target)) {
    console.log(`\n${target} already exists.`);
    const overwrite = opts.yes || (await confirm('Overwrite?', false));
    if (!overwrite) {
      closePrompt();
      console.log('Aborted.');
      return;
    }
  }
  closePrompt();

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(preset, null, 2) + '\n');

  console.log(`\n✓ Imported ${preset.items.length} items to ${target}`);
  console.log(`Use it with:  bywords init --preset ${id}`);
}
