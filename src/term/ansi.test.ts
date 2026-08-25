import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayWidth, stripAnsi, link, BOLD, RESET, prevClusterStart, nextClusterEnd } from './ansi';

test('stripAnsi removes CSI and OSC 8 sequences', () => {
  assert.equal(stripAnsi(BOLD + 'hi' + RESET), 'hi');
  assert.equal(stripAnsi(link('https://x.dev', 'x')), 'x');
});

test('displayWidth ignores escapes and counts wide chars', () => {
  assert.equal(displayWidth('abc'), 3);
  assert.equal(displayWidth(BOLD + 'abc' + RESET), 3);
  assert.equal(displayWidth('中文'), 4);
  assert.equal(displayWidth('a中'), 3);
});

test('cluster helpers delete whole emoji', () => {
  const s = 'a\u{1F468}\u200D\u{1F469}\u200D\u{1F467}b'; // family emoji
  const cut = prevClusterStart(s, s.length - 1);
  assert.equal(s.slice(0, cut), 'a');
  const end = nextClusterEnd(s, 1);
  assert.equal(s.slice(end), 'b');
});
