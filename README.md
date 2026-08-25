# yifeistarwang-coder.github.io

Terminal-style personal homepage for Yifei Wang. The site doubles as a shell:
visitors type commands (`help`, `cat bio`, `ls`, `tree`…) or click links to
navigate. Content lives in Markdown and compiles into the bundle at build time.

Live: <https://yifeistarwang-coder.github.io>

## Architecture

Four decoupled layers (inspired by jiangyy/jiangyy.github.io):

- **content/** — plain Markdown documents. The directory tree is the
  structure; each document becomes both a page and a command (`cat about`
  ≡ `about`).
- **compiler** — `scripts/build-content.ts` walks `content/` and emits
  `src/generated/content.ts`; `scripts/content-plugin.ts` rebuilds it and
  reloads on change during `npm run dev`.
- **framework** — `src/term/` (xterm.js wrapper: shell/TUI modes, OSC 8
  hyperlinks, screen-reader mode) and `src/shell/` (registry + parser + REPL
  with history, tab completion, pipes).
- **apps** — `src/apps/` command plugins (`help`, `cat`, `ls`, `tree`, `cd`,
  `pwd`, `whoami`, `visitors`, `clear`); register in `src/apps/index.ts`.

## Commands

| command | description |
| --- | --- |
| `help` | list documents and shell commands |
| `cat <file>` | print a document |
| `ls [path]` | list directory contents |
| `tree [path]` | show the directory tree |
| `cd <dir>`, `pwd` | navigate the virtual filesystem |
| `whoami` | display current user |
| `visitors` | show visit counts |
| `clear` | clear the screen |
| any document name | render the document (`index`, `bio`, `projects`, …) |

## Development

```sh
npm install
npm run dev        # dev server, hot-reloads content/*.md
npm run typecheck  # tsc --noEmit
npm test           # node --test via tsx
npm run check      # typecheck + test
npm run build      # content compiler + vite build → dist/
```

## Deployment

`.github/workflows/deploy.yml` runs `check` and `build` on every push to
`main`, then publishes `dist/` to the `gh-pages` branch. GitHub Pages serves
that branch (Settings → Pages → Build and deployment → Source: Deploy from a
branch → `gh-pages` / root).

## Visitor counter

The footer visit badge is served by a self-hosted Cloudflare Worker
(`worker/counter.js`) backed by a KV namespace. The homepage footer `<img>` and
the GitHub profile README badge point at the same `/badge` endpoint, so both
share one counter; each page load increments it once.

Deploy: Cloudflare Dashboard → Workers & Pages → Create a Worker → paste
`worker/counter.js` → create a KV namespace and bind it as `VISITS`.

## Privacy

The only third-party resource is the visit badge served by the self-hosted
Worker above. No analytics, cookies, or tracking scripts.
