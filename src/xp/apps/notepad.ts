// Notepad (it opens the README by default). Calculator (calculator-app.ts) is registered here after it, as the
// programs are listed.
import { isBilingual, type Text } from '../../shared/i18n';
import type { XPAppApi } from '../../shared/types';
import { DESKTOP_README } from '../content/readme';
import { registerApp } from '../shell/apps';
import { calcApp } from './calculator-app';
import { ICONS } from './icons';
import { lineCol } from './notepad-text';
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
} as const;

function renderNotepad(content: HTMLElement, api: XPAppApi): () => void {
  const U = ui(api);
  const { h, t } = U;
  const root = U.root(content, 'xpa-notepad', 400);
  const p = api.params ?? {};
  let src: Text | null = typeof p.text === 'string' || isBilingual(p.text) ? p.text : DESKTOP_README;
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
  /** Object URLs of the downloads that are still starting. */
  const saved = new Set<string>();
  U.onCleanup(() => {
    for (const href of saved) URL.revokeObjectURL(href);
  });
  function save(): void {
    try {
      const a = document.createElement('a');
      a.download = name.replace(/[\\/:*?"<>|]/g, '_');
      a.href = URL.createObjectURL(new Blob([ta.value], { type: 'text/plain;charset=utf-8' }));
      document.body.appendChild(a);
      a.click();
      a.remove();
      // the download has started by then; a window closed sooner revokes what is left
      const href = a.href;
      saved.add(href);
      U.later(1000, () => {
        saved.delete(href);
        URL.revokeObjectURL(href);
      });
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
registerApp(calcApp);
