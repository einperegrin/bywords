# bywords

Replace Claude Code's spinner words with vocabulary from a language you're learning.

Claude Code cycles through "thinking verbs" (Pondering…, Cogitating…, Ruminating…) while it works. Those words pass your eyes hundreds of times a day. `bywords` replaces them with words from a language you're learning — passive screen time becomes passive review.

## Install

```sh
npm install -g bywords
```

Requires Node.js ≥ 20 and [Claude Code](https://claude.ai/code).

## Usage

```sh
bywords init      # pick a preset, translation language, and format → writes to settings.json
bywords list      # show available presets
bywords reset     # remove the spinnerVerbs block from settings.json
bywords validate  # check every bundled and user preset against the schema
```

`init` is an interactive wizard:

```
Available presets:
  1) es-top30-verbs — 30 most frequent Spanish verbs
Pick a preset [1]:

Available translation languages:
  1) en
  2) ru
Pick a translation language [1]:

Display format:
  1) term — translation  (e.g. "hablar — to speak")
  2) translation — term  (e.g. "to speak — hablar")
  3) term only           (e.g. "hablar")
Pick a format [1]:

Write? [Y/n]:
```

The result is written to `~/.claude/settings.json` under `spinnerVerbs`. Existing settings are never overwritten — only that key is touched. A one-time backup is created at `settings.json.bak` before the first write.

Restart Claude Code to see the new spinner words.

### Non-interactive

Every choice can be passed as a flag, which skips the wizard — handy for dotfiles and scripts:

```sh
bywords init --preset es-top30-verbs --lang ru --format term-translation --yes
```

| Flag | Meaning |
|------|---------|
| `--preset <id>` | Preset id (as shown by `bywords list`) |
| `--lang <code>` | Translation language, e.g. `en`, `ru` |
| `--format <id>` | `term-translation`, `translation-term`, or `term-only` |
| `-y`, `--yes` | Skip the confirmation prompt |
| `--config-dir <path>` | Claude config directory (default: `~/.claude`) |

## Presets

| ID | Language | Items | Translations |
|----|----------|-------|--------------|
| `es-top30-verbs` | Spanish | 30 | `en`, `ru` |

## Your own word lists

You don't have to edit the package to add lists. Drop preset JSON files in your
user preset directory and they show up in `list` and `init` alongside the bundled
ones (and survive package upgrades):

```
$XDG_CONFIG_HOME/bywords/presets   # default: ~/.config/bywords/presets
```

Override the location with the `BYWORDS_PRESETS_DIR` environment variable. A user
preset with the same `id` as a bundled one takes precedence. Run `bywords validate`
to check your files against the schema before using them.

## Contributing

### Adding a preset

Bundled presets live in `presets/`. To contribute one, create a JSON file there
following this schema (user-only lists can instead go in the directory above):

```json
{
  "id": "fr-top30-verbs",
  "language": "fr",
  "name": "30 most frequent French verbs",
  "items": [
    { "term": "être", "translations": { "en": "to be", "ru": "быть" } }
  ]
}
```

`id` must be unique and match the filename. `language` is an ISO 639-1 code. Each item needs at least one translation key. `bywords validate` enforces all of this.

### Running locally

```sh
git clone https://github.com/einperegrin/bywords
cd bywords
node src/cli.js list
node src/cli.js init
node --test          # run the test suite
node src/cli.js validate
```

No build step, no dependencies to install.

## License

MIT
