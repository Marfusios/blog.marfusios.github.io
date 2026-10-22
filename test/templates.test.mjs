import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPosts, parsePost, collectTopics } from '../lib/posts.mjs';
import { renderMarkdown } from '../lib/markdown.mjs';
import { homePage, postPage, topicsPage, topicPage, notFoundPage } from '../lib/templates/pages.mjs';

const ctx = { cssHref: '/assets/site.test.css' };
const withHtml = (p) => ({ ...p, html: renderMarkdown(p.markdown, { mediaRoot: 'posts' }).html });
const posts = (await loadPosts('posts')).map(withHtml);
const post = posts.find((p) => p.slug === 'hourly-billing-nuts');
const jsonLd = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
const hostile = withHtml(
  parsePost(
    [
      '---',
      `title: 'Příliš žluťoučký kůň & <AI> "agents"'`,
      `description: 'Desc & <b>bold</b>'`,
      'date: 2026-10-22',
      'topics: [AI apps]',
      '---',
      'Body',
    ].join('\n'),
    '2026-10-22-hostile.md',
  ),
);

test('post page head: title, description, canonical, OG, Twitter, feed link', () => {
  const html = postPage(post, { prev: null, next: null }, ctx);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>Hourly billing is nuts · Mariusz Kotas<\/title>/);
  assert.match(html, /<meta name="description" content="As a freelancer I don’t sell my time/);
  assert.match(html, /<link rel="canonical" href="https:\/\/blog\.mkotas\.cz\/hourly-billing-nuts\/">/);
  assert.match(html, /<meta property="og:type" content="article">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/blog\.mkotas\.cz\/hourly-billing-nuts\/">/);
  assert.match(html, /<meta property="article:published_time" content="2020-02-13">/);
  assert.match(html, /<meta property="article:tag" content="Freelance">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/blog\.mkotas\.cz\/og\/hourly-billing-nuts\.png">/);
  assert.match(html, /type="application\/rss\+xml" [^>]*href="\/feed\.xml"/);
  assert.match(html, /<link rel="stylesheet" href="\/assets\/site\.test\.css">/);
  assert.match(html, /<a class="skip-link" href="#main">/);
  assert.match(html, /<main id="main">/);
  assert.doesNotMatch(html, /<script(?! type="application\/ld\+json")/);
});

test('post page body: eyebrow, dek, byline and rendered content', () => {
  const html = postPage(post, { prev: null, next: null }, ctx);
  assert.match(html, /class="post-eyebrow">[^<]*Freelance[^<]*· 2 min read/);
  assert.match(html, /<h1 class="post-title">Hourly billing is nuts<\/h1>/);
  assert.match(html, /<p class="post-dek">As a freelancer/);
  assert.match(html, /<time datetime="2020-02-13">13 February 2020<\/time>/);
  assert.match(html, /<div class="post-body">[\s\S]*How to bill your freelance work/);
});

test('post JSON-LD parses and links the shared Person', () => {
  const blocks = jsonLd(postPage(post, { prev: null, next: null }, ctx));
  const bp = blocks.find((b) => b['@type'] === 'BlogPosting');
  assert.equal(bp.author['@id'], 'https://mkotas.cz/#person');
  assert.equal(bp.headline, 'Hourly billing is nuts');
  assert.equal(bp.datePublished, '2020-02-13');
  assert.equal(bp.dateModified, '2020-02-13');
  assert.equal(bp.mainEntityOfPage, 'https://blog.mkotas.cz/hourly-billing-nuts/');
  assert.equal(bp.image, 'https://blog.mkotas.cz/og/hourly-billing-nuts.png');
  assert.equal(bp.keywords, 'Freelance');
  assert.equal(bp.isPartOf['@id'], 'https://blog.mkotas.cz/#blog');
  const crumbs = blocks.find((b) => b['@type'] === 'BreadcrumbList');
  assert.deepEqual(
    crumbs.itemListElement.map((i) => [i.position, i.name, i.item]),
    [
      [1, 'Build notes', 'https://blog.mkotas.cz/'],
      [2, 'Hourly billing is nuts', 'https://blog.mkotas.cz/hourly-billing-nuts/'],
    ],
  );
});

test('post image front matter overrides the generated card', () => {
  const html = postPage({ ...post, image: '/media/x/cover.png' }, { prev: null, next: null }, ctx);
  assert.match(html, /<meta property="og:image" content="https:\/\/blog\.mkotas\.cz\/media\/x\/cover\.png">/);
});

test('hostile title is escaped in HTML and JSON-LD', () => {
  const html = postPage(hostile, { prev: null, next: null }, ctx);
  assert.match(html, /<h1 class="post-title">Příliš žluťoučký kůň &amp; &lt;AI&gt; &quot;agents&quot;<\/h1>/);
  assert.match(html, /<title>Příliš žluťoučký kůň &amp; &lt;AI&gt; &quot;agents&quot; · Mariusz Kotas<\/title>/);
  assert.doesNotMatch(html, /<AI>|<b>bold/);
  const bp = jsonLd(html).find((b) => b['@type'] === 'BlogPosting');
  assert.equal(bp.headline, 'Příliš žluťoučký kůň & <AI> "agents"');
});

test('home groups by year, newest first, lead row first', () => {
  const html = homePage(posts, collectTopics(posts), ctx);
  const main = html.slice(html.indexOf('<main'));
  assert.ok(html.indexOf('>2020<') > 0 && html.indexOf('>2020<') < html.indexOf('>2016<'));
  assert.equal((html.match(/class="row lead"/g) || []).length, 1);
  assert.ok(main.indexOf('class="row lead"') < main.indexOf('Coding suggestions'));
  assert.match(html, /4 posts · since 2016/);
  assert.match(html, /<h1 class="masthead-title">Build <em>notes<\/em>\.<\/h1>/);
  assert.match(html, /<title>Build notes · Mariusz Kotas — writing on building AI apps<\/title>/);
  assert.match(html, /href="\/topics\/dotnet\/"/);
  const blog = jsonLd(html).find((b) => b['@type'] === 'Blog');
  assert.equal(blog.blogPost.length, 4);
  assert.equal(blog.author['@id'], 'https://mkotas.cz/#person');
});

test('newest/oldest post: missing prev/next rendered as nothing', () => {
  const html = postPage(post, { prev: null, next: null }, ctx);
  assert.doesNotMatch(html, /undefined|>null</);
  assert.doesNotMatch(html, /class="post-nav"/);
  const withNav = postPage(post, { prev: posts[1], next: null }, ctx);
  assert.match(withNav, /class="post-nav"[\s\S]*Coding suggestions/);
});

test('updated date shown only when set', () => {
  assert.doesNotMatch(postPage(post, { prev: null, next: null }, ctx), /Updated/);
  const updated = { ...post, updated: new Date('2021-05-01T00:00:00Z') };
  const html = postPage(updated, { prev: null, next: null }, ctx);
  assert.match(html, /Updated <time datetime="2021-05-01">1 May 2021<\/time>/);
  assert.equal(jsonLd(html).find((b) => b['@type'] === 'BlogPosting').dateModified, '2021-05-01');
  assert.match(html, /<meta property="article:modified_time" content="2021-05-01">/);
});

test('404 page is noindex', () => {
  const html = notFoundPage(ctx);
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /Page <em>not found<\/em>\./);
});

test('topic page canonical and breadcrumb', () => {
  const topics = collectTopics(posts);
  const html = topicPage(topics.find((t) => t.slug === 'dotnet'), ctx);
  assert.match(html, /<link rel="canonical" href="https:\/\/blog\.mkotas\.cz\/topics\/dotnet\/">/);
  assert.match(html, /Style guidelines/);
  const crumbs = jsonLd(html).find((b) => b['@type'] === 'BreadcrumbList');
  assert.deepEqual(crumbs.itemListElement.map((i) => i.name), ['Build notes', 'Topics', '.NET']);
});

test('topics page lists every topic with counts', () => {
  const html = topicsPage(collectTopics(posts), ctx);
  for (const name of ['Freelance', 'Architecture', '\\.NET', 'Meta']) assert.match(html, new RegExp(name));
  assert.match(html, /<link rel="canonical" href="https:\/\/blog\.mkotas\.cz\/topics\/">/);
});
