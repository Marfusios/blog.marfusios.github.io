import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Marked, Renderer } from 'marked';
import { markedHighlight } from 'marked-highlight';
import markedFootnote from 'marked-footnote';
import hljs from 'highlight.js';
import { imageSize } from 'image-size';
import { escapeHtml } from './escape.mjs';

const MEDIA = /^media\//;

// Ids the post page already uses outside the body; headings must not reuse them.
const PAGE_IDS = ['main', 'footnote-label'];

// Per-render state: renderMarkdown is synchronous, so module-level state is safe.
let state = { mediaRoot: '.', warnings: [], ids: new Map() };

/** Plain text of inline tokens (raw, unescaped), for building heading ids. */
function plainText(tokens) {
  return tokens
    .map((t) => (t.tokens ? plainText(t.tokens) : t.type === 'html' ? t.text.replace(/<[^>]+>/g, '') : t.text ?? ''))
    .join('');
}

/** GitHub-style id: lowercase, punctuation dropped, spaces to hyphens, de-duplicated. */
function headingId(text) {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
  const seen = state.ids.get(base) ?? 0;
  state.ids.set(base, seen + 1);
  return seen ? `${base}-${seen}` : base;
}

function imageTag({ href, title, text }) {
  if (!text) state.warnings.push(`image "${href}" has no alt text`);
  let src = href;
  let size = '';
  if (MEDIA.test(href)) {
    src = `/${href}`;
    try {
      const { width, height } = imageSize(readFileSync(join(state.mediaRoot, href)));
      size = ` width="${width}" height="${height}"`;
    } catch {
      state.warnings.push(`image "${href}" not found under ${state.mediaRoot}`);
    }
  }
  const img = `<img src="${escapeHtml(src)}" alt="${escapeHtml(text ?? '')}"${size} loading="lazy" decoding="async">`;
  return { img, caption: title ? `<figcaption>${escapeHtml(title)}</figcaption>` : '' };
}

const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight: (code, lang) =>
      lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : escapeHtml(code),
  }),
  markedFootnote(),
  {
    gfm: true,
    renderer: {
      code({ text, lang }) {
        const language = (lang || '').split(/\s/)[0];
        const cls = language ? `hljs language-${escapeHtml(language)}` : 'hljs';
        const label = language ? `<figcaption>${escapeHtml(language)}</figcaption>` : '';
        return `<figure class="code">${label}<pre><code class="${cls}">${text.replace(/\n$/, '')}</code></pre></figure>\n`;
      },
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const id = headingId(plainText(tokens));
        const anchor =
          depth === 2 || depth === 3
            ? ` <a class="anchor" href="#${id}" aria-label="Link to this section">#</a>`
            : '';
        return `<h${depth} id="${id}">${inner}${anchor}</h${depth}>\n`;
      },
      paragraph({ tokens }) {
        if (tokens.length === 1 && tokens[0].type === 'image') {
          const { img, caption } = imageTag(tokens[0]);
          return `<figure>${img}${caption}</figure>\n`;
        }
        return `<p>${this.parser.parseInline(tokens)}</p>\n`;
      },
      image(token) {
        return imageTag(token).img;
      },
      link(token) {
        const href = MEDIA.test(token.href) ? `/${token.href}` : token.href;
        return Renderer.prototype.link.call(this, { ...token, href });
      },
      table(token) {
        return `<div class="table-wrap">${Renderer.prototype.table.call(this, token)}</div>\n`;
      },
    },
  },
);

export function renderMarkdown(md, { mediaRoot }) {
  state = { mediaRoot, warnings: [], ids: new Map(PAGE_IDS.map((id) => [id, 1])) };
  const html = marked.parse(md);
  return { html, warnings: state.warnings };
}
