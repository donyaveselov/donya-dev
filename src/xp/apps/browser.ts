// Navigator: an Internet-Explorer-like window. Home is the portfolio start page; external sites cannot be embedded,
// so they get a friendly "cannot be displayed" page with a real link out (my own *.donya.dev sites open inside).
import type { Bilingual, XPAppApi } from '../../shared/types';
import { CONTACTS, HEADLINE, PERSON } from '../content/profile';
import { findProject, PROJECTS } from '../content/projects';
import { ico, svg } from '../icons';
import { registerApp } from '../shell/apps';
import { ICONS } from './icons';
import { copyText, pad, reduced, ui } from './kit';
import { HOME, isOwnSite, isThisSite, normalize, searchHits, searchQuery } from './browser-url';
import { siteFrame } from './site-frame';
import { d } from '../content/text';
import { APP } from './strings';

const T = {
  title: d('Навигатор', 'Navigator'),
  home: d('Домой', 'Home'),
  newTab: d('Открыть в новой вкладке…', 'Open in a new tab…'),
  copyAddress: d('Копировать адрес', 'Copy address'),
  refresh: d('Обновить', 'Refresh'),
  linksBar: d('Строка ссылок', 'Links bar'),
  favorites: d('Избранное', 'Favorites'),
  startPage: d('Стартовая страница', 'Start page'),
  aboutText: d('Шифрование: 0 бит. Зато без трекеров.', 'Cipher strength: 0-bit. No trackers, though.'),
  stop: d('Остановить', 'Stop'),
  links: d('Ссылки', 'Links'),
  stopped: d('Остановлено', 'Stopped'),
  opening: d('Открывается ', 'Opening page '),
  cannotDisplay: d('Не удаётся отобразить страницу', 'Cannot display the webpage'),
  done: d('Готово', 'Done'),
  homeTitle: d('Даниил Иванов — стартовая страница', 'Daniil Ivanov — Start Page'),
  pageCannot: d('Не удаётся отобразить страницу', 'The page cannot be displayed'),
  hereTitle: d('Вы уже здесь', 'You are already here'),
  toStart: d('На стартовую страницу', 'Go to the start page'),
  hereText: d(
    'Это donya.dev: страница, на которой открыт этот рабочий стол. Если открыть её здесь, внутри окажется ещё одна комната с ещё одним компьютером, и так до бесконечности.',
    'This is donya.dev, the page this desktop is open on. Opened here, it would hold another room with another computer, and so on forever.',
  ),
  search: d('Поиск', 'Search'),
  noPage: d('Нет такой страницы: ', 'No such page: '),
  internet: d('Интернет', 'Internet'),
  searchHere: d('Найти на этом компьютере…', 'Search this computer…'),
  find: d('Найти', 'Search'),
  welcome: d('Добро пожаловать на домашнюю страницу', 'Welcome to the home page of'),
  offers: d('открыт к предложениям', 'open to offers'),
  projects: d('Проекты', 'Projects'),
  programs: d('Программы', 'Programs'),
  resume: d('Резюме', 'Resume'),
  contact: d('Контакты', 'Contact'),
  aboutMe: d('О себе', 'About me'),
  terminal: d('Консоль', 'Terminal'),
  minesweeper: d('Сапёр', 'Minesweeper'),
  paint: d('Кисть', 'Paint'),
  web: d('В интернете', 'On the web'),
  visitor: d('Вы посетитель №', 'You are visitor #'),
  bestViewed: d('Лучше всего смотреть в разрешении 1024×768. Сделано вручную.', 'Best viewed at 1024×768. Handmade.'),
  thePage: d('Страница ', 'The page '),
  livesOnline: d(
    ' живёт в настоящем интернете, а этот компьютер — внутри монитора. Встроить чужой сайт сюда нельзя (и это правильно: сайты сами запрещают так делать).',
    ' lives on the real internet, and this computer lives inside a monitor. Other sites cannot be embedded here (and rightly so: sites forbid it themselves).',
  ),
  tryThis: d('Попробуйте следующее:', 'Please try the following:'),
  openInTab: d('Откройте страницу в новой вкладке: ', 'Open the page in a new tab: '),
  click: d('Нажмите кнопку ', 'Click the '),
  toGoBack: d(', чтобы вернуться.', ' button to go back.'),
  internet2003: d('Проверьте, существует ли интернет в 2003 году.', 'Check whether the internet exists in 2003.'),
  orReturn: d('Или вернитесь на ', 'Or return to the '),
  startPageLink: d('стартовую страницу', 'start page'),
  monitor: d('Я монитор', "I'm a monitor"),
  results: d('Результаты поиска: ', 'Search results: '),
  nothing: d(
    'Ничего не найдено. Попробуйте «vue», «django», «resume» или «mines».',
    'Nothing found. Try "vue", "django", "resume" or "mines".',
  ),
} as const;

/** Favorites: my pages on the web (content/profile.ts), then the commercial project's site. */
const FAVS: readonly { label: string; short: string; url: string }[] = [
  ...(['github', 'telegram', 'site'] as const).flatMap((id) => {
    const c = CONTACTS.find((x) => x.id === id);
    if (!c?.href) return [];
    // "GitHub — donyaveselov" for a profile, the bare address for a site
    const name = typeof c.label === 'string' ? c.label : c.value;
    const handle = c.value.split('/')[1];
    return [{ label: handle ? `${name} — ${handle}` : c.value, short: handle ? name : c.value, url: c.href }];
  }),
  ...PROJECTS.slice(0, 1).map((p) => {
    const site = p.url.replace(/^https?:\/\//, '');
    return { label: site, short: site, url: p.url };
  }),
];

function visitorNo(): string {
  let n: number;
  try {
    n = (Number(localStorage.getItem('xpa-visits')) || 41) + 1;
    localStorage.setItem('xpa-visits', String(n));
  } catch {
    n = 42;
  }
  return pad(n, 6);
}

function render(content: HTMLElement, api: XPAppApi): () => void {
  const U = ui(api);
  const { h, t } = U;
  const root = U.root(content, 'xpa-browser', 560);
  let hist: string[] = [];
  let hi = -1;
  /** The address in the bar. */
  let url = HOME;
  /** The page in the view (it stays while the next one loads, or after Stop). */
  let shown: string | null = null;
  let cancelLoad: (() => void) | null = null;
  // a page is rebuilt on every navigation and language switch: its bilingual text and its site probe go with it
  const page = U.scope();

  // the Internet Explorer 6 throbber is the Windows flag
  const throbber = h('div.xpa-br-throb', {
    'aria-hidden': 'true',
    html: svg(`<image href="${ico('startFlag') ?? ''}" width="20" height="20"/>`, '0 0 20 20'),
  });
  const menu = U.menubar([
    {
      label: APP.file,
      items: [
        {
          label: T.home,
          key: 'Alt+Home',
          action: () => {
            go(HOME);
          },
        },
        {
          label: T.newTab,
          disabled: () => !/^https?:/.test(url),
          action: () => window.open(url, '_blank', 'noopener'),
        },
        { sep: true },
        {
          label: APP.close,
          action: () => {
            api.win.close();
          },
        },
      ],
    },
    { label: APP.edit, items: [{ label: T.copyAddress, action: () => void copyText(url) }] },
    {
      label: APP.view,
      items: [
        {
          label: T.refresh,
          key: 'F5',
          action: () => {
            load(url);
          },
        },
        {
          label: T.linksBar,
          checked: () => !root.classList.contains('no-links'),
          action: () => root.classList.toggle('no-links'),
        },
      ],
    },
    {
      label: T.favorites,
      items: [
        ...FAVS.map((f) => ({
          label: f.label,
          action: () => {
            go(f.url);
          },
        })),
        { sep: true },
        {
          label: T.startPage,
          action: () => {
            go(HOME);
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
  menu.appendChild(throbber);

  const bBack = U.tbtn({ g: 'back', label: APP.back, showLabel: true, big: true, onClick: back });
  const bFwd = U.tbtn({ g: 'fwd', label: APP.forward, big: true, onClick: fwd });
  const bStop = U.tbtn({ g: 'stop', label: T.stop, big: true, onClick: stop });
  const tb = U.toolbar([
    bBack,
    bFwd,
    bStop,
    U.tbtn({
      g: 'refresh',
      label: T.refresh,
      big: true,
      onClick: () => {
        load(url);
      },
    }),
    U.tbtn({
      g: 'home',
      label: T.home,
      big: true,
      onClick: () => {
        go(HOME);
      },
    }),
    U.tsep(),
    U.tbtn({
      g: 'star',
      label: T.favorites,
      showLabel: true,
      big: true,
      onClick: () => {
        const first = FAVS[0];
        if (first) go(first.url);
      },
    }),
  ]);
  const addrIn = h('input', { type: 'text', spellcheck: 'false', autocomplete: 'off', 'aria-label': APP.address });
  const addrIcon = h('span.xpa-g16', { html: ICONS.url });
  const addr = h('form.xpa-addr', { action: '#' }, [
    h('span.xpa-addr-label', APP.address),
    h('div.xpa-addr-box', [addrIcon, addrIn, h('span.xpa-addr-dd', '▼')]),
    h('button.xpa-go', { type: 'submit' }, [U.glyph('go'), h('span', APP.go)]),
  ]);
  addr.addEventListener('submit', (e) => {
    e.preventDefault();
    U.sound('click');
    go(normalize(addrIn.value));
  });
  addrIn.addEventListener('focus', () => {
    addrIn.select();
  });
  const links = h('div.xpa-br-links', [
    h('span.xpa-muted', T.links),
    ...FAVS.slice(0, 3).map((f) =>
      h(
        'button.xpa-br-link',
        {
          type: 'button',
          on: {
            click: () => {
              go(f.url);
            },
          },
        },
        [h('span.xpa-g16', { html: ICONS.url }), h('span', f.short)],
      ),
    ),
  ]);
  const view = h('div.xpa-br-view', { tabindex: '0' });
  const progFill = h('div.xpa-br-prog-fill');
  const prog = h('div.xpa-br-prog', [progFill]);
  const st = U.statusbar(2);
  const zone = st.cell(1);
  zone?.classList.add('xpa-br-zone');
  st.el.insertBefore(prog, zone ?? null);
  root.append(menu, tb, addr, links, view, st.el);

  function go(u: string): void {
    if (hist[hi] !== u) {
      hist = hist.slice(0, hi + 1);
      hist.push(u);
      hi = hist.length - 1;
    }
    load(u);
  }
  function back(): void {
    const u = hist[hi - 1];
    if (u === undefined) return;
    hi--;
    load(u);
  }
  function fwd(): void {
    const u = hist[hi + 1];
    if (u === undefined) return;
    hi++;
    load(u);
  }
  function stop(): void {
    if (!cancelLoad) return;
    cancelLoad();
    cancelLoad = null;
    root.classList.remove('loading');
    st.set(0, T.stopped);
  }
  const resetProgress = (): void => {
    progFill.style.transition = 'none';
    progFill.style.width = '0';
  };

  function load(u: string): void {
    url = u;
    addrIn.value = u;
    bBack.disabled = hi <= 0;
    bFwd.disabled = hi >= hist.length - 1;
    cancelLoad?.();
    const ext = /^https?:/i.test(u);
    const bad = ext && !isOwnSite(u);
    st.set(0, `${t(T.opening)}${u}...`);
    root.classList.add('loading');
    resetProgress();
    prog.getBoundingClientRect();
    const dur = reduced() ? 0 : ext ? 900 : 350;
    progFill.style.transition = `width ${String(dur)}ms ease-out`;
    progFill.style.width = '100%';
    cancelLoad = U.later(dur, () => {
      cancelLoad = null;
      root.classList.remove('loading');
      draw(u);
      st.set(0, bad ? T.cannotDisplay : T.done);
      resetProgress();
      if (bad) U.sound('error');
    });
  }

  function draw(u: string): void {
    page.dispose();
    const { h } = page;
    shown = u;
    view.innerHTML = '';
    view.scrollTop = 0;
    const ext = /^https?:/i.test(u);
    const nav = t(T.title);
    if (u === HOME) {
      view.appendChild(startPage());
      api.win.setTitle(`${t(T.homeTitle)} — ${nav}`);
    } else if (ext && isThisSite(u)) {
      view.appendChild(herePage());
      api.win.setTitle(`${t(T.hereTitle)} — ${nav}`);
    } else if (ext && isOwnSite(u)) {
      const project = PROJECTS.find((p) => u.startsWith(p.url));
      view.appendChild(
        siteFrame(page, { src: u, overview: project && (() => api.openApp('project', { id: project.id })) }),
      );
      api.win.setTitle(`${u.replace(/^https?:\/\//, '')} — ${nav}`);
    } else if (ext) {
      view.appendChild(errorPage(u));
      api.win.setTitle(`${t(T.pageCannot)} — ${nav}`);
    } else if (u.startsWith('about:search')) {
      view.appendChild(searchPage(searchQuery(u)));
      api.win.setTitle(t(T.search));
    } else {
      view.appendChild(h('div.xpa-br-blank', u === 'about:blank' ? '' : t(T.noPage) + u));
      api.win.setTitle(u);
    }
    st.set(1, ext ? T.internet : APP.myComputer);
    addrIcon.innerHTML = ext ? ICONS.url : ICONS.browser;
  }

  function appLink(id: string, label: Bilingual, iconName: string): HTMLButtonElement {
    const { h } = page;
    const b = h('button.xpa-br-app', { type: 'button' }, [U.icon(iconName), h('span', label)]);
    b.addEventListener('click', () => {
      U.sound('click');
      api.openApp(id);
    });
    b.addEventListener('mouseenter', () => {
      st.set(0, `app://${id}`);
    });
    b.addEventListener('mouseleave', () => {
      st.set(0, T.done);
    });
    return b;
  }

  const visitor = visitorNo();

  function startPage(): HTMLDivElement {
    const { h, button } = page;
    const q = h('input.xpa-field', { type: 'search', placeholder: T.searchHere, 'aria-label': T.search });
    const submit = button(T.find, null, { primary: true });
    submit.type = 'submit';
    const form = h('form.xpa-br-search', { action: '#' }, [q, submit]);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      go(`about:search?q=${encodeURIComponent(q.value)}`);
    });
    return h('div.xpa-br-start', [
      h('div.xpa-br-hero', [
        h('div.xpa-br-hero-txt', [
          h('div.xpa-br-hello', T.welcome),
          h('h1', t(PERSON.name)),
          h('div.xpa-br-role', [t(PERSON.role), ` · ${HEADLINE.join(' · ')}`]),
          h('div.xpa-br-city', ['☀ ', t(PERSON.city), ' · ', h('span.xpa-br-new', 'NEW!'), ' ', t(T.offers)]),
        ]),
        h('div.xpa-br-hero-art', { 'aria-hidden': 'true', html: ICONS.browser }),
      ]),
      form,
      h('div.xpa-br-cols', [
        h('section.xpa-br-box', [
          h('h2', T.projects),
          h(
            'div',
            PROJECTS.map((p) => {
              const b = h('button.xpa-br-proj', { type: 'button' }, [
                U.icon(p.icon),
                h('span', [h('b', t(p.name)), h('br'), h('span.xpa-muted', t(p.tagline))]),
              ]);
              b.addEventListener('click', () => {
                U.sound('click');
                api.openApp('project', { id: p.id });
              });
              return b;
            }),
          ),
        ]),
        h('section.xpa-br-box', [
          h('h2', T.programs),
          h('div.xpa-br-apps', [
            appLink('resume', T.resume, 'resume'),
            appLink('contact', T.contact, 'contact'),
            appLink('about', T.aboutMe, 'computer'),
            appLink('terminal', T.terminal, 'terminal'),
            appLink('minesweeper', T.minesweeper, 'minesweeper'),
            appLink('paint', T.paint, 'paint'),
          ]),
        ]),
      ]),
      h('section.xpa-br-box', [
        h('h2', T.web),
        h(
          'ul.xpa-br-ext',
          CONTACTS.flatMap((c) =>
            c.href
              ? [
                  h('li', [
                    h('a', { href: c.href, target: '_blank', rel: 'noopener noreferrer' }, c.value),
                    h('span.xpa-muted', ` — ${t(c.note)}`),
                  ]),
                ]
              : [],
          ),
        ),
      ]),
      h('div.xpa-br-foot', [
        h('div', [t(T.visitor), h('span.xpa-br-counter', visitor)]),
        h('div.xpa-muted', T.bestViewed),
      ]),
    ]);
  }

  function herePage(): HTMLDivElement {
    const { h } = page;
    return h('div.xpa-br-err', [
      h('div.xpa-br-err-head', [h('span.xpa-ico', { html: ICONS.info }), h('h1', T.hereTitle)]),
      h('p', T.hereText),
      h('p', [
        h(
          'button.xpa-br-inl',
          {
            type: 'button',
            on: {
              click: () => {
                go(HOME);
              },
            },
          },
          T.toStart,
        ),
      ]),
    ]);
  }

  function errorPage(u: string): HTMLDivElement {
    const { h } = page;
    const host = u.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return h('div.xpa-br-err', [
      h('div.xpa-br-err-head', [h('span.xpa-ico', { html: ICONS.info }), h('h1', T.pageCannot)]),
      h('p', [t(T.thePage), h('b', host), t(T.livesOnline)]),
      h('hr'),
      h('p', T.tryThis),
      h('ul', [
        h('li', [t(T.openInTab), h('a.xpa-br-out', { href: u, target: '_blank', rel: 'noopener noreferrer' }, u)]),
        h('li', [t(T.click), h('button.xpa-br-inl', { type: 'button', on: { click: back } }, APP.back), t(T.toGoBack)]),
        h('li', T.internet2003),
        h('li', [
          t(T.orReturn),
          h(
            'button.xpa-br-inl',
            {
              type: 'button',
              on: {
                click: () => {
                  go(HOME);
                },
              },
            },
            T.startPageLink,
          ),
          '.',
        ]),
      ]),
      h('p.xpa-muted.xpa-br-tech', ['HTTP 418 — ', t(T.monitor), h('br'), t(T.title)]),
    ]);
  }

  function searchPage(q: string): HTMLDivElement {
    const { h } = page;
    const hits = searchHits(q);
    return h('div.xpa-br-start', [
      h('h2', [t(T.results), h('b', q)]),
      hits.length
        ? h(
            'ul.xpa-br-results',
            hits.map((id) => {
              const p = id.startsWith('project:') ? findProject(id.slice(8)) : null;
              const b = h('button.xpa-br-inl', { type: 'button' }, p ? t(p.name) : `${id}.exe`);
              b.addEventListener('click', () => {
                if (p) api.openApp('project', { id: p.id });
                else api.openApp(id);
              });
              return h('li', [b, h('span.xpa-muted', p ? ` — ${t(p.tagline)}` : '')]);
            }),
          )
        : h('p', T.nothing),
    ]);
  }

  root.addEventListener('keydown', (e) => {
    if (e.key === 'F5') {
      e.preventDefault();
      load(url);
    } else if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      back();
    } else if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      fwd();
    } else if (e.altKey && e.key === 'Home') {
      e.preventDefault();
      go(HOME);
    } else if (e.key === 'Escape') stop();
  });
  view.addEventListener('mouseover', (e) => {
    const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
    if (a instanceof HTMLAnchorElement) st.set(0, a.href);
  });

  go(normalize(api.params?.url));
  // a language switch redraws the page in the view; while one is loading, its "Opening…" line is said again instead
  // (the bilingual statuses follow the language by themselves)
  U.onCleanup(
    api.onLang(() => {
      if (cancelLoad) st.set(0, `${t(T.opening)}${url}...`);
      else if (shown !== null) draw(shown);
    }),
  );
  return U.destroy;
}

registerApp({
  id: 'browser',
  title: T.title,
  icon: ICONS.browser,
  desktop: true,
  startMenu: 'pinned',
  defaultSize: { w: 720, h: 520 },
  minSize: { w: 300, h: 260 },
  singleton: true,
  render,
});
