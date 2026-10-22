// Local preview with drafts: builds into .dev-dist/, serves it on http://localhost:4321
// and rebuilds when posts/, src/ or lib/ change. POSTS_DIR overrides the posts folder.
import { createServer } from 'node:http';
import { watch, existsSync, statSync, createReadStream } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { build } from '../lib/build.mjs';

const OUT = '.dev-dist';
const PORT = Number(process.env.PORT) || 4321;
const POSTS_DIR = process.env.POSTS_DIR || 'posts';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

let building = Promise.resolve();
function rebuild() {
  building = building.then(async () => {
    const started = Date.now();
    try {
      const { pages, warnings } = await build({ outDir: OUT, postsDir: POSTS_DIR, includeDrafts: true });
      for (const w of warnings) console.warn(`warning: ${w}`);
      console.log(`Built ${pages.length} pages in ${Date.now() - started} ms`);
    } catch (err) {
      console.error(`Build error: ${err.message}`);
    }
  });
  return building;
}

function resolveFile(urlPath) {
  const safe = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const p = join(OUT, safe);
  if (existsSync(p) && statSync(p).isFile()) return p;
  if (existsSync(join(p, 'index.html'))) return join(p, 'index.html');
  if (existsSync(`${p}.html`)) return `${p}.html`;
  return null;
}

await rebuild();

let timer;
for (const dir of [POSTS_DIR, 'src', 'lib']) {
  watch(dir, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 150);
  });
}

createServer(async (req, res) => {
  await building;
  const file = resolveFile(req.url);
  if (!file) {
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    createReadStream(join(OUT, '404.html')).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Preview with drafts: http://localhost:${PORT}/  (posts from ${POSTS_DIR}/)`));
