// Terminal abstraction over xterm.js. Owns the xterm instance + addons and
// exposes two modes:
//   - shell mode: raw input via onShellData (the shell implements line editing)
//   - tui mode:   takeOver() hands an app exclusive key + draw control
// Uses xterm's default DOM renderer so OSC 8 hyperlinks stay clickable.
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import '@xterm/xterm/css/xterm.css';

export interface KeyEvent {
  key: string;
  domEvent: KeyboardEvent;
}

export interface TermSize {
  cols: number;
  rows: number;
}

/** Control surface handed to a TUI app while it owns the terminal. */
export interface TuiSession {
  readonly cols: number;
  readonly rows: number;
  write(s: string): void;
  clear(): void;
  onKey(cb: (e: KeyEvent) => void): () => void;
  onResize(cb: (size: TermSize) => void): () => void;
  /** Return control to the shell. */
  release(): void;
}

/** If `target` is an internal same-page link, return its command slug; else null. */
function internalPage(target: string): string | null {
  if (target.startsWith('#')) return target.slice(1) || null;
  try {
    const u = new URL(target, location.href);
    if (u.origin === location.origin && u.pathname === location.pathname && u.hash) {
      return u.hash.slice(1) || null;
    }
  } catch {
    /* not a url */
  }
  return null;
}

export class Term {
  readonly xterm: Terminal;
  private fitAddon = new FitAddon();
  private mode: 'shell' | 'tui' = 'shell';
  private shellDataCb?: (d: string) => void;
  private tuiKeyCb?: (e: KeyEvent) => void;
  private tuiResizeCb?: (size: TermSize) => void;
  private cleanups: Array<() => void> = [];
  private readonly onNavigate?: (cmd: string) => void;

  constructor(host: HTMLElement, onNavigate?: (cmd: string) => void) {
    this.onNavigate = onNavigate;
    this.xterm = new Terminal({
      fontFamily:
        '"SFMono-Regular", "Cascadia Code", "Fira Code", "JetBrains Mono", ' +
        '"Roboto Mono", Menlo, Consolas, "PingFang SC", "Microsoft YaHei", ' +
        '"Noto Sans CJK SC", "Apple Color Emoji", monospace',
      fontSize: 14,
      lineHeight: 1.35,
      letterSpacing: 0,
      cursorBlink: true,
      allowProposedApi: true,
      // Expose output to screen readers (aria-live) — without this the whole
      // page content is invisible to assistive tech.
      screenReaderMode: true,
      linkHandler: {
        allowNonHttpProtocols: true,
        activate: (_event, target) => {
          // Internal same-page links go through onNavigate (pushState + run);
          // mailto hands off to the mail client; everything else opens in a
          // new tab.
          const page = internalPage(target);
          if (page !== null) {
            this.onNavigate?.(page);
            return;
          }
          if (target.startsWith('mailto:')) {
            window.location.href = target;
            return;
          }
          window.open(target, '_blank', 'noopener');
        },
      },
      // Light palette aligned with style.css variables.
      theme: {
        background: '#fafafa',
        foreground: '#333333',
        cursor: '#2a6f4e',
        cursorAccent: '#fafafa',
        selectionBackground: '#e0e0e0',
        black: '#333333',
        red: '#c06060',
        green: '#2a6f4e',
        yellow: '#8a6d3b',
        blue: '#3a5f8a',
        magenta: '#7a5195',
        cyan: '#2f7a8a',
        white: '#fafafa',
        brightBlack: '#666666',
        brightWhite: '#111111',
      },
    });

    this.xterm.loadAddon(this.fitAddon);
    this.xterm.open(host);
    try {
      // Wide-character (CJK / emoji) width handling.
      this.xterm.loadAddon(new Unicode11Addon());
      this.xterm.unicode.activeVersion = '11';
    } catch (e) {
      console.warn('unicode11 addon unavailable', e);
    }
    this.fit();

    const ro = new ResizeObserver(() => this.fit());
    ro.observe(host);
    this.cleanups.push(() => ro.disconnect());

    const d1 = this.xterm.onData((d) => {
      if (this.mode === 'shell') this.shellDataCb?.(d);
    });
    this.cleanups.push(() => d1.dispose());
    const d2 = this.xterm.onKey((e) => {
      if (this.mode === 'tui') this.tuiKeyCb?.(e);
    });
    this.cleanups.push(() => d2.dispose());
    const d3 = this.xterm.onResize(({ cols, rows }) => {
      if (this.mode === 'tui') this.tuiResizeCb?.({ cols, rows });
    });
    this.cleanups.push(() => d3.dispose());
  }

  get cols() {
    return this.xterm.cols;
  }
  get rows() {
    return this.xterm.rows;
  }

  write(s: string) {
    this.xterm.write(s.replace(/(?<!\r)\n/g, '\r\n'));
  }
  print(s: string) {
    this.write(s + '\n');
  }
  clear() {
    this.xterm.clear();
  }
  fit() {
    this.fitAddon.fit();
  }
  focus() {
    this.xterm.focus();
  }

  /** Shell-mode raw keystream. Returns an unsubscribe. */
  onShellData(cb: (d: string) => void): () => void {
    this.shellDataCb = cb;
    return () => {
      if (this.shellDataCb === cb) this.shellDataCb = undefined;
    };
  }

  /** Hand the terminal to a TUI app. */
  takeOver(): TuiSession {
    this.mode = 'tui';
    const xt = this.xterm;
    const self = this;
    return {
      get cols() {
        return xt.cols;
      },
      get rows() {
        return xt.rows;
      },
      write: (s) => xt.write(s),
      clear: () => xt.reset(),
      onKey: (cb) => {
        self.tuiKeyCb = cb;
        return () => {
          if (self.tuiKeyCb === cb) self.tuiKeyCb = undefined;
        };
      },
      onResize: (cb) => {
        self.tuiResizeCb = cb;
        return () => {
          if (self.tuiResizeCb === cb) self.tuiResizeCb = undefined;
        };
      },
      release: () => {
        self.mode = 'shell';
      },
    };
  }

  dispose() {
    for (const c of this.cleanups) c();
    this.xterm.dispose();
  }
}
