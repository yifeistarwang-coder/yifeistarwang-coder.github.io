import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLine } from './parser';

test('splits on whitespace', () => {
  assert.deepEqual(parseLine('cat bio'), ['cat', 'bio']);
  assert.deepEqual(parseLine('  ls   -a  '), ['ls', '-a']);
});

test('honors double quotes', () => {
  assert.deepEqual(parseLine('cat "hello world"'), ['cat', 'hello world']);
  assert.deepEqual(parseLine('echo "a b" c'), ['echo', 'a b', 'c']);
});

test('empty input yields no args', () => {
  assert.deepEqual(parseLine(''), []);
  assert.deepEqual(parseLine('   '), []);
});

test('empty quoted string is an arg', () => {
  assert.deepEqual(parseLine('echo ""'), ['echo', '']);
});
