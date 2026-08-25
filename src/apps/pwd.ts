import type { Command, Context } from '../shell/types';
import { displayPath } from '../shell/path';

export const pwd: Command = {
  name: 'pwd',
  description: 'print working directory',
  async run(ctx: Context) {
    ctx.stdout.print(displayPath(ctx.cwd));
  },
};
