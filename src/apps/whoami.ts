import type { Command, Context } from '../shell/types';

export const whoami: Command = {
  name: 'whoami',
  description: 'display current user',
  async run(ctx: Context) {
    ctx.stdout.print('Yifei Wang');
  },
};
