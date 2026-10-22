// Tests added after the whole-branch review: inputs real posts will hit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { slugify, parsePost, loadPosts, collectTopics } from '../lib/posts.mjs';
import { renderMarkdown } from '../lib/markdown.mjs';
import { postPage } from '../lib/templates/pages.mjs';
import { ogSvg } from '../lib/og.mjs';
import { checkSite } from '../lib/check.mjs';
import { build } from '../lib/build.mjs';

const fm = (fields, body = 'Hello world') => `---\n${fields}\n---\n${body}`;
const base = 'title: T\ndescription: D\ndate: 2026-10-22\ntopics: [AI apps]';
const md = (s) => renderMarkdown(s, { mediaRoot: 'test/fixtures' });
const read = (f) => readFileSync(f, 'utf8');

// ---------- slugs ----------

test('slugify handles letters NFKD drops, and C#/C++ stay distinct', () => {
  assert.equal(slugify('Złote myśli'), 'zlote-mysli');
  assert.equal(slugify('Łódź'), 'lodz');
  assert.equal(slugify('Straße'), 'strasse');
  assert.equal(slugify('C#'), 'c-sharp');
  assert.equal(slugify('F#'), 'f-sharp');
  assert.equal(slugify('C++'), 'c-plus-plus');
  assert.equal(slugify('.NET'), 'dotnet');
});

test('empty or reserved slugs are rejected', () => {
  assert.throws(() => parsePost(fm(base), '2026-01-01-🚀.md'), /slug/);
  for (const reserved of ['topics', 'assets', 'media', 'og', 'fonts', 'images']) {
    assert.throws(() => parsePost(fm(base), `2026-01-01-${reserved}.md`), /reserved/);
  }
});

test('one topic slug with two different names is an error', () => {
  const a = parsePost(fm('title: A\ndescription: D\ndate: 2026-01-01\ntopics: [AI apps]'), 'a.md');
  const b = parsePost(fm('title: B\ndescription: D\ndate: 2026-01-02\ntopics: [AI Apps]'), 'b.md');
  assert.throws(() => collectTopics([a, b]), /"AI apps".*"AI Apps"/);
});

// ---------- drafts ----------

test('draft must be a boolean', () => {
  for (const v of ['yes', 'on', '"true"', '1']) {
    assert.throws(() => parsePost(fm(`${base}\ndraft: ${v}`), 'a.md'), /draft/, v);
  }
  assert.equal(parsePost(fm(`${base}\ndraft: false`), 'a.md').draft, false);
});

test('draft media is not copied to the output', async () => {
  const out = mkdtempSync(join(tmpdir(), 'blog-'));
  await build({ outDir: out, postsDir: 'test/fixtures/posts' });
  assert.ok(existsSync('test/fixtures/posts/media/secret-draft/x.png'), 'fixture present');
  assert.ok(!existsSync(join(out, 'media/secret-draft')));
  assert.ok(existsSync(join(out, 'media/kitchen-sink/wide.webp')));
});

// ---------- social images ----------

test('image override is normalised to a root-relative path unless absolute', () => {
  assert.equal(parsePost(fm(`${base}\nimage: media/x/cover.png`), 'a.md').image, '/media/x/cover.png');
  assert.equal(parsePost(fm(`${base}\nimage: /media/x/cover.png`), 'a.md').image, '/media/x/cover.png');
  assert.equal(parsePost(fm(`${base}\nimage: https://cdn.example.com/c.png`), 'a.md').image, 'https://cdn.example.com/c.png');
});

test('absolute image override is used as-is', async () => {
  const post = { ...(await loadPosts('posts'))[0], html: '' };
  const html = postPage({ ...post, image: 'https://cdn.example.com/c.png' }, { prev: null, next: null }, { cssHref: '/x.css' });
  assert.match(html, /<meta property="og:image" content="https:\/\/cdn\.example\.com\/c\.png">/);
});

test('a long eyebrow is truncated to one line', () => {
  const svg = ogSvg({ title: 'T', eyebrow: 'Retrieval-augmented generation · Observability and evaluation · Infrastructure · 12 min' });
  const eyebrow = /letter-spacing="2" fill="#EFC149">([^<]*)</.exec(svg)[1];
  assert.ok(eyebrow.length <= 56, `${eyebrow.length}: ${eyebrow}`);
  assert.ok(eyebrow.endsWith('…'));
});

// ---------- headings and links ----------

test('heading ids come from the plain text, not escaped HTML', () => {
  assert.match(md('## What I’d do differently').html, /id="what-id-do-differently"/);
  assert.match(md("## What I'd do differently").html, /id="what-id-do-differently"/);
  assert.match(md('## Q&A: C# & .NET').html, /id="qa-c--net"/);
  assert.match(md('## "Quoted" heading').html, /id="quoted-heading"/);
});

test('heading ids never collide with page ids', () => {
  assert.match(md('## Main').html, /id="main-1"/);
  assert.match(md('## Footnote label').html, /id="footnote-label-1"/);
});

test('relative media links are rewritten to root-relative', () => {
  assert.match(md('[the PDF](media/sample/pic.png)').html, /<a href="\/media\/sample\/pic.png">the PDF<\/a>/);
  assert.match(md('[ext](https://example.com/)').html, /<a href="https:\/\/example.com\/">ext<\/a>/);
});

// ---------- site checks ----------

const head = (extra = '') => `<title>T</title><meta name="description" content="D">${extra}`;
const fullHead = head(
  '<link rel="canonical" href="https://blog.mkotas.cz/"><meta property="og:image" content="https://blog.mkotas.cz/og/home.png">',
);
function site(files) {
  const dir = mkdtempSync(join(tmpdir(), 'blog-check-'));
  const xml = '<?xml version="1.0"?><x></x>';
  const all = { 'og/home.png': 'png', 'feed.xml': xml, 'sitemap.xml': xml, _redirects: '', ...files };
  for (const [path, content] of Object.entries(all)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

test('checkSite flags an og:image that is not a proper URL on the site', async () => {
  const dir = site({
    'index.html': head('<link rel="canonical" href="https://blog.mkotas.cz/"><meta property="og:image" content="https://blog.mkotas.czog/home.png">'),
  });
  assert.ok((await checkSite(dir)).some((e) => /og:image/.test(e)));
});

test('checkSite resolves relative links against the page directory', async () => {
  const dir = site({
    'index.html': fullHead,
    'x/index.html': `${fullHead}<a href="media/a.pdf">a</a><a href="../x/">self</a><a href="#top">top</a><a href="mailto:m@x.cz">m</a>`,
  });
  const errors = await checkSite(dir);
  assert.equal(errors.length, 1, errors.join('\n'));
  assert.match(errors[0], /x\/index\.html: .*media\/a\.pdf/);
});

test('checkSite flags media of draft posts', async () => {
  const dir = site({ 'index.html': fullHead, 'media/secret/x.png': 'png' });
  assert.ok((await checkSite(dir, { draftSlugs: ['secret'] })).some((e) => /media\/secret/.test(e)));
});

// ---------- static files ----------

test('every old post URL redirects with .html, .html/ and no extension', () => {
  const lines = read('src/static/_redirects').split('\n');
  const has = (from, to) =>
    lines.some((l) => {
      const [a, b, c] = l.trim().split(/\s+/);
      return a === from && b === to && c === '301';
    });
  for (const [old, slug] of [
    ['/other/2020/02/13/hourly-billing-nuts', 'hourly-billing-nuts'],
    ['/architecture/2016/06/10/coding-suggestions', 'coding-suggestions'],
    ['/dotnet/2016/06/04/style-guidelines', 'style-guidelines'],
    ['/other/2016/03/01/welcome-to-my-blog', 'welcome-to-my-blog'],
  ]) {
    for (const from of [`${old}.html`, `${old}.html/`, old]) assert.ok(has(from, `/${slug}/`), from);
  }
});

test('CSP allows the Cloudflare Web Analytics beacon and no other script', () => {
  const csp = /Content-Security-Policy: (.*)/.exec(read('src/static/_headers'))[1];
  assert.match(csp, /script-src https:\/\/static\.cloudflareinsights\.com;/);
  assert.match(csp, /connect-src 'self' https:\/\/cloudflareinsights\.com;/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
});

test('headers do not use the obsolete interest-cohort feature', () => {
  assert.doesNotMatch(read('src/static/_headers'), /interest-cohort/);
});

test('header uses the small logo and apple-touch uses the 180px one', async () => {
  const post = { ...(await loadPosts('posts'))[0], html: '' };
  const html = postPage(post, { prev: null, next: null }, { cssHref: '/x.css' });
  assert.match(html, /<a class="brand" href="\/" aria-label="Mariusz Kotas · Build notes, home"><img src="\/images\/logo-64.png"/);
  assert.match(html, /<link rel="apple-touch-icon" href="\/images\/logo-180.png">/);
  assert.doesNotMatch(html, /src="\/images\/logo.png"/);
  assert.ok(existsSync('src/static/images/logo-64.png') && existsSync('src/static/images/logo-180.png'));
});

// ---------- styles ----------

test('focus ring uses a token with enough contrast in both themes', () => {
  assert.match(read('src/styles/tokens.css'), /--focus-ring:\s*var\(--navy-800\)/);
  assert.match(read('src/styles/tokens.css'), /--focus-ring:\s*var\(--gold-500\)/);
  assert.match(read('src/styles/blog.css'), /:focus-visible\s*{[^}]*var\(--focus-ring\)/);
});

test('no text uses fg-faint (ink-300 in light mode)', () => {
  assert.doesNotMatch(read('src/styles/blog.css'), /(^|[^-])color:\s*var\(--fg-faint\)/m);
});

test('titles and topic names may break long words', () => {
  const css = read('src/styles/blog.css');
  for (const sel of ['.masthead-title', '.post-title', '.row-title', '.post-nav-title', '.topic-name']) {
    const block = new RegExp(`(^|\\n)\\${sel} \\{[^}]*\\}`).exec(css)?.[0] ?? '';
    assert.match(block, /overflow-wrap: anywhere/, sel);
  }
});
