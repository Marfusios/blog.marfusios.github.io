import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const WORDS_PER_MINUTE = 230;
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function slugify(text) {
  return String(text)
    .trim()
    .replace(/^\./, 'dot')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toDate(value, field, fileName) {
  if (value === undefined || value === null || value === '') return null;
  const d = value instanceof Date ? value : new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(d.getTime())) throw new Error(`${fileName}: "${field}" is not a valid date`);
  return d;
}

function countWords(markdown) {
  const prose = markdown.replace(/^(```|~~~)[\s\S]*?^\1\s*$/gm, '');
  return prose.split(/\s+/).filter(Boolean).length;
}

export function parsePost(source, fileName) {
  const match = FRONT_MATTER.exec(source);
  if (!match) throw new Error(`${fileName}: missing front matter`);
  const data = parseYaml(match[1]) ?? {};
  const markdown = match[2];
  const draft = data.draft === true;

  const fail = (field, why = 'is required') => {
    throw new Error(`${fileName}: "${field}" ${why}`);
  };
  if (!data.title) fail('title');
  const date = toDate(data.date, 'date', fileName);
  if (!date) fail('date');
  const description = data.description ? String(data.description) : '';
  if (!draft && !description) fail('description');
  const topicNames = Array.isArray(data.topics) ? data.topics.map(String) : [];
  if (!draft && (topicNames.length < 1 || topicNames.length > 3)) fail('topics', 'must list 1 to 3 topics');

  const slug = data.slug ? slugify(data.slug) : slugify(fileName.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''));
  const wordCount = countWords(markdown);

  return {
    title: String(data.title),
    description,
    date,
    updated: toDate(data.updated, 'updated', fileName),
    topics: topicNames.map((name) => ({ name, slug: slugify(name) })),
    slug,
    url: `/${slug}/`,
    image: data.image ? String(data.image) : null,
    draft,
    fileName,
    markdown,
    wordCount,
    readingMinutes: Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE)),
  };
}

export async function loadPosts(dir, { includeDrafts = false } = {}) {
  const files = (await readdir(dir, { withFileTypes: true })).filter((f) => f.isFile() && f.name.endsWith('.md'));
  const posts = [];
  const bySlug = new Map();
  for (const f of files) {
    const post = parsePost(await readFile(join(dir, f.name), 'utf8'), f.name);
    if (bySlug.has(post.slug)) throw new Error(`Duplicate slug "${post.slug}" in ${bySlug.get(post.slug)} and ${f.name}`);
    bySlug.set(post.slug, f.name);
    if (post.draft && !includeDrafts) continue;
    posts.push(post);
  }
  return posts.sort((a, b) => b.date - a.date || a.slug.localeCompare(b.slug));
}

export function collectTopics(posts) {
  const topics = new Map();
  for (const post of posts) {
    for (const { name, slug } of post.topics) {
      if (!topics.has(slug)) topics.set(slug, { name, slug, url: `/topics/${slug}/`, posts: [] });
      topics.get(slug).posts.push(post);
    }
  }
  return [...topics.values()].sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name));
}
