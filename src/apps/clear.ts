import type { Command, Context } from '../shell/types';

export const clear: Command = {
  name: 'clear',
  description: 'clear the terminal screen',
  async run(ctx: Context) {
    if (ctx.tty) ctx.term.clear();
  },
};
