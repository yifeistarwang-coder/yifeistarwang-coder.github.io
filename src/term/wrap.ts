// Word wrapping that stays ANSI-aware: escapes travel with their words and
// widths are measured visually (displayWidth), never by string length.
import { displayWidth } from './ansi';

/**
 * Wrap `text` into lines of at most `width` visual cells, breaking at
 * whitespace. Words wider than `width` are hard-broken. ANSI escapes inside
 * words are preserved (not counted towards width).
 */
export function wrapWords(text: string, width: number): string[] {
  if (width <= 0) return [text];
  const lines: string[] = [];
  for (const raw of text.split('\n')) {
    const words = raw.split(/(\s+)/); // keep separators to preserve spacing
    let line = '';
    let lineW = 0;
    const flush = () => {
      lines.push(line.replace(/\s+$/, ''));
      line = '';
      lineW = 0;
    };
    for (const word of words) {
      if (/^\s+$/.test(word)) {
        if (line.length > 0) line += ' ';
        continue;
      }
      if (word === '') continue;
      const w = displayWidth(word);
      if (lineW > 0 && lineW + 1 + w > width) flush();
      // Hard-break oversized words.
      if (w > width) {
        if (line.length > 0) flush();
        let rest = word;
        while (displayWidth(rest) > width) {
          let cut = 0;
          let acc = 0;
          for (const ch of rest) {
            acc += displayWidth(ch);
            cut += ch.length;
            if (acc >= width) break;
          }
          lines.push(rest.slice(0, cut));
          rest = rest.slice(cut);
        }
        line = rest;
        lineW = displayWidth(rest);
        continue;
      }
      if (line.length > 0) lineW += 1;
      line += word;
      lineW += w;
    }
    flush();
  }
  return lines;
}
