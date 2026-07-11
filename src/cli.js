#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initCommand } from './commands/init.js';
import { listCommand } from './commands/list.js';
import { resetCommand } from './commands/reset.js';
import { validateCommand } from './commands/validate.js';
import { importCommand } from './commands/import.js';
import { statusCommand } from './commands/status.js';
import { discoverClaudeDirs, DEFAULT_CLAUDE_DIR, validateClaudeDir } from './lib/settings.js';
import { selectFromList } from './lib/prompt.js';

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));

const USAGE = `bywords v${pkg.version}

Usage:
  bywords <command> [options]

Commands:
  init             Pick a preset and write it to Claude Code's settings.json
  list             Show available presets
  status           Show the spinnerVerbs currently written to settings.json
  import <file>    Import a CSV word list into your user presets
  reset            Remove the spinnerVerbs block this tool wrote
  validate         Check every bundled and user preset against the schema

Options:
  --config-dir <path>  Claude config directory to use (default: ~/.claude)
  --preset <id>        (init) Preset id, skips the interactive picker
  --lang <code>        (init) Translation language, e.g. en, ru
  --format <id>        (init) term-translation | translation-term | term-only
  --mode <id>          (init) replace | append
  --id <id>            (import) Preset id (default: from filename)
  --language <code>    (import) Language being learned, e.g. es
  --name <name>        (import) Human-readable preset name
  -y, --yes            Skip confirmation / overwrite prompts
  -h, --help           Show this help
  -v, --version        Show version

Custom presets: drop JSON files in
  ${'$XDG_CONFIG_HOME'}/bywords/presets  (default: ~/.config/bywords/presets)
`;

const { values, positionals } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
    'config-dir': { type: 'string' },
    preset: { type: 'string' },
    lang: { type: 'string' },
    format: { type: 'string' },
    mode: { type: 'string' },
    id: { type: 'string' },
    language: { type: 'string' },
    name: { type: 'string' },
    yes: { type: 'boolean', short: 'y' },
  },
  allowPositionals: true,
});

if (values.version) {
  console.log(pkg.version);
  process.exit(0);
}

const [command] = positionals;

if (values.help || !command) {
  process.stdout.write(USAGE);
  process.exit(0);
}

async function resolveClaudeDir() {
  if (values['config-dir']) {
    await validateClaudeDir(values['config-dir']);
    return values['config-dir'];
  }

  const dirs = await discoverClaudeDirs();
  if (dirs.length === 1) return dirs[0];

  const defaultIdx = dirs.indexOf(DEFAULT_CLAUDE_DIR);
  console.log('Multiple Claude config directories found:');
  const chosen = await selectFromList(
    'Which config directory to use?',
    dirs.map((d) => ({ label: d, value: d })),
    { defaultIndex: defaultIdx >= 0 ? defaultIdx : 0 },
  );
  console.log('');
  return chosen;
}

try {
  switch (command) {
    case 'init': {
      const claudeDir = await resolveClaudeDir();
      await initCommand(claudeDir, {
        preset: values.preset,
        lang: values.lang,
        format: values.format,
        mode: values.mode,
        yes: values.yes,
      });
      break;
    }
    case 'list':
      await listCommand();
      break;
    case 'status': {
      const claudeDir = await resolveClaudeDir();
      await statusCommand(claudeDir);
      break;
    }
    case 'import':
      await importCommand(positionals[1], {
        id: values.id,
        language: values.language,
        name: values.name,
        yes: values.yes,
      });
      break;
    case 'validate':
      await validateCommand();
      break;
    case 'reset': {
      const claudeDir = await resolveClaudeDir();
      await resetCommand(claudeDir);
      break;
    }
    default:
      console.error(`Unknown command: ${command}\n`);
      process.stdout.write(USAGE);
      process.exit(1);
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
