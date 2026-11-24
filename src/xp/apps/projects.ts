// My Projects: an Explorer-style window (projects), a document window per project (project), and the live sites as
// desktop programs (wax, kompy-app).
import { fill, type Text } from '../../shared/i18n';
import type { Bilingual, Lang, XPAppApi, XPAppParams } from '../../shared/types';
import { findProject, type Project, PROJECTS } from '../content/projects';
import { registerApp } from '../shell/apps';
import { G16, G24, ICONS } from './icons';
import { copyText, reduced, ui } from './kit';
import { genericMock, MOCKS } from './mocks';

const T = {
  myProjects: { ru: 'Мои проекты', en: 'My Projects' },
  projectFolder: { ru: 'Папка проекта', en: 'Project folder' },
  textDoc: { ru: 'Текстовый документ', en: 'Text Document' },
  readmeDesc: { ru: 'Как пользоваться этой папкой', en: 'How to use this folder' },
  overviewDoc: { ru: '%s — обзор.doc', en: '%s — overview.doc' },
  document: { ru: 'Документ', en: 'Document' },
  pngImage: { ru: 'Изображение PNG', en: 'PNG Image' },
  stackDesc: { ru: 'Технологии проекта', en: 'Technologies used' },
  lines: { ru: 'строк', en: 'lines' },
  stack: { ru: 'стек', en: 'stack' },
  shortcut: { ru: 'Интернет-ярлык', en: 'Internet Shortcut' },
  path: { ru: 'C:\\Пользователи\\Даниил\\Мои проекты', en: 'C:\\Users\\Daniil\\My Projects' },
  file: { ru: 'Файл', en: 'File' },
  open: { ru: 'Открыть', en: 'Open' },
  properties: { ru: 'Свойства', en: 'Properties' },
  close: { ru: 'Закрыть', en: 'Close' },
  edit: { ru: 'Правка', en: 'Edit' },
  copyAddress: { ru: 'Копировать путь', en: 'Copy address' },
  selectNext: { ru: 'Выделить следующий', en: 'Select next' },
  view: { ru: 'Вид', en: 'View' },
  tiles: { ru: 'Плитка', en: 'Tiles' },
  icons: { ru: 'Значки', en: 'Icons' },
  details: { ru: 'Таблица', en: 'Details' },
  taskPane: { ru: 'Панель задач', en: 'Task pane' },
  go: { ru: 'Переход', en: 'Go' },
  back: { ru: 'Назад', en: 'Back' },
  forward: { ru: 'Вперёд', en: 'Forward' },
  upOneLevel: { ru: 'Вверх', en: 'Up one level' },
  up: { ru: 'Вверх', en: 'Up' },
  help: { ru: 'Справка', en: 'Help' },
  about: { ru: 'О программе', en: 'About' },
  explorer: { ru: 'Проводник проектов', en: 'Project Explorer' },
  explorerAbout: {
    ru: 'Здесь только то, что можно показать. Остальное под NDA и в памяти.',
    en: 'Only what can be shown lives here. The rest is under NDA and in memory.',
  },
  views: { ru: 'Вид', en: 'Views' },
  folders: { ru: 'Папки', en: 'Folders' },
  address: { ru: 'Адрес', en: 'Address' },
  tasks: { ru: 'Задачи', en: 'Project Tasks' },
  otherPlaces: { ru: 'Другие места', en: 'Other Places' },
  detailsBox: { ru: 'Подробно', en: 'Details' },
  resume: { ru: 'Резюме', en: 'Resume' },
  contactMe: { ru: 'Написать мне', en: 'Contact me' },
  startPage: { ru: 'Стартовая страница', en: 'Start page' },
  recycleBin: { ru: 'Корзина', en: 'Recycle Bin' },
  folderContents: { ru: 'Содержимое папки', en: 'Folder contents' },
  propsOf: { ru: 'Свойства: ', en: 'Properties: ' },
  fileFolder: { ru: 'Папка с файлами', en: 'File Folder' },
  objects: { ru: 'объектов', en: 'objects' },
  openItem: { ru: 'Открыть «%s»', en: 'Open "%s"' },
  overview: { ru: 'Обзор проекта', en: 'Project overview' },
  visitSite: { ru: 'Открыть сайт', en: 'Visit the site' },
  github: { ru: 'Код на GitHub', en: 'Code on GitHub' },
  upLevel: { ru: 'На уровень вверх', en: 'Up one level' },
  name: { ru: 'Имя', en: 'Name' },
  type: { ru: 'Тип', en: 'Type' },
  description: { ru: 'Описание', en: 'Description' },
  empty: { ru: 'Эта папка пуста.', en: 'This folder is empty.' },
  myComputer: { ru: 'Мой компьютер', en: 'My Computer' },
  unknown: { ru: '?', en: '?' },
  // the project document
  visit: { ru: 'Открыть сайт', en: 'Visit site' },
  openFolder: { ru: 'Открыть папку проекта', en: 'Open project folder' },
  nextProject: { ru: 'Следующий проект', en: 'Next project' },
  prevProject: { ru: 'Предыдущий проект', en: 'Previous project' },
  copyLink: { ru: 'Копировать ссылку', en: 'Copy link' },
  copyStack: { ru: 'Копировать стек', en: 'Copy stack' },
  zoomIn: { ru: 'Крупнее', en: 'Zoom in' },
  zoomOut: { ru: 'Мельче', en: 'Zoom out' },
  actualSize: { ru: 'Обычный размер', en: 'Actual size' },
  toFolder: { ru: 'К папке', en: 'Folder' },
  previous: { ru: 'Предыдущий', en: 'Previous' },
  next: { ru: 'Следующий', en: 'Next' },
  fig: { ru: 'Рис. ', en: 'Fig. ' },
  role: { ru: 'Роль', en: 'Role' },
  link: { ru: 'Ссылка', en: 'Link' },
  notPublic: { ru: 'пока не публичный', en: 'not public yet' },
  stackTitle: { ru: 'Стек', en: 'Stack' },
  whatIDid: { ru: 'Что я сделал', en: 'What I did' },
  looks: { ru: 'Как это выглядит', en: 'What it looks like' },
  openUrl: { ru: 'Открыть %s', en: 'Open %s' },
  nextProjectBtn: { ru: 'Следующий проект ›', en: 'Next project ›' },
  projectOf: { ru: 'Проект %s', en: 'Project %s' },
  of: { ru: ' из ', en: ' of ' },
  project: { ru: 'Проект', en: 'Project' },
  // the site windows
  newTab: { ru: 'Открыть в новой вкладке', en: 'Open in a new tab' },
  opening: { ru: 'Открывается ', en: 'Opening ' },
  down: { ru: 'Сайт %s сейчас недоступен', en: '%s is not reachable right now' },
  downWhy: {
    ru: 'Возможно, его ещё не выложили или нет интернета. В папке «Мои проекты» есть описание и скриншоты.',
    en: 'It may not be deployed yet, or the internet is off. «My Projects» has the overview and screenshots.',
  },
  openOverview: { ru: 'Открыть описание', en: 'Open the overview' },
} as const satisfies Record<string, Bilingual>;

const README: Bilingual = {
  ru: 'Привет! Это папка с проектами.\r\n\r\nКаждая подпапка — один проект: описание, «скриншоты»,\r\nстек и ссылка, если проект публичный.\r\n\r\nДвойной щелчок открывает, Backspace — на уровень вверх,\r\nAlt+← / Alt+→ — назад и вперёд.\r\n\r\nСтарые проекты лежат в Корзине. Восстановить их нельзя.\r\nМы пробовали.',
  en: 'Hi! This is the projects folder.\r\n\r\nEach subfolder is one project: an overview, "screenshots",\r\nthe stack and a link when the project is public.\r\n\r\nDouble-click opens, Backspace goes up a level,\r\nAlt+Left / Alt+Right go back and forward.\r\n\r\nOld projects live in the Recycle Bin. They cannot be restored.\r\nWe tried.',
};

const bare = (url: string): string => url.replace(/^https?:\/\//, '');

/** stack.txt of a project, in one language. */
export function stackText(p: Project, lang: Lang): string {
  return `${p.name[lang]} — ${T.stack[lang]}\r\n${'='.repeat(31)}\r\n\r\n${p.stack.map((s) => `  * ${s}`).join('\r\n')}\r\n`;
}

/** What opening an item does: go into a folder, or open an app with params. */
type Opener = { path: string[] } | { app: string; params: XPAppParams };

interface Item {
  key: string;
  icon: string;
  name: Text;
  type: Bilingual;
  desc: Text;
  sub: Text;
  open: Opener;
}

/** The items of a folder; path is [] (the root) or [projectId]. */
export function listItems(path: readonly string[], t: (d: Text) => string): Item[] {
  const id = path[0];
  if (id === undefined)
    return [
      ...PROJECTS.map((p): Item => ({
        key: p.id,
        icon: p.icon,
        name: p.name,
        type: T.projectFolder,
        desc: p.tagline,
        sub: p.type,
        open: { path: [p.id] },
      })),
      {
        key: 'readme',
        icon: 'txt',
        name: 'README.txt',
        type: T.textDoc,
        desc: T.readmeDesc,
        sub: '1 KB',
        open: { app: 'notepad', params: { title: 'README.txt', text: README } },
      },
    ];
  const p = findProject(id);
  if (!p) return [];
  const out: Item[] = [
    {
      key: 'doc',
      icon: 'doc',
      name: fill(T.overviewDoc, t(p.name)),
      type: T.document,
      desc: p.summary,
      sub: p.period,
      open: { app: 'project', params: { id: p.id } },
    },
    ...p.shots.map((s, i): Item => ({
      key: `shot${String(i)}`,
      icon: 'image',
      name: `${s.kind}.png`,
      type: T.pngImage,
      desc: s.title,
      sub: s.title,
      open: { app: 'project', params: { id: p.id, shot: i } },
    })),
    {
      key: 'stack',
      icon: 'txt',
      name: 'stack.txt',
      type: T.textDoc,
      desc: T.stackDesc,
      sub: `${String(p.stack.length)} ${t(T.lines)}`,
      open: {
        app: 'notepad',
        params: { title: 'stack.txt', text: { ru: stackText(p, 'ru'), en: stackText(p, 'en') } },
      },
    },
  ];
  if (p.repo)
    out.push({
      key: 'repo',
      icon: 'url',
      name: 'github.url',
      type: T.shortcut,
      desc: p.repo,
      sub: bare(p.repo),
      open: { app: 'browser', params: { url: p.repo } },
    });
  out.push({
    key: 'url',
    icon: 'url',
    name: `${bare(p.url)}.url`,
    type: T.shortcut,
    desc: p.url,
    sub: bare(p.url),
    open: { app: 'browser', params: { url: p.url } },
  });
  return out;
}

/** The site window that shows a project's live site. */
const siteApp = (p: Project): string => (p.id === 'wax' ? 'wax' : p.id === 'kompy' ? 'kompy-app' : 'browser');

type View = 'tiles' | 'icons' | 'details';

/* ================================================================ Explorer */
function renderExplorer(content: HTMLElement, api: XPAppApi): () => void {
  const U = ui(api);
  const { h, t } = U;
  const root = U.root(content, 'xpa-explorer', 560);
  const startPath = api.params?.path;
  const state = {
    path: Array.isArray(startPath) ? (startPath as string[]).slice() : ([] as string[]),
    back: [] as string[][],
    fwd: [] as string[][],
    sel: -1,
    view: 'tiles' as View,
    items: [] as Item[],
  };

  const folderTitle = (path: readonly string[]): Bilingual => {
    const id = path[0];
    if (id === undefined) return T.myProjects;
    return findProject(id)?.name ?? T.unknown;
  };
  const addr = (path: readonly string[]): string => {
    const base = t(T.path);
    return path.length ? `${base}\\${t(folderTitle(path))}` : base;
  };

  const menu = U.menubar([
    {
      label: T.file,
      items: [
        { label: T.open, key: 'Enter', action: openSel, disabled: () => state.sel < 0 },
        { label: T.properties, key: 'Alt+Enter', action: props, disabled: () => state.sel < 0 },
        { sep: true },
        {
          label: T.close,
          action: () => {
            api.win.close();
          },
        },
      ],
    },
    {
      label: T.edit,
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
      label: T.view,
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
      label: T.go,
      items: [
        { label: T.back, key: 'Alt+←', action: goBack, disabled: () => !state.back.length },
        { label: T.forward, key: 'Alt+→', action: goFwd, disabled: () => !state.fwd.length },
        { label: T.upOneLevel, key: 'Backspace', action: goUp, disabled: () => !state.path.length },
      ],
    },
    {
      label: T.help,
      items: [
        {
          label: T.about,
          action: () => {
            U.aboutDialog(T.explorer, T.explorerAbout);
          },
        },
      ],
    },
  ]);

  const bBack = U.tbtn({ g: 'back', label: T.back, showLabel: true, big: true, onClick: goBack });
  const bFwd = U.tbtn({ g: 'fwd', label: T.forward, big: true, onClick: goFwd });
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
    h('span.xpa-addr-label', T.address),
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
      [U.glyph('go'), h('span', T.go)],
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

  function updateSide(): void {
    const it = state.items[state.sel];
    details.innerHTML = '';
    if (it) {
      details.append(h('b', t(it.name)), h('div', t(it.type)), h('div.xpa-muted', t(it.desc)));
      st.set(0, `${t(it.type)}: ${t(it.desc)}`);
    } else {
      details.append(h('b', t(folderTitle(state.path))), h('div', t(T.fileFolder)));
      st.set(0, `${String(state.items.length)} ${t(T.objects)}`);
    }
    tasksBody.innerHTML = '';
    tasksBody.style.display = 'grid';
    tasksBody.style.gap = '6px';
    if (it) tasksBody.appendChild(tpLink('fwd', fill(T.openItem, t(it.name)), openSel));
    const id = state.path[0];
    const p = id === undefined ? null : findProject(id);
    if (p) {
      const repo = p.repo;
      tasksBody.appendChild(tpLink('props', T.overview, () => api.openApp('project', { id: p.id })));
      tasksBody.appendChild(tpLink('link', T.visitSite, () => api.openApp(siteApp(p), { url: p.url })));
      if (repo) tasksBody.appendChild(tpLink('link', T.github, () => window.open(repo, '_blank', 'noopener')));
      tasksBody.appendChild(tpLink('up', T.upLevel, goUp));
    } else
      for (const pp of PROJECTS)
        tasksBody.appendChild(
          tpLink('folders', pp.name, () => {
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
      view.appendChild(h('div.xpa-ex-dhead', [h('span', T.name), h('span', T.type), h('span', T.description)]));
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
    if (!state.items.length) view.appendChild(h('div.xpa-muted', { style: { padding: '12px' } }, T.empty));
    if (state.sel >= 0) select(state.sel, false);
    else updateSide();
    st.set(1, T.myComputer);
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

/* ================================================================ Project document */
function renderProject(content: HTMLElement, api: XPAppApi): () => void {
  const U = ui(api);
  const { h, t } = U;
  const root = U.root(content, 'xpa-projdoc', 560);
  const id = api.params?.id;
  let idx = Math.max(
    0,
    PROJECTS.findIndex((p) => p.id === id),
  );
  const shotParam = api.params?.shot;
  let shot = typeof shotParam === 'number' ? shotParam : 0;
  let zoom = 1;
  const proj = (): Project => {
    const p = PROJECTS[idx];
    if (!p) throw new Error('no such project');
    return p;
  };

  const linkBtn = h('a.xpa-tb.xpa-tb-link', { target: '_blank', rel: 'noopener noreferrer' }, [
    U.glyph('link'),
    h('span.xpa-tb-l', T.visit),
  ]);
  const openFolder = (): void => {
    api.openApp('projects', { path: [proj().id] });
  };
  const menu = U.menubar([
    {
      label: T.file,
      items: [
        { label: T.openFolder, action: openFolder },
        {
          label: T.nextProject,
          key: 'Ctrl+→',
          action: () => {
            go(1);
          },
        },
        {
          label: T.prevProject,
          key: 'Ctrl+←',
          action: () => {
            go(-1);
          },
        },
        { sep: true },
        {
          label: T.close,
          action: () => {
            api.win.close();
          },
        },
      ],
    },
    {
      label: T.edit,
      items: [
        { label: T.copyLink, disabled: () => !proj().url, action: () => void copyText(proj().url) },
        { label: T.copyStack, action: () => void copyText(proj().stack.join(', ')) },
      ],
    },
    {
      label: T.view,
      items: [
        {
          label: T.zoomIn,
          key: 'Ctrl++',
          action: () => {
            setZoom(zoom + 0.1);
          },
        },
        {
          label: T.zoomOut,
          key: 'Ctrl+-',
          action: () => {
            setZoom(zoom - 0.1);
          },
        },
        {
          label: T.actualSize,
          key: 'Ctrl+0',
          action: () => {
            setZoom(1);
          },
        },
      ],
    },
  ]);
  const tb = U.toolbar([
    U.tbtn({ g: 'up', label: T.toFolder, showLabel: true, big: true, onClick: openFolder }),
    U.tsep(),
    U.tbtn({
      g: 'back',
      label: T.prevProject,
      big: true,
      onClick: () => {
        go(-1);
      },
    }),
    U.tbtn({
      g: 'fwd',
      label: T.nextProject,
      big: true,
      onClick: () => {
        go(1);
      },
    }),
    U.tsep(),
    linkBtn,
  ]);
  const page = h('div.xpa-pd-page.xpa-selectable');
  const scroller = h('div.xpa-pd-scroll', { tabindex: '0' }, [page]);
  const st = U.statusbar(2);
  root.append(menu, tb, scroller, st.el);

  function go(d: number): void {
    idx = (idx + d + PROJECTS.length) % PROJECTS.length;
    shot = 0;
    U.sound('click');
    render();
    scroller.scrollTop = 0;
  }
  function setZoom(z: number): void {
    zoom = Math.max(0.8, Math.min(1.4, Math.round(z * 10) / 10));
    page.style.fontSize = `${String(12 * zoom)}px`;
    st.set(1, `${String(Math.round(zoom * 100))}%`);
  }

  const mock = (kind: string, title: string): string => (MOCKS[kind] ?? ((l: Lang) => genericMock(l, title)))(U.lang());
  const arrow = (key: 'back' | 'fwd'): HTMLSpanElement => h('span.xpa-g16.x24', { html: G24[key] ?? '' });

  let gallery: HTMLDivElement | null = null;
  function renderGallery(p: Project): HTMLDivElement {
    const frame = h('div.xpa-pd-frame', { tabindex: '0', role: 'img' });
    const cap = h('div.xpa-pd-cap');
    const thumbs = h('div.xpa-pd-thumbs', { role: 'tablist' });
    const prev = h('button.xpa-pd-arrow.l', { type: 'button', 'aria-label': T.previous }, arrow('back'));
    const next = h('button.xpa-pd-arrow.r', { type: 'button', 'aria-label': T.next }, arrow('fwd'));
    const n = p.shots.length;
    function show(i: number, anim: boolean): void {
      shot = (i + n) % n;
      const s = p.shots[shot];
      if (!s) return;
      frame.innerHTML = mock(s.kind, t(s.title));
      frame.setAttribute('aria-label', t(s.title));
      if (anim && !reduced()) {
        frame.classList.remove('flip');
        frame.getBoundingClientRect();
        frame.classList.add('flip');
      }
      cap.textContent = `${t(T.fig)}${String(shot + 1)} / ${String(n)} — ${t(s.title)}`;
      [...thumbs.children].forEach((b, k) => {
        b.setAttribute('aria-selected', String(k === shot));
      });
    }
    p.shots.forEach((s, i) => {
      const b = h('button.xpa-pd-thumb', {
        type: 'button',
        role: 'tab',
        title: t(s.title),
        html: mock(s.kind, t(s.title)),
      });
      b.addEventListener('click', () => {
        U.sound('click');
        show(i, true);
      });
      thumbs.appendChild(b);
    });
    prev.addEventListener('click', () => {
      show(shot - 1, true);
    });
    next.addEventListener('click', () => {
      show(shot + 1, true);
    });
    frame.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        show(shot - 1, true);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        show(shot + 1, true);
      }
    });
    const g = h('div.xpa-pd-gallery', [h('div.xpa-pd-stage', [prev, frame, next]), cap, thumbs]);
    show(shot, false);
    return g;
  }

  function render(): void {
    const p = proj();
    api.win.setTitle(`${t(p.name)} — ${t(T.document)}`);
    linkBtn.href = p.url;
    linkBtn.style.display = '';
    page.innerHTML = '';
    page.appendChild(
      h('header.xpa-pd-head', [
        U.icon(p.icon, 'xpa-pd-icon'),
        h('div.xpa-grow', [
          h('h1.xpa-pd-title', t(p.name)),
          h('div.xpa-pd-tag', t(p.tagline)),
          h('div.xpa-pd-meta', [h('span', t(p.type)), h('span', t(p.period))]),
        ]),
      ]),
    );
    page.appendChild(
      h('dl.xpa-pd-facts', [
        h('dt', T.role),
        h('dd', t(p.role)),
        h('dt', T.link),
        h('dd', h('a', { href: p.url, target: '_blank', rel: 'noopener noreferrer' }, bare(p.url))),
      ]),
    );
    page.appendChild(h('p.xpa-pd-summary', t(p.summary)));
    page.appendChild(h('h2', T.stackTitle));
    page.appendChild(
      h(
        'div.xpa-chips',
        p.stack.map((s) => h('span.xpa-chip', s)),
      ),
    );
    page.appendChild(h('h2', T.whatIDid));
    page.appendChild(
      h(
        'ul.xpa-pd-hl',
        p.highlights.map((x) => h('li', t(x))),
      ),
    );
    page.appendChild(h('h2', T.looks));
    gallery = renderGallery(p);
    page.appendChild(gallery);
    page.appendChild(
      h('div.xpa-pd-foot', [
        h('a.xpa-btn.primary', { href: p.url, target: '_blank', rel: 'noopener noreferrer' }, [
          U.glyph('link'),
          h('span', fill(T.openUrl, bare(p.url))),
        ]),
        U.button(T.nextProjectBtn, () => {
          go(1);
        }),
      ]),
    );
    st.set(0, `${t(fill(T.projectOf, idx + 1))}${t(T.of)}${String(PROJECTS.length)} · ${t(p.type)}`);
    st.set(1, `${String(Math.round(zoom * 100))}%`);
  }
  root.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const run: (() => void) | undefined = {
      ArrowRight: () => {
        go(1);
      },
      ArrowLeft: () => {
        go(-1);
      },
      '=': () => {
        setZoom(zoom + 0.1);
      },
      '+': () => {
        setZoom(zoom + 0.1);
      },
      '-': () => {
        setZoom(zoom - 0.1);
      },
      '0': () => {
        setZoom(1);
      },
    }[e.key];
    if (run) {
      e.preventDefault();
      run();
    }
  });
  U.bind(render);
  if (typeof shotParam === 'number')
    U.later(60, () => {
      if (!gallery) return;
      gallery.scrollIntoView({ block: 'center' });
      gallery.querySelector<HTMLElement>('.xpa-pd-frame')?.focus({ preventScroll: true });
    });
  else
    U.later(30, () => {
      scroller.focus({ preventScroll: true });
    });
  return U.destroy;
}

/* ================================================================ live sites */

interface Site {
  id: string;
  project: string;
  title: Bilingual;
  icon: string;
  home: string;
  repo?: string;
  url: (lang: Lang) => string;
}

/* My live sites as desktop programs: the site in a window, like a game in its own exe. A no-cors probe resolves for any
   reachable site and rejects when it is down or offline: only then is the frame shown, so a site that is not deployed
   yet gets a Windows-style page instead of the browser's broken-page icon. */
function siteWindow(cfg: Site) {
  return (content: HTMLElement, api: XPAppApi): (() => void) => {
    const U = ui(api);
    const { h } = U;
    const root = U.root(content, 'xpa-wax', 320);
    // the site opens in the page's language, as it was when the window opened
    const lang: Lang = document.documentElement.lang === 'en' ? 'en' : 'ru';
    const url = cfg.url(lang);
    const host = cfg.home.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const links = [h('a.xpa-br-out', { href: url, target: '_blank', rel: 'noopener noreferrer' }, T.newTab)];
    if (cfg.repo)
      links.push(h('a.xpa-br-out', { href: cfg.repo, target: '_blank', rel: 'noopener noreferrer' }, T.github));
    root.appendChild(h('div.xpa-wax-bar', links));
    const wait = h('div.xpa-wax-msg', `${T.opening[lang]}${host}…`);
    root.appendChild(wait);
    let alive = true;
    U.onCleanup(() => {
      alive = false;
    });
    fetch(cfg.home, { mode: 'no-cors', cache: 'no-store' }).then(
      () => {
        if (alive)
          root.replaceChild(
            h('iframe.xpa-wax-frame', { src: url, title: host, allow: 'fullscreen', referrerpolicy: 'no-referrer' }),
            wait,
          );
      },
      () => {
        if (!alive) return;
        root.replaceChild(
          h('div.xpa-wax-msg', [
            h('b', fill(T.down, host)),
            h('p', T.downWhy),
            U.button(T.openOverview, () => api.openApp('project', { id: cfg.project }), { primary: true }),
          ]),
          wait,
        );
      },
    );
    return U.destroy;
  };
}

const SITES: Site[] = [
  {
    id: 'wax',
    project: 'wax',
    title: { ru: 'Wax', en: 'Wax' },
    icon: ICONS.wax,
    home: 'https://wax.donya.dev/',
    repo: 'https://github.com/le5tef/wax',
    url: (l) => `https://wax.donya.dev/?lang=${l}`,
  },
  {
    id: 'kompy-app',
    project: 'kompy',
    title: { ru: 'Компи', en: 'Kompi' },
    icon: ICONS.kompy,
    home: 'https://kompy.app/',
    url: () => 'https://kompy.app/',
  },
];

registerApp({
  id: 'projects',
  title: T.myProjects,
  icon: ICONS.projects,
  desktop: true,
  startMenu: 'pinned',
  defaultSize: { w: 680, h: 460 },
  minSize: { w: 300, h: 240 },
  singleton: true,
  render: renderExplorer,
});
for (const c of SITES)
  registerApp({
    id: c.id,
    title: c.title,
    icon: c.icon,
    desktop: true,
    startMenu: true,
    defaultSize: { w: 760, h: 540 },
    minSize: { w: 320, h: 360 },
    singleton: true,
    render: siteWindow(c),
  });
registerApp({
  id: 'project',
  title: T.project,
  icon: ICONS.doc,
  desktop: false,
  startMenu: false,
  defaultSize: { w: 640, h: 520 },
  minSize: { w: 300, h: 260 },
  singleton: false,
  render: renderProject,
});
