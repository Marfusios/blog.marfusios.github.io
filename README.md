# blog.mkotas.cz — Build notes

Mariusz Kotas's blog about building independent AI apps (retrieval, agents, applied ML),
plus older notes on software architecture, .NET and freelancing.

Plain static HTML generated from Markdown by a small Node script, hosted on Cloudflare
Workers Static Assets. No framework, no client-side JavaScript. Same design system as
[mkotas.cz](https://mkotas.cz) (navy + gold on warm paper; Fraunces, Inter, JetBrains Mono),
with an automatic dark theme.

## Write a post

```bash
npm install                    # once
npm run new -- "Post title"    # creates posts/YYYY-MM-DD-post-title.md as a draft
npm run dev                    # http://localhost:4321, drafts included, rebuilds on save
```

Front matter:

| Field | Required | Notes |
|---|---|---|
| `title` | yes | |
| `description` | yes (not for drafts) | One or two sentences. Meta description, social card text and the dek under the title. |
| `date` | yes | `YYYY-MM-DD`. The date in the file name is not used. |
| `topics` | yes (not for drafts) | 1 to 3, e.g. `[AI apps, RAG]`. Topic pages are created automatically; "AI apps" gets the gold chip. |
| `updated` | no | Shown as "Updated …" and used as `dateModified`. |
| `slug` | no | Defaults to the file name without the date. The post lives at `/<slug>/`. |
| `image` | no | Root-relative path to a 1200×630 social card, e.g. `/media/my-post/card.png`. Without it a card is generated. |
| `draft` | no | `true` keeps the post out of the production build, feed and sitemap. |

Markdown is GitHub-flavoured: tables, task lists, footnotes, fenced code with a language
(highlighted at build time). `##` and `###` headings get anchor links.

Images go in `posts/media/<slug>/` and are referenced relatively, so editor previews work:

```markdown
![What the image shows](media/my-post/diagram.png "Optional caption")
```

An image on its own line becomes a figure with a caption; width and height are added
automatically. The build warns about images without alt text.

## Publish

Remove `draft: true`, commit, and push to `master`. Cloudflare Workers Builds runs
`npm run build` and `npx wrangler deploy`; the site is live a minute later.

`npm run build` fails if anything is broken: internal links, missing titles, descriptions,
canonical URLs or social images, redirects pointing at missing pages, invalid feed or
sitemap XML, or a draft that leaked into the output.

Cloudflare setup (Workers & Pages → `marfusios-blog` → Settings → Builds): Git repository
`Marfusios/blog.marfusios.github.io`, production branch `master`, build command
`npm run build`, deploy command `npx wrangler deploy`, root directory `/`. Node version comes
from `.node-version`. Custom domain: `blog.mkotas.cz` (Settings → Domains & Routes).

`npm run preview` serves `dist/` through Wrangler, which applies `_redirects` and
`_headers` like production (needs Node 22+).

## Layout

```
posts/                 Markdown posts; posts/media/ for their images
lib/                   Build: posts, markdown, templates, feed, sitemap, social cards, checks
src/styles/            tokens.css (from mkotas.cz + dark theme), fonts.css, blog.css
src/static/            Copied as-is: images, fonts, favicon, robots.txt, _headers, _redirects
src/og/fonts/          TTFs used to render social cards
scripts/               build, dev, new-post, fetch-fonts (one-off)
test/                  node --test suites and fixtures
docs/superpowers/      Design doc, mockups and implementation plan for this rebuild
dist/                  Build output (git-ignored), served by Cloudflare
```

`npm test` runs the test suite.

## Old URLs

The previous Jekyll blog used `/<category>/YYYY/MM/DD/<slug>.html`. Those addresses
301-redirect to the new ones via `src/static/_redirects`. Keep those lines.
