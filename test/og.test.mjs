import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapText, ogSvg, renderOgPng } from '../lib/og.mjs';

test('wrapText', () => {
  assert.deepEqual(wrapText('Hourly billing is nuts', 18, 4), ['Hourly billing is', 'nuts']);
  const long = wrapText('word '.repeat(80), 18, 4);
  assert.equal(long.length, 4);
  assert.ok(long.at(-1).endsWith('…'));
  assert.ok(long.every((l) => l.length <= 18));
  assert.deepEqual(wrapText('Supercalifragilisticexpialidocious', 10, 4)[0].length <= 10, true);
});

test('og svg escapes text', () => {
  const svg = ogSvg({ title: 'Kůň & <AI>', eyebrow: 'A & B' });
  assert.match(svg, /Kůň &amp; &lt;AI&gt;/);
  assert.match(svg, /A &amp; B/);
  assert.doesNotMatch(svg, /<AI>/);
});

test('og png is 1200x630 and renders diacritics without throwing', () => {
  const png = renderOgPng({ title: 'Příliš žluťoučký kůň & <AI>', eyebrow: 'AI apps · 9 min' });
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});
