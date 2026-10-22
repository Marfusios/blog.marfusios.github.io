import { site } from './config.mjs';
import { formatDate } from './dates.mjs';

const person = () => ({
  '@type': 'Person',
  '@id': site.author.id,
  name: site.author.name,
  url: site.author.url,
});

const abs = (path) => site.url + path;
const iso = (d) => formatDate(d, 'iso');

/** JSON-LD inside <script>: escape "<" so the content can never close the tag. */
export function jsonLdScript(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

export function blogJsonLd(posts) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${site.url}/#blog`,
    url: `${site.url}/`,
    name: site.name,
    description: site.description,
    inLanguage: site.lang,
    author: person(),
    publisher: person(),
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: abs(p.url),
      datePublished: iso(p.date),
    })),
  };
}

export function postJsonLd(post, ogImageUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: iso(post.date),
    dateModified: iso(post.updated ?? post.date),
    image: ogImageUrl,
    keywords: post.topics.map((t) => t.name).join(', '),
    wordCount: post.wordCount,
    inLanguage: site.lang,
    mainEntityOfPage: abs(post.url),
    url: abs(post.url),
    author: person(),
    publisher: person(),
    isPartOf: { '@id': `${site.url}/#blog` },
  };
}

export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: abs(item.path),
    })),
  };
}
