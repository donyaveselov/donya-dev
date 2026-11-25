// Notepad (it opens the README by default) and Calculator.
import { isBilingual, type Text } from '../../shared/i18n';
import type { Bilingual, XPAppApi } from '../../shared/types';
import { registerApp } from '../shell/apps';
import { Calculator } from './calculator';
import { ICONS } from './icons';
import { copyText, pad, phuketNow, ui } from './kit';
import { d } from '../content/text';
import { APP } from './strings';

const T = {
  notepad: d('Блокнот', 'Notepad'),
  phuket: d('Пхукет', 'Phuket'),
  new: d('Создать', 'New'),
  untitled: d('Безымянный.txt', 'Untitled.txt'),
  saveAs: d('Сохранить как…', 'Save As…'),
  copyAll: d('Копировать всё', 'Copy all'),
  timeDate: d('Время и дата', 'Time/Date'),
  format: d('Формат', 'Format'),
  wordWrap: d('Перенос по словам', 'Word Wrap'),
  larger: d('Шрифт крупнее', 'Larger font'),
  smaller: d('Шрифт мельче', 'Smaller font'),
  statusBar: d('Строка состояния', 'Status Bar'),
  aboutNotepad: d('О программе', 'About Notepad'),
  notepadAbout: d('Лучший редактор кода, если других нет.', 'The best code editor when there is no other.'),
  ln: d('Стр ', 'Ln '),
  col: d(', стлб ', ', Col '),
  calculator: d('Калькулятор', 'Calculator'),
  divZero: d('Деление на ноль невозможно.', 'Cannot divide by zero.'),
  invalid: d('Недопустимый ввод.', 'Invalid input.'),
  ieee: d('Это не баг, это IEEE 754.', 'Not a bug, that is IEEE 754.'),
  aboutCalc: d('О программе', 'About Calculator'),
  calcAbout: d('Считает точнее, чем оценки сроков.', 'More accurate than time estimates.'),
} as const;

const README: Bilingual = {
  ru: 'README.txt\r\n==========\r\n\r\nЭтот рабочий стол живёт внутри монитора на сайте Даниила Иванова.\r\n\r\nС чего начать:\r\n  * «Мои проекты» — над чем я работаю сейчас\r\n  * «Резюме» — коротко и по делу\r\n  * «Написать мне» — контакты, которые можно скопировать\r\n  * «Командная строка» — введите help\r\n  * «Сапёр» — первый ход всегда безопасен\r\n\r\nМелочи, которые стоит найти:\r\n  * F5 в Блокноте вставляет время на Пхукете\r\n  * В Корзине лежат старые проекты. Попробуйте их восстановить\r\n  * В консоли есть скрытые команды\r\n\r\nP.S. Этот файл можно редактировать. Сохранять — тоже.\r\n',
  en: "README.txt\r\n==========\r\n\r\nThis desktop lives inside a monitor on Daniil Ivanov's website.\r\n\r\nWhere to start:\r\n  * My Projects: what I am working on now\r\n  * Resume: short and to the point\r\n  * Contact me: contacts you can copy\r\n  * Command Prompt: type help\r\n  * Minesweeper: the first click is always safe\r\n\r\nSmall things worth finding:\r\n  * F5 in Notepad inserts the time in Phuket\r\n  * The Recycle Bin holds old projects. Try restoring them\r\n  * The console has hidden commands\r\n\r\nP.S. You can edit this file. And save it, too.\r\n",
};

/** Line and column (1-based) of a caret offset. */
function lineCol(text: string, caret: number): [number, number] {
  const before = text.slice(0, caret).split('\n');
  return [before.length, (before[before.length - 1] ?? '').length + 1];
}

function renderNotepad(content: HTMLElement, api: XPAppApi): () => void {
  const U = ui(api);
  const { h, t } = U;
  const root = U.root(content, 'xpa-notepad', 400);
  const p = api.params ?? {};
  let src: Text | null = typeof p.text === 'string' || isBilingual(p.text) ? p.text : README;
  let name = typeof p.title === 'string' && p.title ? p.title : 'README.txt';
  let modified = false;
  let wrap = true;
  let showStatus = true;
  let fontSize = 13;

  const ta = h('textarea.xpa-np-text', { spellcheck: 'false', wrap: 'soft', 'aria-label': name });
  const st = U.statusbar(2);
  const title = (): void => {
    api.win.setTitle(`${modified ? '*' : ''}${name} — ${t(T.notepad)}`);
  };
  const pos = (): void => {
    const [ln, col] = lineCol(ta.value, ta.selectionStart);
    st.set(1, `${t(T.ln)}${String(ln)}${t(T.col)}${String(col)}`);
  };
  const changed = (): void => {
    if (!modified) {
      modified = true;
      title();
    }
    pos();
  };
  function save(): void {
    try {
      const a = document.createElement('a');
      a.download = name.replace(/[\\/:*?"<>|]/g, '_');
      a.href = URL.createObjectURL(new Blob([ta.value], { type: 'text/plain;charset=utf-8' }));
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
      }, 1000);
      modified = false;
      title();
    } catch {
      U.sound('error');
    }
  }
  /** F5, as in the real Notepad: the time and date (in Phuket) at the caret. */
  function insertTime(): void {
    const n = phuketNow(api);
    const dt = n.date;
    const s = `${pad(n.h)}:${pad(n.m)} ${pad(dt.getUTCDate())}.${pad(dt.getUTCMonth() + 1)}.${String(dt.getUTCFullYear())} (${t(T.phuket)})`;
    const a = ta.selectionStart;
    ta.value = ta.value.slice(0, a) + s + ta.value.slice(ta.selectionEnd);
    ta.selectionStart = ta.selectionEnd = a + s.length;
    ta.focus();
    changed();
  }
  const setFont = (px: number): void => {
    fontSize = px;
    ta.style.fontSize = `${String(fontSize)}px`;
  };
  const menu = U.menubar([
    {
      label: APP.file,
      items: [
        {
          label: T.new,
          key: 'Ctrl+N',
          action: () => {
            ta.value = '';
            name = t(T.untitled);
            modified = false;
            src = null;
            title();
            pos();
          },
        },
        { label: T.saveAs, key: 'Ctrl+S', action: save },
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
      label: APP.edit,
      items: [
        {
          label: APP.selectAll,
          key: 'Ctrl+A',
          action: () => {
            ta.focus();
            ta.select();
          },
        },
        { label: T.copyAll, action: () => void copyText(ta.value) },
        { label: T.timeDate, key: 'F5', action: insertTime },
      ],
    },
    {
      label: T.format,
      items: [
        {
          label: T.wordWrap,
          checked: () => wrap,
          action: () => {
            wrap = !wrap;
            ta.setAttribute('wrap', wrap ? 'soft' : 'off');
            root.classList.toggle('nowrap', !wrap);
          },
        },
        {
          label: T.larger,
          action: () => {
            setFont(Math.min(22, fontSize + 1));
          },
        },
        {
          label: T.smaller,
          action: () => {
            setFont(Math.max(10, fontSize - 1));
          },
        },
      ],
    },
    {
      label: APP.view,
      items: [
        {
          label: T.statusBar,
          checked: () => showStatus,
          action: () => {
            showStatus = !showStatus;
            st.el.style.display = showStatus ? '' : 'none';
          },
        },
      ],
    },
    {
      label: APP.help,
      items: [
        {
          label: T.aboutNotepad,
          action: () => {
            U.aboutDialog(T.notepad, T.notepadAbout);
          },
        },
      ],
    },
  ]);
  root.append(menu, ta, st.el);

  ta.addEventListener('input', changed);
  for (const ev of ['keyup', 'click', 'select'] as const) ta.addEventListener(ev, pos);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'F5') {
      e.preventDefault();
      insertTime();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save();
    } else if (e.key === 'Tab') {
      // a tab character, not the focus moving on
      e.preventDefault();
      const a = ta.selectionStart;
      ta.value = `${ta.value.slice(0, a)}\t${ta.value.slice(ta.selectionEnd)}`;
      ta.selectionStart = ta.selectionEnd = a + 1;
      changed();
    }
  });
  U.bind(() => {
    // an untouched document follows the language
    if (!modified && src) ta.value = t(src).replace(/\r\n/g, '\n');
    title();
    pos();
    st.set(0, '');
  });
  U.later(30, () => {
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(0, 0);
    ta.scrollTop = 0;
    pos();
  });
  return U.destroy;
}

/* ---------------------------------------------------------------- Calculator */

const CALC_KEYS = [
  'MC',
  '7',
  '8',
  '9',
  '/',
  'sqrt',
  'MR',
  '4',
  '5',
  '6',
  '*',
  '%',
  'MS',
  '1',
  '2',
  '3',
  '-',
  '1/x',
  'M+',
  '0',
  '+/-',
  '.',
  '+',
  '=',
];
const KEY_LABEL: Readonly<Record<string, string>> = { sqrt: '√', '*': '×', '/': '÷' };
/** Keyboard keys besides digits and + - * /. */
const KEY_MAP: Readonly<Record<string, string>> = {
  Enter: '=',
  '=': '=',
  Escape: 'C',
  Delete: 'CE',
  Backspace: 'BS',
  ',': '.',
  '.': '.',
  '@': 'sqrt',
  '%': '%',
};

function renderCalc(content: HTMLElement, api: XPAppApi): () => void {
  const U = ui(api);
  const { h, t } = U;
  const root = U.root(content, 'xpa-calc', 300);
  const calc = new Calculator(() => ({ divZero: t(T.divZero), invalid: t(T.invalid), ieee: t(T.ieee) }));
  const disp = h('div.xpa-calc-disp.xpa-selectable', { role: 'status', 'aria-live': 'polite' }, '0.');
  const memEl = h('div.xpa-calc-mem.xpa-sunken');
  const hint = h('div.xpa-calc-hint', { 'aria-live': 'polite' });
  const show = (): void => {
    disp.textContent = calc.display();
    memEl.textContent = calc.mem ? 'M' : '';
  };
  const press = (k: string): void => {
    if (calc.press(k)) U.sound('notify');
    if (k === '=') hint.textContent = calc.hint;
    show();
  };
  const key = (k: string, label: string, cls: string): HTMLButtonElement => {
    const b = h('button.xpa-calc-k', { type: 'button', 'data-k': k }, label);
    for (const c of cls.split(' ')) b.classList.add(c);
    return b;
  };
  const top = h('div.xpa-calc-top', [
    memEl,
    key('BS', 'Backspace', 'red wide'),
    key('CE', 'CE', 'red'),
    key('C', 'C', 'red'),
  ]);
  // memory keys and operators are red, digits and the rest blue
  const keypad = h(
    'div.xpa-calc-pad',
    CALC_KEYS.map((k) => key(k, KEY_LABEL[k] ?? k, k.startsWith('M') || /^[-+*/=]$/.test(k) ? 'red' : 'blue')),
  );
  const menu = U.menubar([
    {
      label: d('Правка', 'Edit'),
      items: [{ label: APP.copy, key: 'Ctrl+C', action: () => void copyText(calc.err ? '' : calc.cur) }],
    },
    {
      label: d('Справка', 'Help'),
      items: [
        {
          label: T.aboutCalc,
          action: () => {
            U.aboutDialog(T.calculator, T.calcAbout);
          },
        },
      ],
    },
  ]);
  root.appendChild(menu);
  root.appendChild(h('div.xpa-calc-body', [disp, hint, top, keypad]));
  root.addEventListener('click', (e) => {
    const b = e.target instanceof Element ? e.target.closest('[data-k]') : null;
    if (!b) return;
    U.sound('click');
    press(b.getAttribute('data-k') ?? '');
  });
  root.addEventListener('keydown', (e) => {
    const k = e.key;
    if (e.ctrlKey || e.metaKey) {
      if (k === 'c') void copyText(calc.cur);
      return;
    }
    const m = /^[0-9+\-*/]$/.test(k) ? k : KEY_MAP[k];
    if (!m) return;
    e.preventDefault();
    press(m);
    // the key on screen goes down too
    const b = root.querySelector(`[data-k="${m}"]`);
    if (b) {
      b.classList.add('down');
      setTimeout(() => {
        b.classList.remove('down');
      }, 90);
    }
  });
  root.tabIndex = 0;
  U.bind(() => {
    api.win.setTitle(t(T.calculator));
    show();
  });
  U.later(30, () => {
    root.focus({ preventScroll: true });
  });
  return U.destroy;
}

registerApp({
  id: 'notepad',
  title: T.notepad,
  icon: ICONS.notepad,
  desktop: true,
  startMenu: 'programs',
  defaultSize: { w: 560, h: 420 },
  minSize: { w: 260, h: 200 },
  singleton: false,
  render: renderNotepad,
});
registerApp({
  id: 'calc',
  title: T.calculator,
  icon: ICONS.calc,
  desktop: false,
  startMenu: 'programs',
  defaultSize: { w: 300, h: 330 },
  minSize: { w: 260, h: 280 },
  singleton: true,
  render: renderCalc,
});
