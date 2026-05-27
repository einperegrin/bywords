#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initCommand } from './commands/init.js';
import { listCommand } from './commands/list.js';
import { resetCommand } from './commands/reset.js';

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));

const USAGE = `bywords v${pkg.version}

Usage:
  bywords <command>

Commands:
  init      Pick a preset and write it to Claude Code's settings.json
  list      Show available presets
  reset     Remove the spinnerVerbs block this tool wrote

Options:
  -h, --help     Show this help
  -v, --version  Show version
`;

const { values, positionals } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
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

try {
  switch (command) {
    case 'init':
      await initCommand();
      break;
    case 'list':
      await listCommand();
      break;
    case 'reset':
      await resetCommand();
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      process.stdout.write(USAGE);
      process.exit(1);
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
