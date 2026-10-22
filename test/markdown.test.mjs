import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../lib/markdown.mjs';

const r = (md) => renderMarkdown(md, { mediaRoot: 'test/fixtures' });

test('code fence: language label, hljs spans, no wrapping <p>', () => {
  const { html } = r('```python\ndef f(): pass\n```');
  assert.match(html, /<figure class="code"><figcaption>python<\/figcaption><pre><code class="hljs language-python">/);
  assert.match(html, /<span class="hljs-keyword">def<\/span>/);
  assert.doesNotMatch(html, /<p><figure/);
});

test('code fence without language has no label and is escaped', () => {
  const { html } = r('```\n<b>&\n```');
  assert.doesNotMatch(html, /figcaption/);
  assert.match(html, /&lt;b&gt;&amp;/);
});

test('h2/h3 get ids and anchor links, h1/h4 do not get anchors', () => {
  const { html } = r('## Chunking by section\n\n### Sub part\n\n#### Deep');
  assert.match(html, /<h2 id="chunking-by-section">Chunking by section <a class="anchor" href="#chunking-by-section" aria-label="Link to this section">#<\/a><\/h2>/);
  assert.match(html, /<h3 id="sub-part">Sub part <a class="anchor" href="#sub-part"/);
  assert.match(html, /<h4 id="deep">Deep<\/h4>/);
});

test('standalone image becomes figure with size, lazy, caption, rewritten path', () => {
  const { html, warnings } = r('![A pic](media/sample/pic.png "Caption here")');
  assert.match(html, /<figure><img src="\/media\/sample\/pic.png" alt="A pic" width="40" height="20" loading="lazy" decoding="async"><figcaption>Caption here<\/figcaption><\/figure>/);
  assert.doesNotMatch(html, /<p><figure/);
  assert.deepEqual(warnings, []);
});

test('image without alt warns', () => {
  assert.equal(r('![](media/sample/pic.png)').warnings.length, 1);
});

test('missing local image warns and renders without size', () => {
  const { html, warnings } = r('![x](media/sample/missing.png)');
  assert.equal(warnings.length, 1);
  assert.match(html, /<img src="\/media\/sample\/missing.png" alt="x" loading="lazy"/);
});

test('external image keeps URL, no size', () => {
  const { html } = r('![Ext](https://example.com/x.png)');
  assert.match(html, /<img src="https:\/\/example.com\/x.png" alt="Ext" loading="lazy" decoding="async">/);
  assert.doesNotMatch(html, /width=/);
});

test('inline image inside text stays inline', () => {
  const { html } = r('Text ![i](media/sample/pic.png) more');
  assert.match(html, /<p>Text <img src="\/media\/sample\/pic.png" alt="i" width="40" height="20" loading="lazy" decoding="async"> more<\/p>/);
});

test('GFM table is wrapped for horizontal scroll', () => {
  assert.match(r('|a|b|\n|-|-|\n|1|2|').html, /<div class="table-wrap"><table>/);
});

test('footnotes render', () => {
  const { html } = r('x[^1]\n\n[^1]: note');
  assert.match(html, /footnotes/);
  assert.match(html, /note/);
});

test('instances do not leak heading ids between renders', () => {
  r('## Same');
  assert.match(r('## Same').html, /id="same"/);
});
