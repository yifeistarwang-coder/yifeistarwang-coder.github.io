// markdown -> ANSI renderer with a light-background palette (256-color).
// Walks the marked token stream and emits terminal styling. Links use OSC 8 so
// they are genuinely clickable in xterm.js.
import { marked } from 'marked';
import type { Token, Tokens } from 'marked';
import { BOLD, DIM, ITALIC, RESET, displayWidth, fg256, link as oscLink, stripAnsi } from '../term/ansi';
import { wrapWords } from '../term/wrap';

// Muted palette friendly to the light (#fafafa) background.
const C = {
  heading: fg256(29), // green, matches --accent
  bullet: fg256(240), // muted gray, AA contrast on #fafafa
  border: fg256(240), // soft gray for code/quote rules
  hr: fg256(252),
};

/**
 * Render markdown to ANSI text. Pass `width` (terminal columns) to word-wrap
 * paragraphs, list items, and blockquotes at word boundaries with hanging
 * indents; omit it for unwrapped output (tests, widthless callers).
 */
export function renderMarkdown(body: string, width = 0): string {
  const tokens = marked.lexer(body);
  const out = tokens.map((t) => renderBlock(t, width)).join('');
  // strip trailing whitespace, then force exactly one blank line at the end so
  // every page ends consistently before the next prompt.
  return out.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n\n';
}

function renderInline(tokens?: Token[]): string {
  if (!tokens) return '';
  return tokens.map(renderInlineToken).join('');
}

function renderInlineToken(t: Token): string {
  switch (t.type) {
    case 'strong':
      return BOLD + renderInline((t as Tokens.Strong).tokens) + RESET;
    case 'em':
      return ITALIC + renderInline((t as Tokens.Em).tokens) + RESET;
    case 'codespan':
      // gray underline marks inline code without hijacking the text color
      return `\x1b[58;5;252m\x1b[4m${(t as Tokens.Codespan).text}${RESET}`;
    case 'link': {
      const lk = t as Tokens.Link;
      // A bare email address in text stays plain; an explicit mailto: link is
      // kept clickable so visitors can open their mail client.
      const isBareEmail =
        !/^[a-z][a-z0-9+.-]*:/i.test(lk.href) && lk.href.includes('@');
      if (isBareEmail) {
        return renderInline(lk.tokens) || lk.href;
      }
      // xterm's OSC 8 opener won't follow a bare "#fragment", so promote
      // internal hash links to an absolute same-page URL — clicking opens
      // /#hash, which the hash router then runs.
      let href = lk.href;
      if (href.startsWith('#') && typeof location !== 'undefined') {
        href = location.origin + location.pathname + href;
      }
      // Links keep the default text color but stay clickable via OSC 8 —
      // xterm underlines them on hover.
      return oscLink(href, renderInline(lk.tokens) || lk.href);
    }
    case 'image': {
      const im = t as Tokens.Image;
      return `${DIM}[img: ${im.text || im.href}]${RESET}`;
    }
    case 'br':
      return '\n';
    case 'escape':
      return (t as Tokens.Escape).text;
    case 'text':
    default: {
      const tx = t as Tokens.Text;
      return tx.tokens ? renderInline(tx.tokens) : (tx.text ?? '');
    }
  }
}

function renderBlock(t: Token, width: number): string {
  switch (t.type) {
    case 'heading': {
      const h = t as Tokens.Heading;
      const prefix = '#'.repeat(h.depth) + ' ';
      const inline = renderInline(h.tokens);
      if (h.depth === 1) {
        // h1: title then a rule beneath; the blank line goes below the rule.
        const w = displayWidth(prefix + stripAnsi(inline));
        return `${BOLD}${C.heading}${prefix}${inline}${RESET}\n${C.border}${'─'.repeat(Math.max(2, w))}${RESET}\n\n`;
      }
      return `\n${BOLD}${C.heading}${prefix}${inline}${RESET}\n\n`;
    }
    case 'paragraph': {
      const p = t as Tokens.Paragraph;
      const inline = renderInline(p.tokens);
      const body = width ? wrapWords(inline, width).join('\n') : inline;
      return `${body}\n\n`;
    }
    case 'list': {
      const l = t as Tokens.List;
      const lines: string[] = [];
      l.items.forEach((item, i) => {
        const bullet = l.ordered ? `${i + 1}. ` : `${C.bullet}•${RESET} `;
        const inner = renderInline((item as Tokens.ListItem).tokens).trim();
        if (!width) {
          lines.push(`  ${bullet}${inner}`);
          return;
        }
        // Hanging indent: wrapped continuation lines align under the text
        // after the "  • " marker.
        const bulletW = 2 + displayWidth(stripAnsi(bullet));
        const wrapped = wrapWords(inner, Math.max(1, width - bulletW));
        const pad = ' '.repeat(bulletW);
        lines.push(`  ${bullet}${wrapped[0]}`);
        for (let k = 1; k < wrapped.length; k++) lines.push(pad + wrapped[k]);
      });
      return lines.join('\n') + '\n\n';
    }
    case 'code': {
      const c = t as Tokens.Code;
      const body = c.text.replace(/\n$/, '');
      return `${body}\n\n`;
    }
    case 'blockquote': {
      const b = t as Tokens.Blockquote;
      const innerWidth = width ? Math.max(1, width - 2) : 0; // room for "│ "
      const inner = (b.tokens ?? []).map((tk) => renderBlock(tk, innerWidth)).join('').trimEnd();
      return inner.split('\n').map((l) => `${C.border}│${RESET} ${l}`).join('\n') + '\n\n';
    }
    case 'hr':
      return `${C.hr}${'─'.repeat(40)}${RESET}\n\n`;
    case 'table': {
      const tb = t as Tokens.Table;
      const headerCells = tb.header.map((c) =>
        renderInline((c as unknown as { tokens: Token[] }).tokens),
      );
      const rowCells = tb.rows.map((r) =>
        r.map((c) => renderInline((c as unknown as { tokens: Token[] }).tokens)),
      );
      // Pad every cell to its column width so columns line up visually.
      const ncols = headerCells.length;
      const colW = new Array<number>(ncols).fill(0);
      const measure = (cells: string[]) =>
        cells.forEach((c, i) => {
          if (i < ncols) colW[i] = Math.max(colW[i], displayWidth(stripAnsi(c)));
        });
      measure(headerCells);
      rowCells.forEach(measure);
      const pad = (cell: string, i: number) =>
        cell + ' '.repeat(Math.max(0, colW[i] - displayWidth(stripAnsi(cell))));
      const line = (cells: string[]) => '  ' + cells.map((c, i) => pad(c, i)).join('  ');
      const rule = '  ' + colW.map((w) => `${C.border}${'─'.repeat(w)}${RESET}`).join('  ');
      return [line(headerCells.map((c) => BOLD + c + RESET)), rule, ...rowCells.map(line)].join('\n') + '\n\n';
    }
    case 'space':
    case 'html':
      return '';
    default:
      return renderInline([t]);
  }
}
