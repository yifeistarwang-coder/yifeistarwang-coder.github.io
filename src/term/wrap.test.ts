import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapWords } from './wrap';
import { link, stripAnsi } from './ansi';

test('a hyperlink containing spaces wraps as one unit', () => {
  const out = wrapWords('aaa ' + link('https://x', 'Teng Wang') + ' bbb', 12);
  // The whole "Teng Wang" label must stay on a single line — never split at
  // the space inside the label (which used to leave an unclosed OSC 8
  // sequence with its underline trailing across the line break).
  const linesWithLabel = out.filter((l) => l.includes('Teng Wang'));
  assert.equal(linesWithLabel.length, 1);
  assert.ok(linesWithLabel[0].startsWith('\x1b]8;;'));
  assert.ok(linesWithLabel[0].endsWith('\x1b]8;;\x1b\\'));
  // The label's space is preserved in the rendered text.
  assert.ok(stripAnsi(linesWithLabel[0]).includes('Teng Wang'));
});

test('escapes are preserved and not counted toward width', () => {
  const out = wrapWords('ab \x1b[1mcd\x1b[0m ef', 4);
  assert.deepEqual(stripAnsi(out.join('\n')), 'ab\ncd\nef');
  assert.ok(out[1].includes('\x1b[1mcd\x1b[0m'));
});

test('plain text still wraps at word boundaries', () => {
  const out = wrapWords('the quick brown fox', 10);
  assert.deepEqual(out, ['the quick', 'brown fox']);
});

test('oversized words are hard-broken', () => {
  const out = wrapWords('abcdefghij kl', 5);
  assert.deepEqual(out, ['abcde', 'fghij', 'kl']);
});
