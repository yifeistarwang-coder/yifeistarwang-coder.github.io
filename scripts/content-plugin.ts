// Vite plugin wrapping the content compiler: rebuilds the manifest once on
// startup, and in dev re-runs it (plus a full page reload) whenever a file
// under content/ changes.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { buildContent } from './build-content';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(HERE, '..', 'content');

export function contentPlugin(): Plugin {
  return {
    name: 'content-compiler',
    async buildStart() {
      await buildContent();
    },
    configureServer(server) {
      server.watcher.add(CONTENT_DIR);
      const rebuild = async (file: string) => {
        if (!file.startsWith(CONTENT_DIR) || !file.endsWith('.md')) return;
        try {
          await buildContent();
          server.ws.send({ type: 'full-reload' });
        } catch (e) {
          server.config.logger.error(`content: ${String(e)}`);
        }
      };
      server.watcher.on('add', rebuild);
      server.watcher.on('change', rebuild);
      server.watcher.on('unlink', rebuild);
    },
  };
}
