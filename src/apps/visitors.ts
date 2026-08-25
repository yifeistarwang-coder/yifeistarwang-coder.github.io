import type { Command, Context } from '../shell/types';

// Visit counter persisted in localStorage — one increment per page load.
const COUNT_KEY = 'yw.visit.count';
const SESSION_KEY = 'yw.visit.session';

export function recordVisit(): void {
  try {
    // Guard against HMR double-counting in dev: one count per tab session.
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');
    const n = Number(localStorage.getItem(COUNT_KEY) ?? '0') || 0;
    localStorage.setItem(COUNT_KEY, String(n + 1));
  } catch {
    // localStorage unavailable (private mode etc.) — the command still works.
  }
}

export function visitCount(): number {
  try {
    return Number(localStorage.getItem(COUNT_KEY) ?? '0') || 0;
  } catch {
    return 0;
  }
}

// Each figure is 5 rows; the plate row contains the digit placeholder #.
const FIGURES = [
  ['  ___  ', ' (^_^) ', '<[ # ]>', '  / \\  ', ' /   \\ '],
  ['  ___  ', ' (o_o) ', '<[ # ]>', '   |   ', '  / \\  '],
  ['  ___  ', ' (-_-) ', '<[ # ]>', '  / \\  ', ' /   \\ '],
  ['  ___  ', ' (=_=) ', '<[ # ]>', '   |   ', ' /   \\ '],
  ['  ___  ', ' (>_<) ', '<[ # ]>', '  / \\  ', ' /   \\ '],
  ['  ___  ', ' (x_x) ', '<[ # ]>', '   |   ', '  / \\  '],
  ['  ___  ', ' (o.o) ', '<[ # ]>', '  / \\  ', ' /   \\ '],
  ['  ___  ', ' (._.) ', '<[ # ]>', '   |   ', ' /   \\ '],
];

function banner(digits: string[]): string[] {
  return Array.from({ length: 5 }, (_, row) =>
    digits
      .map((d, i) => FIGURES[i % FIGURES.length][row].replace('#', d))
      .join('  '),
  );
}

export const visitors: Command = {
  name: 'visitors',
  description: 'show visit counts',
  async run(ctx: Context) {
    // Site-wide visits are tracked by the komarev badge in the footer (shared
    // with the GitHub profile); this command reports the local per-browser
    // count and points at the badge for the global number.
    const total = visitCount();
    const digits = String(total).padStart(4, '0').split('');
    const lines = [
      '👀 Visitors',
      '',
      ...banner(digits),
      '',
      `visits from this browser: ${total}`,
      'site-wide visits: see the badge in the footer',
      '(komarev counter shared with the GitHub profile)',
    ];
    ctx.stdout.print(lines.join('\n'));
  },
};
