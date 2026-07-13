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
bywords init          # set the spinner words to a preset (replaces what's there)
bywords add           # add a preset's words on top of the ones already set
bywords list          # show available presets
bywords status        # show what's currently written to settings.json
bywords import <csv>  # import a CSV word list into your user presets
bywords reset         # remove the spinnerVerbs block from settings.json
bywords validate      # check every bundled and user preset against the schema
```

`init` replaces the spinner words — the point of the tool is to swap Claude Code's
built-in verbs for words you're learning. When you want to grow your list, `add`
keeps what's there and appends another preset's words (duplicates are dropped).

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

The same `--preset` / `--lang` / `--format` / `--yes` flags work with `add`.

## Presets

| ID | Language | Items | Translations |
|----|----------|-------|--------------|
| `es-top30-verbs` | Spanish | 30 | `en`, `ru` |
| `fi-verb-types` | Finnish | 50 | `en`, `ru`, `sv` |
| `sv-irregular-verbs` | Swedish | 76 | `en`, `ru` |

## Your own word lists

You're not limited to the bundled presets — you can add your own **without touching
the installed package**. A preset is a single JSON file kept in your user preset
directory:

```
~/.config/bywords/presets/      # or $XDG_CONFIG_HOME/bywords/presets
```

Set `BYWORDS_PRESETS_DIR` to use a different location. Anything you put here shows
up in `list`, `init`, and `add` next to the bundled presets and survives package
upgrades. There are two ways to create one.

### Option A — write a JSON file

1. Create the directory above if it doesn't exist.

2. Add a file named after the preset id (id `fr-verbs` → `fr-verbs.json`) with this
   shape:

   ```json
   {
     "id": "fr-verbs",
     "language": "fr",
     "name": "My French verbs",
     "items": [
       { "term": "être",  "translations": { "en": "to be",   "ru": "быть" } },
       { "term": "avoir", "translations": { "en": "to have", "ru": "иметь" } }
     ]
   }
   ```

   | Field | Meaning |
   |-------|---------|
   | `id` | Unique, kebab-case, **must match the filename** |
   | `language` | ISO 639-1 code of the language you're learning (the `term` side) |
   | `name` | Human-readable name shown in `list` / `init` |
   | `items[].term` | The word or phrase in the target language |
   | `items[].translations` | One or more translations keyed by 2-letter code; you choose which to display when you run `init` |
   | `items[].notes` | Optional disambiguation — stored, never displayed |

3. Check and use it:

   ```sh
   bywords validate                 # confirm it matches the schema
   bywords init --preset fr-verbs   # or run `bywords init` and pick it
   ```

A user preset whose `id` matches a bundled one takes precedence, so you can also
override a shipped list with your own.

### Option B — import from a spreadsheet

If your words already live in a spreadsheet, export them to CSV instead of writing
JSON by hand. The header needs a `term` column plus one or more 2-letter language
columns; any other column (e.g. `notes`) is ignored:

```csv
term,en,ru
hablar,to speak,говорить
ser,to be,быть
```

```sh
bywords import words.csv --id es-mine --language es --name "My Spanish words"
```

This builds a validated preset in your user preset directory, ready for
`bywords init --preset es-mine`. `--id` defaults to the filename and `--language`
(the language you're learning) is asked interactively if omitted.

The full field rules live in [`presets/schema.json`](presets/schema.json), and
`bywords validate` checks every bundled and user preset against it.

## Contributing

### Contributing a preset to the project

To ship a preset with the package so everyone gets it, add its JSON file to the
`presets/` directory in the repo (same shape as [your own word lists](#your-own-word-lists)
above) and open a pull request. Keep translations accurate and the `id` matching
the filename — `bywords validate` runs in CI and rejects anything that doesn't match
the schema.

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
