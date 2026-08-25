// Split a command line into argv, honoring double quotes.

/** Parse one pipe segment into argv: whitespace-split, double-quote-aware. */
export function parseLine(line: string): string[] {
  const args: string[] = [];
  let cur = '';
  let inQ = false;
  let touched = false; // tracks whether the current arg has any content/quotes
  for (const c of line) {
    if (c === '"') {
      inQ = !inQ;
      touched = true;
    } else if (/\s/.test(c) && !inQ) {
      if (touched || cur.length > 0) {
        args.push(cur);
        cur = '';
        touched = false;
      }
    } else {
      cur += c;
      touched = true;
    }
  }
  if (touched || cur.length > 0) args.push(cur);
  return args;
}
