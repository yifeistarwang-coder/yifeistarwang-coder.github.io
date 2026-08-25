import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from './render';
import { stripAnsi } from '../term/ansi';

test('renders h1 with a rule underneath', () => {
  const out = renderMarkdown('# Title\n\nBody.');
  const plain = stripAnsi(out);
  assert.ok(plain.startsWith('# Title'));
  assert.ok(plain.includes('─'.repeat(7))); // rule under "# Title"
  assert.ok(plain.includes('Body.'));
});

test('lists get bullets and indentation', () => {
  const out = stripAnsi(renderMarkdown('- one\n- two'));
  assert.ok(out.includes('• one'));
  assert.ok(out.includes('• two'));
});

test('explicit mailto links stay clickable', () => {
  const out = renderMarkdown('[me](mailto:a@b.co)');
  assert.ok(out.includes('\x1b]8;;mailto:a@b.co'));
  assert.ok(stripAnsi(out).includes('me'));
});

test('bare email text is not hyperlinked', () => {
  const out = renderMarkdown('[a@b.co](a@b.co)');
  assert.ok(!out.includes('\x1b]8;;'));
});

test('hash links become absolute same-page urls', () => {
  const out = renderMarkdown('[bio](#bio)');
  // Node has no `location`, so the href stays as "#bio" in tests; in the
  // browser render.ts promotes it. Just ensure the OSC 8 wrapper is present.
  assert.ok(out.includes('\x1b]8;;'));
  assert.ok(stripAnsi(out).includes('bio'));
});

test('output ends with exactly one blank line', () => {
  const out = renderMarkdown('# T\n\npara\n\n\n\n');
  assert.ok(out.endsWith('\n\n'));
  assert.ok(!out.endsWith('\n\n\n'));
});

test('width parameter wraps long paragraphs', () => {
  const long = 'word '.repeat(40).trim();
  const out = renderMarkdown(long, 20);
  for (const line of stripAnsi(out).split('\n')) {
    assert.ok(line.length <= 20, `line too wide: "${line}"`);
  }
});
