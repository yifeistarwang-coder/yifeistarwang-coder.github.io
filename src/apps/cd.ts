import type { Command, Context } from '../shell/types';

export const cd: Command = {
  name: 'cd',
  description: 'change directory',
  builtin: true,
  async run(ctx: Context, argv: string[]) {
    const err = ctx.chdir(argv[1] ?? '~');
    if (err) ctx.stdout.print(`cd: ${err}`);
  },
};
