import type { Command, Context } from '../shell/types';

export const ls: Command = {
  name: 'ls',
  description: 'list directory contents',
  async run(ctx: Context, argv: string[]) {
    const target = argv[1] ?? '.';
    const entries = ctx.listDir(target);
    if (!entries) {
      ctx.stdout.print(`ls: cannot access '${target}': No such file or directory`);
      return;
    }
    if (entries.length === 0) return;
    ctx.stdout.print(entries.map((e) => e.name + (e.dir ? '/' : '')).join('  '));
  },
};
