import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkSite } from '../lib/check.mjs';

const head = (extra = '') => `<title>T</title><meta name="description" content="D">${extra}`;
const fullHead = head(
  '<link rel="canonical" href="https://blog.mkotas.cz/"><meta property="og:image" content="https://blog.mkotas.cz/og/home.png">',
);
const XML_OK = '<?xml version="1.0"?><x></x>';

function site(files) {
  const dir = mkdtempSync(join(tmpdir(), 'blog-check-'));
  const all = { 'og/home.png': 'png', 'feed.xml': XML_OK, 'sitemap.xml': XML_OK, '_redirects': '', ...files };
  for (const [path, content] of Object.entries(all)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

test('a clean site has no errors', async () => {
  const dir = site({ 'index.html': `${fullHead}<a href="/x/">x</a><a href="/x/#top">x</a><a href="https://e.com/">e</a>`, 'x/index.html': fullHead });
  assert.deepEqual(await checkSite(dir), []);
});

test('checkSite flags a broken internal link and a missing canonical', async () => {
  const dir = site({ 'index.html': `${head('<meta property="og:image" content="https://blog.mkotas.cz/og/home.png">')}<a href="/nope/">n</a>` });
  const errors = await checkSite(dir);
  assert.ok(errors.some((e) => /index\.html: .*\/nope\//.test(e)), errors.join('\n'));
  assert.ok(errors.some((e) => /canonical/.test(e)), errors.join('\n'));
});

test('checkSite flags a missing og:image file', async () => {
  const dir = site({
    'index.html': head('<link rel="canonical" href="https://blog.mkotas.cz/"><meta property="og:image" content="https://blog.mkotas.cz/og/missing.png">'),
  });
  assert.ok((await checkSite(dir)).some((e) => /og:image/.test(e)));
});

test('checkSite does not require SEO tags on 404.html', async () => {
  const dir = site({ 'index.html': fullHead, '404.html': '<title>Not found</title>' });
  assert.deepEqual(await checkSite(dir), []);
});

test('checkSite flags a redirect to a missing page and ignores comments and external targets', async () => {
  const dir = site({
    'index.html': fullHead,
    _redirects: '# comment\n/a /missing/ 301\n/b https://mkotas.cz/ 301\n/c / 301\n',
  });
  const errors = await checkSite(dir);
  assert.equal(errors.length, 1, errors.join('\n'));
  assert.match(errors[0], /_redirects: .*\/missing\//);
});

test('checkSite flags invalid XML', async () => {
  const dir = site({ 'index.html': fullHead, 'feed.xml': '<rss><channel></rss>' });
  assert.ok((await checkSite(dir)).some((e) => /feed\.xml/.test(e)));
});

test('checkSite flags sitemap entries that do not resolve', async () => {
  const dir = site({
    'index.html': fullHead,
    'sitemap.xml': '<?xml version="1.0"?><urlset><url><loc>https://blog.mkotas.cz/gone/</loc></url></urlset>',
  });
  assert.ok((await checkSite(dir)).some((e) => /sitemap\.xml: .*\/gone\//.test(e)));
});

test('checkSite flags draft output', async () => {
  const dir = site({ 'index.html': fullHead, 'secret/index.html': fullHead });
  assert.ok((await checkSite(dir, { draftSlugs: ['secret'] })).some((e) => /draft/.test(e)));
});
