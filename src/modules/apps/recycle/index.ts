// Recycle Bin: retired old projects as greyed file names. Nothing can be restored, and nothing is shown.
import { fill } from '../../../i18n/i18n';
import type { Bilingual, XPAppApi } from '../../../types';
import { registerApp } from '../../desktop/apps';
import { ICONS } from '../../../components/kit/icons';
import { reduced, ui } from '../../../components/kit/kit';
import { counted, d, fillEach } from '../../../content/text';
import { APP } from '../../../components/kit/strings';

const T = {
  title: d('Корзина', 'Recycle Bin'),
  restoreError: d('Ошибка восстановления', 'Error Restoring File'),
  allItems: d('все объекты', 'all items'),
  openProjects: d('Открыть «Мои проекты»', 'Open My Projects'),
  confirm: d('Подтверждение удаления', 'Confirm Multiple File Delete'),
  confirmText: d(
    'Вы действительно хотите удалить эти %s навсегда?',
    'Are you sure you want to delete these %s for good?',
  ),
  yes: d('Да', 'Yes'),
  no: d('Нет', 'No'),
  stillHere: d(
    'Попытка №%s. Они всё ещё здесь.\nНекоторые вещи остаются с нами навсегда. Как первый проект.',
    'Attempt #%s. They are still here.\nSome things stay with you forever. Like a first project.',
  ),
  memories: d(
    'Файлы не удалось удалить: они дороги владельцу как память.\nНо и показывать их никто не будет.',
    'The files could not be deleted: the owner keeps them as memories.\nBut nobody is going to show them either.',
  ),
  binProps: d('Свойства: Корзина', 'Recycle Bin Properties'),
  binPropsText: d(
    'Объектов: %s\nМаксимальный размер: сколько не жалко\nВосстановление: отключено владельцем',
    'Items: %s\nMaximum size: whatever it takes\nRestore: disabled by the owner',
  ),
  propsOf: d('Свойства: ', 'Properties: '),
  origin: d('Исходное расположение: ', 'Origin: '),
  deleted: d('Удалён: ', 'Deleted: '),
  size: d('Размер: ', 'Size: '),
  reason: d('Причина: вырос из него', 'Reason: outgrew it'),
  attrs: d('Атрибуты: только для ностальгии', 'Attributes: read-only nostalgia'),
  cannotOpen: d(
    'Чтобы открыть этот файл, его нужно сначала восстановить из Корзины.\nА восстановить его нельзя.',
    'To open this file you need to restore it from the Recycle Bin first.\nAnd it cannot be restored.',
  ),
  restore: d('Восстановить', 'Restore'),
  emptyBin: d('Очистить корзину', 'Empty Recycle Bin'),
  undoDelete: d('Отменить удаление', 'Undo Delete'),
  aboutText: d(
    'Здесь лежат старые проекты из прошлой версии портфолио.',
    'Old projects from the previous portfolio live here.',
  ),
  restoreAll: d('Восстановить всё', 'Restore all'),
  name: d('Имя', 'Name'),
  location: d('Исходное расположение', 'Original Location'),
  dateDeleted: d('Дата удаления', 'Date Deleted'),
  sizeCol: d('Размер', 'Size'),
  deletedFiles: d('Удалённые файлы', 'Deleted files'),
  tasks: d('Задачи корзины', 'Recycle Bin Tasks'),
  emptyTheBin: d('Очистить корзину', 'Empty the Recycle Bin'),
  restoreAllItems: d('Восстановить все объекты', 'Restore all items'),
  otherPlaces: d('Другие места', 'Other Places'),
  noRestore: d('восстановление недоступно', 'cannot be restored'),
} as const;

interface Trashed {
  name: string;
  from: string;
  when: Bilingual;
  size: string;
  type: Bilingual;
}
const FILES: readonly [Trashed, ...Trashed[]] = [
  {
    name: 'башмак.exe',
    from: 'C:\\Projects\\2022',
    when: d('давно', 'long ago'),
    size: '1,4 MB',
    type: d('Приложение', 'Application'),
  },
  {
    name: 'sandwich.glb',
    from: 'C:\\Projects\\2022',
    when: d('давно', 'long ago'),
    size: '6,2 MB',
    type: d('3D-модель', '3D model'),
  },
  {
    name: 'aparts-template.zip',
    from: 'C:\\Projects\\2022',
    when: d('давно', 'long ago'),
    size: '880 KB',
    type: d('Архив', 'Archive'),
  },
  {
    name: 'portfolio-2022.vue',
    from: 'C:\\Projects\\old',
    when: d('в этом году', 'this year'),
    size: '31 KB',
    type: d('Компонент Vue', 'Vue component'),
  },
];

/** Each try to restore gets the next excuse. */
const RESTORE_JOKES: readonly [Bilingual, ...Bilingual[]] = [
  d(
    'Невозможно восстановить «%s».\n\nФайл находится в заслуженном отпуске и просил не беспокоить.',
    'Cannot restore "%s".\n\nThe file is enjoying a well-deserved retirement and asked not to be disturbed.',
  ),
  d(
    'Восстановление «%s» отменено.\n\nЭтот проект писал Даниил из 2022 года. Даниил из 2026 года против.',
    'Restoring "%s" was cancelled.\n\nThis project was written by Daniil from 2022. Daniil from 2026 objects.',
  ),
  d(
    'Ошибка 0x2022: «%s» слишком старый для этого рабочего стола.\n\nСвежие проекты лежат в папке «Мои проекты».',
    'Error 0x2022: "%s" is too old for this desktop.\n\nFresh projects live in the My Projects folder.',
  ),
  d(
    '«%s» восстановлен на 0%.\n\nПроверьте папку «Мои проекты»: там гораздо интереснее.',
    '"%s" restored: 0%.\n\nCheck My Projects instead: it is much more interesting there.',
  ),
];

function render(content: HTMLElement, api: XPAppApi): () => void {
  const U = ui(api);
  const { h, t } = U;
  const root = U.root(content, 'xpa-recycle', 560);
  let sel = -1;
  let jokeI = 0;
  let emptyTries = 0;
  const n = FILES.length;

  /** i < 0: everything. */
  function restore(i: number): void {
    const f = FILES[i < 0 ? 0 : i] ?? FILES[0];
    const j = RESTORE_JOKES[jokeI++ % RESTORE_JOKES.length] ?? RESTORE_JOKES[0];
    U.sound('error');
    U.dialog({
      title: T.restoreError,
      icon: 'error',
      text: fill(j, i < 0 ? t(T.allItems) : f.name),
      buttons: [
        { label: T.openProjects, onClick: () => api.openApp('projects') },
        { label: 'OK', primary: true },
      ],
    });
  }
  function empty(): void {
    U.dialog({
      title: T.confirm,
      icon: 'warn',
      text: fillEach(T.confirmText, counted(n, ['объект', 'объекта', 'объектов'], ['item', 'items'])),
      buttons: [
        {
          label: T.yes,
          primary: true,
          onClick: () => {
            U.sound('recycle');
            emptyTries++;
            list.classList.remove('wobble');
            list.getBoundingClientRect();
            if (!reduced()) list.classList.add('wobble');
            U.later(450, () => {
              U.dialog({
                title: T.title,
                icon: 'info',
                text: emptyTries > 2 ? fill(T.stillHere, emptyTries) : T.memories,
                buttons: [{ label: 'OK', primary: true }],
              });
            });
          },
        },
        { label: T.no },
      ],
    });
  }
  function props(): void {
    const f = FILES[sel];
    if (!f) {
      U.dialog({
        title: T.binProps,
        icon: 'info',
        text: fill(T.binPropsText, n),
        buttons: [{ label: 'OK', primary: true }],
      });
      return;
    }
    U.dialog({
      title: t(T.propsOf) + f.name,
      icon: 'info',
      text: `${t(f.type)}\n${t(T.origin)}${f.from}\n${t(T.deleted)}${t(f.when)}\n${t(T.size)}${f.size}\n${t(T.reason)}\n\n${t(T.attrs)}`,
      buttons: [{ label: 'OK', primary: true }],
    });
  }
  function open(i: number): void {
    const f = FILES[i];
    if (!f) return;
    U.sound('error');
    U.dialog({
      title: f.name,
      icon: 'warn',
      text: T.cannotOpen,
      buttons: [
        {
          label: T.restore,
          onClick: () => {
            restore(i);
          },
        },
        { label: 'OK', primary: true },
      ],
    });
  }

  const menu = U.menubar([
    {
      label: APP.file,
      items: [
        { label: T.emptyBin, action: empty },
        {
          label: T.restore,
          disabled: () => sel < 0,
          action: () => {
            restore(sel);
          },
        },
        { label: APP.properties, action: props },
        { sep: true },
        {
          label: APP.close,
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
            select(0);
          },
        },
        {
          label: T.undoDelete,
          key: 'Ctrl+Z',
          action: () => {
            restore(-1);
          },
        },
      ],
    },
    {
      label: APP.help,
      items: [
        {
          label: APP.about,
          action: () => {
            U.aboutDialog(T.title, T.aboutText);
          },
        },
      ],
    },
  ]);
  const tb = U.toolbar([
    U.tbtn({ g: 'trash', label: T.emptyBin, showLabel: true, big: true, onClick: empty }),
    U.tbtn({
      g: 'restore',
      label: T.restoreAll,
      showLabel: true,
      big: true,
      onClick: () => {
        restore(-1);
      },
    }),
    U.tsep(),
    U.tbtn({ g: 'props', label: APP.properties, big: true, onClick: props }),
  ]);
  const head = h('div.xpa-rb-head', [
    h('span', T.name),
    h('span', T.location),
    h('span', T.dateDeleted),
    h('span', T.sizeCol),
  ]);
  const list = h('div.xpa-rb-list', { role: 'listbox', tabindex: '0', 'aria-label': T.deletedFiles });
  const link = (g: string, label: Bilingual, fn: () => void): HTMLButtonElement =>
    h('button.xpa-tp-link', { type: 'button', on: { click: fn } }, [U.glyph(g), h('span', label)]);
  const tpBox = (title: Bilingual, links: HTMLElement[]): HTMLDivElement =>
    h('div.xpa-tp-box', [h('div.xpa-tp-head', { role: 'heading' }, [h('span', title)]), h('div.xpa-tp-body', links)]);
  const pane = h('div.xpa-taskpane.xpa-rb-pane', [
    tpBox(T.tasks, [
      link('trash', T.emptyTheBin, empty),
      link('restore', T.restoreAllItems, () => {
        restore(-1);
      }),
    ]),
    tpBox(T.otherPlaces, [
      link('folders', APP.myProjects, () => api.openApp('projects')),
      link('props', APP.myComputer, () => api.openApp('about')),
    ]),
  ]);
  const st = U.statusbar(2);
  root.append(menu, tb, h('div.xpa-rb-body', [pane, h('div.xpa-rb-view', [head, list])]), st.el);

  function select(i: number): void {
    sel = i;
    [...list.children].forEach((el, k) => {
      el.classList.toggle('sel', k === i);
      el.setAttribute('aria-selected', String(k === i));
    });
    const f = FILES[i];
    st.set(
      0,
      f ? `${f.name} — ${t(T.noRestore)}` : t(counted(n, ['объект', 'объекта', 'объектов'], ['object', 'objects'])),
    );
  }
  function build(): void {
    list.innerHTML = '';
    FILES.forEach((f, i) => {
      const row = h('div.xpa-rb-row', { role: 'option', 'aria-selected': 'false' }, [
        h('span.xpa-rb-name', [h('span.xpa-g16', { html: ICONS.ghost }), h('span', f.name)]),
        h('span', f.from),
        h('span', t(f.when)),
        h('span', f.size),
      ]);
      row.addEventListener('click', () => {
        select(i);
      });
      row.addEventListener('dblclick', () => {
        open(i);
      });
      list.appendChild(row);
    });
    select(sel);
    st.set(1, '9,3 MB');
    api.win.setTitle(t(T.title));
  }
  list.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      select(Math.min(FILES.length - 1, sel + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      select(Math.max(0, sel - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (sel >= 0) open(sel);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      empty();
    }
  });
  U.bind(build);
  U.later(30, () => {
    list.focus({ preventScroll: true });
  });
  return U.destroy;
}

registerApp({
  id: 'recycle',
  title: T.title,
  icon: ICONS.recycleFull,
  desktop: true,
  startMenu: false,
  defaultSize: { w: 600, h: 380 },
  minSize: { w: 300, h: 220 },
  singleton: true,
  render,
});
