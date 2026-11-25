// Command Prompt: a cmd-like console with real commands, history, tab completion and a few hidden ones. The commands
// themselves are in terminal-commands.ts; this is their window.
import type { XPAppApi } from '../../../types';
import { d } from '../../../content/text';
import { registerApp } from '../../desktop/apps';
import { ICONS } from '../../../components/kit/icons';
import { phuketNow, reduced, ui } from '../../../components/kit/kit';
import { createTerminal } from './terminal-commands';

const T = {
  title: d('Командная строка', 'Command Prompt'),
  commandLine: d('Командная строка', 'Command line'),
  matrixEnd: d(
    'Проснись, посетитель… Матрица — это просто много div-ов.',
    'Wake up, visitor... The Matrix is just a lot of divs.',
  ),
} as const;

function render(content: HTMLElement, api: XPAppApi): () => void {
  const U = ui(api);
  const { h, t } = U;
  const root = U.root(content, 'xpa-term', 420);
  const out = h('div.xpa-term-out.xpa-selectable', { role: 'log', 'aria-live': 'polite' });
  const promptEl = h('span.xpa-term-prompt');
  const input = h('input.xpa-term-in', {
    type: 'text',
    spellcheck: 'false',
    autocomplete: 'off',
    autocapitalize: 'off',
    'aria-label': T.commandLine,
  });
  const screen = h('div.xpa-term-screen', { tabindex: '-1' }, [out, h('div.xpa-term-line', [promptEl, input])]);
  root.appendChild(screen);
  /** Where the arrow keys are in the history. */
  let hi = 0;
  let matrixStop: (() => void) | null = null;
  // the rain stops by itself, on a click or a key, and with the window
  const timers = U.scope();

  const line = (text: string, cls?: string): HTMLDivElement => {
    const el = h('div.xpa-term-l', text === '' ? '\u00A0' : text);
    if (cls) el.classList.add(cls);
    out.appendChild(el);
    return el;
  };
  const toBottom = (): void => {
    screen.scrollTop = screen.scrollHeight;
  };
  const term = createTerminal({
    print: (s, cls) => {
      for (const ln of s.split('\n')) line(ln, cls);
      while (out.children.length > 600) out.firstChild?.remove();
      toBottom();
    },
    printLive: () => {
      const el = line('');
      return (text) => {
        el.textContent = text;
        toBottom();
      };
    },
    clear: () => {
      out.innerHTML = '';
    },
    lang: U.lang,
    openApp: (id, params) => {
      api.openApp(id, params);
    },
    sound: U.sound,
    status: () => api.status(),
    now: () => phuketNow(api),
    close: () => {
      api.win.close();
    },
    setColors: (bg, fg) => {
      screen.style.background = bg;
      screen.style.color = fg;
      input.style.color = fg;
    },
    later: (ms, fn) => {
      U.later(reduced() ? 10 : ms, fn);
    },
    busy: (on) => {
      input.disabled = on;
      if (!on) input.focus();
    },
    matrix: startMatrix,
    random: Math.random,
  });
  const setPrompt = (): void => {
    promptEl.textContent = term.prompt();
  };
  const exec = (raw: string): void => {
    term.exec(raw);
    hi = term.history.length;
    setPrompt();
  };

  input.addEventListener('keydown', (e) => {
    if (matrixStop) {
      e.preventDefault();
      matrixStop();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = input.value;
      input.value = '';
      exec(v);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hi > 0) {
        hi--;
        input.value = term.history[hi] ?? '';
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hi < term.history.length) {
        hi++;
        input.value = term.history[hi] ?? '';
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      input.value = term.complete(input.value) ?? input.value;
    } else if (e.key === 'Escape') input.value = '';
    else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      term.clear();
    } else if (e.key === 'c' && e.ctrlKey && !String(window.getSelection() ?? '')) {
      e.preventDefault();
      term.print(`${term.prompt()}${input.value}^C`, 'cmd');
      input.value = '';
    }
  });
  screen.addEventListener('mouseup', () => {
    if (!String(window.getSelection() ?? '')) input.focus({ preventScroll: true });
  });

  function startMatrix(): void {
    const cv = h('canvas.xpa-term-matrix');
    root.appendChild(cv);
    const w = (cv.width = root.clientWidth);
    const hh = (cv.height = root.clientHeight);
    const ctx = cv.getContext('2d');
    const size = 14;
    const cols = Math.ceil(w / size);
    const drops: number[] = [];
    for (let i = 0; i < cols; i++) drops.push(Math.random() * -20);
    const font = `${String(size)}px monospace`;
    const chars = 'アイウエオカキクケコサシスセソ0123456789VUEDJANGOPYTHON<>{}=/';
    const frame = (): void => {
      if (!ctx) return;
      ctx.fillStyle = 'rgba(0,0,0,.08)';
      ctx.fillRect(0, 0, w, hh);
      ctx.font = font;
      for (let i = 0; i < cols; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)] ?? '0';
        ctx.fillStyle = Math.random() < 0.05 ? '#d7ffd7' : '#00e040';
        const y = drops[i] ?? 0;
        ctx.fillText(ch, i * size, y * size);
        drops[i] = (y * size > hh && Math.random() > 0.97 ? 0 : y) + 1;
      }
    };
    const stop = (): void => {
      timers.dispose();
      cv.remove();
      matrixStop = null;
      term.print(t(T.matrixEnd));
      input.focus();
    };
    matrixStop = stop;
    cv.addEventListener('click', stop);
    if (reduced()) {
      for (let k = 0; k < 40; k++) frame();
      timers.later(1500, stop);
    } else {
      timers.every(50, frame);
      timers.later(6000, stop);
    }
  }

  term.banner();
  const cmd = api.params?.cmd;
  if (typeof cmd === 'string') exec(cmd);
  else setPrompt();
  U.bind(() => {
    api.win.setTitle(t(T.title));
  });
  U.later(30, () => {
    input.focus({ preventScroll: true });
  });
  return U.destroy;
}

registerApp({
  id: 'terminal',
  title: T.title,
  icon: ICONS.terminal,
  desktop: true,
  startMenu: 'programs',
  defaultSize: { w: 640, h: 400 },
  minSize: { w: 280, h: 200 },
  singleton: false,
  render,
});
