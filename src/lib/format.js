export const FORMATS = [
  { id: 'term-translation', label: 'term — translation', template: '{term} — {translation}' },
  { id: 'translation-term', label: 'translation — term', template: '{translation} — {term}' },
  { id: 'term-only', label: 'term only', template: '{term}' },
];

export const MODES = [
  { id: 'replace', label: 'replace — show only these words' },
  { id: 'append', label: "append — mix these into Claude Code's built-in words" },
];

export function renderItem(item, translationLang, formatId) {
  const format = FORMATS.find((f) => f.id === formatId);
  if (!format) throw new Error(`Unknown format: ${formatId}`);
  const translation = item.translations[translationLang] ?? item.term;
  return format.template.replace('{term}', item.term).replace('{translation}', translation);
}

export function renderPreset(preset, translationLang, formatId) {
  return preset.items.map((item) => renderItem(item, translationLang, formatId));
}
