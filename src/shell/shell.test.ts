import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Shell, splitPipe, commonPrefix } from './shell';
import { createRegistry } from './registry';
import { createStore } from '../content/store';
import type { Term } from '../term/term';
import type { Command } from './types';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

function mockTerm(): Term & { writes: string[] } {
  const writes: string[] = [];
  return {
    writes,
    onShellData: () => {},
    write: (s: string) => void writes.push(s),
    print: (s: string) => void writes.push(s + '\n'),
    clear: () => {},
    fit: () => {},
    focus: () => {},
    takeOver: () => {
      throw new Error('unused in tests');
    },
    cols: 80,
    rows: 24,
  } as unknown as Term & { writes: string[] };
}

/** A command that records its invocations; can optionally stall. */
function spy(name: string, ran: string[], delay = 0): Command {
  return {
    name,
    description: `${name} command`,
    async run() {
      if (delay) await tick(delay);
      ran.push(name);
    },
  };
}

test('splitPipe respects double quotes', () => {
  assert.deepEqual(splitPipe('cat bio | grep "a | b"'), ['cat bio', 'grep "a | b"']);
  assert.deepEqual(splitPipe('ls'), ['ls']);
  assert.deepEqual(splitPipe(''), []);
});

test('commonPrefix finds the longest shared prefix', () => {
  assert.equal(commonPrefix(['bio', 'bin']), 'bi');
  assert.equal(commonPrefix(['abc']), 'abc');
  assert.equal(commonPrefix([]), '');
});

test('inject runs a command at the prompt', async () => {
  const ran: string[] = [];
  const term = mockTerm();
  const registry = createRegistry();
  registry.register(spy('bio', ran));
  const shell = new Shell({ term, registry, store: createStore() });
  void shell.start();
  await tick(); // let the REPL reach readLine()
  shell.inject('bio');
  await tick();
  assert.deepEqual(ran, ['bio']);
  assert.ok(term.writes.some((w) => w.includes('bio\r\n')));
});

test('inject while a command is executing queues it for the next prompt', async () => {
  const ran: string[] = [];
  const term = mockTerm();
  const registry = createRegistry();
  registry.register(spy('slow', ran, 40));
  registry.register(spy('ls', ran));
  const shell = new Shell({ term, registry, store: createStore() });
  void shell.start();
  await tick(); // REPL waiting for input
  shell.inject('slow'); // starts executing…
  shell.inject('ls'); // …so this one must be queued, not dropped
  await tick(80); // slow (40ms) finishes, then the queue flushes ls
  assert.deepEqual(ran, ['slow', 'ls']);
});
