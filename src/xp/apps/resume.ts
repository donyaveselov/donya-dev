// Resume: a WordPad-like viewer of the public resume.
import type { Text } from '../../shared/i18n';
import type { Bilingual, XPAppApi } from '../../shared/types';
import { CONTACTS, PERSON } from '../content/profile';
import { jobPeriod, RESUME } from '../content/resume';
import { registerApp } from '../shell/apps';
import { G16, ICONS } from './icons';
import { copyText, ui } from './kit';

const T = {
  title: { ru: 'Резюме', en: 'Resume' },
  winTitle: { ru: 'Резюме — Иванов Даниил.rtf — ДокПад', en: 'Resume — Daniil Ivanov.rtf — DocPad' },
  print: { ru: 'Печать', en: 'Print' },
  printMenu: { ru: 'Печать…', en: 'Print…' },
  copyContacts: { ru: 'Копировать контакты', en: 'Copy contacts' },
  file: { ru: 'Файл', en: 'File' },
  preview: { ru: 'Предварительный просмотр', en: 'Print Preview' },
  exit: { ru: 'Выход', en: 'Exit' },
  edit: { ru: 'Правка', en: 'Edit' },
  selectAll: { ru: 'Выделить всё', en: 'Select All' },
  copySel: { ru: 'Копировать выделенное', en: 'Copy selection' },
  view: { ru: 'Вид', en: 'View' },
  ruler: { ru: 'Линейка', en: 'Ruler' },
  wrap: { ru: 'Перенос по ширине окна', en: 'Wrap to window' },
  zoomIn: { ru: 'Крупнее', en: 'Zoom in' },
  zoomOut: { ru: 'Мельче', en: 'Zoom out' },
  help: { ru: 'Справка', en: 'Help' },
  about: { ru: 'О программе', en: 'About' },
  aboutName: { ru: 'ДокПад — просмотр резюме', en: 'DocPad — resume viewer' },
  aboutText: {
    ru: '«Печать» открывает лист резюме, который можно распечатать.',
    en: 'Print opens the resume sheet, ready for printing.',
  },
  docpad: { ru: 'ДокПад', en: 'DocPad' },
  f1: {
    ru: 'Справка: читайте сверху вниз. Контакты в шапке.',
    en: 'Help: read from top to bottom. Contacts are at the top.',
  },
  clipboard: { ru: 'Буфер обмена', en: 'Clipboard' },
  copied: { ru: 'Контакты скопированы. Жду сообщения!', en: 'Contacts copied. Looking forward to your message!' },
  bold: { ru: 'Полужирный', en: 'Bold' },
  italic: { ru: 'Курсив', en: 'Italic' },
  underline: { ru: 'Подчёркнутый', en: 'Underline' },
  font: { ru: 'Шрифт', en: 'Font' },
  zoom: { ru: 'Масштаб', en: 'Zoom' },
  experience: { ru: 'Опыт работы', en: 'Experience' },
  skills: { ru: 'Навыки', en: 'Skills' },
  education: { ru: 'Образование', en: 'Education' },
  end: { ru: 'конец документа', en: 'end of document' },
  helpHint: { ru: 'Для справки нажмите F1', en: 'For Help, press F1' },
  page: { ru: 'Стр. 1 из 1', en: 'Page 1 of 1' },
} as const satisfies Record<string, Bilingual>;

/** Name, role and contacts as plain text, for the clipboard. */
function contactsText(t: (d: Text) => string): string {
  return `${t(PERSON.name)} — ${t(PERSON.role)}\n${CONTACTS.map((c) => `${t(c.label)}: ${c.value}`).join('\n')}`;
}

type Fmt = 'b' | 'i' | 'u';
const FMT_GLYPH: Record<Fmt, string> = { b: 'bold', i: 'italic', u: 'underline' };

function render(content: HTMLElement, api: XPAppApi): () => void {
  const U = ui(api);
  const { h, t } = U;
  const root = U.root(content, 'xpa-resume', 600);
  let zoom = 100;
  let wrap = true;
  let showRuler = true;
  const fmt: Record<Fmt, boolean> = { b: false, i: false, u: false };

  /** The room's printable resume sheet (the host opens it). */
  const print = (): void => {
    api.openResume();
  };
  const togglePreview = (): void => {
    root.classList.toggle('preview');
  };

  const copyBtn = U.copyButton(() => contactsText(t), {
    label: T.copyContacts,
    onCopied: (ok) => {
      if (ok) api.balloon({ title: T.clipboard, text: T.copied });
    },
  });
  copyBtn.classList.add('xpa-res-copy');

  const menu = U.menubar([
    {
      label: T.file,
      items: [
        { label: T.printMenu, key: 'Ctrl+P', action: print },
        { label: T.preview, action: togglePreview },
        {
          label: T.copyContacts,
          action: () => {
            copyBtn.click();
          },
        },
        { sep: true },
        {
          label: T.exit,
          action: () => {
            api.win.close();
          },
        },
      ],
    },
    {
      label: T.edit,
      items: [
        { label: T.selectAll, key: 'Ctrl+A', action: selectAll },
        { label: T.copySel, key: 'Ctrl+C', action: () => void copyText(String(window.getSelection() ?? '')) },
      ],
    },
    {
      label: T.view,
      items: [
        {
          label: T.ruler,
          checked: () => showRuler,
          action: () => {
            showRuler = !showRuler;
            ruler.style.display = showRuler ? '' : 'none';
          },
        },
        {
          label: T.wrap,
          checked: () => wrap,
          action: () => {
            wrap = !wrap;
            root.classList.toggle('nowrap', !wrap);
          },
        },
        { sep: true },
        {
          label: T.zoomIn,
          key: 'Ctrl++',
          action: () => {
            setZoom(zoom + 10);
          },
        },
        {
          label: T.zoomOut,
          key: 'Ctrl+-',
          action: () => {
            setZoom(zoom - 10);
          },
        },
      ],
    },
    {
      label: T.help,
      items: [
        {
          label: T.about,
          action: () => {
            U.aboutDialog(T.aboutName, T.aboutText);
          },
        },
      ],
    },
  ]);

  const fmtBtn = (k: Fmt, title: Bilingual): HTMLButtonElement => {
    // WordPad's own B / I / U bitmaps
    const b = h(
      'button.xpa-tb',
      { type: 'button', title, 'aria-pressed': 'false' },
      h('span.xpa-fmt-l.xpa-g16', { html: G16[FMT_GLYPH[k]] ?? '' }),
    );
    b.classList.add(`xpa-fmt-${k}`);
    b.addEventListener('click', () => {
      fmt[k] = !fmt[k];
      b.classList.toggle('on', fmt[k]);
      b.setAttribute('aria-pressed', String(fmt[k]));
      page.classList.toggle(`f-${k}`, fmt[k]);
      U.sound('click');
    });
    return b;
  };
  const fontSel = h('select.xpa-field.xpa-res-font', { 'aria-label': T.font }, [
    h('option', 'Tahoma'),
    h('option', 'Verdana'),
    h('option', 'Georgia'),
    h('option', 'Courier New'),
  ]);
  fontSel.addEventListener('change', () => {
    page.style.fontFamily = `${fontSel.value}, sans-serif`;
  });
  const zoomSel = h(
    'select.xpa-field.xpa-res-zoom',
    { 'aria-label': T.zoom },
    [80, 90, 100, 110, 125, 150].map((z) => h('option', { value: String(z) }, `${String(z)}%`)),
  );
  zoomSel.value = '100';
  zoomSel.addEventListener('change', () => {
    setZoom(+zoomSel.value);
  });

  const tb = U.toolbar([
    U.tbtn({ g: 'print', label: T.print, big: true, onClick: print }),
    U.tbtn({ g: 'preview', label: T.preview, big: true, onClick: togglePreview }),
    U.tsep(),
    fontSel,
    zoomSel,
    U.tsep(),
    fmtBtn('b', T.bold),
    fmtBtn('i', T.italic),
    fmtBtn('u', T.underline),
    U.tsep(),
    copyBtn,
  ]);

  const ruler = h('div.xpa-ruler', { 'aria-hidden': 'true' }, [h('div.xpa-ruler-in')]);
  const page = h('article.xpa-res-page.xpa-selectable');
  const scroller = h('div.xpa-res-scroll', { tabindex: '0' }, [page]);
  const st = U.statusbar(3);
  root.append(menu, tb, ruler, scroller, st.el);

  function setZoom(z: number): void {
    zoom = Math.max(60, Math.min(160, z));
    page.style.fontSize = `${String((12 * zoom) / 100)}px`;
    zoomSel.value = String(zoom);
    st.set(2, `${String(zoom)}%`);
  }
  function selectAll(): void {
    const r = document.createRange();
    r.selectNodeContents(page);
    const s = window.getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
  }

  /** A section heading in the current language, with the other one after it. */
  const sec = (title: Bilingual): HTMLHeadingElement => {
    const other = U.lang() === 'ru' ? title.en : title.ru;
    return h('h2', [h('span', t(title)), h('span.xpa-res-alt', ` / ${other}`)]);
  };

  function build(): void {
    page.innerHTML = '';
    const contactLine = h(
      'div.xpa-res-contacts',
      CONTACTS.map((c) =>
        h('span', [
          h('span.xpa-muted', `${t(c.label)}: `),
          c.href ? h('a', { href: c.href, target: '_blank', rel: 'noopener noreferrer' }, c.value) : h('span', c.value),
        ]),
      ),
    );
    page.appendChild(
      h('header.xpa-res-head', [
        h('div.xpa-res-photo', { 'aria-hidden': 'true' }, U.lang() === 'ru' ? 'ДИ' : 'DI'),
        h('div.xpa-grow', [
          h('h1', t(PERSON.name)),
          h('div.xpa-res-role', t(RESUME.title)),
          h('div.xpa-res-city', t(PERSON.city)),
          contactLine,
        ]),
      ]),
    );
    page.appendChild(h('p.xpa-res-lead', t(RESUME.lead)));
    page.appendChild(sec(T.experience));
    for (const j of RESUME.jobs)
      page.appendChild(
        h('section.xpa-res-job', [
          h('div.xpa-res-jhead', [
            h('b', t(j.org)),
            h('span', ` — ${t(j.role)}`),
            j.link
              ? h('span', [
                  ' · ',
                  h('a', { href: `https://${j.link}`, target: '_blank', rel: 'noopener noreferrer' }, j.link),
                ])
              : null,
            h('span.xpa-res-when', t(jobPeriod(j))),
          ]),
          j.stack ? h('div.xpa-res-stack', j.stack) : null,
          h(
            'ul',
            j.items.map((x) => h('li', t(x))),
          ),
        ]),
      );
    page.appendChild(sec(T.skills));
    page.appendChild(
      h(
        'dl.xpa-res-skills',
        RESUME.skills.map(([area, line]) => [h('dt', t(area)), h('dd', t(line))]),
      ),
    );
    page.appendChild(sec(T.education));
    page.appendChild(
      h(
        'ul.xpa-res-edu',
        RESUME.edu.map(([school, years]) => h('li', [h('span', t(school)), h('span.xpa-res-when', years)])),
      ),
    );
    page.appendChild(h('div.xpa-res-end', `— ${t(T.end)} —`));
    api.win.setTitle(t(T.winTitle));
    st.set(0, t(T.helpHint));
    st.set(1, t(T.page));
    st.set(2, `${String(zoom)}%`);
  }
  root.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
      e.preventDefault();
      U.aboutDialog(T.docpad, T.f1);
    }
    if (!(e.ctrlKey || e.metaKey)) return;
    const run: (() => void) | undefined = {
      p: print,
      a: selectAll,
      '=': () => {
        setZoom(zoom + 10);
      },
      '+': () => {
        setZoom(zoom + 10);
      },
      '-': () => {
        setZoom(zoom - 10);
      },
    }[e.key];
    if (run) {
      e.preventDefault();
      run();
    }
  });
  U.bind(build);
  U.later(30, () => {
    scroller.focus({ preventScroll: true });
  });
  return U.destroy;
}

registerApp({
  id: 'resume',
  title: T.title,
  icon: ICONS.resume,
  desktop: true,
  startMenu: 'pinned',
  defaultSize: { w: 700, h: 560 },
  minSize: { w: 300, h: 240 },
  singleton: true,
  render,
});
