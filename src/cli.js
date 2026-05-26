#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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

switch (command) {
  case 'init':
    console.log('TODO: interactive wizard');
    break;
  case 'list':
    console.log('TODO: list presets');
    break;
  case 'reset':
    console.log('TODO: reset settings');
    break;
  default:
    console.error(`Unknown command: ${command}\n`);
    process.stdout.write(USAGE);
    process.exit(1);
}
