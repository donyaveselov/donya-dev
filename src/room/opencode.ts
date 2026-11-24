/* An opencode session that never ends: the owner asks to centre a div, the agent tries, the test says "almost", repeat.
   Every attempt is assembled from phrase pools with a seeded random, so it keeps going without visibly looping.
   Line kinds: u = the owner's prompt, a = the agent's text, t = a tool call, + / - = diff lines, o = tool output,
   ' ' = a gap. */

import { must } from './util';

export type LineKind = 'u' | 'a' | 't' | '+' | '-' | 'o' | ' ';
export type Line = readonly [LineKind, string];

const ASK: readonly [string, ...string[]] = [
  'отцентруй див',
  'он всё ещё не по центру',
  'теперь по вертикали уехал',
  'по горизонтали ок, а по вертикали нет',
  'на мобилке опять слева',
  'ну почти, ещё чуть-чуть правее',
  'стало хуже, верни как было и отцентруй',
  'в сафари съехал',
  'просто. отцентруй. див.',
  'а теперь он по центру, но не тот див',
  'он по центру экрана, а надо по центру родителя',
  'почему он прыгает при загрузке',
  'теперь скролл появился',
  'дизайнер говорит, на пиксель левее',
  'на 4к мониторе не по центру',
  'при ресайзе окна уезжает',
  'а если текст в две строки?',
  'теперь кнопка внутри не по центру',
  'окей, а оптически по центру?',
  'я верю в тебя, отцентруй',
];
const THINK = [
  'Понял. Сейчас отцентрую.',
  'Вижу проблему: у родителя нет высоты.',
  'Похоже, мешает margin у соседа.',
  'Попробую через flex, это надёжнее.',
  'Тут поможет grid, одна строка.',
  'Старый добрый transform точно сработает.',
  'Дело в box-sizing. Наверное.',
  'Уберу предыдущую попытку и сделаю чисто.',
  'Нашёл: это всё inline-block и пробел в разметке.',
  'Проблема в скроллбаре, он съедает 15 пикселей.',
  'В этот раз наверняка.',
  'Ага, вложенный контейнер сбивает центр.',
  'Добавлю обёртку. Ещё одну.',
  'Причина в шрифте: у него смещена базовая линия.',
  'Кажется, я понял CSS. Сейчас.',
  'Спокойно. Это решаемая задача.',
];
/** An edit: the line removed, the lines added. */
const TRY: readonly (readonly [string, readonly string[]])[] = [
  ['  margin-left: 20px;', ['  margin: 0 auto;']],
  ['  margin: 0 auto;', ['  text-align: center;']],
  ['  text-align: center;', ['  display: flex;', '  justify-content: center;']],
  ['  justify-content: center;', ['  justify-content: center;', '  align-items: center;']],
  ['  display: flex;', ['  display: grid;', '  place-items: center;']],
  ['  place-items: center;', ['  position: absolute;', '  top: 50%; left: 50%;']],
  ['  top: 50%; left: 50%;', ['  top: 50%; left: 50%;', '  transform: translate(-50%, -50%);']],
  ['  transform: translate(-50%, -50%);', ['  inset: 0;', '  margin: auto;']],
  ['  margin: auto;', ['  display: table-cell;', '  vertical-align: middle;']],
  ['  vertical-align: middle;', ['  line-height: 100vh;']],
  ['  line-height: 100vh;', ['  padding-top: 47.3%;']],
  ['  padding-top: 47.3%;', ['  margin-left: calc(50% - 137px);']],
  ['  margin-left: calc(50% - 137px);', ['  margin-left: calc(50% - 136.5px) !important;']],
  ['  height: auto;', ['  height: 100%;', '  min-height: 100vh;']],
  ['  min-height: 100vh;', ['  min-height: 100dvh;']],
  ['  width: 100vw;', ['  width: 100%;']],
  ['  align-items: center;', ['  align-items: safe center;']],
  ['  <div class="box">', ['  <center><div class="box">']],
  ['  left: 50%;', ['  left: 49.9%; /* оптически */']],
  ['  .wrapper {', ['  .wrapper .wrapper-inner .wrapper-center {']],
];
const FILES = [
  'src/styles.css',
  'src/App.vue',
  'src/components/Box.vue',
  'src/layouts/default.vue',
  'src/assets/main.css',
];
const MISS = [
  'на %dpx левее центра',
  'на %dpx правее центра',
  'на %dpx выше центра',
  'на %dpx ниже центра',
  'по центру, но только в Chrome',
  'по центру, пока не открыть консоль',
  'по центру на 1920px, на 1921px уже нет',
  'на %d.5px левее центра',
  'по центру, но это другой див',
  'по центру страницы, а не родителя',
  'центр найден, див не найден',
  'на %dpx левее в Safari',
];
const AFTER = [
  'Почти. Осталось чуть-чуть.',
  'Странно, у меня работало.',
  'Это уже ближе.',
  'Хм. Попробую иначе.',
  'Теперь точно знаю, в чём дело.',
  'Кто вообще придумал CSS.',
  'Интересный случай.',
  'Это особенность браузера, но я её обойду.',
  'Мы на верном пути.',
  'Зафиксирую прогресс и продолжу.',
  'Ещё один подход.',
  'Не сдаёмся.',
];

/** Seconds of pause after a line of each kind lands. */
const WAIT: Record<LineKind, number> = { u: 0.7, a: 0.45, t: 0.5, '+': 0.12, '-': 0.12, o: 0.9, ' ': 0.25 };
/** Prose is typed (the owner slower than the agent); tool lines land whole. */
const isTyped = (k: LineKind): boolean => k === 'u' || k === 'a';
const MAX_LINES = 40;

export class CodeSession {
  /** Finished lines, the last 40. */
  readonly lines: Line[] = [];
  /** The line being typed, and how many of its characters are out (fractional). */
  cur: Line | null = null;
  shown = 0;
  /** Attempts so far. */
  n = 0;
  /** The time of the last step, 0 before the first one. */
  last = 0;
  private readonly queue: Line[] = [];
  private wait = 0;
  private seed: number;
  private readonly seen = new Map<readonly unknown[], number[]>();

  constructor(seed = 20261124) {
    this.seed = seed;
  }

  private rnd(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  /** Never the same phrase from a pool twice in a row, nor one of its last few. */
  private pick<T>(pool: readonly T[]): T {
    let seen = this.seen.get(pool);
    if (!seen) this.seen.set(pool, (seen = []));
    let i: number;
    let tries = 0;
    do i = Math.floor(this.rnd() * pool.length);
    while (seen.includes(i) && ++tries < 12);
    seen.push(i);
    if (seen.length > Math.min(6, pool.length - 1)) seen.shift();
    return must(pool[i]);
  }

  private attempt(): void {
    const q = this.queue;
    const n = ++this.n;
    const edit = this.pick(TRY);
    const file = this.pick(FILES);
    const win = n % 9 === 0;
    q.push(['u', n === 1 ? ASK[0] : this.pick(ASK)], [' ', '']);
    q.push(['a', this.pick(THINK)]);
    if (this.rnd() < 0.45) q.push(['t', 'Read  ' + file]);
    if (this.rnd() < 0.25) q.push(['t', 'Grep  "center" in src']);
    q.push(['t', 'Edit  ' + file], ['-', edit[0]]);
    for (const l of edit[1]) q.push(['+', l]);
    q.push(['t', 'Bash  npx playwright test center.spec.ts']);
    if (win) {
      q.push(
        ['o', '  ✓ div is centered (1.' + String(Math.floor(this.rnd() * 9)) + 's)'],
        ['a', 'Готово! Див по центру. Попытка №' + String(n) + '.'],
        [' ', ''],
      );
    } else {
      q.push(
        ['o', '  ✗ div is centered: ' + this.pick(MISS).replace('%d', String(1 + Math.floor(this.rnd() * 14)))],
        ['a', this.pick(AFTER) + ' Попытка №' + String(n + 1) + '.'],
        [' ', ''],
      );
    }
  }

  /** Plays `dt` seconds of the session. */
  step(dt: number): void {
    while (dt > 0) {
      if (this.wait > 0) {
        const w = Math.min(this.wait, dt);
        this.wait -= w;
        dt -= w;
        continue;
      }
      if (!this.cur) {
        if (!this.queue.length) this.attempt();
        const next = must(this.queue.shift());
        this.cur = next;
        this.shown = isTyped(next[0]) ? 0 : next[1].length;
      }
      const cur = this.cur;
      if (isTyped(cur[0]) && this.shown < cur[1].length) {
        const rate = cur[0] === 'u' ? 16 : 42;
        const need = (cur[1].length - this.shown) / rate;
        if (dt < need) {
          this.shown += dt * rate;
          break;
        }
        this.shown = cur[1].length;
        dt -= need;
      }
      this.lines.push(cur);
      if (this.lines.length > MAX_LINES) this.lines.shift();
      this.wait = WAIT[cur[0]];
      this.cur = null;
    }
  }

  /** True while the owner is typing a prompt (the prompt box shows the key hints, not the spinner). */
  get asking(): boolean {
    return this.cur?.[0] === 'u';
  }
}

/** Splits text into lines no wider than maxW (a single long token is split hard). */
export function wrapText(measure: (s: string) => number, tx: string, maxW: number): string[] {
  if (!tx || measure(tx) <= maxW) return [tx];
  const out: string[] = [];
  let line = '';
  for (let w of tx.split(' ')) {
    const tryL = line ? line + ' ' + w : w;
    if (measure(tryL) <= maxW) {
      line = tryL;
      continue;
    }
    if (line) out.push(line);
    while (measure(w) > maxW && w.length > 1) {
      let n = w.length;
      while (n > 1 && measure(w.slice(0, n)) > maxW) n--;
      out.push(w.slice(0, n));
      w = w.slice(n);
    }
    line = w;
  }
  if (line) out.push(line);
  return out;
}
