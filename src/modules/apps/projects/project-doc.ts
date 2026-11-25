// A project's document: the overview, the stack, what I did, and a gallery of its screens (apps/mocks).
import { fill } from '../../../i18n/i18n';
import type { Bilingual, XPAppApi } from '../../../types';
import { type Project, PROJECTS } from '../../../content/projects';
import { bare } from '../browser/browser-url';
import { G24 } from '../../../components/kit/icons';
import { copyText, reduced, ui } from '../../../components/kit/kit';
import { MOCKS } from './mocks';
import { APP } from '../../../components/kit/strings';

const T = {
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
  stackTitle: { ru: 'Стек', en: 'Stack' },
  whatIDid: { ru: 'Что я сделал', en: 'What I did' },
  looks: { ru: 'Как это выглядит', en: 'What it looks like' },
  openUrl: { ru: 'Открыть %s', en: 'Open %s' },
  nextProjectBtn: { ru: 'Следующий проект ›', en: 'Next project ›' },
  projectOf: { ru: 'Проект %s', en: 'Project %s' },
  of: { ru: ' из ', en: ' of ' },
} as const satisfies Record<string, Bilingual>;

export function renderProject(content: HTMLElement, api: XPAppApi): () => void {
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
      label: APP.file,
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
        { label: T.copyLink, action: () => void copyText(proj().url) },
        { label: T.copyStack, action: () => void copyText(proj().stack.join(', ')) },
      ],
    },
    {
      label: APP.view,
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

  // the page is rebuilt for another project or language: its bilingual text goes with it
  const doc = U.scope();
  const arrow = (key: 'back' | 'fwd'): HTMLSpanElement => h('span.xpa-g16.x24', { html: G24[key] ?? '' });

  let gallery: HTMLDivElement | null = null;
  function renderGallery(p: Project): HTMLDivElement {
    const { h } = doc;
    // each picture is drawn once; the frame and the thumbnails show copies of it
    const pictures = p.shots.map((s) => {
      const tpl = document.createElement('template');
      tpl.innerHTML = MOCKS[s.kind]?.(U.lang()) ?? '';
      return tpl.content;
    });
    const picture = (i: number): Node => pictures[i]?.cloneNode(true) ?? document.createTextNode('');
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
      frame.replaceChildren(picture(shot));
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
      const b = h('button.xpa-pd-thumb', { type: 'button', role: 'tab', title: t(s.title) }, picture(i));
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
    doc.dispose();
    const { h, button } = doc;
    const p = proj();
    api.win.setTitle(`${t(p.name)} — ${t(APP.document)}`);
    linkBtn.href = p.url;
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
        button(T.nextProjectBtn, () => {
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
