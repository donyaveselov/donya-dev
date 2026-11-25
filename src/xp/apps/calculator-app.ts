// Calculator's window: the keypad, the display and the keyboard (the arithmetic is in calculator.ts).
import type { XPAppApi, XPAppDef } from '../../shared/types';
import { d } from '../content/text';
import { Calculator } from './calculator';
import { ICONS } from './icons';
import { copyText, ui } from './kit';
import { APP } from './strings';

const T = {
  calculator: d('Калькулятор', 'Calculator'),
  divZero: d('Деление на ноль невозможно.', 'Cannot divide by zero.'),
  invalid: d('Недопустимый ввод.', 'Invalid input.'),
  ieee: d('Это не баг, это IEEE 754.', 'Not a bug, that is IEEE 754.'),
  aboutCalc: d('О программе', 'About Calculator'),
  calcAbout: d('Считает точнее, чем оценки сроков.', 'More accurate than time estimates.'),
} as const;

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
      label: APP.edit,
      items: [{ label: APP.copy, key: 'Ctrl+C', action: () => void copyText(calc.err ? '' : calc.cur) }],
    },
    {
      label: APP.help,
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
      U.later(90, () => {
        b.classList.remove('down');
      });
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

/** Registered by notepad.ts, after Notepad. */
export const calcApp: XPAppDef = {
  id: 'calc',
  title: T.calculator,
  icon: ICONS.calc,
  desktop: false,
  startMenu: 'programs',
  defaultSize: { w: 300, h: 330 },
  minSize: { w: 260, h: 280 },
  singleton: true,
  render: renderCalc,
};
