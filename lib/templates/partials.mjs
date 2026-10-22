import { site } from '../config.mjs';
import { escapeHtml as e } from '../escape.mjs';
import { formatDate } from '../dates.mjs';

const RSS_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>';

const current = (on) => (on ? ' aria-current="page"' : '');

export function header(path) {
  const inTopics = path.startsWith('/topics/');
  return `<header class="site-header">
  <a class="brand" href="/" aria-label="Mariusz Kotas · Build notes, home"><img src="/images/logo-64.png" alt="" width="28" height="28"><span class="brand-name">Mariusz Kotas</span><span class="brand-sub">· notes</span></a>
  <nav class="site-nav" aria-label="Primary">
    <a href="/"${current(path === '/')}>Posts</a>
    <a href="/topics/"${current(inTopics)}>Topics</a>
    <a class="nav-ext" href="${site.links.home}">mkotas.cz <span aria-hidden="true">↗</span></a>
    <a class="nav-rss" href="/feed.xml" aria-label="RSS feed">${RSS_ICON}</a>
  </nav>
</header>`;
}

export function footer() {
  const year = new Date().getUTCFullYear();
  return `<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-id">
      <p class="footer-name">${e(site.author.name)}</p>
      <p class="footer-meta">Product builder · Prague · <a href="mailto:${site.author.email}">${site.author.email}</a></p>
    </div>
    <nav class="footer-links" aria-label="Elsewhere">
      <a href="${site.links.home}">mkotas.cz ↗</a>
      <a href="${site.links.github}">GitHub ↗</a>
      <a href="${site.links.linkedin}">LinkedIn ↗</a>
      <a href="${site.links.medium}">Medium ↗</a>
      <a href="/feed.xml">RSS</a>
    </nav>
    <p class="footer-copy">© ${year} ${e(site.author.name)}</p>
  </div>
</footer>`;
}

const chipClass = (topic) => (topic.slug === 'ai-apps' ? 'chip gold' : 'chip');

/** Topic chips as links (outside of other links). */
export function topicChips(topics) {
  return topics.map((t) => `<a class="${chipClass(t)}" href="/topics/${t.slug}/">${e(t.name)}</a>`).join('');
}

export function postRow(post, { lead = false } = {}) {
  const topic = post.topics[0];
  return `<a class="row${lead ? ' lead' : ''}" href="${post.url}">
  <time class="row-date" datetime="${formatDate(post.date, 'iso')}">${formatDate(post.date, 'short')}</time>
  <div class="row-main">
    <h3 class="row-title">${e(post.title)}</h3>
    <p class="row-desc">${e(post.description)}</p>
  </div>
  <div class="row-meta">${topic ? `<span class="${chipClass(topic)}">${e(topic.name)}</span>` : ''}<span class="row-time">${post.readingMinutes} min</span></div>
</a>`;
}

/** Posts (newest first) grouped under year headings; the very first row may be the lead. */
export function yearGroups(posts, { leadFirst = false } = {}) {
  const groups = new Map();
  for (const p of posts) {
    const y = p.date.getUTCFullYear();
    if (!groups.has(y)) groups.set(y, []);
    groups.get(y).push(p);
  }
  let first = true;
  return [...groups]
    .map(([year, list]) => {
      const rows = list
        .map((p) => {
          const html = postRow(p, { lead: leadFirst && first });
          first = false;
          return html;
        })
        .join('\n');
      return `<section class="year-group" aria-labelledby="y${year}">
<h2 class="year" id="y${year}"><span>${year}</span></h2>
${rows}
</section>`;
    })
    .join('\n');
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
