import { loadPresets, presetLanguages } from '../lib/presets.js';

export async function listCommand() {
  const presets = await loadPresets();
  if (presets.length === 0) {
    console.log('No presets found.');
    return;
  }
  for (const p of presets) {
    const langs = presetLanguages(p).join(', ');
    console.log(p.id);
    console.log(`  ${p.name}`);
    console.log(`  language: ${p.language}   items: ${p.items.length}   translations: ${langs}`);
    console.log('');
  }
}
