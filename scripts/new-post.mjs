// Scaffold a draft post: npm run new -- "Post title"
import { existsSync, writeFileSync } from 'node:fs';
import { slugify } from '../lib/posts.mjs';
import { formatDate } from '../lib/dates.mjs';

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.error('Usage: npm run new -- "Post title"');
  process.exit(1);
}
const today = formatDate(new Date(), 'iso');
const path = `posts/${today}-${slugify(title)}.md`;
if (existsSync(path)) {
  console.error(`${path} already exists`);
  process.exit(1);
}
writeFileSync(
  path,
  `---
title: ${JSON.stringify(title)}
description: ""          # one or two sentences: meta description and the dek under the title
date: ${today}
topics: []               # 1 to 3, e.g. [AI apps, RAG]
draft: true              # remove to publish
---

Start writing here.

<!-- Images: put them in posts/media/${slugify(title)}/ and reference them as
![Alt text](media/${slugify(title)}/picture.png "Optional caption") -->
`,
);
console.log(`Created ${path}`);
