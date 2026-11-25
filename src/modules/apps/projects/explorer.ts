// My Projects: an Explorer-style window over the folder that explorer-items.ts describes.
import { fill, type Text } from '../../../i18n/i18n';
import type { Bilingual, XPAppApi } from '../../../types';
import { findProject, PROJECTS, siteApp } from '../../../content/projects';
import { counted } from '../../../content/text';
import { type Item, listItems } from './explorer-items';
import { G16 } from '../../../components/kit/icons';
import { copyText, reduced, ui } from '../../../components/kit/kit';
import { APP } from '../../../components/kit/strings';

const T = {
  unknown: { ru: '?', en: '?' },
  path: { ru: 'C:\\Пользователи\\Даниил\\Мои проекты', en: 'C:\\Users\\Daniil\\My Projects' },
  copyAddress: { ru: 'Копировать путь', en: 'Copy address' },
  selectNext: { ru: 'Выделить следующий', en: 'Select next' },
  tiles: { ru: 'Плитка', en: 'Tiles' },
  icons: { ru: 'Значки', en: 'Icons' },
  details: { ru: 'Таблица', en: 'Details' },
  taskPane: { ru: 'Панель задач', en: 'Task pane' },
  upOneLevel: { ru: 'Вверх', en: 'Up one level' },
  explorer: { ru: 'Проводник проектов', en: 'Project Explorer' },
  explorerAbout: {
    ru: 'Здесь только то, что можно показать. Остальное под NDA и в памяти.',
    en: 'Only what can be shown lives here. The rest is under NDA and in memory.',
  },
  up: { ru: 'Вверх', en: 'Up' },
  views: { ru: 'Вид', en: 'Views' },
  folders: { ru: 'Папки', en: 'Folders' },
  tasks: { ru: 'Задачи', en: 'Project Tasks' },
  otherPlaces: { ru: 'Другие места', en: 'Other Places' },
  resume: { ru: 'Резюме', en: 'Resume' },
  contactMe: { ru: 'Написать мне', en: 'Contact me' },
  startPage: { ru: 'Стартовая страница', en: 'Start page' },
  recycleBin: { ru: 'Корзина', en: 'Recycle Bin' },
  detailsBox: { ru: 'Подробно', en: 'Details' },
  folderContents: { ru: 'Содержимое папки', en: 'Folder contents' },
  propsOf: { ru: 'Свойства: ', en: 'Properties: ' },
  fileFolder: { ru: 'Папка с файлами', en: 'File Folder' },
  openItem: { ru: 'Открыть «%s»', en: 'Open "%s"' },
  overview: { ru: 'Обзор проекта', en: 'Project overview' },
  visitSite: { ru: 'Открыть сайт', en: 'Visit the site' },
  upLevel: { ru: 'На уровень вверх', en: 'Up one level' },
  name: { ru: 'Имя', en: 'Name' },
  type: { ru: 'Тип', en: 'Type' },
  description: { ru: 'Описание', en: 'Description' },
  empty: { ru: 'Эта папка пуста.', en: 'This folder is empty.' },
} as const satisfies Record<string, Bilingual>;

type View = 'tiles' | 'icons' | 'details';

/* ================================================================ Explorer */
export function renderExplorer(content: HTMLElement, api: XPAppApi): () => void {
  const U = ui(api);
  const { h, t } = U;
  const root = U.root(content, 'xpa-explorer', 560);
  const startPath = api.params?.path;
  const state = {
    path: Array.isArray(startPath) ? startPath.filter((x): x is string => typeof x === 'string') : [],
    back: [] as string[][],
    fwd: [] as string[][],
    sel: -1,
    view: 'tiles' as View,
    items: [] as Item[],
  };

  const folderTitle = (path: readonly string[]): Bilingual => {
    const id = path[0];
    if (id === undefined) return APP.myProjects;
    return findProject(id)?.name ?? T.unknown;
  };
  const addr = (path: readonly string[]): string => {
    const base = t(T.path);
    return path.length ? `${base}\\${t(folderTitle(path))}` : base;
  };

  const menu = U.menubar([
    {
      label: APP.file,
      items: [
        { label: APP.open, key: 'Enter', action: openSel, disabled: () => state.sel < 0 },
        { label: APP.properties, key: 'Alt+Enter', action: props, disabled: () => state.sel < 0 },
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
        { label: T.copyAddress, action: () => void copyText(addr(state.path)) },
        {
          label: T.selectNext,
          key: '→',
          action: () => {
            select(Math.min(state.items.length - 1, state.sel + 1));
          },
        },
      ],
    },
    {
      label: APP.view,
      items: [
        {
          label: T.tiles,
          radio: true,
          checked: () => state.view === 'tiles',
          action: () => {
            setView('tiles');
          },
        },
        {
          label: T.icons,
          radio: true,
          checked: () => state.view === 'icons',
          action: () => {
            setView('icons');
          },
        },
        {
          label: T.details,
          radio: true,
          checked: () => state.view === 'details',
          action: () => {
            setView('details');
          },
        },
        { sep: true },
        { label: T.taskPane, checked: () => !root.classList.contains('no-pane'), action: togglePane },
      ],
    },
    {
      label: APP.go,
      items: [
        { label: APP.back, key: 'Alt+←', action: goBack, disabled: () => !state.back.length },
        { label: APP.forward, key: 'Alt+→', action: goFwd, disabled: () => !state.fwd.length },
        { label: T.upOneLevel, key: 'Backspace', action: goUp, disabled: () => !state.path.length },
      ],
    },
    {
      label: APP.help,
      items: [
        {
          label: APP.about,
          action: () => {
            U.aboutDialog(T.explorer, T.explorerAbout);
          },
        },
      ],
    },
  ]);

  const bBack = U.tbtn({ g: 'back', label: APP.back, showLabel: true, big: true, onClick: goBack });
  const bFwd = U.tbtn({ g: 'fwd', label: APP.forward, big: true, onClick: goFwd });
  const bUp = U.tbtn({ g: 'up', label: T.up, big: true, onClick: goUp });
  const bViews = U.tbtn({
    g: 'views',
    label: T.views,
    drop: true,
    big: true,
    onClick: () => {
      setView(state.view === 'tiles' ? 'icons' : state.view === 'icons' ? 'details' : 'tiles');
    },
  });
  const bPane = U.tbtn({ g: 'folders', label: T.folders, showLabel: true, big: true, onClick: togglePane });
  const tb = U.toolbar([bBack, bFwd, bUp, U.tsep(), bPane, U.tsep(), bViews]);

  const addrText = h('span.xpa-addr-text.xpa-selectable');
  const addrIcon = h('span.xpa-g16');
  const addrBar = h('div.xpa-addr', [
    h('span.xpa-addr-label', APP.address),
    h('div.xpa-addr-box', [addrIcon, addrText, h('span.xpa-addr-dd', '▼')]),
    h(
      'button.xpa-go',
      {
        type: 'button',
        on: {
          click: () => {
            U.sound('click');
            render();
          },
        },
      },
      [U.glyph('go'), h('span', APP.go)],
    ),
  ]);

  const tpBox = (title: Bilingual, body: HTMLElement[]): HTMLDivElement => {
    const box = h('div.xpa-tp-box');
    const head = h('button.xpa-tp-head', { type: 'button', 'aria-expanded': 'true' }, [
      h('span', title),
      h('span.xpa-tp-chev', '▲'),
    ]);
    head.addEventListener('click', () => {
      const c = box.classList.toggle('collapsed');
      head.setAttribute('aria-expanded', String(!c));
    });
    box.appendChild(head);
    box.appendChild(h('div.xpa-tp-body', body));
    return box;
  };
  const tpLink = (g: string, label: Text, fn: () => void): HTMLButtonElement =>
    h(
      'button.xpa-tp-link',
      {
        type: 'button',
        on: {
          click: () => {
            U.sound('click');
            fn();
          },
        },
      },
      [U.glyph(g), h('span', label)],
    );
  const tasksBody = h('div');
  const details = h('div.xpa-tp-details');
  const pane = h('div.xpa-taskpane', [
    tpBox(T.tasks, [tasksBody]),
    tpBox(T.otherPlaces, [
      tpLink('props', T.resume, () => api.openApp('resume')),
      tpLink('send', T.contactMe, () => api.openApp('contact')),
      tpLink('home', T.startPage, () => api.openApp('browser')),
      tpLink('trash', T.recycleBin, () => api.openApp('recycle')),
    ]),
    tpBox(T.detailsBox, [details]),
  ]);

  const view = h('div.xpa-ex-view', { tabindex: '0', role: 'listbox', 'aria-label': T.folderContents });
  const st = U.statusbar(2);
  root.append(menu, tb, addrBar, h('div.xpa-ex-body', [pane, view]), st.el);

  function togglePane(): void {
    root.classList.toggle('no-pane');
  }
  function navigate(path: string[]): void {
    state.back.push(state.path);
    state.fwd = [];
    state.path = path;
    state.sel = -1;
    render(true);
  }
  function goBack(): void {
    const prev = state.back.pop();
    if (!prev) return;
    state.fwd.push(state.path);
    state.path = prev;
    state.sel = -1;
    render(true);
  }
  function goFwd(): void {
    const next = state.fwd.pop();
    if (!next) return;
    state.back.push(state.path);
    state.path = next;
    state.sel = -1;
    render(true);
  }
  function goUp(): void {
    if (state.path.length) navigate([]);
  }
  function setView(v: View): void {
    state.view = v;
    render();
  }
  function openItem(it: Item | undefined): void {
    if (!it) return;
    U.sound('click');
    if ('path' in it.open) navigate(it.open.path);
    else api.openApp(it.open.app, it.open.params);
  }
  function openSel(): void {
    openItem(state.items[state.sel]);
  }
  function props(): void {
    const it = state.items[state.sel];
    if (!it) return;
    U.dialog({
      title: t(T.propsOf) + t(it.name),
      icon: 'info',
      text: `${t(it.type)}\n\n${t(it.desc)}`,
      buttons: [{ label: 'OK', primary: true }],
    });
  }
  function select(i: number, scroll = true): void {
    state.sel = i;
    const els = view.querySelectorAll('.xpa-ex-item');
    els.forEach((el, k) => {
      el.classList.toggle('sel', k === i);
      el.setAttribute('aria-selected', String(k === i));
    });
    if (scroll) els[i]?.scrollIntoView({ block: 'nearest' });
    updateSide();
  }

  // the list and the side pane are rebuilt on every selection, folder and language change, so they take their text
  // through t() and leave no bindings behind
  function updateSide(): void {
    const it = state.items[state.sel];
    details.innerHTML = '';
    if (it) {
      details.append(h('b', t(it.name)), h('div', t(it.type)), h('div.xpa-muted', t(it.desc)));
      st.set(0, `${t(it.type)}: ${t(it.desc)}`);
    } else {
      details.append(h('b', t(folderTitle(state.path))), h('div', t(T.fileFolder)));
      st.set(0, t(counted(state.items.length, ['объект', 'объекта', 'объектов'], ['object', 'objects'])));
    }
    tasksBody.innerHTML = '';
    tasksBody.style.display = 'grid';
    tasksBody.style.gap = '6px';
    if (it) tasksBody.appendChild(tpLink('fwd', t(fill(T.openItem, t(it.name))), openSel));
    const id = state.path[0];
    const p = id === undefined ? null : findProject(id);
    if (p) {
      const repo = p.repo;
      tasksBody.appendChild(tpLink('props', t(T.overview), () => api.openApp('project', { id: p.id })));
      tasksBody.appendChild(tpLink('link', t(T.visitSite), () => api.openApp(siteApp(p), { url: p.url })));
      if (repo) tasksBody.appendChild(tpLink('link', t(APP.github), () => window.open(repo, '_blank', 'noopener')));
      tasksBody.appendChild(tpLink('up', t(T.upLevel), goUp));
    } else
      for (const pp of PROJECTS)
        tasksBody.appendChild(
          tpLink('folders', t(pp.name), () => {
            navigate([pp.id]);
          }),
        );
  }

  function render(navigated = false): void {
    state.items = listItems(state.path, t);
    api.win.setTitle(t(folderTitle(state.path)));
    addrText.textContent = addr(state.path);
    addrIcon.innerHTML = G16.folders ?? '';
    bBack.disabled = !state.back.length;
    bFwd.disabled = !state.fwd.length;
    bUp.disabled = !state.path.length;
    view.className = `xpa-ex-view v-${state.view}${navigated && !reduced() ? ' entering' : ''}`;
    view.innerHTML = '';
    const v = state.view;
    if (v === 'details')
      view.appendChild(
        h('div.xpa-ex-dhead', [h('span', t(T.name)), h('span', t(T.type)), h('span', t(T.description))]),
      );
    state.items.forEach((it, i) => {
      const el = h('div.xpa-ex-item', { role: 'option', 'aria-selected': 'false', 'data-key': it.key }, [
        U.icon(it.icon),
        h('div.xpa-ex-txt', [
          h('div.xpa-ex-name', t(it.name)),
          v === 'tiles' ? h('div.xpa-ex-sub', t(it.sub)) : null,
          v === 'tiles' ? h('div.xpa-ex-sub', t(it.type)) : null,
        ]),
        v === 'details' ? h('div.xpa-ex-col', t(it.type)) : null,
        v === 'details' ? h('div.xpa-ex-col', t(it.desc)) : null,
      ]);
      let lastTap = 0;
      el.addEventListener('click', (e) => {
        select(i, false);
        // a tap opens at once; a mouse needs a double click
        const caps = (e as MouseEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } }).sourceCapabilities;
        const touch = e.pointerType === 'touch' || !!caps?.firesTouchEvents;
        const now = Date.now();
        if (touch || now - lastTap < 400) {
          openItem(it);
          lastTap = 0;
        } else lastTap = now;
      });
      el.addEventListener('dblclick', (e) => {
        e.preventDefault();
      });
      view.appendChild(el);
    });
    if (!state.items.length) view.appendChild(h('div.xpa-muted', { style: { padding: '12px' } }, t(T.empty)));
    if (state.sel >= 0) select(state.sel, false);
    else updateSide();
    st.set(1, APP.myComputer);
  }

  view.addEventListener('click', (e) => {
    if (e.target === view) select(-1);
  });
  view.addEventListener('keydown', (e) => {
    const n = state.items.length;
    const i = state.sel;
    let cols = 1;
    if (state.view !== 'details') {
      // items per row: how many share the first one's top
      const items = [...view.querySelectorAll<HTMLElement>('.xpa-ex-item')];
      const top0 = items[0]?.offsetTop;
      if (items.length > 1) {
        cols = 0;
        for (const x of items) {
          if (x.offsetTop !== top0) break;
          cols++;
        }
      }
    }
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      goBack();
      return;
    }
    if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      goFwd();
      return;
    }
    if (e.altKey && e.key === 'Enter') {
      e.preventDefault();
      props();
      return;
    }
    const keys: Record<string, (() => void) | undefined> = {
      ArrowRight: () => {
        select(Math.min(n - 1, i + 1));
      },
      ArrowLeft: () => {
        select(Math.max(0, i - 1));
      },
      ArrowDown: () => {
        select(Math.min(n - 1, i < 0 ? 0 : i + cols));
      },
      ArrowUp: () => {
        select(Math.max(0, i - cols));
      },
      Home: () => {
        select(0);
      },
      End: () => {
        select(n - 1);
      },
      Enter: openSel,
      Backspace: goUp,
    };
    const run = keys[e.key];
    if (run) {
      e.preventDefault();
      run();
    }
  });
  U.bind(() => {
    render();
  });
  U.later(30, () => {
    view.focus({ preventScroll: true });
  });
  return U.destroy;
}
