import type { Command, Context } from '../shell/types';
import { resolvePath } from '../shell/path';
import { renderMarkdown } from '../content/render';

export const cat: Command = {
  name: 'cat',
  description: 'print file contents',
  async run(ctx: Context, argv: string[]) {
    // No args: pass stdin through (pipe-friendly).
    if (argv.length < 2) {
      if (ctx.stdin) ctx.stdout.write(ctx.stdin);
      else ctx.stdout.print('cat: missing file operand');
      return;
    }
    for (const arg of argv.slice(1)) {
      const doc = ctx.store.get(resolvePath(arg, ctx.cwd));
      if (!doc) {
        ctx.stdout.print(`cat: ${arg}: No such file or directory`);
        continue;
      }
      // In a pipe, emit unwrapped text; on the tty, wrap to its width.
      ctx.stdout.write(renderMarkdown(doc.body, ctx.tty ? ctx.term.cols : 0));
    }
  },
};
