import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XMLValidator } from 'fast-xml-parser';
import { loadPosts, parsePost } from '../lib/posts.mjs';
import { renderMarkdown } from '../lib/markdown.mjs';
import { renderFeed } from '../lib/feed.mjs';

const withHtml = (p) => ({ ...p, html: renderMarkdown(p.markdown, { mediaRoot: 'posts' }).html });
const posts = (await loadPosts('posts')).map(withHtml);

test('feed is valid RSS with absolute URLs and full content', () => {
  const xml = renderFeed(posts);
  assert.equal(XMLValidator.validate(xml), true);
  assert.match(xml, /<atom:link href="https:\/\/blog\.mkotas\.cz\/feed\.xml" rel="self" type="application\/rss\+xml"\/>/);
  assert.match(xml, /<guid isPermaLink="true">https:\/\/blog\.mkotas\.cz\/hourly-billing-nuts\/<\/guid>/);
  assert.match(xml, /<link>https:\/\/blog\.mkotas\.cz\/hourly-billing-nuts\/<\/link>/);
  assert.match(xml, /<pubDate>Thu, 13 Feb 2020 00:00:00 GMT<\/pubDate>/);
  assert.match(xml, /<lastBuildDate>Thu, 13 Feb 2020 00:00:00 GMT<\/lastBuildDate>/);
  assert.match(xml, /<category>Freelance<\/category>/);
  assert.match(xml, /src="https:\/\/blog\.mkotas\.cz\/media\/hourly-billing-nuts\/business-card\.webp"/);
  assert.match(xml, /href="https:\/\/blog\.mkotas\.cz\/hourly-billing-nuts\/#how-to-bill-your-freelance-work"/);
  assert.equal((xml.match(/<item>/g) || []).length, 4);
  assert.ok(xml.indexOf('Hourly billing is nuts') < xml.indexOf('Welcome to my blog!'));
});

test('feed escapes hostile titles and survives "]]>" in content', () => {
  const hostile = parsePost(
    ['---', `title: 'Příliš žluťoučký kůň & <AI>'`, 'description: D', 'date: 2026-10-22', 'topics: [AI apps]', '---', 'x'].join('\n'),
    'h.md',
  );
  const xml = renderFeed([{ ...hostile, html: '<p>a ]]> b</p>' }]);
  assert.equal(XMLValidator.validate(xml), true);
  assert.match(xml, /<title>Příliš žluťoučký kůň &amp; &lt;AI&gt;<\/title>/);
});
