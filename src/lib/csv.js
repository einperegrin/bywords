// Minimal RFC 4180-ish CSV parser and preset builder. No dependencies.

/**
 * Parse CSV text into rows of string fields. Handles quoted fields, escaped
 * quotes (""), and both LF and CRLF line endings.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
    } else if (c === ',') {
      row.push(field);
      field = '';
      i++;
    } else if (c === '\r') {
      i++;
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
    } else {
      field += c;
      i++;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Build a preset from CSV text. The header must contain a `term` column plus at
 * least one 2-letter language column (e.g. term,en,ru). Metadata (id, language
 * of the terms, name) is supplied by the caller.
 *
 * @returns {{ preset: object, warnings: string[] }}
 */
export function csvToPreset(text, { id, language, name }) {
  const rows = parseCsv(text)
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c !== ''));

  if (rows.length < 2) {
    throw new Error('CSV needs a header row and at least one data row.');
  }

  const header = rows[0].map((h) => h.toLowerCase());
  const termIdx = header.indexOf('term');
  if (termIdx === -1) {
    throw new Error('CSV header must include a "term" column.');
  }
  const langCols = header
    .map((h, idx) => ({ code: h, idx }))
    .filter(({ code, idx }) => idx !== termIdx && /^[a-z]{2}$/.test(code));
  if (langCols.length === 0) {
    throw new Error('CSV header must include at least one 2-letter language column (e.g. en, ru).');
  }

  const items = [];
  const warnings = [];
  for (let r = 1; r < rows.length; r++) {
    const line = r + 1;
    const term = rows[r][termIdx] ?? '';
    if (!term) {
      warnings.push(`row ${line}: empty term, skipped`);
      continue;
    }
    const translations = {};
    for (const { code, idx } of langCols) {
      const v = rows[r][idx] ?? '';
      if (v) translations[code] = v;
    }
    if (Object.keys(translations).length === 0) {
      warnings.push(`row ${line} ("${term}"): no translations, skipped`);
      continue;
    }
    items.push({ term, translations });
  }

  return { preset: { id, language, name, items }, warnings };
}
