import { mkdir, readFile, rm, writeFile, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPosts, collectTopics } from './posts.mjs';
import { renderMarkdown } from './markdown.mjs';
import { homePage, postPage, topicsPage, topicPage, notFoundPage } from './templates/pages.mjs';
import { renderFeed } from './feed.mjs';
import { renderSitemap } from './sitemap.mjs';
import { renderOgPng } from './og.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const STYLES = ['tokens.css', 'fonts.css', 'blog.css'];

async function write(outDir, path, content) {
  const full = join(outDir, path);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, content);
}

async function bundleCss(outDir) {
  const css = (await Promise.all(STYLES.map((f) => readFile(join(ROOT, 'src/styles', f), 'utf8')))).join('\n');
  const hash = createHash('sha256').update(css).digest('hex').slice(0, 8);
  const href = `/assets/site.${hash}.css`;
  await write(outDir, href, css);
  return href;
}

export async function build({ outDir, postsDir = 'posts', includeDrafts = false }) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(join(ROOT, 'src/static'), outDir, { recursive: true });

  const ctx = { cssHref: await bundleCss(outDir) };
  const all = await loadPosts(postsDir, { includeDrafts: true });
  const draftSlugs = all.filter((p) => p.draft).map((p) => p.slug);
  const mediaDir = join(postsDir, 'media');
  if (existsSync(mediaDir)) {
    // media/<draft-slug>/ stays private until the post is published
    const hidden = new Set(includeDrafts ? [] : draftSlugs);
    const root = resolve(mediaDir);
    // cp may hand over Windows long paths (\\?\C:\...); compare the first folder under media/
    const filter = (src) => !hidden.has(relative(root, src.replace(/^\\\\\?\\/, '')).split(sep)[0]);
    await cp(mediaDir, join(outDir, 'media'), { recursive: true, filter });
  }
  const warnings = [];
  const posts = all
    .filter((p) => includeDrafts || !p.draft)
    .map((p) => {
      const { html, warnings: w } = renderMarkdown(p.markdown, { mediaRoot: postsDir });
      warnings.push(...w.map((msg) => `${p.fileName}: ${msg}`));
      return { ...p, html };
    });
  const topics = collectTopics(posts);
  const pages = [];
  const page = async (path, html) => {
    await write(outDir, path, html);
    pages.push(path);
  };

  await page('index.html', homePage(posts, topics, ctx));
  for (const [i, post] of posts.entries()) {
    // posts are newest first: the older post is next in the array, the newer one before it
    await page(`${post.slug}/index.html`, postPage(post, { prev: posts[i + 1] ?? null, next: posts[i - 1] ?? null }, ctx));
  }
  await page('topics/index.html', topicsPage(topics, ctx));
  for (const topic of topics) await page(`topics/${topic.slug}/index.html`, topicPage(topic, ctx));
  await page('404.html', notFoundPage(ctx));

  await write(outDir, 'og/home.png', renderOgPng({ title: 'Build notes', eyebrow: 'Mariusz Kotas · blog' }));
  for (const post of posts.filter((p) => !p.image)) {
    const eyebrow = [...post.topics.map((t) => t.name), `${post.readingMinutes} min`].join(' · ');
    await write(outDir, `og/${post.slug}.png`, renderOgPng({ title: post.title, eyebrow }));
  }

  await write(outDir, 'feed.xml', renderFeed(posts));
  await write(
    outDir,
    'sitemap.xml',
    renderSitemap([
      { path: '/', lastmod: posts[0] ? posts[0].updated ?? posts[0].date : undefined },
      ...posts.map((p) => ({ path: p.url, lastmod: p.updated ?? p.date })),
      { path: '/topics/' },
      ...topics.map((t) => ({ path: t.url })),
    ]),
  );

  return { pages, warnings, draftSlugs };
}
