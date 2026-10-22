import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { imageSize } from 'image-size';
import { escapeXml as x } from './escape.mjs';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const FONT_FILES = ['Fraunces-SemiBold.ttf', 'Inter-Medium.ttf', 'JetBrainsMono-Regular.ttf'].map((f) => root(`src/og/fonts/${f}`));

const W = 1200;
const H = 630;
const PAD = 80;
const TITLE_SIZE = 68;
const TITLE_LEADING = 75;
const TITLE_LAST_BASELINE = 498;

let assets;
function loadAssets() {
  if (assets) return assets;
  const maze = readFileSync(root('src/static/images/maze-pattern.png'));
  const logo = readFileSync(root('src/static/images/logo.png'));
  assets = { maze: maze.toString('base64'), mazeSize: imageSize(maze), logo: logo.toString('base64') };
  return assets;
}

/** Greedy word wrap; hard-splits words longer than a line; ellipsis when truncated. */
export function wrapText(text, maxChars, maxLines) {
  const words = text.trim().split(/\s+/).flatMap((w) => w.match(new RegExp(`.{1,${maxChars}}`, 'gu')) ?? []);
  const lines = [];
  for (const word of words) {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= maxChars) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  const tail = kept[maxLines - 1];
  kept[maxLines - 1] = `${tail.length < maxChars ? tail : tail.slice(0, maxChars - 1).trimEnd()}…`;
  return kept;
}

export function ogSvg({ title, eyebrow }) {
  const { maze, mazeSize, logo } = loadAssets();
  const lines = wrapText(title, 30, 4);
  const firstBaseline = TITLE_LAST_BASELINE - (lines.length - 1) * TITLE_LEADING;
  const tspans = lines
    .map((l, i) => `<tspan x="${PAD}" y="${firstBaseline + i * TITLE_LEADING}">${x(l)}</tspan>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <pattern id="maze" patternUnits="userSpaceOnUse" width="${mazeSize.width}" height="${mazeSize.height}">
    <image width="${mazeSize.width}" height="${mazeSize.height}" xlink:href="data:image/png;base64,${maze}"/>
  </pattern>
  <radialGradient id="glow" cx="0.85" cy="0.2" r="0.6">
    <stop offset="0" stop-color="#E8AE0D" stop-opacity="0.2"/>
    <stop offset="1" stop-color="#E8AE0D" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="#102439"/>
<rect width="${W}" height="${H}" fill="url(#maze)" opacity="0.045"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
<image x="${PAD}" y="64" width="72" height="72" xlink:href="data:image/png;base64,${logo}"/>
<text x="${PAD}" y="${firstBaseline - TITLE_SIZE - 22}" font-family="JetBrains Mono" font-size="26" letter-spacing="2" fill="#EFC149">${x(wrapText(eyebrow.toUpperCase(), 56, 1)[0] ?? '')}</text>
<text font-family="Fraunces 144pt" font-weight="600" font-size="${TITLE_SIZE}" fill="#FAF7F1">${tspans}</text>
<rect x="${PAD}" y="540" width="${W - 2 * PAD}" height="1" fill="#20406A"/>
<text x="${PAD}" y="588" font-family="JetBrains Mono" font-size="24" fill="#8FA2BD">blog.mkotas.cz</text>
<text x="${W - PAD}" y="588" text-anchor="end" font-family="Inter" font-weight="500" font-size="26" fill="#FAF7F1">Mariusz Kotas</text>
</svg>`;
}

export function renderOgPng(p) {
  const resvg = new Resvg(ogSvg(p), {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Inter' },
  });
  return resvg.render().asPng();
}
