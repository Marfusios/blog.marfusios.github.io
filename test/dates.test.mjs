import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate } from '../lib/dates.mjs';

test('formatDate is UTC and stable', () => {
  const d = new Date('2026-10-22T00:00:00Z');
  assert.equal(formatDate(d, 'short'), '22 Oct');
  assert.equal(formatDate(d, 'long'), '22 October 2026');
  assert.equal(formatDate(d, 'iso'), '2026-10-22');
  assert.equal(formatDate(new Date('2020-02-13T23:30:00Z'), 'short'), '13 Feb');
});
