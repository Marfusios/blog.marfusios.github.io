import { site } from '../config.mjs';
import { escapeHtml as e } from '../escape.mjs';
import { formatDate } from '../dates.mjs';
import { blogJsonLd, postJsonLd, breadcrumbJsonLd } from '../seo.mjs';
import { layout } from './layout.mjs';
import { topicChips, yearGroups, plural } from './partials.mjs';

const HOME_OG = `${site.url}/og/home.png`;
const SUFFIX = ' · Mariusz Kotas';

export function ogImageFor(post) {
  if (!post.image) return `${site.url}/og/${post.slug}.png`;
  return /^https?:\/\//.test(post.image) ? post.image : site.url + post.image;
}

const dateTag = (d) => `<time datetime="${formatDate(d, 'iso')}">${formatDate(d, 'long')}</time>`;

export function homePage(posts, topics, { cssHref }) {
  const body = `<section class="masthead">
  <h1 class="masthead-title">Build <em>notes</em>.</h1>
  <div class="masthead-intro">
    <p>${e(site.intro)}</p>
    <p class="masthead-meta"><a href="/feed.xml">Subscribe via RSS</a><span>${plural(posts.length, 'post')} · since ${site.since}</span></p>
  </div>
</section>
<nav class="topics-bar" aria-label="Topics"><span class="topics-label">Topics</span>${topicChips(topics)}</nav>
<div class="archive">
${yearGroups(posts, { leadFirst: true })}
</div>`;
  return layout({
    title: `${site.title}${SUFFIX} — writing on building AI apps`,
    description: site.description,
    path: '/',
    ogImage: HOME_OG,
    ogType: 'website',
    jsonLd: [blogJsonLd(posts)],
    body,
    cssHref,
  });
}

function postNav({ prev, next }) {
  if (!prev && !next) return '';
  const link = (p, rel, label) =>
    p ? `<a class="post-nav-${rel}" href="${p.url}" rel="${rel}"><span class="post-nav-label">${label}</span><span class="post-nav-title">${e(p.title)}</span></a>` : '<span></span>';
  return `<nav class="post-nav" aria-label="More posts">${link(prev, 'prev', '← Older')}${link(next, 'next', 'Newer →')}</nav>`;
}

export function postPage(post, nav, { cssHref }) {
  const ogImage = ogImageFor(post);
  const eyebrow = [...post.topics.map((t) => t.name), `${post.readingMinutes} min read`].join(' · ');
  const updated = post.updated ? `<span class="post-updated">Updated ${dateTag(post.updated)}</span>` : '';
  const body = `<article class="post">
  <header class="post-header">
    <p class="post-eyebrow">${e(eyebrow)}</p>
    <h1 class="post-title">${e(post.title)}</h1>
    <p class="post-dek">${e(post.description)}</p>
    <p class="post-byline">${dateTag(post.date)}${updated}<span class="post-author">${e(site.author.name)}</span></p>
  </header>
  <div class="post-body">
${post.html}
  </div>
  <footer class="post-end">
    <div class="post-topics">${topicChips(post.topics)}</div>
    <aside class="author-card" aria-label="About the author">
      <img src="/images/head.png" alt="" width="64" height="64" loading="lazy" decoding="async">
      <p><strong>${e(site.author.name)}</strong> — product builder in Prague. More about me on <a href="${site.links.home}">mkotas.cz</a>.</p>
    </aside>
    ${postNav(nav)}
    <p class="post-subscribe"><a href="/feed.xml">Subscribe via RSS</a> to get new posts.</p>
  </footer>
</article>`;
  return layout({
    title: post.title + SUFFIX,
    description: post.description,
    path: post.url,
    ogImage,
    ogType: 'article',
    article: { published: post.date, modified: post.updated, tags: post.topics.map((t) => t.name) },
    jsonLd: [postJsonLd(post, ogImage), breadcrumbJsonLd([{ name: site.title, path: '/' }, { name: post.title, path: post.url }])],
    body,
    cssHref,
  });
}

export function topicsPage(topics, { cssHref }) {
  const rows = topics
    .map(
      (t) =>
        `<a class="topic-row" href="${t.url}"><span class="topic-name">${e(t.name)}</span><span class="topic-count">${plural(t.posts.length, 'post')}</span></a>`,
    )
    .join('\n');
  const body = `<section class="masthead masthead-small">
  <h1 class="masthead-title">All <em>topics</em>.</h1>
  <div class="masthead-intro"><p>Every post is filed under one to three topics.</p></div>
</section>
<div class="topic-list">
${rows}
</div>`;
  return layout({
    title: `Topics${SUFFIX}`,
    description: `All topics on ${site.title} by ${site.author.name}: ${topics.map((t) => t.name).join(', ')}.`,
    path: '/topics/',
    ogImage: HOME_OG,
    ogType: 'website',
    jsonLd: [breadcrumbJsonLd([{ name: site.title, path: '/' }, { name: 'Topics', path: '/topics/' }])],
    body,
    cssHref,
  });
}

export function topicPage(topic, { cssHref }) {
  const body = `<section class="masthead masthead-small">
  <h1 class="masthead-title">${e(topic.name)}<em>.</em></h1>
  <div class="masthead-intro">
    <p class="masthead-meta"><a href="/topics/">All topics</a><span>${plural(topic.posts.length, 'post')}</span></p>
  </div>
</section>
<div class="archive">
${yearGroups(topic.posts)}
</div>`;
  return layout({
    title: `${topic.name}${SUFFIX}`,
    description: `Posts about ${topic.name} on ${site.title} by ${site.author.name}.`,
    path: topic.url,
    ogImage: HOME_OG,
    ogType: 'website',
    jsonLd: [
      breadcrumbJsonLd([
        { name: site.title, path: '/' },
        { name: 'Topics', path: '/topics/' },
        { name: topic.name, path: topic.url },
      ]),
    ],
    body,
    cssHref,
  });
}

export function notFoundPage({ cssHref }) {
  const body = `<section class="masthead masthead-small">
  <h1 class="masthead-title">Page <em>not found</em>.</h1>
  <div class="masthead-intro">
    <p>This page doesn’t exist, or it moved. Try the <a href="/">latest posts</a> or browse by <a href="/topics/">topic</a>.</p>
  </div>
</section>`;
  return layout({
    title: `Page not found${SUFFIX}`,
    description: 'This page does not exist.',
    path: '/404.html',
    ogImage: HOME_OG,
    ogType: 'website',
    body,
    cssHref,
    noindex: true,
  });
}
