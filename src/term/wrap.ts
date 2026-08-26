// Word wrapping that stays ANSI-aware: escapes travel with their words and
// widths are measured visually (displayWidth), never by string length.
import { displayWidth } from './ansi';

/**
 * Split `raw` into word and whitespace tokens. Escape sequences (CSI styles
 * and OSC 8 hyperlinks) stay attached to the word they belong to, and an
 * OSC 8 link is consumed whole — label spaces included — so a hyperlink such
 * as "Teng Wang" never splits at its inner space (which used to leave an
 * unclosed link with its underline trailing across the line break).
 */
function tokenize(raw: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  let i = 0;
  const n = raw.length;
  const OSC_CLOSE = '\x1b]8;;\x1b\\';
  while (i < n) {
    const c = raw[i];
    if (c === '\x1b') {
      // OSC 8 hyperlink OPEN: swallow the label too — spaces included —
      // through the matching close, so the whole link is one unbreakable
      // word and its underline can never trail across a line break.
      if (raw.startsWith('\x1b]8;;', i) && !raw.startsWith(OSC_CLOSE, i)) {
        const close = raw.indexOf(OSC_CLOSE, i + 5);
        const end = close === -1 ? n : close + OSC_CLOSE.length;
        cur += raw.slice(i, end);
        i = end;
        continue;
      }
      let end = i + 1;
      if (raw[end] === '[') {
        // CSI: \x1b[ ... final byte (@..~). Include the final byte.
        end += 1;
        while (end < n && !(raw.charCodeAt(end) >= 0x40 && raw.charCodeAt(end) <= 0x7e)) end += 1;
        if (end < n) end += 1;
      } else if (raw[end] === ']') {
        // Other OSC (e.g. an OSC 8 close): terminated by BEL or ST.
        let j = end + 1;
        while (j < n) {
          if (raw[j] === '\x07') { j += 1; break; }
          if (raw[j] === '\x1b' && raw[j + 1] === '\\') { j += 2; break; }
          j += 1;
        }
        end = j;
      }
      cur += raw.slice(i, end);
      i = end;
      continue;
    }
    if (/\s/.test(c)) {
      if (cur !== '') tokens.push(cur);
      cur = '';
      let j = i;
      while (j < n && /\s/.test(raw[j])) j += 1;
      tokens.push(raw.slice(i, j));
      i = j;
      continue;
    }
    cur += c;
    i += 1;
  }
  if (cur !== '') tokens.push(cur);
  return tokens;
}

/**
 * Wrap `text` into lines of at most `width` visual cells, breaking at
 * whitespace. Words wider than `width` are hard-broken. ANSI escapes inside
 * words are preserved (not counted towards width).
 */
export function wrapWords(text: string, width: number): string[] {
  if (width <= 0) return [text];
  const lines: string[] = [];
  for (const raw of text.split('\n')) {
    const words = tokenize(raw);
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
