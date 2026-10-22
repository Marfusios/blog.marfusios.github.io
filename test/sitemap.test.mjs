import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XMLValidator } from 'fast-xml-parser';
import { renderSitemap } from '../lib/sitemap.mjs';

test('sitemap lists absolute URLs with lastmod', () => {
  const xml = renderSitemap([{ path: '/' }, { path: '/x/', lastmod: new Date('2020-02-13T00:00:00Z') }]);
  assert.equal(XMLValidator.validate(xml), true);
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(xml, /<url><loc>https:\/\/blog\.mkotas\.cz\/<\/loc><\/url>/);
  assert.match(xml, /<loc>https:\/\/blog\.mkotas\.cz\/x\/<\/loc><lastmod>2020-02-13<\/lastmod>/);
});
