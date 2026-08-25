// Wiring: build the terminal, registry, store, shell; register /bin commands
// AND one command per content document; wire navigation (history-based, so the
// browser Back button works) and start the REPL.
import './style.css';
import { Term } from './term/term';
import { createRegistry } from './shell/registry';
import { Shell } from './shell/shell';
import { createStore } from './content/store';
import { docCommand } from './content/commands';
import { builtinApps } from './apps';
import { recordVisit } from './apps/visitors';

recordVisit();

// The visit badge is cache-busted on every load so each page view actually
// reaches komarev and increments the shared counter. The extra query param is
// safe: ghpvc counts by username only, label/color/style/extra params do not
// change the counter key.
const visitImg = document.querySelector<HTMLImageElement>('.term-footer .visits img');
if (visitImg) {
  visitImg.src += (visitImg.src.includes('?') ? '&' : '?') + 't=' + Date.now();
}

const termHost = document.getElementById('term-host');
const termScreen = document.getElementById('term-screen');
if (!termHost || !termScreen) throw new Error('missing #term-host/#term-screen');

const commandFromHash = () => location.hash.replace(/^#/, '').trim();
const initial = commandFromHash() || 'index';

let shell: Shell;
// Internal links and quick-command buttons push a history entry (so Back
// works) and run the command.
const navigate = (cmd: string) => {
  history.pushState({ cmd }, '', '#' + cmd);
  shell.inject(cmd);
};

const term = new Term(termScreen, navigate);

const registry = createRegistry();
const store = createStore();
for (const cmd of builtinApps) registry.register(cmd);
for (const doc of store.all()) registry.register(docCommand(doc));

shell = new Shell({ term, registry, store, initialCommand: initial });

// Quick-command buttons in the titlebar (touch friendly): same effect as
// clicking an internal link inside the terminal.
for (const btn of document.querySelectorAll<HTMLButtonElement>('.quick-cmds [data-cmd]')) {
  btn.addEventListener('click', () => navigate(btn.dataset.cmd ?? 'help'));
}

// Clicking the padding around the xterm surface refocuses the terminal so
// typing always lands at the prompt.
document.querySelector('.term-body')?.addEventListener('click', () => term.focus());

// Back/Forward: run whatever page the history entry recorded.
window.addEventListener('popstate', (e) => {
  const cmd = (e.state?.cmd as string | undefined) || commandFromHash() || 'index';
  shell.inject(cmd);
});

// Clear the hash on load so a plain refresh returns to home (index).
history.replaceState({ cmd: initial }, '', location.pathname + location.search);

void shell.start();

// Reveal the terminal only once it has been fit at final (post-font-load)
// metrics. The host starts at opacity:0 (html.js) so neither the pre-JS frame
// nor the web-font swap reflow is visible; we fade it in after the fit
// settles. The 1.5s timeout is a safety net in case font loading stalls.
let revealed = false;
const reveal = () => {
  if (revealed) return;
  revealed = true;
  try {
    term.fit();
  } finally {
    termHost.classList.add('ready');
    term.focus();
  }
};
const fontReady = document.fonts?.ready ?? null;
if (fontReady) fontReady.then(reveal);
else reveal();
setTimeout(reveal, 1500);
