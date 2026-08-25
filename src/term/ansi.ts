// ANSI primitives: style codes, 256-color helpers, OSC 8 hyperlinks, and
// width/cluster utilities that stay correct when strings carry escapes.

export const RESET = '\x1b[0m';
export const BOLD = '\x1b[1m';
export const DIM = '\x1b[2m';
export const ITALIC = '\x1b[3m';
export const UNDERLINE = '\x1b[4m';

/** 256-color foreground. */
export function fg256(n: number): string {
  return `\x1b[38;5;${n}m`;
}

/** 256-color background. */
export function bg256(n: number): string {
  return `\x1b[48;5;${n}m`;
}

/** OSC 8 hyperlink — genuinely clickable in xterm.js. */
export function link(href: string, text: string): string {
  return `\x1b]8;;${href}\x1b\\${text}\x1b]8;;\x1b\\`;
}

/** Strip all ANSI escapes (CSI sequences and OSC 8 hyperlinks). */
export function stripAnsi(s: string): string {
  return s
    .replace(/\x1b\]8;;[^\x1b]*\x1b\\/g, '')
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
}

/** Zero-width ranges (combining marks, variation selectors, ZWJ). */
const ZERO_WIDTH =
  /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufe00-\ufe0f\ufe20-\ufe2f]/;

/** Wide (2-cell) ranges: CJK, fullwidth forms, hangul, common emoji blocks. */
const WIDE =
  /[\u1100-\u115f\u2e80-\u303e\u3041-\u33ff\u3400-\u4dbf\u4e00-\u9fff\ua000-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]|\ud83c[\udf00-\udfff]|\ud83d[\udc00-\uddff\ude00-\ude4f\ude80-\udeff]/;

/** Visual cell width of a string, ignoring ANSI escapes. */
export function displayWidth(s: string): number {
  const plain = stripAnsi(s);
  let w = 0;
  for (const ch of plain) {
    if (ZERO_WIDTH.test(ch)) continue;
    w += WIDE.test(ch) ? 2 : 1;
  }
  return w;
}

const segmenter: Intl.Segmenter | undefined =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : undefined;

/** Split a string into grapheme clusters (fallback: codepoints). */
export function clusters(s: string): string[] {
  if (segmenter) return [...segmenter.segment(s)].map((seg) => seg.segment);
  return [...s];
}

/** Index where the grapheme cluster to the left of `pos` starts. */
export function prevClusterStart(s: string, pos: number): number {
  if (pos <= 0) return 0;
  const left = clusters(s.slice(0, pos));
  return pos - left[left.length - 1].length;
}

/** Index just past the grapheme cluster starting at `pos`. */
export function nextClusterEnd(s: string, pos: number): number {
  if (pos >= s.length) return s.length;
  const right = clusters(s.slice(pos));
  return pos + right[0].length;
}
