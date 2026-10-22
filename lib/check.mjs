import { readdir, readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { XMLValidator } from 'fast-xml-parser';
import { site } from './config.mjs';

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

/** Does a root-relative URL path resolve to a file the static server would serve? */
function resolves(distDir, urlPath) {
  const clean = decodeURIComponent(urlPath.split('#')[0].split('?')[0]);
  const p = join(distDir, clean);
  if (clean.endsWith('/')) return existsSync(join(p, 'index.html'));
  if (existsSync(p) && statSync(p).isFile()) return true;
  return existsSync(join(p, 'index.html')) || existsSync(`${p}.html`);
}

const attr = (html, re) => re.exec(html)?.[1];
const SITE_ORIGIN = new URL(site.url).origin;
const NOT_A_PATH = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i; // scheme (https:, mailto:, data:), protocol-relative, fragment

/** Validate a built site. Returns a list of "<file>: <problem>" strings; empty means OK. */
export async function checkSite(distDir, { draftSlugs = [] } = {}) {
  const errors = [];
  const files = await walk(distDir);
  const rel = (f) => relative(distDir, f).split(sep).join('/');

  for (const file of files.filter((f) => f.endsWith('.html'))) {
    const name = rel(file);
    const html = await readFile(file, 'utf8');
    for (const [, url] of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
      if (!url || NOT_A_PATH.test(url)) continue;
      // root-relative as-is; relative links resolve against the page's own URL
      const path = url.startsWith('/') ? url : new URL(url, `${SITE_ORIGIN}/${name}`).pathname;
      if (!resolves(distDir, path)) errors.push(`${name}: broken internal link ${url}`);
    }
    if (name === '404.html') continue;
    if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${name}: missing <title>`);
    if (!attr(html, /<meta name="description" content="([^"]+)"/)) errors.push(`${name}: missing meta description`);
    if (!attr(html, /<link rel="canonical" href="([^"]+)"/)) errors.push(`${name}: missing canonical`);
    const og = attr(html, /<meta property="og:image" content="([^"]+)"/);
    if (!og) errors.push(`${name}: missing og:image`);
    else {
      let url = null;
      try {
        url = new URL(og);
      } catch {}
      if (!url || (og.startsWith(site.url) && url.origin !== SITE_ORIGIN)) errors.push(`${name}: og:image ${og} is not a valid URL`);
      else if (url.origin === SITE_ORIGIN && !resolves(distDir, url.pathname)) errors.push(`${name}: og:image ${og} does not exist`);
    }
  }

  const redirectsFile = join(distDir, '_redirects');
  if (existsSync(redirectsFile)) {
    for (const line of (await readFile(redirectsFile, 'utf8')).split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (!parts[0] || parts[0].startsWith('#')) continue;
      const target = parts[1];
      if (target?.startsWith('/') && !resolves(distDir, target)) errors.push(`_redirects: ${parts[0]} -> ${target} does not exist`);
    }
  }

  for (const xml of ['feed.xml', 'sitemap.xml']) {
    const path = join(distDir, xml);
    if (!existsSync(path)) {
      errors.push(`${xml}: missing`);
      continue;
    }
    const content = await readFile(path, 'utf8');
    const valid = XMLValidator.validate(content);
    if (valid !== true) errors.push(`${xml}: invalid XML (${valid.err.msg})`);
    if (xml === 'sitemap.xml') {
      for (const [, loc] of content.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        if (loc.startsWith(site.url) && !resolves(distDir, loc.slice(site.url.length))) errors.push(`sitemap.xml: ${loc} does not exist`);
      }
    }
  }

  for (const slug of draftSlugs) {
    if (existsSync(join(distDir, slug))) errors.push(`${slug}/: draft post was published`);
    if (existsSync(join(distDir, 'media', slug))) errors.push(`media/${slug}/: draft media was published`);
  }
  return errors;
}
