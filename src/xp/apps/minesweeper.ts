// Minesweeper: classic rules (minesweeper-board.ts) with the original winmine.exe sprites, flags, question marks,
// chording, a touch flag mode and three sizes.
import type { Bilingual, XPAppApi } from '../../shared/types';
import { ico } from '../icons';
import { registerApp } from '../shell/apps';
import { ICONS } from './icons';
import { reduced, ui } from './kit';
import { Board, ledDigits } from './minesweeper-board';
import { d } from '../content/text';
import { APP } from './strings';

type Level = 'beginner' | 'intermediate' | 'expert';
const LEVELS: Record<Level, { r: number; c: number; m: number; label: Bilingual }> = {
  beginner: { r: 9, c: 9, m: 10, label: d('Новичок', 'Beginner') },
  intermediate: { r: 16, c: 16, m: 40, label: d('Любитель', 'Intermediate') },
  expert: { r: 16, c: 30, m: 99, label: d('Профессионал', 'Expert') },
};
const isLevel = (v: unknown): v is Level => typeof v === 'string' && v in LEVELS;

const T = {
  title: d('Сапёр', 'Minesweeper'),
  game: d('Игра', 'Game'),
  newGame: d('Новая игра', 'New'),
  marks: d('Метки (?)', 'Marks (?)'),
  flagModeMenu: d('Режим флажков (касание)', 'Flag mode (touch)'),
  bestMenu: d('Лучшие результаты…', 'Best Times…'),
  howTo: d('Как играть', 'How to play'),
  aboutText: d(
    'Первый ход всегда безопасен. Как и первое сообщение в Telegram.',
    'The first click is always safe. So is the first message on Telegram.',
  ),
  newGameBtn: d('Новая игра', 'New game'),
  flagMode: d('Режим флажков', 'Flag mode'),
  minefield: d('Минное поле', 'Minefield'),
  empty: d('пусто', 'empty'),
  flag: d('флажок', 'flag'),
  closed: d('закрыто', 'closed'),
  boom: d('Бум! Игра окончена.', 'Boom! Game over.'),
  win: d('Победа!', 'You win!'),
  record: d('Новый рекорд для уровня «%s»: ', 'New best time for %s: '),
  recordTail: d(
    ' с.\n\nТакая внимательность пригодится и в код-ревью.',
    ' s.\n\nThat kind of attention also works well in code review.',
  ),
  minesLeft: d('Мин осталось: ', 'Mines left: '),
  time: d('Время: ', 'Time: '),
  rules: d(
    'Откройте все клетки без мин.\n\n• Щелчок — открыть клетку (первый всегда безопасен).\n• Правая кнопка или долгое касание — флажок.\n• Щелчок по цифре, у которой стоят все флажки, открывает соседей.\n• Клавиатура: стрелки, пробел — открыть, F — флажок, F2 — новая игра.',
    'Open every cell that has no mine.\n\n• Click opens a cell (the first one is always safe).\n• Right click or long press places a flag.\n• Clicking a number whose flags are all placed opens its neighbours.\n• Keyboard: arrows, Space opens, F flags, F2 starts a new game.',
  ),
  seconds: d(' с', ' s'),
  anonymous: d('Аноним', 'Anonymous'),
  bestTitle: d('Лучшие результаты', 'Fastest Mine Sweepers'),
  reset: d('Сбросить', 'Reset Scores'),
} as const;

/* The original winmine.exe sprites: 16 px cells (a 1 px grid line on an open cell, a 2 px bevel on a closed one). */
function sprite(key: string, vb: string, size = 16): string {
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><image href="${ico(key) ?? ''}" width="${String(size)}" height="${String(size)}" style="image-rendering:pixelated"/></svg>`;
}
const OPEN_VB = '1 1 15 15';
const SHUT_VB = '2 2 12 12';
const MINE_S = sprite('ms_mine', OPEN_VB);
const BOOM_S = sprite('ms_boom', OPEN_VB);
const WRONG_S = sprite('ms_misflagged', OPEN_VB);
const FLAG_S = sprite('ms_flag', SHUT_VB);
const QMARK_S = sprite('ms_question', SHUT_VB);
const FLAG_BTN = sprite('ms_flag', '0 0 16 16');
const NUM_S = Array.from({ length: 9 }, (_, n) => (n ? sprite(`ms_n${String(n)}`, OPEN_VB) : ''));
type Face = 'smile' | 'oh' | 'dead' | 'cool';
const FACES: Record<Face, string> = {
  smile: sprite('ms_smile', '0 0 17 17', 17),
  oh: sprite('ms_ohh', '0 0 17 17', 17),
  dead: sprite('ms_dead', '0 0 17 17', 17),
  cool: sprite('ms_win', '0 0 17 17', 17),
};

function led(n: number): string {
  const s = ledDigits(n);
  let out = '<svg viewBox="0 0 39 23" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
  for (let i = 0; i < 3; i++) {
    const ch = s[i] ?? '0';
    out += `<image href="${ico(ch === '-' ? 'ms_dminus' : `ms_d${ch}`) ?? ''}" x="${String(i * 13)}" width="13" height="23" style="image-rendering:pixelated"/>`;
  }
  return `${out}</svg>`;
}

interface Saved {
  level?: unknown;
  marks?: unknown;
}
function readJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as unknown;
  } catch {
    return {};
  }
}

interface Press {
  i: number;
  touch?: boolean;
  both?: boolean;
  rightOnly?: boolean;
  flagged?: boolean;
  cancel?: boolean;
  longT?: number;
}

function render(content: HTMLElement, api: XPAppApi): () => void {
  const U = ui(api);
  const { h, t } = U;
  const root = U.root(content, 'xpa-mines', 520);
  let level: Level = 'beginner';
  let marks = true;
  let flagMode = false;
  const saved = readJson('xpa-mines') as Saved | null;
  if (saved && isLevel(saved.level)) level = saved.level;
  if (saved?.marks === false) marks = false;
  let best: Partial<Record<Level, number>> =
    (readJson('xpa-mines-best') as Partial<Record<Level, number>> | null) ?? {};
  const save = (): void => {
    try {
      localStorage.setItem('xpa-mines', JSON.stringify({ level, marks }));
      localStorage.setItem('xpa-mines-best', JSON.stringify(best));
    } catch {
      /* storage blocked */
    }
  };

  let G = new Board(LEVELS[level].r, LEVELS[level].c, LEVELS[level].m);
  let cells: HTMLDivElement[] = [];
  let time = 0;
  let timerId = 0;
  let cursor = 0;

  const menu = U.menubar([
    {
      label: T.game,
      items: [
        {
          label: T.newGame,
          key: 'F2',
          action: () => {
            newGame();
          },
        },
        { sep: true },
        ...(Object.keys(LEVELS) as Level[]).map((l) => ({
          label: LEVELS[l].label,
          radio: true,
          checked: () => level === l,
          action: () => {
            setLevel(l);
          },
        })),
        { sep: true },
        {
          label: T.marks,
          checked: () => marks,
          action: () => {
            marks = !marks;
            save();
          },
        },
        {
          label: T.flagModeMenu,
          checked: () => flagMode,
          action: () => {
            toggleFlagMode();
          },
        },
        { sep: true },
        { label: T.bestMenu, action: showBest },
        { sep: true },
        {
          label: APP.exit,
          action: () => {
            api.win.close();
          },
        },
      ],
    },
    {
      label: APP.help,
      items: [
        { label: T.howTo, key: 'F1', action: help },
        {
          label: APP.about,
          action: () => {
            U.aboutDialog(T.title, T.aboutText);
          },
        },
      ],
    },
  ]);

  const mineLed = h('div.xpa-ms-led', { role: 'img' });
  const timeLed = h('div.xpa-ms-led', { role: 'img' });
  const smiley = h('button.xpa-ms-face', { type: 'button', 'aria-label': T.newGameBtn });
  const flagBtn = h('button.xpa-ms-flagmode', {
    type: 'button',
    'aria-pressed': 'false',
    title: T.flagMode,
    html: FLAG_BTN,
  });
  const board = h('div.xpa-ms-board', { role: 'grid', tabindex: '0', 'aria-label': T.minefield });
  const game = h('div.xpa-ms-game', [
    h('div.xpa-ms-top', [mineLed, h('div.xpa-ms-mid', [smiley, flagBtn]), timeLed]),
    h('div.xpa-ms-field', [board]),
  ]);
  const wrapEl = h('div.xpa-ms-wrap', [game]);
  const live = h('div.xpa-sr', { 'aria-live': 'polite' });
  root.append(menu, wrapEl, live);

  function setLevel(l: Level): void {
    level = l;
    save();
    newGame();
    fitWindow();
  }
  function toggleFlagMode(): void {
    flagMode = !flagMode;
    flagBtn.setAttribute('aria-pressed', String(flagMode));
    flagBtn.classList.toggle('on', flagMode);
  }

  function newGame(): void {
    const L = LEVELS[level];
    clearInterval(timerId);
    timerId = 0;
    G = new Board(L.r, L.c, L.m);
    time = 0;
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${String(L.c)}, var(--cs))`;
    cells = [];
    for (let k = 0; k < G.size; k++) {
      const cell = h('div.xpa-ms-cell', { role: 'gridcell', 'data-i': String(k) });
      cells.push(cell);
      board.appendChild(cell);
    }
    cursor = Math.min(cursor, G.size - 1);
    setFace('smile');
    updateLeds();
    sizeCells();
    paintCursor();
    root.setAttribute('data-level', level);
  }

  function paint(i: number): void {
    const el = cells[i];
    if (!el) return;
    el.className = 'xpa-ms-cell';
    el.innerHTML = '';
    const flag = G.flag[i];
    const n = G.n[i] ?? 0;
    if (G.open[i]) {
      el.classList.add('open');
      if (G.mine[i]) {
        el.innerHTML = G.boom === i ? BOOM_S : MINE_S;
        if (G.boom === i) el.classList.add('boom');
      } else if (n) {
        el.innerHTML = NUM_S[n] ?? '';
        el.classList.add(`n${String(n)}`);
      }
    } else if (G.over && G.mine[i] && flag !== 1 && !G.won) {
      el.classList.add('open');
      el.innerHTML = MINE_S;
    } else if (G.over && !G.mine[i] && flag === 1) {
      el.classList.add('open', 'wrong');
      el.innerHTML = WRONG_S;
    } else if (flag === 1) {
      el.innerHTML = FLAG_S;
      el.classList.add('flag');
    } else if (flag === 2) el.innerHTML = QMARK_S;
    if (i === cursor) el.classList.add('cur');
    el.setAttribute(
      'aria-label',
      G.open[i] ? (G.mine[i] ? 'mine' : n ? String(n) : t(T.empty)) : flag === 1 ? t(T.flag) : t(T.closed),
    );
  }
  const paintAll = (): void => {
    for (let i = 0; i < G.size; i++) paint(i);
  };

  function reveal(i: number): void {
    const wasPlaced = G.placed;
    const r = G.reveal(i);
    if (!wasPlaced && G.placed) {
      timerId = window.setInterval(() => {
        if (time < 999) {
          time++;
          updateLeds();
        }
      }, 1000);
      time = 1;
      updateLeds();
    }
    if (r === 'boom') {
      lose();
      return;
    }
    for (const k of r) paint(k);
    if (r.length) checkWin();
  }
  function chord(i: number): void {
    for (const q of G.chordTargets(i)) reveal(q);
  }
  function toggleFlag(i: number): void {
    if (!G.cycleFlag(i, marks)) return;
    paint(i);
    updateLeds();
    U.sound('click');
  }

  function lose(): void {
    clearInterval(timerId);
    setFace('dead');
    paintAll();
    U.sound('error');
    live.textContent = t(T.boom);
    if (!reduced()) {
      game.classList.remove('shake');
      game.getBoundingClientRect();
      game.classList.add('shake');
    }
  }
  function checkWin(): void {
    if (!G.checkWin()) return;
    clearInterval(timerId);
    paintAll();
    updateLeds();
    setFace('cool');
    U.sound('notify');
    live.textContent = t(T.win);
    const prev = best[level];
    if (!prev || time < prev) {
      best[level] = time;
      save();
      U.dialog({
        title: T.title,
        icon: 'info',
        text: `${t(T.record).replace('%s', t(LEVELS[level].label))}${String(time)}${t(T.recordTail)}`,
        buttons: [{ label: 'OK', primary: true }],
      });
    }
  }

  function updateLeds(): void {
    const left = G.mines - G.flags;
    mineLed.innerHTML = led(left);
    mineLed.setAttribute('aria-label', t(T.minesLeft) + String(left));
    timeLed.innerHTML = led(time);
    timeLed.setAttribute('aria-label', t(T.time) + String(time));
  }
  let faceNow: Face | '' = '';
  function setFace(k: Face): void {
    if (faceNow === k) return;
    faceNow = k;
    smiley.innerHTML = FACES[k];
  }

  /* ---- pointer input */
  let press: Press | null = null;
  const cellIndex = (el: Element | null): number => {
    const c = el?.closest('.xpa-ms-cell');
    return c && board.contains(c) ? Number(c.getAttribute('data-i')) : -1;
  };
  const clearPressed = (): void => {
    for (const el of board.querySelectorAll('.pressed')) el.classList.remove('pressed');
  };
  function showPressed(i: number, both: boolean): void {
    clearPressed();
    if (i < 0 || G.over) return;
    const list = both || G.open[i] ? [i, ...G.neighbors(i)] : [i];
    for (const q of list) if (!G.open[q] && G.flag[q] !== 1) cells[q]?.classList.add('pressed');
  }
  board.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
  board.addEventListener('pointerdown', (e) => {
    if (G.over && e.button !== 0) return;
    const i = cellIndex(e.target instanceof Element ? e.target : null);
    if (i < 0) return;
    cursor = i;
    paintCursor();
    if (e.pointerType === 'touch') {
      const p: Press = { i, touch: true, flagged: false };
      // a long press plants a flag
      p.longT = window.setTimeout(() => {
        if (press && !G.open[press.i]) {
          toggleFlag(press.i);
          press.flagged = true;
          try {
            navigator.vibrate(20);
          } catch {
            /* no vibration motor */
          }
        }
      }, 420);
      press = p;
      if (!G.over) setFace('oh');
      showPressed(i, false);
      return;
    }
    if (e.button === 2 && !(e.buttons & 1)) {
      toggleFlag(i);
      press = { i, rightOnly: true };
      return;
    }
    if (e.button === 0 || e.button === 1 || (e.buttons & 3) === 3) {
      e.preventDefault();
      const both = e.button === 1 || (e.buttons & 3) === 3;
      press = { i, both };
      if (!G.over) setFace('oh');
      showPressed(i, both);
      try {
        board.setPointerCapture(e.pointerId);
      } catch {
        /* the pointer is already gone */
      }
    }
  });
  board.addEventListener('pointermove', (e) => {
    if (!press || press.rightOnly) return;
    const i = cellIndex(document.elementFromPoint(e.clientX, e.clientY));
    if (press.touch && i !== press.i) {
      clearTimeout(press.longT);
      press.cancel = true;
    }
    if (i !== press.i) {
      press.i = i;
      showPressed(i, !!press.both);
    }
    if ((e.buttons & 3) === 3) press.both = true;
  });
  board.addEventListener('pointerup', () => {
    const p = press;
    if (!p) return;
    press = null;
    clearTimeout(p.longT);
    clearPressed();
    if (!G.over) setFace('smile');
    if (p.rightOnly || p.i < 0 || p.cancel) return;
    if (p.touch) {
      if (p.flagged) return;
      if (flagMode && !G.open[p.i]) {
        toggleFlag(p.i);
        return;
      }
      if (G.open[p.i]) chord(p.i);
      else reveal(p.i);
      return;
    }
    if (p.both || G.open[p.i]) chord(p.i);
    else reveal(p.i);
    if (!G.over) setFace('smile');
  });
  board.addEventListener('pointercancel', () => {
    if (!press) return;
    clearTimeout(press.longT);
    press = null;
    clearPressed();
    if (!G.over) setFace('smile');
  });

  smiley.addEventListener('click', () => {
    U.sound('click');
    newGame();
  });
  flagBtn.addEventListener('click', () => {
    U.sound('click');
    toggleFlagMode();
  });

  /* ---- keyboard */
  function paintCursor(): void {
    board.querySelector('.cur')?.classList.remove('cur');
    cells[cursor]?.classList.add('cur');
  }
  board.addEventListener('keydown', (e) => {
    let r = Math.floor(cursor / G.cols);
    let c = cursor % G.cols;
    if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
    else if (e.key === 'ArrowDown') r = Math.min(G.rows - 1, r + 1);
    else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
    else if (e.key === 'ArrowRight') c = Math.min(G.cols - 1, c + 1);
    else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (G.open[cursor]) chord(cursor);
      else reveal(cursor);
      return;
    } else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') {
      // F, or the same key on a Russian layout
      e.preventDefault();
      toggleFlag(cursor);
      return;
    } else return;
    e.preventDefault();
    cursor = r * G.cols + c;
    paintCursor();
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'F2') {
      e.preventDefault();
      newGame();
    } else if (e.key === 'F1') {
      e.preventDefault();
      help();
    }
  });

  function help(): void {
    U.dialog({ title: T.howTo, icon: 'info', text: T.rules, buttons: [{ label: 'OK', primary: true }] });
  }
  function showBest(): void {
    const lines = (Object.keys(LEVELS) as Level[]).map((k) => {
      const b = best[k];
      return `${t(LEVELS[k].label)}: ${b ? String(b) + t(T.seconds) : `999 ${t(T.anonymous)}`}`;
    });
    U.dialog({
      title: T.bestTitle,
      icon: 'info',
      text: lines.join('\n'),
      buttons: [
        {
          label: T.reset,
          onClick: () => {
            best = {};
            save();
          },
        },
        { label: 'OK', primary: true },
      ],
    });
  }

  const coarse = window.matchMedia('(pointer: coarse)');
  function sizeCells(): void {
    // big enough to tap on a touch screen or a narrow window, the classic 16 px otherwise
    const fit = Math.floor((wrapEl.clientWidth - 30) / G.cols);
    const cs = coarse.matches || root.clientWidth < 520 ? Math.max(16, Math.min(26, fit)) : 16;
    root.style.setProperty('--cs', `${String(cs)}px`);
  }
  /** Fits the window around the board. */
  function fitWindow(): void {
    requestAnimationFrame(() => {
      api.win.resize(game.offsetWidth + 34, game.offsetHeight + 22 + 28 + 34);
    });
  }
  const ro = new ResizeObserver(sizeCells);
  ro.observe(wrapEl);
  U.onCleanup(() => {
    ro.disconnect();
  });

  newGame();
  fitWindow();
  U.bind(() => {
    api.win.setTitle(t(T.title));
    updateLeds();
  });
  U.onCleanup(() => {
    clearInterval(timerId);
  });
  U.later(30, () => {
    board.focus({ preventScroll: true });
  });
  return U.destroy;
}

registerApp({
  id: 'minesweeper',
  title: T.title,
  icon: ICONS.minesweeper,
  desktop: true,
  startMenu: 'programs',
  defaultSize: { w: 300, h: 380 },
  minSize: { w: 220, h: 260 },
  singleton: true,
  render,
});
