// Production build: posts/ -> dist/, then validate dist/. Exits 1 on any check failure.
import { build } from '../lib/build.mjs';
import { checkSite } from '../lib/check.mjs';

const outDir = 'dist';
const started = Date.now();
const { pages, warnings, draftSlugs } = await build({ outDir });
for (const w of warnings) console.warn(`warning: ${w}`);
const errors = await checkSite(outDir, { draftSlugs });
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  console.error(`Build failed: ${errors.length} problem(s) in ${outDir}/`);
  process.exit(1);
}
const drafts = draftSlugs.length ? ` (${draftSlugs.length} draft(s) skipped)` : '';
console.log(`Built ${pages.length} pages in ${Date.now() - started} ms${drafts}`);
