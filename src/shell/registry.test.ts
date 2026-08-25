import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry } from './registry';
import type { Command } from './types';

function cmd(name: string): Command {
  return { name, description: `${name} command`, run: async () => {} };
}

test('registers and resolves commands', () => {
  const r = createRegistry();
  r.register(cmd('ls'));
  assert.equal(r.get('ls')?.name, 'ls');
  assert.equal(r.get('cat'), undefined);
});

test('re-registering the same command object is idempotent', () => {
  const r = createRegistry();
  const c = cmd('ls');
  r.register(c);
  r.register(c); // must not throw
  assert.equal(r.get('ls'), c);
});

test('duplicate command names throw instead of silently overwriting', () => {
  const r = createRegistry();
  r.register(cmd('cat'));
  assert.throws(() => r.register(cmd('cat')), /already registered/);
});

test('list is sorted by name', () => {
  const r = createRegistry();
  r.register(cmd('cat'));
  r.register(cmd('ls'));
  r.register(cmd('pwd'));
  assert.deepEqual(
    r.list().map((c) => c.name),
    ['cat', 'ls', 'pwd'],
  );
});
