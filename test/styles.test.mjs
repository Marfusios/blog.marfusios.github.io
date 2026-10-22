import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (f) => readFileSync(f, 'utf8');

test('tokens copied from mkotas.cz plus gold-800 and a dark remap', () => {
  const css = read('src/styles/tokens.css');
  for (const t of ['--navy-800: #102439', '--gold-700: #B8860D', '--paper:    #FAF7F1', '--gold-800: #8A6508']) {
    assert.ok(css.includes(t), t);
  }
  assert.match(css, /@media \(prefers-color-scheme: dark\)/);
});

test('every font file referenced in fonts.css exists', () => {
  const urls = [...read('src/styles/fonts.css').matchAll(/url\((\/fonts\/[^)]+\.woff2)\)/g)].map((m) => m[1]);
  assert.ok(urls.length >= 8, `expected at least 8 font files, got ${urls.length}`);
  for (const u of urls) assert.ok(existsSync(`src/static${u}`), u);
  for (const f of ['fraunces-latin', 'fraunces-latin-ext', 'fraunces-italic-latin', 'fraunces-italic-latin-ext', 'inter-latin', 'inter-latin-ext', 'jetbrains-mono-latin', 'jetbrains-mono-latin-ext']) {
    assert.ok(urls.includes(`/fonts/${f}.woff2`), f);
  }
});

test('blog.css uses no raw ink-300 for text colour', () => {
  assert.doesNotMatch(read('src/styles/blog.css'), /(^|[^-])color:\s*var\(--ink-300\)/m);
});

test('blog.css styles every class the templates emit', () => {
  const css = read('src/styles/blog.css');
  for (const cls of ['site-header', 'brand', 'brand-sub', 'site-nav', 'masthead', 'masthead-title', 'masthead-intro', 'masthead-meta', 'topics-bar', 'chip', 'year', 'row', 'lead', 'row-date', 'row-main', 'row-meta', 'post', 'post-eyebrow', 'post-title', 'post-dek', 'post-byline', 'post-body', 'post-end', 'author-card', 'post-nav', 'site-footer', 'skip-link', 'anchor', 'table-wrap', 'topic-row']) {
    assert.match(css, new RegExp(`\\.${cls}\\b`), cls);
  }
});
