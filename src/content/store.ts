// Read-only view over the compiled content manifest.
import { manifest } from '../generated/content';
import type { Document } from './types';

export interface ContentStore {
  /** All documents, sorted by slug. */
  all(): Document[];
  /** Look up one document by slug ('' never matches). */
  get(slug: string): Document | undefined;
}

export function createStore(): ContentStore {
  return {
    all: () => manifest.documents,
    get: (slug: string) => manifest.documents.find((d) => d.slug === slug),
  };
}
