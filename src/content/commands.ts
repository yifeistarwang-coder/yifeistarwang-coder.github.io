// Turn a content document into a shell command. Every markdown file becomes
// runnable by its slug — `bio` and `cat bio` reach the same content.
import type { Command, Context } from '../shell/types';
import type { Document } from './types';
import { renderMarkdown } from './render';

export function docCommand(doc: Document): Command {
  return {
    name: doc.slug,
    description: `${doc.title} (document)`,
    doc: true,
    async run(ctx: Context) {
      // Wrap to the live terminal width when talking to the tty; emit
      // unwrapped text into pipes so downstream commands see clean input.
      const width = ctx.tty ? ctx.term.cols : 0;
      ctx.stdout.write(renderMarkdown(doc.body, width));
    },
  };
}
