# blog.mkotas.cz redesign and Cloudflare migration

Date: 2026-10-22 · Owner: Mariusz Kotas

## Intent

Mariusz wants to start publishing regularly about the AI apps he is building
(first one: Aviation Casebook, a RAG app over aviation accident investigation
reports). The current blog is a 2016 Jekyll theme ("Daktilo") on GitHub Pages
that looks nothing like mkotas.cz, carries dead integrations, and is awkward to
post to. The new blog should look like part of the same personal brand, be
pleasant to read long technical posts in, rank well, share well, and make
writing a new post as cheap as dropping a Markdown file in a folder and
pushing to `master`.

## Goals

- Rebuild blog.mkotas.cz as fully static HTML in **direction B, "Editorial"**
  (chosen from three mockups): reading-first, big Fraunces masthead, posts as a
  dated index grouped by year, hairline rules, navy reserved for code blocks
  and the footer band.
- Follow the mkotas.cz design system exactly: tokens from
  `marfusios.github.io/public/styles/colors-and-type.css` (navy + gold on warm
  paper; Fraunces display, Inter body, JetBrains Mono metadata; ~70% neutral /
  25% navy / 5% gold). The blog adds a dark theme derived from the same tokens.
- Authoring: one Markdown file per post with front matter. A small Node build
  script turns posts into HTML. No Jekyll, no framework, no client-side JS
  framework.
- Host on **Cloudflare Workers Static Assets**, deployed by Workers Builds on
  every push to `master`, same as mkotas.cz.
- Keep all four existing posts and their search equity: 301 every old URL to
  its new URL.
- Full public-site hygiene: SEO metadata, structured data, sitemap, RSS,
  social cards, accessibility, performance, security headers, a real 404.
- Link the blog from mkotas.cz: header nav (right side), the social icon rows
  next to Medium, and the footer.

## Non-goals

- Comments, newsletter/email capture, search, analytics scripts, cookie banner.
  (Disqus and the dead Google Analytics UA tag are removed, not replaced.
  Cloudflare Web Analytics can be switched on later from the dashboard with no
  code change if wanted.)
- A CMS or any server-side code. The Worker has no script; it only serves
  assets.
- Writing new blog posts. The site launches with the four existing posts.
- Redesigning mkotas.cz beyond adding the blog links.

## Anti-goals (would count as failure even if it "works")

- Breaking old links: any of the old post URLs returning 404.
- The blog looking like a different brand from mkotas.cz.
- Posting needing more than: write Markdown, `git push`.
- Client-side JavaScript being required to read a post.
- A long outage of blog.mkotas.cz during the cut-over.

## Constraints and facts

- Repo: `github.com/Marfusios/blog.marfusios.github.io`. Today GitHub Pages
  serves it from `gh-pages` (legacy build, custom domain `blog.mkotas.cz`,
  `CNAME` file). Old `master` is a 2016 ancestor of `gh-pages`, so `master` is
  fast-forwarded to `gh-pages` and the new site is committed on top (no force
  push). `master` becomes the default branch.
- DNS for mkotas.cz is on Cloudflare. `blog.mkotas.cz` currently points at
  GitHub Pages (DNS-only record).
- No Wrangler credentials on this machine; mkotas.cz deploys through the
  Cloudflare Workers Builds Git integration (check run "Workers Builds:
  marfusios"). Connecting a new repo to Workers Builds and attaching a custom
  domain are dashboard actions.
- Workers Static Assets supports `_redirects` (2,000 static + 100 dynamic,
  codes 301/302/303/307/308, redirects win over assets) and `_headers` (100
  rules) placed in the assets directory.
- Node 20 locally. Build must also run in the Workers Builds Linux image.

## Information architecture and URLs

| Page | URL |
|---|---|
| Home (masthead, topic chips, every post grouped by year) | `/` |
| Post | `/<slug>/` |
| Topic index (list of topics with counts) | `/topics/` |
| Topic page (posts with that topic, grouped by year) | `/topics/<topic-slug>/` |
| RSS 2.0 feed (full content, all posts) | `/feed.xml` (same path as today) |
| Sitemap | `/sitemap.xml` |
| robots | `/robots.txt` |
| 404 | `/404.html` (served by `not_found_handling: "404-page"`) |

Home is the archive; there is no separate archive page until post count makes
one useful. "About" is mkotas.cz itself.

Header nav (right): **Posts** (`/`), **Topics** (`/topics/`), **mkotas.cz ↗**,
RSS icon.

### Existing posts and redirects

| Old URL (also with trailing `/`, as the old sitemap listed it) | New URL | Topics |
|---|---|---|
| `/other/2020/02/13/hourly-billing-nuts.html` | `/hourly-billing-nuts/` | Freelance |
| `/architecture/2016/06/10/coding-suggestions.html` | `/coding-suggestions/` | Architecture |
| `/dotnet/2016/06/04/style-guidelines.html` | `/style-guidelines/` | .NET |
| `/other/2016/03/01/welcome-to-my-blog.html` | `/welcome-to-my-blog/` | Meta |
| `/categories/dotnet/` | `/topics/dotnet/` | |
| `/categories/architecture/` | `/topics/architecture/` | |
| `/categories/other/` | `/topics/` | |
| `/about/` | `https://mkotas.cz/` | |

All 301. Post bodies are kept verbatim. The three images in "Hourly billing is
nuts" are hot-linked from miro.medium.com today; they are downloaded, resized
(max 1600px wide), and served from the blog. Each old post gets a one-line
`description` taken from its own opening text (used as meta description and
dek). The category typo "Achitecture" disappears with the old data file.

## Authoring model

```
posts/
  2026-10-22-some-slug.md
```

Front matter:

```yaml
title: Building Aviation Casebook        # required
description: One or two sentences.       # required; meta description + dek
date: 2026-10-22                         # required (file name date is not used)
updated: 2026-11-02                      # optional; shown and used in dateModified
topics: [AI apps, RAG]                   # required, 1-3; slug derived from the name
slug: building-aviation-casebook         # optional; default = file name without date
image: images/aviation/cover.png         # optional social card override
draft: true                              # optional; excluded from the build output
```

- Markdown: CommonMark + GFM (tables, task lists, strikethrough, autolinks),
  fenced code with a language, footnotes, heading anchors.
- Post images live next to posts under `posts/images/` (or a per-post folder)
  and are copied to the output.
- `npm run new -- "Post title"` scaffolds a dated draft file with front matter.
- `npm run dev` builds and serves locally with live rebuild on file change.
- Drafts are visible in `npm run dev`, never in the production build.

## Design (direction B, "Editorial")

Reference mockup: the "B — Editorial" frame in
`2026-10-22-blog-redesign/design-directions.html` (screenshot alongside).
Where the mockup and this document differ (nav labels, phone hamburger,
footer contents), this document wins.

**Colour for small text**: gold-700 (#B8860D) is only 3.0:1 on paper, below
WCAG AA for small text. The blog adds one token, `--gold-800: #8A6508`
(5.0:1 on paper, 4.6:1 on paper-2), used only for gold text under 18px
(eyebrows, chip labels, dates in gold). gold-700 stays for large text, rules
and decoration. ink-300 is never used for text.

**Home**
- Slim header: MK logo + "Mariusz Kotas" + italic Fraunces "· notes";
  nav on the right.
- Masthead: two columns on desktop. Left: "Build *notes*." in Fraunces ~92px
  (italic gold-700 "notes"). Right: one short intro paragraph about building
  AI apps in public, plus "Subscribe via RSS" and "N posts · since 2016"
  in mono. A 3px ink rule closes the masthead.
- Topic chips row (gold chip for the most important topic, "AI apps", once it
  exists; neutral chips otherwise), each linking to its topic page.
- Year groups: outlined Fraunces year numeral + hairline. Rows: mono date
  (`22 Oct`) | Fraunces title (larger for the newest post) + one-line
  description | topic chip + reading time. Whole row is the link.
- Footer band: navy-800 with the maze pattern at low opacity, name +
  "Product builder · Prague · m@mkotas.cz", links mkotas.cz, GitHub,
  LinkedIn, Medium, RSS, and © year.

**Post**
- Eyebrow in mono gold-700: topics · reading time.
- H1 Fraunces; dek = `description` in italic Fraunces; byline rule
  (ink top border) with date, "updated" date if set, author.
- Body column ~68ch, Inter 17-18px / 1.7. Drop cap on the first paragraph.
  H2/H3 in Fraunces with hover anchor links. Blockquotes with a gold left rule
  in Fraunces. Inline code on paper-2. Code blocks on navy-900 with a
  gold/blue/green token palette and a language label; horizontally scrollable,
  never wrapped. Figures with captions (from image title text), lazy-loaded,
  with width/height set. Tables with hairlines.
- End of post: author card (portrait, one line, link to mkotas.cz), topic
  chips, previous/next post, RSS link.

**Topics / topic page**: same row component as home.

**404**: masthead-style "Page *not found*." with links to home and topics.

**Dark mode**: automatic via `prefers-color-scheme`. Background navy-900,
surfaces navy-800, text paper / navy-100, accents gold-500, hairlines
navy-700. No toggle.

**Responsive**: single column below ~760px; masthead stacks; rows become
date-over-title; nav collapses to Posts / Topics / RSS (no hamburger needed).
16px minimum side gutter, no horizontal page scroll (code blocks scroll
inside themselves).

**Motion**: none beyond link colour transitions; respect
`prefers-reduced-motion`.

## SEO and sharing

- Per page: unique `<title>` and meta description, canonical URL (absolute,
  trailing slash), `lang="en"`, `meta robots` index/follow with
  `max-image-preview:large`, `theme-color` for both schemes.
- Open Graph + Twitter: `og:type` website/article,
  `article:published_time` / `modified_time` / `tag` / `author`,
  `twitter:card=summary_large_image`.
- **Social card images**: a 1200×630 PNG per post, generated at build time
  from an SVG template in the brand style (navy, maze pattern, Fraunces title,
  mono "blog.mkotas.cz", MK monogram), plus one for the home page. Uses
  `@resvg/resvg-js` with the brand font files committed to the repo. A post's
  `image` front matter overrides it.
- JSON-LD: `Blog` on home; `BlogPosting` on posts (headline, description,
  datePublished, dateModified, image, keywords, wordCount, mainEntityOfPage);
  `BreadcrumbList` on posts and topic pages. Author is the Person
  `https://mkotas.cz/#person` (the same `@id` mkotas.cz already publishes),
  so both sites describe one entity.
- `sitemap.xml` with `lastmod` per post; `robots.txt` pointing to it;
  `<link rel="alternate" type="application/rss+xml">` on every page.
- RSS 2.0 at `/feed.xml` with full HTML content, absolute URLs, categories.
- `rel="me"` links to GitHub, LinkedIn, Medium and mkotas.cz.

## Performance, accessibility, security

- Fonts self-hosted as WOFF2 (Latin + Latin-Ext subsets: Czech and Polish
  names), `font-display: swap`, the two most-used faces preloaded. Avoids the
  third-party Google Fonts request.
- One CSS file with a content hash in its name, cached immutable for a year.
  HTML `Cache-Control: public, max-age=0, must-revalidate`. Images and fonts
  cached for a year.
- No JavaScript on content pages except, optionally, a tiny copy-code button
  script loaded with `defer` (pages work fully without it).
- Semantic landmarks, skip link, visible focus styles, WCAG AA contrast in
  both themes, alt text required for post images (build warns if missing).
- `_headers`: `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `Permissions-Policy` minimal,
  `X-Frame-Options: DENY`, a strict `Content-Security-Policy` (self only).

## Repository layout

```
posts/                 Markdown posts (+ posts/images/)
src/templates/         Page templates (JS template literals)
src/styles/            tokens.css (copied from mkotas.cz + dark theme), blog.css
src/static/            favicon, logo, portrait, maze pattern, fonts,
                       robots.txt, _headers, _redirects (copied as-is)
src/og/                Social card SVG template + font files for resvg
scripts/build.mjs      Build: posts -> dist/
scripts/new-post.mjs   Scaffold a draft
dist/                  Build output (gitignored), Wrangler assets directory
wrangler.jsonc         name "marfusios-blog", assets.directory "./dist",
                       not_found_handling "404-page",
                       html_handling "auto-trailing-slash"
package.json           build, dev, new, check; deps: marked + extensions,
                       highlight.js, gray-matter, @resvg/resvg-js; dev: wrangler
README.md              How to write, preview and publish a post
```

Everything Jekyll is deleted: `_config.yml`, `_includes/`, `_layouts/`,
`_sass/`, `_data/`, `categories/`, `css/`, `assets/vendor/` (Font Awesome,
highlight.js themes, normalize, w3.css), `README.html`, `test.json`,
`.DS_Store`, `.idea/`, and the GitHub Pages `CNAME`.

## Checks before publishing

- `npm run check` (run by the build): every internal link and asset in
  `dist/` resolves; every redirect target exists; sitemap and feed parse as
  XML; every page has title, description, canonical, OG image; no draft in
  output.
- Visual check with Playwright at 1440px and 390px, light and dark, for home,
  a post with code and images, topics, 404.

## Cut-over to Cloudflare (order matters)

Decided: Claude performs the dashboard steps in Mariusz's logged-in Chrome
(Claude in Chrome) and the GitHub settings with `gh`. The DNS record deletion
happens only after the `*.workers.dev` deploy has been verified, and is
followed immediately by attaching the custom domain.

1. Push the new site to `master` (GitHub Pages keeps serving `gh-pages`
   meanwhile, so nothing changes for readers).
2. In the Cloudflare dashboard: Workers & Pages → Create → Import a
   repository → `Marfusios/blog.marfusios.github.io`, production branch
   `master`, build command `npm run build`, deploy command
   `npx wrangler deploy`. First deploy lands on the `*.workers.dev` URL;
   verify there.
3. Delete the existing `blog` DNS record (GitHub Pages) in the mkotas.cz zone,
   then add `blog.mkotas.cz` as a Custom Domain on the Worker. Expected gap:
   about a minute.
4. Verify on blog.mkotas.cz: served by Cloudflare, HTTPS, every page, all old
   URLs 301 to the right new URL, feed, sitemap, headers.
5. Disable GitHub Pages on the repo and set the default branch to `master`.
   The `gh-pages` branch is left in place (its history is fully contained in
   `master`) and can be deleted later.
6. Submit the new sitemap in Google Search Console if the property exists
   (optional, Mariusz).

## mkotas.cz changes (repo `marfusios.github.io`, branch `master`)

- Header nav: add **Blog** as the right-most item (after Contact), linking to
  `https://blog.mkotas.cz/`, and keep it visible on mobile where the section
  links are hidden.
- Hero socials and the contact socials row: add a Blog icon button directly
  after Medium (Feather-style pen icon, same stroke style, `title`/`aria-label`
  "Blog").
- Footer: add "Blog ↗" next to "Medium ↗".
- `<link rel="me" href="https://blog.mkotas.cz/">` and the blog URL in the
  Person's `sameAs`.
- Blog links open in the same tab (it is Mariusz's own site); existing
  external links unchanged.
- Push to `master`; Workers Builds deploys it. Verify on mkotas.cz.

## Calls made by the builder (Claude), open to change

- Post URLs `/<slug>/` (short, no dates) rather than `/posts/<slug>/`.
- Worker name `marfusios-blog`; repo is not renamed.
- Self-hosted fonts on the blog (mkotas.cz keeps Google Fonts).
- Build-time social card generation (adds `@resvg/resvg-js`).
- Copy for the masthead intro, page titles and old-post descriptions is
  written by Claude and easy to edit in one place.
- Old post content kept verbatim, including the 2016 "Welcome" post.
- `--gold-800` added for AA-compliant small gold text (see Design).
