// Structural validator for preset objects. Mirrors presets/schema.json but
// carries no dependency, so it can run at load time and in CI.

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const LANG_RE = /^[a-z]{2}$/;

const PRESET_KEYS = new Set(['id', 'language', 'name', 'description', 'items']);
const ITEM_KEYS = new Set(['term', 'translations', 'notes']);

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validate a parsed preset object.
 * @returns {string[]} human-readable errors; empty array means valid.
 */
export function validatePreset(preset) {
  const errors = [];
  if (!isPlainObject(preset)) return ['preset must be a JSON object'];

  for (const key of Object.keys(preset)) {
    if (!PRESET_KEYS.has(key)) errors.push(`unknown property "${key}"`);
  }

  if (typeof preset.id !== 'string' || !ID_RE.test(preset.id)) {
    errors.push('id must be a kebab-case string (^[a-z0-9][a-z0-9-]*$)');
  }
  if (typeof preset.language !== 'string' || !LANG_RE.test(preset.language)) {
    errors.push('language must be a 2-letter ISO 639-1 code');
  }
  if (typeof preset.name !== 'string' || preset.name.length < 1) {
    errors.push('name must be a non-empty string');
  }
  if (preset.description !== undefined && typeof preset.description !== 'string') {
    errors.push('description must be a string');
  }

  if (!Array.isArray(preset.items) || preset.items.length < 1) {
    errors.push('items must be a non-empty array');
    return errors;
  }

  preset.items.forEach((item, i) => {
    const at = `items[${i}]`;
    if (!isPlainObject(item)) {
      errors.push(`${at} must be an object`);
      return;
    }
    for (const key of Object.keys(item)) {
      if (!ITEM_KEYS.has(key)) errors.push(`${at} has unknown property "${key}"`);
    }
    if (typeof item.term !== 'string' || item.term.length < 1) {
      errors.push(`${at}.term must be a non-empty string`);
    }
    if (!isPlainObject(item.translations)) {
      errors.push(`${at}.translations must be an object`);
    } else {
      const keys = Object.keys(item.translations);
      if (keys.length < 1) {
        errors.push(`${at}.translations must have at least one entry`);
      }
      for (const k of keys) {
        if (!LANG_RE.test(k)) {
          errors.push(`${at}.translations key "${k}" must be a 2-letter code`);
        }
        if (typeof item.translations[k] !== 'string' || item.translations[k].length < 1) {
          errors.push(`${at}.translations.${k} must be a non-empty string`);
        }
      }
    }
    if (item.notes !== undefined && typeof item.notes !== 'string') {
      errors.push(`${at}.notes must be a string`);
    }
  });

  return errors;
}
