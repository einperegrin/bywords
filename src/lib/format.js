export const FORMATS = [
  { id: 'term-translation', label: 'term — translation', template: '{term} — {translation}' },
  { id: 'translation-term', label: 'translation — term', template: '{translation} — {term}' },
  { id: 'term-only', label: 'term only', template: '{term}' },
];

/**
 * Merge incoming verbs into an existing list, dropping exact duplicates and
 * preserving order (existing first, then the new ones).
 * @returns {{ merged: string[], added: number }}
 */
export function mergeVerbs(existing, incoming) {
  const seen = new Set(existing);
  const merged = [...existing];
  let added = 0;
  for (const v of incoming) {
    if (!seen.has(v)) {
      seen.add(v);
      merged.push(v);
      added++;
    }
  }
  return { merged, added };
}

export function renderItem(item, translationLang, formatId) {
  const format = FORMATS.find((f) => f.id === formatId);
  if (!format) throw new Error(`Unknown format: ${formatId}`);
  const translation = item.translations[translationLang] ?? item.term;
  return format.template.replace('{term}', item.term).replace('{translation}', translation);
}

export function renderPreset(preset, translationLang, formatId) {
  return preset.items.map((item) => renderItem(item, translationLang, formatId));
}
