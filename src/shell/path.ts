// Path resolution for the virtual FS (slugs, no extensions).

/**
 * Resolve `target` against `cwd` into a normalized slug path ('' = root '/').
 * Supports '~' (root), '.', '..' and plain relative names.
 */
export function resolvePath(target: string, cwd: string): string {
  if (!target || target === '~' || target === '/') return '';
  const parts = target.startsWith('~') ? target.slice(1).split('/') : target.split('/');
  const stack = cwd ? cwd.split('/') : [];
  for (const p of parts) {
    if (p === '' || p === '.') continue;
    if (p === '..') stack.pop();
    else stack.push(p);
  }
  return stack.join('/');
}

/** Human form of a slug path: '' -> '~', 'bin' -> '~/bin'. */
export function displayPath(cwd: string): string {
  return cwd === '' ? '~' : `~/${cwd}`;
}
