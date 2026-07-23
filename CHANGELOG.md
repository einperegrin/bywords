# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries before the changelog existed were reconstructed from the git history, so
they list the notable features of each release rather than every commit.

## [1.5.0] - 2026-07-23

### Added

- Rotation mode so a long word list isn't wasted on the same handful of spinner
  words: `bywords init --rotate` keeps the full list as a deck and writes only a
  window of it to `spinnerVerbs`; the new `bywords rotate` command slides the
  window to the next slice, wrapping around the deck. Flags `--window <n>` and
  `--shuffle` tune it, and `--rotate` isn't required when `--window` is given.
- `bywords rotate --daily` is a no-op until 24h have passed, so it's safe to run
  from cron or any scheduler.
- The interactive `init` wizard now asks for a window size (Enter keeps every
  word visible, as before).
- Rotation is deck-aware across the other commands: `add` extends the deck,
  `status` shows the window position, and `reset` clears the deck.

### Changed

- The Spanish preset grew from 30 to the 100 most frequent verbs, and was
  renamed `es-top30-verbs` → `es-common-verbs`. **Breaking:** update any
  `--preset es-top30-verbs` references (e.g. in dotfiles) to `es-common-verbs`.
  Words already written to `settings.json` are unaffected — they're stored as
  plain strings, not a reference to the preset.

## [1.4.0] - 2026-07-14

### Added

- Multi-select when several Claude config directories are found, so `init` and
  `add` can target more than one at once.

### Changed

- The Spanish preset now shows each verb's present-indicative forms alongside the
  infinitive.

## [1.3.0] - 2026-07-13

### Added

- `fi-verb-types` preset — 50 common Finnish verbs covering all verb types and
  KPT consonant gradation (`en`, `ru`, `sv`).

## [1.2.0] - 2026-07-12

### Added

- `add` command and the `init` / `add` split: `init` replaces the spinner words,
  `add` appends a preset's words to the ones already set.
- `status` command showing what's currently written to `settings.json`.
- `import` command to build a user preset from a CSV word list.
- User preset directory (`~/.config/bywords/presets`) merged in alongside the
  bundled presets, plus a `validate` command and schema.
- Non-interactive `init` via `--preset` / `--lang` / `--format` / `--yes` flags.
- `sv-irregular-verbs` preset — 76 Swedish irregular verbs (`en`, `ru`).
- Test suite and CI.

## [1.1.0] - 2026-07-10

### Added

- Support for multiple Claude config directories.

## [1.0.1] - 2026-06-11

### Added

- Initial release: the `bywords` CLI with `list`, `init`, and `reset` commands.
- Preset schema and the `es-top30-verbs` Spanish preset.
- Safe writes to `settings.json` — only the `spinnerVerbs` key is touched, with a
  one-time backup.
