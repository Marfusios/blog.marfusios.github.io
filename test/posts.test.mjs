import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, parsePost, loadPosts, collectTopics } from '../lib/posts.mjs';

const fm = (fields, body = 'Hello world') => `---\n${fields}\n---\n${body}`;
const base = 'title: T\ndescription: D\ndate: 2026-10-22\ntopics: [AI apps]';

test('slugify', () => {
  assert.equal(slugify('.NET'), 'dotnet');
  assert.equal(slugify('AI apps'), 'ai-apps');
  assert.equal(slugify('Příliš žluťoučký kůň'), 'prilis-zlutoucky-kun');
  assert.equal(slugify('  RAG & agents! '), 'rag-agents');
});

test('parsePost derives slug from file name without date', () => {
  const p = parsePost(fm(base), '2026-10-22-my-post.md');
  assert.equal(p.slug, 'my-post');
  assert.equal(p.url, '/my-post/');
  assert.equal(p.title, 'T');
  assert.equal(p.description, 'D');
  assert.equal(p.date.toISOString(), '2026-10-22T00:00:00.000Z');
  assert.deepEqual(p.topics, [{ name: 'AI apps', slug: 'ai-apps' }]);
  assert.equal(p.updated, null);
  assert.equal(p.draft, false);
  assert.equal(p.image, null);
  assert.equal(p.readingMinutes, 1);
  assert.equal(p.markdown.trim(), 'Hello world');
  assert.equal(p.fileName, '2026-10-22-my-post.md');
});

test('front matter slug overrides file name', () => {
  const p = parsePost(fm(`${base}\nslug: custom`), '2026-10-22-my-post.md');
  assert.equal(p.slug, 'custom');
  assert.equal(p.url, '/custom/');
});

test('updated and image are read', () => {
  const p = parsePost(fm(`${base}\nupdated: 2026-11-02\nimage: /media/x/cover.png`), 'a.md');
  assert.equal(p.updated.toISOString(), '2026-11-02T00:00:00.000Z');
  assert.equal(p.image, '/media/x/cover.png');
});

test('missing required field names the file and field', () => {
  assert.throws(() => parsePost(fm('title: T\ndate: 2026-10-22\ntopics: [x]', ''), 'a.md'), /a\.md.*description/);
  assert.throws(() => parsePost(fm('description: D\ndate: 2026-10-22\ntopics: [x]', ''), 'b.md'), /b\.md.*title/);
  assert.throws(() => parsePost(fm('title: T\ndescription: D\ntopics: [x]', ''), 'c.md'), /c\.md.*date/);
  assert.throws(() => parsePost('no front matter', 'd.md'), /d\.md.*front matter/);
});

test('topics must be 1-3', () => {
  assert.throws(() => parsePost(fm('title: T\ndescription: D\ndate: 2026-10-22\ntopics: []'), 'a.md'), /a\.md.*topics/);
  assert.throws(() => parsePost(fm('title: T\ndescription: D\ndate: 2026-10-22\ntopics: [a, b, c, d]'), 'a.md'), /a\.md.*topics/);
  assert.equal(parsePost(fm('title: T\ndescription: D\ndate: 2026-10-22\ntopics: [a, b, c]'), 'a.md').topics.length, 3);
});

test('drafts may have empty description and topics', () => {
  const draft = 'title: T\ndescription: ""\ndate: 2026-10-22\ntopics: []';
  const p = parsePost(fm(`${draft}\ndraft: true`), 'a.md');
  assert.equal(p.draft, true);
  assert.deepEqual(p.topics, []);
  assert.throws(() => parsePost(fm(draft), 'a.md'), /description/);
});

test('reading time ignores fenced code, 230 wpm, min 1', () => {
  const prose = 'word '.repeat(460);
  const code = '```\n' + 'code '.repeat(500) + '\n```';
  const p = parsePost(fm(base, `${prose}\n\n${code}\n`), 'a.md');
  assert.equal(p.wordCount, 460);
  assert.equal(p.readingMinutes, 2);
});

test('loadPosts sorts newest first and drops drafts by default', async () => {
  const posts = await loadPosts('test/fixtures/posts');
  assert.ok(posts.length >= 3);
  assert.ok(posts.every((p) => !p.draft));
  for (let i = 1; i < posts.length; i++) assert.ok(posts[i - 1].date >= posts[i].date);
  const all = await loadPosts('test/fixtures/posts', { includeDrafts: true });
  assert.equal(all.length, posts.length + 1);
});

test('duplicate slugs throw', async () => {
  await assert.rejects(loadPosts('test/fixtures/dupes'), /Duplicate slug "same"/);
});

test('collectTopics counts and sorts', () => {
  const posts = [
    parsePost(fm('title: A\ndescription: D\ndate: 2026-01-01\ntopics: [RAG]'), 'a.md'),
    parsePost(fm('title: B\ndescription: D\ndate: 2026-01-02\ntopics: [AI apps, RAG]'), 'b.md'),
  ];
  const topics = collectTopics(posts);
  assert.deepEqual(topics.map((t) => [t.name, t.posts.length]), [['RAG', 2], ['AI apps', 1]]);
  assert.equal(topics[0].url, '/topics/rag/');
  assert.equal(topics[0].slug, 'rag');
});
