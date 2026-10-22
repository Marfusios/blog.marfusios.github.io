import { site } from '../config.mjs';
import { escapeHtml as e } from '../escape.mjs';
import { formatDate } from '../dates.mjs';
import { jsonLdScript } from '../seo.mjs';
import { header, footer } from './partials.mjs';

const FONT_PRELOADS = ['/fonts/fraunces-latin.woff2', '/fonts/inter-latin.woff2'];

function articleMeta(article) {
  if (!article) return '';
  const lines = [
    `<meta property="article:published_time" content="${formatDate(article.published, 'iso')}">`,
    article.modified ? `<meta property="article:modified_time" content="${formatDate(article.modified, 'iso')}">` : '',
    `<meta property="article:author" content="${site.author.url}">`,
    ...article.tags.map((t) => `<meta property="article:tag" content="${e(t)}">`),
  ];
  return lines.filter(Boolean).join('\n');
}

export function layout({ title, description, path, ogImage, ogType, article, jsonLd = [], body, cssHref, noindex = false }) {
  const canonical = site.url + path;
  return `<!DOCTYPE html>
<html lang="${site.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${e(description)}">
<meta name="author" content="${e(site.author.name)}">
<meta name="robots" content="${noindex ? 'noindex' : 'index, follow, max-image-preview:large'}">
<link rel="canonical" href="${canonical}">
<meta property="og:site_name" content="${e(site.name)}">
<meta property="og:locale" content="${site.locale}">
<meta property="og:type" content="${ogType}">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:image" content="${e(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${e(title)}">
${articleMeta(article)}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(title)}">
<meta name="twitter:description" content="${e(description)}">
<meta name="twitter:image" content="${e(ogImage)}">
<meta name="twitter:image:alt" content="${e(title)}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#FAF7F1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0B1A2E" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/images/logo.png" type="image/png">
<link rel="apple-touch-icon" href="/images/logo.png">
<link rel="me" href="${site.links.home}">
<link rel="me" href="${site.links.github}">
<link rel="me" href="${site.links.linkedin}">
<link rel="me" href="${site.links.medium}">
<link rel="alternate" type="application/rss+xml" title="${e(site.name)}" href="/feed.xml">
${FONT_PRELOADS.map((f) => `<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>`).join('\n')}
<link rel="stylesheet" href="${cssHref}">
${jsonLd.map(jsonLdScript).join('\n')}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${header(path)}
<main id="main">
${body}
</main>
${footer()}
</body>
</html>
`;
}
