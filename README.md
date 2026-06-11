# bywords

Turn Claude Code's spinner words into language-learning flashcards.

> **byword** — *a frequently used word or phrase.*

Claude Code cycles through a list of "thinking verbs" (Pondering…, Cogitating…, Ruminating…) while it works. Those words pass your eyes hundreds of times a day. `bywords` replaces them with vocabulary from a language you're learning, so passive screen time becomes passive review.

## How it works

Claude Code reads `spinnerVerbs` from `settings.json`:

```json
{
  "spinnerVerbs": {
    "mode": "replace",
    "verbs": ["hablar — to speak", "comer — to eat", "vivir — to live"]
  }
}
```

`bywords` is a small CLI that:

1. Lets you pick a preset (e.g. *30 most frequent Spanish verbs*).
2. Lets you pick a translation language and display format.
3. Writes the resulting strings into your `settings.json` under `spinnerVerbs`, leaving everything else untouched.

No runtime, no daemon, no patching. Just a config writer.

## CLI (MVP)

```
bywords init      Interactive wizard: pick preset → translation lang → format → write
bywords list      Show available presets
bywords reset     Remove the spinnerVerbs block this tool wrote
```

Post-MVP candidates: `add` (import a custom preset from a JSON/CSV file), `--scope project` (write to `.claude/settings.json` in the cwd instead of `~/.claude/settings.json`).

## Preset format

Each preset is a JSON file shipped with the package:

```json
{
  "id": "es-top30-verbs",
  "language": "es",
  "name": "30 most frequent Spanish verbs",
  "items": [
    { "term": "ser",   "translations": { "ru": "быть",    "en": "to be" } },
    { "term": "estar", "translations": { "ru": "быть (находиться)", "en": "to be (located)" } }
  ]
}
```

At apply time the user picks a translation language and a format string (e.g. `"{term} — {translation}"`), and we render the final array.

## Display format options

The user picks one of:

- `term` only — `hablar`
- `term — translation` — `hablar — to speak`
- `translation — term` — `to speak — hablar`

(Format is a template string under the hood, so adding more is trivial.)

## Safety

- Always read the existing `settings.json` and merge — never overwrite unrelated keys.
- On first write, create `settings.json.bak` next to the original.
- `reset` removes only the `spinnerVerbs` key.
- If `settings.json` is missing, create it with just our block.

## Starter presets

MVP ships with one preset:

- `es-top30-verbs` — 30 most frequent Spanish verbs, with `ru` and `en` translations.

## Stack

- Node.js (no build step, ESM, single binary via `npm i -g`).
- Zero runtime deps if feasible; otherwise a tiny prompt lib for the wizard.

## Status

MVP complete. All three commands (`init`, `list`, `reset`) are implemented and working.
