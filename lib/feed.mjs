import { site } from './config.mjs';
import { escapeXml as x } from './escape.mjs';

const cdata = (s) => `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

/** Feed readers need absolute URLs: rewrite root-relative and fragment-only links. */
function absolutize(html, postUrl) {
  return html
    .replace(/(href|src)="\/(?!\/)/g, `$1="${site.url}/`)
    .replace(/href="#/g, `href="${postUrl}#`);
}

export function renderFeed(posts) {
  const latest = posts.reduce((max, p) => Math.max(max, (p.updated ?? p.date).getTime()), 0);
  const items = posts
    .map((p) => {
      const url = site.url + p.url;
      return `<item>
<title>${x(p.title)}</title>
<link>${url}</link>
<guid isPermaLink="true">${url}</guid>
<pubDate>${p.date.toUTCString()}</pubDate>
<dc:creator>${x(site.author.name)}</dc:creator>
<description>${x(p.description)}</description>
${p.topics.map((t) => `<category>${x(t.name)}</category>`).join('\n')}
<content:encoded>${cdata(absolutize(p.html, url))}</content:encoded>
</item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${x(site.name)}</title>
<link>${site.url}/</link>
<description>${x(site.description)}</description>
<language>${site.lang}</language>
<lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>
<atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/>
<image>
<url>${site.url}/images/logo.png</url>
<title>${x(site.name)}</title>
<link>${site.url}/</link>
</image>
${items}
</channel>
</rss>
`;
}
