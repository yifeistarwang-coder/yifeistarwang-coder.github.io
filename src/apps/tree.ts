import type { Command, Context } from '../shell/types';

export const tree: Command = {
  name: 'tree',
  description: 'show the directory tree',
  async run(ctx: Context, argv: string[]) {
    const target = argv[1] ?? '.';
    const entries = ctx.listDir(target);
    if (!entries) {
      ctx.stdout.print(`tree: ${target}: No such file or directory`);
      return;
    }
    const lines: string[] = [target === '.' ? '.' : target];
    const walk = (path: string, prefix: string) => {
      const children = ctx.listDir(path);
      if (!children) return;
      children.forEach((child, i) => {
        const isLast = i === children.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        lines.push(prefix + connector + child.name + (child.dir ? '/' : ''));
        if (child.dir) {
          const childPath = path === '.' ? child.name : `${path}/${child.name}`;
          walk(childPath, prefix + (isLast ? '    ' : '│   '));
        }
      });
    };
    walk(target, '');
    ctx.stdout.print(lines.join('\n'));
  },
};
