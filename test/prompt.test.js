import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSelection, reduceCheckbox } from '../src/lib/prompt.js';

// --- parseSelection (non-TTY fallback parser) ---

test('parseSelection: single numbers and comma lists', () => {
  assert.deepEqual(parseSelection('1', 5), [1]);
  assert.deepEqual(parseSelection('1,3,5', 5), [1, 3, 5]);
});

test('parseSelection: ranges, mixed, and reversed ranges', () => {
  assert.deepEqual(parseSelection('1-3', 5), [1, 2, 3]);
  assert.deepEqual(parseSelection('1,3-5', 5), [1, 3, 4, 5]);
  assert.deepEqual(parseSelection('3-1', 5), [1, 2, 3]);
});

test('parseSelection: "all"/"a"/"*" select everything', () => {
  const all = [1, 2, 3, 4, 5];
  assert.deepEqual(parseSelection('all', 5), all);
  assert.deepEqual(parseSelection('a', 5), all);
  assert.deepEqual(parseSelection('*', 5), all);
});

test('parseSelection: dedupes and sorts', () => {
  assert.deepEqual(parseSelection('5,1,1,2-3,3', 5), [1, 2, 3, 5]);
});

test('parseSelection: tolerates surrounding whitespace', () => {
  assert.deepEqual(parseSelection('2 , 4', 5), [2, 4]);
  assert.deepEqual(parseSelection('1 - 3', 5), [1, 2, 3]);
});

test('parseSelection: rejects empty and out-of-range input', () => {
  assert.equal(parseSelection('', 5), null);
  assert.equal(parseSelection('0', 5), null);
  assert.equal(parseSelection('6', 5), null);
  assert.equal(parseSelection('1-6', 5), null);
  assert.equal(parseSelection('foo', 5), null);
  assert.equal(parseSelection('1,x', 5), null);
});

// --- reduceCheckbox (interactive key handling) ---

const start = (cursor = 0, selected = []) => ({ cursor, selected: new Set(selected) });
const sel = (s) => [...s.selected].sort((a, b) => a - b);

test('reduceCheckbox: up/down move and wrap around', () => {
  assert.equal(reduceCheckbox(start(0), 'down', 3).cursor, 1);
  assert.equal(reduceCheckbox(start(2), 'down', 3).cursor, 0);
  assert.equal(reduceCheckbox(start(0), 'up', 3).cursor, 2);
});

test('reduceCheckbox: space toggles the row under the cursor', () => {
  const on = reduceCheckbox(start(1), 'space', 3);
  assert.deepEqual(sel(on), [1]);
  const off = reduceCheckbox(on, 'space', 3);
  assert.deepEqual(sel(off), []);
});

test('reduceCheckbox: "a" selects all, then clears all', () => {
  const all = reduceCheckbox(start(0), 'all', 3);
  assert.deepEqual(sel(all), [0, 1, 2]);
  const none = reduceCheckbox(all, 'all', 3);
  assert.deepEqual(sel(none), []);
});

test('reduceCheckbox: return confirms and keeps the selection', () => {
  const s = reduceCheckbox(start(0, [2]), 'return', 3);
  assert.equal(s.done, true);
  assert.deepEqual(sel(s), [2]);
});

test('reduceCheckbox: return with nothing checked picks the highlighted row', () => {
  const s = reduceCheckbox(start(1), 'return', 3);
  assert.equal(s.done, true);
  assert.deepEqual(sel(s), [1]);
});

test('reduceCheckbox: does not mutate the input state', () => {
  const before = start(0, [0]);
  reduceCheckbox(before, 'space', 3);
  reduceCheckbox(before, 'all', 3);
  assert.deepEqual(sel(before), [0]);
  assert.equal(before.cursor, 0);
});
