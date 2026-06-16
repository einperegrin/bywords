#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initCommand } from './commands/init.js';
import { listCommand } from './commands/list.js';
import { resetCommand } from './commands/reset.js';
import { discoverClaudeDirs, DEFAULT_CLAUDE_DIR, validateClaudeDir } from './lib/settings.js';
import { selectFromList, closePrompt } from './lib/prompt.js';

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));

const USAGE = `bywords v${pkg.version}

Usage:
  bywords <command> [options]

Commands:
  init      Pick a preset and write it to Claude Code's settings.json
  list      Show available presets
  reset     Remove the spinnerVerbs block this tool wrote

Options:
  --config-dir <path>  Claude config directory to use (default: ~/.claude)
  -h, --help           Show this help
  -v, --version        Show version
`;

const { values, positionals } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
    'config-dir': { type: 'string' },
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
      await initCommand(claudeDir);
      break;
    }
    case 'list':
      await listCommand();
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
