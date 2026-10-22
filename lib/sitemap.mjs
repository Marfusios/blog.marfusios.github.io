import { site } from './config.mjs';
import { escapeXml as x } from './escape.mjs';
import { formatDate } from './dates.mjs';

export function renderSitemap(entries) {
  const urls = entries
    .map(({ path, lastmod }) => {
      const mod = lastmod ? `<lastmod>${formatDate(lastmod, 'iso')}</lastmod>` : '';
      return `<url><loc>${x(site.url + path)}</loc>${mod}</url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
