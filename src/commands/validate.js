import { auditPresets } from '../lib/presets.js';

export async function validateCommand() {
  const results = await auditPresets();
  if (results.length === 0) {
    console.log('No preset files found.');
    return;
  }

  let invalid = 0;
  for (const r of results) {
    if (r.errors.length === 0) {
      console.log(`✓ ${r.source}: ${r.file}`);
    } else {
      invalid++;
      console.log(`✗ ${r.source}: ${r.file}`);
      for (const e of r.errors) console.log(`    ${e}`);
    }
  }

  console.log('');
  if (invalid > 0) {
    console.error(`${invalid} of ${results.length} preset file(s) invalid.`);
    process.exit(1);
  }
  console.log(`All ${results.length} preset file(s) valid.`);
}
