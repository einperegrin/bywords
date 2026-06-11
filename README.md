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
bywords init    # pick a preset, translation language, and format → writes to settings.json
bywords list    # show available presets
bywords reset   # remove the spinnerVerbs block from settings.json
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

## Presets

| ID | Language | Items | Translations |
|----|----------|-------|--------------|
| `es-top30-verbs` | Spanish | 30 | `en`, `ru` |

## Contributing

### Adding a preset

Create a JSON file in `presets/` following this schema:

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

`id` must be unique and match the filename. `language` is an ISO 639-1 code. Each item needs at least one translation key.

### Running locally

```sh
git clone https://github.com/einperegrin/bywords
cd bywords
node src/cli.js list
node src/cli.js init
```

No build step, no dependencies to install.

## License

MIT
