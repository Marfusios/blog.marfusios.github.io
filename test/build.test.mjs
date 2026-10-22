import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../lib/build.mjs';
import { checkSite } from '../lib/check.mjs';

test('production build of fixtures: drafts absent everywhere, check passes', async () => {
  const out = mkdtempSync(join(tmpdir(), 'blog-'));
  const res = await build({ outDir: out, postsDir: 'test/fixtures/posts' });
  assert.deepEqual(res.draftSlugs, ['secret-draft']);
  // _redirects targets are the real posts, which the fixture build does not contain
  const errors = (await checkSite(out, { draftSlugs: res.draftSlugs })).filter((e) => !e.startsWith('_redirects:'));
  assert.deepEqual(errors, []);
  for (const f of ['feed.xml', 'sitemap.xml', 'index.html', 'topics/index.html']) {
    for (const s of res.draftSlugs) assert.doesNotMatch(readFileSync(join(out, f), 'utf8'), new RegExp(s), f);
  }
  assert.ok(existsSync(join(out, '404.html')));
  assert.ok(existsSync(join(out, 'og/home.png')));
  assert.ok(existsSync(join(out, 'og/newest.png')));
  assert.ok(existsSync(join(out, '_redirects')) && existsSync(join(out, '_headers')));
  assert.ok(existsSync(join(out, 'fonts/inter-latin.woff2')));
  const css = readdirSync(join(out, 'assets')).filter((f) => /^site\.[0-9a-f]{8}\.css$/.test(f));
  assert.equal(css.length, 1);
  assert.match(readFileSync(join(out, 'index.html'), 'utf8'), new RegExp(`href="/assets/${css[0]}"`));
});

test('post count and topic counts exclude drafts', async () => {
  const out = mkdtempSync(join(tmpdir(), 'blog-'));
  const res = await build({ outDir: out, postsDir: 'test/fixtures/posts' });
  const nonDraft = readdirSync('test/fixtures/posts').filter((f) => f.endsWith('.md')).length - res.draftSlugs.length;
  const home = readFileSync(join(out, 'index.html'), 'utf8');
  assert.match(home, new RegExp(`${nonDraft} posts · since 2016`));
});

test('drafts are included when asked (dev)', async () => {
  const out = mkdtempSync(join(tmpdir(), 'blog-'));
  await build({ outDir: out, postsDir: 'test/fixtures/posts', includeDrafts: true });
  assert.ok(existsSync(join(out, 'secret-draft/index.html')));
});

test('prev/next link older and newer posts', async () => {
  const out = mkdtempSync(join(tmpdir(), 'blog-'));
  await build({ outDir: out, postsDir: 'test/fixtures/posts' });
  const middle = readFileSync(join(out, 'middle/index.html'), 'utf8');
  assert.match(middle, /class="post-nav-prev" href="\/oldest\/"/);
  assert.match(middle, /class="post-nav-next" href="\/newest\/"/);
});

test('production build of the real posts passes every check', async () => {
  const out = mkdtempSync(join(tmpdir(), 'blog-'));
  const res = await build({ outDir: out });
  assert.deepEqual(await checkSite(out, { draftSlugs: res.draftSlugs }), []);
  assert.deepEqual(res.warnings, []);
  assert.equal(res.pages.length, 11);
});
