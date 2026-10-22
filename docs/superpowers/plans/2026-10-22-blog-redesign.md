# blog.mkotas.cz Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2016 Jekyll blog with a static, Markdown-driven blog in the "Editorial" design, hosted on Cloudflare Workers Static Assets, and link it from mkotas.cz.

**Architecture:** A small Node build (`lib/*.mjs`, run by `scripts/build.mjs`) reads `posts/*.md`, renders HTML with template-literal templates, generates feed, sitemap and social-card PNGs into `dist/`, then validates `dist/`. Wrangler serves `dist/` as static assets with `_redirects` and `_headers`. No client-side JavaScript.

**Tech Stack:** Node ≥ 20 (ESM), `node:test`, marked 18 (+ marked-highlight, marked-gfm-heading-id, marked-footnote), highlight.js 11, gray-matter 4, image-size 2, @resvg/resvg-js 2, fast-xml-parser 5, wrangler 4.

**Spec:** `docs/superpowers/specs/2026-10-22-blog-redesign-design.md` (mockup: `docs/superpowers/specs/2026-10-22-blog-redesign/design-directions.html`, section "B — Editorial").

## Global Constraints

- Repo: `C:\dev\repos\kotas\blog.marfusios.github.io`, branch `master` (already fast-forwarded to `gh-pages`). Commit on `master`; never force-push.
- Site URL `https://blog.mkotas.cz`; every canonical/OG/feed/sitemap URL is absolute with a trailing slash for pages.
- Worker name `marfusios-blog`; assets directory `./dist`; `not_found_handling: "404-page"`; `html_handling: "auto-trailing-slash"`.
- Design tokens copied verbatim from `C:\dev\repos\kotas\marfusios.github.io\public\styles\colors-and-type.css`, plus `--gold-800: #8A6508` for gold text under 18px. ink-300 never used for text. Templates use semantic tokens only so dark mode is a token remap.
- Fonts: Fraunces (display), Inter (body), JetBrains Mono (metadata), self-hosted WOFF2, Latin + Latin-Ext.
- No `<script>` other than `application/ld+json`. Pages must read fully without JS.
- Author entity everywhere: `{"@type":"Person","@id":"https://mkotas.cz/#person","name":"Mariusz Kotas","url":"https://mkotas.cz/"}`.
- Old post bodies verbatim; only the three miro.medium.com image URLs change to self-hosted copies.
- Copy: masthead "Build *notes*."; intro "I’m building a series of independent AI apps (retrieval, agents, applied ML) and writing up the design, the mistakes and the numbers as I go."; site name "Mariusz Kotas · Build notes".
- Commit messages end with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01NrkyjGQYK5RxRghYVGFUM2`

## Review Focus

1. Titles/descriptions containing `&`, `<`, `"`, `’` and Czech/Polish diacritics (e.g. `Příliš žluťoučký kůň & <AI> "agents"`) must come out escaped and intact in HTML, JSON-LD, RSS and the social-card PNG. → tests in Tasks 3, 4, 5.
2. Dates written as `2026-10-22` must display as 22 Oct everywhere regardless of the machine's time zone (gray-matter yields UTC midnight). → test in Task 1.
3. Long code lines, long URLs and wide tables on a 390px phone: the page itself must never scroll sideways; only the code block/table scrolls. → fixture post + Playwright check in Task 7.
4. The newest and oldest posts, a post with one topic, no images and no code: prev/next and optional blocks must simply be absent, never `undefined`. → test in Task 3.
5. Drafts must not leak into `dist/`, the feed, the sitemap, topic counts or the "N posts" line in production builds. → tests in Tasks 1 and 6.

---

### Task 1: Scaffold, config and post loading

**Files:**
- Delete: `_config.yml`, `_includes/`, `_layouts/`, `_sass/`, `_data/`, `categories/`, `css/`, `assets/vendor/`, `README.html`, `test.json`, `CNAME`, `index.html`, `about.md`, `404.html`, `feed.xml`, `sitemap.xml`, `robots.txt`, `.DS_Store`, `_includes/.DS_Store`, `assets/.DS_Store`, `.idea/`
- Delete: `assets/` (old logos included)
- Copy from `C:\dev\repos\kotas\marfusios.github.io\public\`: `images/logo.png`, `images/head.png`, `images/maze-pattern.png` → `src/static/images/`; `favicon.ico` → `src/static/favicon.ico`
- Create: `package.json`, `.gitignore`, `.node-version`, `wrangler.jsonc`, `lib/config.mjs`, `lib/escape.mjs`, `lib/dates.mjs`, `lib/posts.mjs`
- Create (migrated): `posts/2016-03-01-welcome-to-my-blog.md`, `posts/2016-06-04-style-guidelines.md`, `posts/2016-06-10-coding-suggestions.md`, `posts/2020-02-13-hourly-billing-nuts.md`, `posts/media/hourly-billing-nuts/*.webp`
- Test: `test/posts.test.mjs`, `test/dates.test.mjs`, `test/fixtures/posts/` (fixture posts incl. one draft)

**Interfaces:**
- Produces:
  - `site` (from `lib/config.mjs`): `{ url, name, title, description, lang:'en', locale:'en_US', since:2016, intro, author:{ name, url, id, email, image }, links:{ home, github, linkedin, medium } }`
  - `escapeHtml(s: string): string`, `escapeXml(s: string): string` (`lib/escape.mjs`)
  - `formatDate(d: Date, style: 'short'|'long'|'iso'): string` → `'22 Oct'`, `'22 October 2026'`, `'2026-10-22'`, always UTC (`lib/dates.mjs`)
  - `slugify(text: string): string` (`lib/posts.mjs`)
  - `parsePost(source: string, fileName: string): Post`
  - `loadPosts(dir: string, opts?: { includeDrafts?: boolean }): Promise<Post[]>` newest first
  - `collectTopics(posts: Post[]): Topic[]` sorted by post count desc, then name
  - `Post = { title, description, date: Date, updated: Date|null, topics: {name, slug}[], slug, url: '/<slug>/', image: string|null, draft: boolean, fileName, markdown, wordCount, readingMinutes }`
  - `Topic = { name, slug, url: '/topics/<slug>/', posts: Post[] }`

- [ ] **Step 1: Delete Jekyll files and set up the package**

`package.json`: `"type": "module"`, `"private": true`, `"engines": {"node": ">=20"}`, scripts:
```json
{
  "build": "node scripts/build.mjs",
  "dev": "node scripts/dev.mjs",
  "new": "node scripts/new-post.mjs",
  "test": "node --test",
  "preview": "npm run build && wrangler dev",
  "deploy": "wrangler deploy"
}
```
Install: `npm i marked@18 marked-highlight@2 marked-gfm-heading-id@4 marked-footnote@1 highlight.js@11 gray-matter@4 image-size@2 @resvg/resvg-js@2 fast-xml-parser@5` and `npm i -D wrangler@4`. `.node-version`: `22`. `.gitignore`: `node_modules`, `dist`, `.wrangler`, `.DS_Store`, `.dev.vars*`, `.playwright-mcp`.

`wrangler.jsonc`:
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "marfusios-blog",
  "compatibility_date": "2026-10-22",
  "observability": { "enabled": true },
  "assets": {
    "directory": "./dist",
    "not_found_handling": "404-page",
    "html_handling": "auto-trailing-slash"
  }
}
```

- [ ] **Step 2: Write failing tests**

`test/dates.test.mjs`:
```js
test('formatDate is UTC and stable', () => {
  const d = new Date('2026-10-22T00:00:00Z');
  assert.equal(formatDate(d, 'short'), '22 Oct');
  assert.equal(formatDate(d, 'long'), '22 October 2026');
  assert.equal(formatDate(d, 'iso'), '2026-10-22');
  assert.equal(formatDate(new Date('2020-02-13T23:30:00Z'), 'short'), '13 Feb');
});
```
`test/posts.test.mjs` (fixtures under `test/fixtures/posts/`):
```js
test('slugify', () => {
  assert.equal(slugify('.NET'), 'dotnet');
  assert.equal(slugify('AI apps'), 'ai-apps');
  assert.equal(slugify('Příliš žluťoučký kůň'), 'prilis-zlutoucky-kun');
  assert.equal(slugify('  RAG & agents! '), 'rag-agents');
});
test('parsePost derives slug from file name without date', () => {
  const p = parsePost('---\ntitle: T\ndescription: D\ndate: 2026-10-22\ntopics: [AI apps]\n---\nHello world', '2026-10-22-my-post.md');
  assert.equal(p.slug, 'my-post'); assert.equal(p.url, '/my-post/');
  assert.deepEqual(p.topics, [{ name: 'AI apps', slug: 'ai-apps' }]);
  assert.equal(p.updated, null); assert.equal(p.draft, false); assert.equal(p.readingMinutes, 1);
});
test('front matter slug overrides file name', ...);            // slug: custom → '/custom/'
test('missing required field names the file and field', () => {
  assert.throws(() => parsePost('---\ntitle: T\ndate: 2026-10-22\ntopics: [x]\n---\n', 'a.md'), /a\.md.*description/);
});
test('topics must be 1-3', ...);                                  // [] and 4 topics both throw
test('drafts may have empty description and topics', ...);        // draft: true + description "" + topics [] parses; same without draft throws
test('reading time ignores fenced code, 230 wpm, min 1', ...);    // 460 prose words + a 500-word code fence → 2
test('loadPosts sorts newest first and drops drafts by default', async () => {
  const posts = await loadPosts('test/fixtures/posts');
  assert.ok(posts.every(p => !p.draft));
  assert.ok(posts[0].date >= posts.at(-1).date);
  assert.equal((await loadPosts('test/fixtures/posts', { includeDrafts: true })).length, posts.length + 1);
});
test('duplicate slugs throw', ...);                               // fixture dir test/fixtures/dupes
test('collectTopics counts and sorts', ...);                      // 2-post topic before 1-post topic
```

- [ ] **Step 3: Run tests, expect failure**

Run: `npm test`  Expected: FAIL (modules not found).

- [ ] **Step 4: Implement `lib/config.mjs`, `lib/escape.mjs`, `lib/dates.mjs`, `lib/posts.mjs`**

`slugify`: leading `.` → `dot`, NFKD + strip combining marks, lowercase, runs of non-`[a-z0-9]` → `-`, trim `-`. `parsePost` uses gray-matter; required: `title`, `date`, and (unless `draft: true`) a non-empty `description` and 1–3 `topics`; `date`/`updated` accepted as Date or ISO string; `image` stored as given. Word count: split prose (markdown with fenced blocks removed) on whitespace; `readingMinutes = max(1, ceil(words/230))`. `loadPosts` reads `*.md` (not subfolders), throws `Duplicate slug "<slug>" in <a> and <b>`.

- [ ] **Step 5: Run tests, expect pass**

Run: `npm test`  Expected: all pass.

- [ ] **Step 6: Migrate the four posts**

New front matter per post (body below `---` copied byte-for-byte from `_posts/*.markdown`, then delete `_posts/`):

| File | title | description | date | topics |
|---|---|---|---|---|
| `2016-03-01-welcome-to-my-blog.md` | Welcome to my blog! | My new blog: quick notes on software architecture, .NET and building games, so they don’t get forgotten. | 2016-03-01 | [Meta] |
| `2016-06-04-style-guidelines.md` | Style guidelines | The C# coding style guidelines I use: naming, braces, and the order of members in a class. | 2016-06-04 | [.NET] |
| `2016-06-10-coding-suggestions.md` | Coding suggestions | SRP, DRY, CQS, dependency injection and friends: my rules of thumb for clean, maintainable code. | 2016-06-10 | [Architecture] |
| `2020-02-13-hourly-billing-nuts.md` | Hourly billing is nuts | As a freelancer I don’t sell my time but my experience, knowledge and quality. Why hourly billing hurts both sides, and what I do instead. | 2020-02-13 | [Freelance] |

Download the three images as WebP at max width 1600 from `https://miro.medium.com/v2/format:webp/resize:fit:1600/<id>.png` into `posts/media/hourly-billing-nuts/` as `business-card.webp` (`1*CHlys9fWs_pbuBmOvGPdRw`), `office-wall.webp` (`1*plGcNxP6PHJIz1Z2x1axuQ`), `scope-agreement.webp` (`1*4oGfq0xdXf_Jk3wuknsECg`); replace the three URLs in the post with `media/hourly-billing-nuts/<name>.webp` (alt text unchanged).

Run: `node -e "import('./lib/posts.mjs').then(m=>m.loadPosts('posts')).then(p=>console.log(p.map(x=>x.url)))"`
Expected: `[ '/hourly-billing-nuts/', '/coding-suggestions/', '/style-guidelines/', '/welcome-to-my-blog/' ]`

- [ ] **Step 7: Commit** — `git add -A && git commit -m "Replace Jekyll with Node build scaffold and migrate posts"`

---

### Task 2: Markdown rendering

**Files:**
- Create: `lib/markdown.mjs`
- Test: `test/markdown.test.mjs`, `test/fixtures/media/sample/pic.png` (a real 40×20 PNG)

**Interfaces:**
- Consumes: `escapeHtml` (Task 1)
- Produces: `renderMarkdown(md: string, opts: { mediaRoot: string }): { html: string, warnings: string[] }` where `mediaRoot` is the directory that relative `media/...` paths resolve against (production: `posts/`).

- [ ] **Step 1: Write failing tests**

```js
const r = (md) => renderMarkdown(md, { mediaRoot: 'test/fixtures' });
test('code fence: language label, hljs spans, no wrapping <p>', () => {
  const { html } = r('```python\ndef f(): pass\n```');
  assert.match(html, /<figure class="code"><figcaption>python<\/figcaption><pre><code class="hljs language-python">/);
  assert.match(html, /<span class="hljs-keyword">def<\/span>/);
});
test('code fence without language has no label and is escaped', () => {
  const { html } = r('```\n<b>&\n```');
  assert.doesNotMatch(html, /figcaption/); assert.match(html, /&lt;b&gt;&amp;/);
});
test('h2/h3 get ids and anchor links', () => {
  const { html } = r('## Chunking by section');
  assert.match(html, /<h2 id="chunking-by-section">Chunking by section <a class="anchor" href="#chunking-by-section" aria-label="Link to this section">#<\/a><\/h2>/);
});
test('standalone image becomes figure with size, lazy, caption, rewritten path', () => {
  const { html } = r('![A pic](media/sample/pic.png "Caption here")');
  assert.match(html, /<figure><img src="\/media\/sample\/pic.png" alt="A pic" width="40" height="20" loading="lazy" decoding="async"><figcaption>Caption here<\/figcaption><\/figure>/);
  assert.doesNotMatch(html, /<p><figure/);
});
test('image without alt warns', () => {
  assert.equal(r('![](media/sample/pic.png)').warnings.length, 1);
});
test('external image keeps URL, no size', ...);   // https://example.com/x.png → src unchanged, no width attr
test('GFM table is wrapped for horizontal scroll', () => {
  assert.match(r('|a|b|\n|-|-|\n|1|2|').html, /<div class="table-wrap"><table>/);
});
test('footnotes render', ...);                      // 'x[^1]\n\n[^1]: note' → contains 'footnotes' and 'note'
```

- [ ] **Step 2: Run, expect failure** — `node --test test/markdown.test.mjs` → FAIL.

- [ ] **Step 3: Implement `renderMarkdown`**

A fresh `new Marked()` per module with `markedHighlight({ emptyLangClass: 'hljs', langPrefix: 'hljs language-', highlight: (code, lang) => lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : escapeHtml(code) })`, `gfmHeadingId()`, `markedFootnote()`. Renderer overrides (marked token-object signatures): `code`, `heading` (anchors on depth 2–3 only), `paragraph` (single image token → figure, no `<p>`), `image`, `table` (wrap). Image size via `imageSize(readFileSync(join(mediaRoot, href)))` for relative `media/` paths; missing file → warning, no size.

- [ ] **Step 4: Run, expect pass** — `node --test test/markdown.test.mjs` → PASS.

- [ ] **Step 5: Commit** — `git commit -am "Add Markdown rendering with highlighting, anchors and figures"` (add new files first).

---

### Task 3: Templates and structured data

**Files:**
- Create: `lib/seo.mjs`, `lib/templates/layout.mjs`, `lib/templates/partials.mjs`, `lib/templates/pages.mjs`
- Test: `test/templates.test.mjs`

**Interfaces:**
- Consumes: `site`, `escapeHtml`, `formatDate`, `Post`, `Topic` (Task 1)
- Produces:
  - `jsonLdScript(obj: object): string` (escapes `<` as `\u003c`)
  - `blogJsonLd(posts: Post[]): object`, `postJsonLd(post: Post, ogImageUrl: string): object`, `breadcrumbJsonLd(items: {name: string, path: string}[]): object`
  - `layout(p: { title, description, path, ogImage: string /* absolute URL */, ogType: 'website'|'article', article?: { published: Date, modified: Date|null, tags: string[] }, jsonLd: object[], body: string, cssHref: string, noindex?: boolean }): string`
  - `homePage(posts: Post[], topics: Topic[], ctx: { cssHref }): string`
  - `postPage(post: Post & { html: string }, nav: { prev: Post|null, next: Post|null }, ctx): string` (`prev` = older, `next` = newer)
  - `topicsPage(topics: Topic[], ctx): string`, `topicPage(topic: Topic, ctx): string`, `notFoundPage(ctx): string`
  - OG image URL convention used by pages: `${site.url}/og/<slug>.png` for posts (or `site.url + post.image` when set), `${site.url}/og/home.png` otherwise.

- [ ] **Step 1: Write failing tests** (build Posts with `parsePost` and add `html`)

```js
test('post page head: title, description, canonical, OG, Twitter, feed link', () => {
  const html = postPage(post, { prev: null, next: null }, ctx);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>Hourly billing is nuts · Mariusz Kotas<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/blog\.mkotas\.cz\/hourly-billing-nuts\/">/);
  assert.match(html, /<meta property="og:type" content="article">/);
  assert.match(html, /<meta property="article:published_time" content="2020-02-13">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/blog\.mkotas\.cz\/og\/hourly-billing-nuts\.png">/);
  assert.match(html, /type="application\/rss\+xml" href="\/feed\.xml"/);
  assert.doesNotMatch(html, /<script(?! type="application\/ld\+json")/);
});
test('post JSON-LD parses and links the shared Person', () => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m => JSON.parse(m[1]));
  const bp = blocks.find(b => b['@type'] === 'BlogPosting');
  assert.equal(bp.author['@id'], 'https://mkotas.cz/#person');
  assert.equal(bp.datePublished, '2020-02-13'); assert.equal(bp.mainEntityOfPage, 'https://blog.mkotas.cz/hourly-billing-nuts/');
  assert.ok(blocks.find(b => b['@type'] === 'BreadcrumbList'));
});
test('hostile title is escaped in HTML and JSON-LD', () => {
  // title: Příliš žluťoučký kůň & <AI> "agents"
  assert.match(html, /<h1[^>]*>Příliš žluťoučký kůň &amp; &lt;AI&gt; &quot;agents&quot;<\/h1>/);
  assert.doesNotMatch(html, /<AI>/);
});
test('home groups by year, newest first, lead row first', () => {   // posts = loadPosts('posts'), the 4 migrated posts
  const html = homePage(posts, collectTopics(posts), ctx);
  assert.ok(html.indexOf('>2020<') < html.indexOf('>2016<'));
  assert.equal((html.match(/class="row lead"/g) || []).length, 1);
  assert.match(html, /4 posts · since 2016/);
});
test('newest/oldest post: missing prev/next rendered as nothing', () => {
  const html = postPage(post, { prev: null, next: null }, ctx);
  assert.doesNotMatch(html, /undefined|null/); assert.doesNotMatch(html, /class="post-nav"/);
});
test('updated date shown only when set', ...);     // 'Updated' absent without updated, present with it; dateModified matches
test('404 page is noindex', ...);                  // <meta name="robots" content="noindex">
test('topic page canonical and breadcrumb', ...);  // /topics/dotnet/ canonical, BreadcrumbList with Topics → .NET
```

- [ ] **Step 2: Run, expect failure** — `node --test test/templates.test.mjs` → FAIL.

- [ ] **Step 3: Implement `lib/seo.mjs`**

`blogJsonLd`: `{ "@context": "https://schema.org", "@type": "Blog", "@id": site.url + "/#blog", url, name: site.name, description, inLanguage: "en", author: <Person>, publisher: <Person>, blogPost: posts.map(p => ({ "@type": "BlogPosting", headline, url, datePublished })) }`. `postJsonLd`: `BlogPosting` with `headline`, `description`, `datePublished` and `dateModified` (iso, modified falls back to published), `image`, `keywords` (topic names joined by ", "), `wordCount`, `inLanguage`, `mainEntityOfPage` (absolute URL), `author`/`publisher` Person, `isPartOf: { "@id": site.url + "/#blog" }`. Breadcrumb positions start at 1 with "Build notes" → `/`.

- [ ] **Step 4: Implement templates**

`layout` head order: charset, viewport, title (`<page> · Mariusz Kotas`; home uses `Build notes · Mariusz Kotas — writing on building AI apps`), description, robots (`index, follow, max-image-preview:large` or `noindex`), canonical, OG (`og:site_name`, `og:locale`, `og:type`, `og:url`, `og:title`, `og:description`, `og:image` + width 1200/height 630/alt), article meta, Twitter (`summary_large_image`, title, description, image), `theme-color` light `#FAF7F1` / dark `#0B1A2E` with media queries, icons (`/favicon.ico`, `/images/logo.png` apple-touch), `rel="me"` to github/linkedin/medium/mkotas.cz, RSS alternate, preload `/fonts/fraunces-latin.woff2` and `/fonts/inter-latin.woff2` (`as="font" type="font/woff2" crossorigin`), stylesheet `cssHref`, JSON-LD scripts. Body: skip link → `#main`, `header()`, `<main id="main">`, `footer()`.

Markup follows spec "Design (direction B)" and the mockup's `.B` / `.Ba` structure. Class names to use (Task 4 styles them): `site-header`, `brand`, `brand-sub`, `site-nav`, `masthead`, `masthead-title`, `masthead-intro`, `masthead-meta`, `topics-bar`, `chip` (`chip gold` for "AI apps" only), `year`, `row` / `row lead`, `row-date`, `row-main`, `row-meta`, `post`, `post-eyebrow`, `post-title`, `post-dek`, `post-byline`, `post-body`, `post-end`, `author-card`, `post-nav`, `site-footer`. Header nav: Posts `/`, Topics `/topics/`, `mkotas.cz ↗`, RSS icon link `/feed.xml` with `aria-label="RSS feed"`; current section gets `aria-current="page"`. Each row is one `<a class="row">` containing date `<time datetime>`, title `<h3>`, description, first topic chip and `N min`. Post byline: `<time datetime>` long date, optional "Updated <date>", "Mariusz Kotas". Post end: author card (portrait `/images/head.png`, "Mariusz Kotas — product builder in Prague. More about me on mkotas.cz."), topic chips, prev/next (`post-nav` only if at least one exists), RSS link. 404: "Page *not found*." with links to `/` and `/topics/`. Footer (navy band): "Mariusz Kotas" + "Product builder · Prague · m@mkotas.cz"; links mkotas.cz, GitHub, LinkedIn, Medium, RSS; "© <current year>".

- [ ] **Step 5: Run, expect pass** — `node --test` → all pass.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "Add page templates and structured data"`

---

### Task 4: Styles and fonts

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/fonts.css`, `src/styles/blog.css`, `src/static/fonts/*.woff2`, `scripts/fetch-fonts.mjs`
- Test: visual check (Task 7 harness) + `test/styles.test.mjs`

**Interfaces:**
- Produces: CSS files concatenated by the build in the order `tokens.css`, `fonts.css`, `blog.css`. Font file names: `fraunces-latin.woff2`, `fraunces-latin-ext.woff2`, `fraunces-italic-latin.woff2`, `fraunces-italic-latin-ext.woff2`, `inter-latin.woff2`, `inter-latin-ext.woff2`, `jetbrains-mono-latin.woff2`, `jetbrains-mono-latin-ext.woff2`.

- [ ] **Step 1: Write failing test** `test/styles.test.mjs`

```js
test('tokens copied from mkotas.cz plus gold-800 and a dark remap', () => {
  const css = readFileSync('src/styles/tokens.css', 'utf8');
  for (const t of ['--navy-800: #102439', '--gold-700: #B8860D', '--paper:    #FAF7F1', '--gold-800: #8A6508']) assert.ok(css.includes(t), t);
  assert.match(css, /@media \(prefers-color-scheme: dark\)/);
});
test('every font file referenced in fonts.css exists', ...);   // parse url(/fonts/x.woff2), existsSync(src/static/fonts/x.woff2)
test('blog.css uses no raw ink-300 for text colour', ...);     // no /color:\s*var\(--ink-300\)/
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Fetch fonts** — `scripts/fetch-fonts.mjs` requests `https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Inter:wght@400..700&family=JetBrains+Mono:wght@400;500&display=swap` with a current Chrome User-Agent, keeps only the `/* latin */` and `/* latin-ext */` blocks, downloads each WOFF2 to `src/static/fonts/<name>.woff2` (names above), and writes `src/styles/fonts.css` with the same `@font-face` rules pointing at `/fonts/<name>.woff2`, `font-display: swap`. Run once: `node scripts/fetch-fonts.mjs`; commit the output.

- [ ] **Step 4: Write `tokens.css`** — the full `:root` block and the semantic element styles from mkotas.cz `colors-and-type.css` verbatim; add `--gold-800`; add `--accent-text: var(--gold-800)`, `--code-bg: var(--navy-900)`, `--code-fg: #DCE3EC`, `--rule-strong: var(--ink-900)`; dark block remaps `--bg: var(--navy-900)`, `--bg-elevated: var(--navy-800)`, `--bg-sunken: var(--navy-800)`, `--fg: var(--paper)`, `--fg-muted: var(--navy-100)`, `--fg-subtle: #8FA2BD`, `--border: var(--navy-700)`, `--border-strong: var(--navy-600)`, `--link: var(--paper)`, `--link-hover: var(--gold-500)`, `--accent-text: var(--gold-500)`, `--rule-strong: var(--navy-100)`, `--code-bg: #07111F`.

- [ ] **Step 5: Write `blog.css`** — implement the spec's Design section using the class names from Task 3 and the mockup's `.B`/`.Ba` rules as the reference for sizes and spacing (masthead title 92px desktop → 56px ≤ 760px; row grid `110px 1fr 190px` → single column ≤ 760px; post body max-width 68ch, 18px/1.7; drop cap on `.post-body > p:first-of-type::first-letter`; code figure on `--code-bg`, `overflow-x: auto`, `white-space: pre`; `.table-wrap { overflow-x: auto }`; hljs token colours: keyword/built_in gold-400, string `#9FD3B5`, comment navy-300, title/function `#9CC2F0`, number `#F2B880`; `.anchor` visible on heading hover/focus; footer navy band with maze pattern at 0.06). Small gold text uses `--accent-text`. Global: `html { overflow-x: hidden }` is NOT allowed (it hides bugs); instead `img, svg { max-width: 100% ; height: auto }`, `pre`/tables scroll in place. `:focus-visible` outline 2px gold-600. `@media (prefers-reduced-motion: reduce)` disables transitions.

- [ ] **Step 6: Run tests, expect pass**; commit — `git add -A && git commit -m "Add Editorial styles, dark theme and self-hosted fonts"`

---

### Task 5: Feed, sitemap and social cards

**Files:**
- Create: `lib/feed.mjs`, `lib/sitemap.mjs`, `lib/og.mjs`, `src/og/fonts/Fraunces-SemiBold.ttf`, `src/og/fonts/Inter-Medium.ttf`, `src/og/fonts/JetBrainsMono-Regular.ttf`
- Test: `test/feed.test.mjs`, `test/sitemap.test.mjs`, `test/og.test.mjs`

**Interfaces:**
- Consumes: `site`, `escapeXml`, `formatDate`, `Post` (+ `html`)
- Produces:
  - `renderFeed(posts: (Post & {html})[]): string` — RSS 2.0, all posts, newest first
  - `renderSitemap(entries: { path: string, lastmod?: Date }[]): string`
  - `wrapText(text: string, maxChars: number, maxLines: number): string[]`
  - `ogSvg(p: { title: string, eyebrow: string }): string`, `renderOgPng(p): Buffer` (1200×630)

- [ ] **Step 1: Write failing tests**

```js
test('feed is valid RSS with absolute URLs and full content', () => {
  const xml = renderFeed(posts);
  assert.equal(XMLValidator.validate(xml), true);
  assert.match(xml, /<atom:link href="https:\/\/blog\.mkotas\.cz\/feed\.xml" rel="self" type="application\/rss\+xml"\/>/);
  assert.match(xml, /<guid isPermaLink="true">https:\/\/blog\.mkotas\.cz\/hourly-billing-nuts\/<\/guid>/);
  assert.match(xml, /<pubDate>Thu, 13 Feb 2020 00:00:00 GMT<\/pubDate>/);
  assert.match(xml, /<category>Freelance<\/category>/);
  assert.match(xml, /src="https:\/\/blog\.mkotas\.cz\/media\//);   // relative /media rewritten inside content:encoded
});
test('feed escapes hostile titles', ...);       // validates, contains 'kůň &amp; &lt;AI&gt;'
test('sitemap lists absolute URLs with lastmod', () => {
  const xml = renderSitemap([{ path: '/' }, { path: '/x/', lastmod: new Date('2020-02-13T00:00:00Z') }]);
  assert.equal(XMLValidator.validate(xml), true);
  assert.match(xml, /<loc>https:\/\/blog\.mkotas\.cz\/x\/<\/loc><lastmod>2020-02-13<\/lastmod>/);
});
test('wrapText', () => {
  assert.deepEqual(wrapText('Hourly billing is nuts', 18, 4), ['Hourly billing is', 'nuts']);
  assert.equal(wrapText('word '.repeat(80), 18, 4).length, 4);
  assert.ok(wrapText('word '.repeat(80), 18, 4).at(-1).endsWith('…'));
});
test('og png is 1200x630 and renders diacritics without throwing', () => {
  const png = renderOgPng({ title: 'Příliš žluťoučký kůň & <AI>', eyebrow: 'AI apps · 9 min' });
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
});
test('og svg escapes text', ...);               // ogSvg contains '&amp; &lt;AI&gt;'
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Get static TTFs for resvg** — download static instances (resvg does not reliably handle variable axes) from the Google Fonts CSS2 API using a legacy User-Agent (which returns TTF): `Fraunces:opsz,wght@144,600`, `Inter:wght@500`, `JetBrains+Mono:wght@400`; save under the names above. Verify each file starts with bytes `00 01 00 00` or `true`/`OTTO`.

- [ ] **Step 4: Implement** — `renderFeed`: channel title `site.name`, link, description, language `en`, `lastBuildDate` = newest post date, `<image>` `/images/logo.png`; items with `title`, `link`, `guid`, `pubDate` (RFC 822 via `toUTCString()`), `description` (post description), `category` per topic, `content:encoded` as CDATA (split any `]]>`). `ogSvg`: 1200×630, background navy-800, maze pattern from `src/static/images/maze-pattern.png` as a data-URI `<pattern>` at opacity 0.06, radial gold glow top-right, MK logo (data URI) top-left at 72px, eyebrow in JetBrains Mono 26px gold-400 uppercase, title in Fraunces SemiBold 68px paper lines from `wrapText(title, 24, 4)` with 1.1 line height, footer "blog.mkotas.cz" mono 24px `#8FA2BD` bottom-left and "Mariusz Kotas" Inter 26px paper bottom-right. `renderOgPng`: `new Resvg(svg, { font: { fontFiles: [...three TTFs], loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng()`.

- [ ] **Step 5: Run, expect pass**; open one PNG (`node -e` write to `C:\dev\repos\kotas\.playwright-mcp\og-sample.png`) and look at it. Commit — `git add -A && git commit -m "Add RSS feed, sitemap and generated social cards"`

---

### Task 6: Build, validation, dev server and authoring tools

**Files:**
- Create: `lib/build.mjs`, `lib/check.mjs`, `scripts/build.mjs`, `scripts/dev.mjs`, `scripts/new-post.mjs`, `src/static/robots.txt`, `src/static/_redirects`, `src/static/_headers`, `README.md` (replace the Daktilo one)
- Test: `test/check.test.mjs`, `test/build.test.mjs`

**Interfaces:**
- Consumes: everything above
- Produces:
  - `build(opts: { outDir: string, postsDir?: string /* 'posts' */, includeDrafts?: boolean }): Promise<{ pages: string[], warnings: string[], draftSlugs: string[] }>`
  - `checkSite(distDir: string, opts?: { draftSlugs?: string[] }): Promise<string[]>` (empty = OK)

- [ ] **Step 1: Static files (exact content)**

`src/static/robots.txt`:
```
User-agent: *
Allow: /

Sitemap: https://blog.mkotas.cz/sitemap.xml
```
`src/static/_redirects`:
```
/other/2020/02/13/hourly-billing-nuts.html          /hourly-billing-nuts/   301
/other/2020/02/13/hourly-billing-nuts.html/         /hourly-billing-nuts/   301
/architecture/2016/06/10/coding-suggestions.html    /coding-suggestions/    301
/architecture/2016/06/10/coding-suggestions.html/   /coding-suggestions/    301
/dotnet/2016/06/04/style-guidelines.html            /style-guidelines/      301
/dotnet/2016/06/04/style-guidelines.html/           /style-guidelines/      301
/other/2016/03/01/welcome-to-my-blog.html           /welcome-to-my-blog/    301
/other/2016/03/01/welcome-to-my-blog.html/          /welcome-to-my-blog/    301
/categories/dotnet/                                 /topics/dotnet/         301
/categories/dotnet                                  /topics/dotnet/         301
/categories/architecture/                           /topics/architecture/   301
/categories/architecture                            /topics/architecture/   301
/categories/other/                                  /topics/                301
/categories/other                                   /topics/                301
/about/                                             https://mkotas.cz/      301
/about                                              https://mkotas.cz/      301
```
`src/static/_headers`:
```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; style-src 'self'; font-src 'self'; script-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/og/*
  Cache-Control: public, max-age=86400
/media/*
  Cache-Control: public, max-age=604800
/images/*
  Cache-Control: public, max-age=604800
/feed.xml
  Content-Type: application/rss+xml; charset=utf-8
```

- [ ] **Step 2: Write failing tests**

```js
test('checkSite flags a broken internal link and a missing canonical', async () => {
  // temp dir with index.html linking to /nope/ and lacking canonical
  const errors = await checkSite(tmp);
  assert.ok(errors.some(e => /\/nope\//.test(e)));
  assert.ok(errors.some(e => /canonical/.test(e)));
});
test('checkSite flags a redirect to a missing page', ...);   // _redirects line "/a /missing/ 301"
test('checkSite flags draft output', ...);                    // dist/<draftSlug>/index.html present → error
test('production build of fixtures: drafts absent everywhere, check passes', async () => {
  const out = mkdtempSync(join(tmpdir(), 'blog-'));
  const res = await build({ outDir: out, postsDir: 'test/fixtures/posts' });
  assert.deepEqual(await checkSite(out, { draftSlugs: res.draftSlugs }), []);
  for (const f of ['feed.xml', 'sitemap.xml', 'index.html', 'topics/index.html'])
    for (const s of res.draftSlugs) assert.doesNotMatch(readFileSync(join(out, f), 'utf8'), new RegExp(s));
  assert.ok(existsSync(join(out, '404.html')) && existsSync(join(out, 'og/home.png')));
  assert.equal(readdirSync(join(out, 'assets')).filter(f => /^site\.[0-9a-f]{8}\.css$/.test(f)).length, 1);
});
```

- [ ] **Step 3: Run, expect failure.**

- [ ] **Step 4: Implement `build`** — empty `outDir`; copy `src/static/**` → `outDir/`; copy `<postsDir>/media/**` → `outDir/media/`; concat CSS → `assets/site.<first 8 hex of sha256>.css`; `loadPosts(postsDir, { includeDrafts })`; `renderMarkdown(post.markdown, { mediaRoot: postsDir })` per post (collect warnings with file name); write `index.html`, `<slug>/index.html`, `topics/index.html`, `topics/<slug>/index.html`, `404.html`, `feed.xml`, `sitemap.xml` (home, posts with `lastmod = updated ?? date`, topics index, topic pages; not 404), `og/home.png` (title "Build notes", eyebrow "Mariusz Kotas · blog") and `og/<slug>.png` per post without `image` (eyebrow = topic names joined by " · " + " · N min"). `draftSlugs` = slugs of drafts present in `postsDir` (whether or not included).

`checkSite`: for every `*.html`, collect `href`/`src` starting with `/` (strip `#…`/`?…`), resolve `p`, `p/index.html`, or `p.html` under `distDir`; non-404 pages must have `<title>`, meta description, canonical, `og:image` whose path exists in `distDir`; each `_redirects` destination starting with `/` must resolve; `feed.xml` and `sitemap.xml` must pass `XMLValidator.validate`; any `draftSlugs` directory present is an error. Return messages as `<file>: <problem>`.

`scripts/build.mjs`: `build({ outDir: 'dist' })`, print warnings, run `checkSite`, print errors and `process.exit(1)` if any, else print `Built N pages`.

- [ ] **Step 5: Run, expect pass** — `npm test` → PASS; `npm run build` → `Built 11 pages` (home, 4 posts, topics index, 4 topic pages, 404) and exit 0.

- [ ] **Step 6: `scripts/dev.mjs` and `scripts/new-post.mjs`**

`dev.mjs`: `build({ outDir: '.dev-dist', includeDrafts: true })`, serve it with `node:http` on `http://localhost:4321` (directory → `index.html`, missing → `404.html` with status 404, correct content types for html/css/xml/png/webp/woff2/ico), rebuild on `fs.watch` changes in `posts/`, `src/`, `lib/` (debounced 150ms). Add `.dev-dist` to `.gitignore`.
`new-post.mjs "Title"`: writes `posts/<YYYY-MM-DD>-<slugify(title)>.md` with `title`, `description: ""`, `date: <today>`, `topics: []`, `draft: true` and a one-line body; refuses to overwrite; prints the path. Drafts with empty description/topics are accepted (Task 1); removing `draft` forces the author to fill them. Also honour `POSTS_DIR` (default `posts`) in `dev.mjs`.

Run: `npm run new -- "Test draft"` → file created; `npm run dev` → page visible at `http://localhost:4321/test-draft/`; delete the test file.

- [ ] **Step 7: README.md** — what the blog is; Write a post (`npm run new -- "Title"`, front matter table from the spec, media folder, drafts); Preview (`npm run dev`, `npm run preview` for the real Cloudflare runtime incl. redirects/headers); Publish (push to `master`, Workers Builds runs `npm run build` + `npx wrangler deploy`); Project layout.

- [ ] **Step 8: Commit** — `git add -A && git commit -m "Add build, site checks, dev server and post scaffolding"`

---

### Task 7: Visual and responsive verification

**Files:**
- Create: `test/fixtures/posts/2026-01-01-kitchen-sink.md` (non-draft fixture: H2/H3, a 200-char code line, a long URL, a 6-column table, blockquote, image `media/kitchen-sink/pic.png` stored at `test/fixtures/posts/media/kitchen-sink/pic.png`, footnote, hostile title from Review Focus 1). The Task 6 fixture build test must still pass with it.

- [ ] **Step 1:** Run `POSTS_DIR=test/fixtures/posts npm run dev` (serves `http://localhost:4321`).
- [ ] **Step 2:** Playwright screenshots at 1440×900 and 390×844, light and dark (`emulateMedia colorScheme`), of `/`, `/kitchen-sink…/`, `/topics/`, `/topics/<one>/`, `/nope/` (404). Save under `C:\dev\repos\kotas\.playwright-mcp\`.
- [ ] **Step 3:** In each page evaluate `document.documentElement.scrollWidth <= window.innerWidth` → must be `true` at 390px. Check the console has no errors and no failed requests.
- [ ] **Step 4:** Compare against mockup B; fix any defects in `blog.css`/templates; re-run `npm test` and `npm run build`.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Polish layout after visual review"`

---

### Task 8: Link the blog from mkotas.cz

**Files (repo `C:\dev\repos\kotas\marfusios.github.io`, branch `master`):**
- Modify: `public/index.html` (header nav ~line 138, hero socials ~line 189, `<link rel="me">` ~line 46, JSON-LD `sameAs` ~line 118, contact socials ~line 611, footer ~line 636)
- Modify: `public/styles/styles.css` (mobile nav rule ~line 348)

- [ ] **Step 1:** Header nav: append `<a href="https://blog.mkotas.cz/" class="nav-blog">Blog</a>` after Contact. CSS: under the 880px media query, keep `.site-header nav a.nav-blog` visible (`display: inline`), all other nav links hidden as today.
- [ ] **Step 2:** Hero socials and contact `socials-row`: insert after the Medium link
```html
<a class="icon-link" href="https://blog.mkotas.cz/" title="Blog" aria-label="Blog">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
</a>
```
- [ ] **Step 3:** Footer `.foot-right`: `<a href="https://blog.mkotas.cz/">Blog ↗</a>` after Medium. Head: `<link rel="me" href="https://blog.mkotas.cz/">`; add `"https://blog.mkotas.cz/"` to Person `sameAs`.
- [ ] **Step 4:** Verify: `python -I -c "import json,re;s=open('public/index.html',encoding='utf-8').read();json.loads(re.search(r'<script type=\"application/ld\+json\">(.*?)</script>',s,re.S).group(1));print(s.count('blog.mkotas.cz'))"` → prints `6` (nav, 2 icons, footer, rel=me, sameAs). Serve `public/` (`python -m http.server 8765 --directory public`) and screenshot desktop and 390px: Blog visible in header on both, icon sits right of Medium in hero and contact rows, footer link present.
- [ ] **Step 5: Commit** — `git commit -am "Link the blog from header, socials and footer"`

---

### Task 9: Publish and cut over to Cloudflare

Done in this session: GitHub via `gh`, Cloudflare via Claude in Chrome in Mariusz's logged-in browser.

- [ ] **Step 1:** Push both repos: blog `git push -u origin master`; personal site `git push origin master`. Personal site: wait for check run "Workers Builds: marfusios" to succeed (`gh api repos/Marfusios/marfusios.github.io/commits/<sha>/check-runs`), then `curl -s https://mkotas.cz/ | grep -c blog.mkotas.cz` → `6`.
- [ ] **Step 2:** Cloudflare dashboard → Workers & Pages → Create → Import a repository → GitHub → `Marfusios/blog.marfusios.github.io` (grant the Cloudflare GitHub app access to this repo if it is not listed). Project name `marfusios-blog`, production branch `master`, build command `npm run build`, deploy command `npx wrangler deploy`. Save and deploy; wait for the build to succeed (read the build log on failure and fix in the repo).
- [ ] **Step 3:** Verify on the `*.workers.dev` URL: home, a post, `/topics/`, `/feed.xml`, `/sitemap.xml`, a missing path returns 404 with the 404 page, an old URL returns 301 to the right path, `_headers` present (`curl -sI`).
- [ ] **Step 4:** Back to back: in the mkotas.cz zone → DNS → delete the `blog` record (GitHub Pages target); then Worker → Settings → Domains & Routes → Add → Custom domain `blog.mkotas.cz`. Wait for "Active".
- [ ] **Step 5:** Verify on `https://blog.mkotas.cz`: `curl -sI` shows `server: cloudflare`; loop over every old URL in `_redirects` with `curl -s -o /dev/null -w "%{http_code} %{redirect_url}"` → `301` to the expected target; every sitemap URL returns 200; feed returns `application/rss+xml`; `http://` redirects to `https://`.
- [ ] **Step 6:** GitHub: `gh api -X DELETE repos/Marfusios/blog.marfusios.github.io/pages`; `gh api -X PATCH repos/Marfusios/blog.marfusios.github.io -f default_branch=master -f homepage=https://blog.mkotas.cz`. Leave `gh-pages` branch in place.
- [ ] **Step 7:** Final pass: Playwright on the live blog (desktop + phone, light + dark) and on mkotas.cz (Blog links); no console errors. Report results to Mariusz, including that Search Console sitemap submission is optional and his to do.
