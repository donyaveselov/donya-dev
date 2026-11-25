// The room's DOM chrome: the top bar (time chip, resume button, language switch) and the resume sheet. The projects
// live on the desktop (src/modules/desktop, src/modules/apps).
import { DESKTOP_DOM, DESKTOP_ROOT_ID } from '../../../services/desktop-registry';
import { EXPERIENCE } from '../../../content/experience';
import type { Lang, Status } from '../../../types';
import { isAriaKey, isMarkupKey, t, timeChip } from '../i18n';
import { currentRoute, go } from '../../../services/router.service';
import { fitPixelBox } from './tags';
import { byId } from '../../../utils/dom';
import { track } from '../../../services/analytics.service';

/** The tab title per language; index.html carries the English one for crawlers and link previews. */
export const PAGE_TITLE: Record<Lang, string> = {
  en: 'Daniil Ivanov | Fullstack Developer | Vue Django NodeJS',
  ru: 'Даниил Иванов | Fullstack-разработчик | Vue Django NodeJS',
};

/** The meta description per language; index.html carries the English one. */
export const PAGE_DESCRIPTION: Record<Lang, string> = {
  en: 'Portfolio of Daniil Ivanov, a fullstack developer: Vue 3 / Nuxt, Python / Django, Node.js. An interactive 3D room with projects, a resume and contacts.',
  ru: 'Портфолио Даниила Иванова, fullstack-разработчика: Vue 3 / Nuxt, Python / Django, Node.js. Интерактивная 3D-комната с проектами, резюме и контактами.',
};
import type { EventProps } from '../../../services/analytics.service';

export class Panels {
  private readonly sheet = byId('sheet');
  private readonly sheetBack = byId('sheet-back');
  private readonly time = byId('time');
  /** what had the focus before the sheet opened, to give it back */
  private returnFocus: HTMLElement | null = null;

  constructor() {
    // the badges are sized to their text: measure again once the pixel font is in (fonts.ready alone can resolve
    // before Tiny5 is even requested, and then a phone's bar wraps differently from run to run)
    void document.fonts.load('15px "Tiny5"').then(() => {
      this.fitChips();
    });
    void document.fonts.ready.then(() => {
      this.fitChips();
    });
    // and whenever a font arrives later: on a first visit the fonts' stylesheet itself comes late (it does not block
    // the first paint), both promises above can settle before Tiny5 is in, and the badges kept the fallback's widths
    document.fonts.addEventListener('loadingdone', () => {
      this.fitChips();
    });
    byId('open-resume').addEventListener('click', () => {
      this.openResume('header');
    });
    this.sheetBack.addEventListener('click', () => {
      this.closeResume();
    });
    byId('print-resume').addEventListener('click', () => {
      window.print();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeResume();
      else if (e.key === 'Tab' && !this.sheet.hidden) this.trapTab(e);
    });
    // the markup holds a value for no-JS; the years go on counting
    byId('cv-years').textContent = EXPERIENCE.ru;
    byId('cv-years-en').textContent = EXPERIENCE.en;
  }

  /** Whether the resume sheet covers the page (the room need not be drawn under it). */
  get sheetOpen(): boolean {
    return !this.sheet.hidden;
  }

  /** Opens the sheet; `from` is what opened it (for the analytics). */
  openResume(from: EventProps['resume_open']['from']): void {
    const wasOpen = !this.sheet.hidden;
    this.sheet.hidden = false;
    this.sheet.style.opacity = '1';
    this.sheetBack.hidden = false;
    go('resume');
    if (wasOpen) return;
    track('resume_open', { from });
    this.sheet.scrollTop = 0;
    const active = document.activeElement;
    this.returnFocus = active instanceof HTMLElement && active !== document.body ? active : null;
    this.sheetBack.focus({ preventScroll: true });
  }

  closeResume(): void {
    if (this.sheet.hidden) return;
    this.sheet.hidden = true;
    this.sheetBack.hidden = true;
    if (currentRoute().resume) go('');
    const back = this.returnFocus;
    this.returnFocus = null;
    // back to what opened it; a Start menu item has gone by now, so at the PC the desktop takes the keyboard again
    if (back?.isConnected && back.offsetParent) back.focus({ preventScroll: true });
    else if (document.body.classList.contains('at-pc'))
      document.querySelector<HTMLElement>(`#${DESKTOP_ROOT_ID} ${DESKTOP_DOM.root}`)?.focus({ preventScroll: true });
  }

  /** Keeps Tab inside the open sheet (its back button, links and buttons), as a modal dialog does. */
  private trapTab(e: KeyboardEvent): void {
    // the back button comes first in the sheet's markup
    const items = [...this.sheet.querySelectorAll<HTMLElement>('a[href], button:not([disabled]):not([hidden])')];
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const at = document.activeElement;
    const inside = at instanceof HTMLElement && items.includes(at);
    if (e.shiftKey && (at === first || !inside)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (at === last || !inside)) {
      e.preventDefault();
      first.focus();
    }
  }

  /** Opens or closes the sheet for the route (/resume). */
  showResume(open: boolean): void {
    if (open) this.openResume('route');
    else this.closeResume();
  }

  /** The time chip: "Пхукет 13:00 · работаю". */
  renderTime(lang: Lang, h: number, m: number, status: Status, gameName: string | null): void {
    this.time.replaceChildren(
      document.createElement('i'),
      document.createTextNode(timeChip(lang, h, m, status, gameName)),
    );
    fitPixelBox(this.time);
  }

  /** The top bar's pixel badges on whole pixels (an even width each), or their frames smear. */
  private fitChips(): void {
    document.querySelectorAll<HTMLElement>('.bar .chip').forEach((el) => fitPixelBox(el));
    // the Resume button is as wide as its widest translation, so the language switch next to it stays put when the
    // language changes
    const resume = byId('open-resume');
    const label = resume.textContent;
    let w = 0;
    for (const lang of ['ru', 'en'] satisfies Lang[]) {
      resume.textContent = t(lang).resume;
      w = Math.max(w, fitPixelBox(resume).w);
    }
    resume.textContent = label;
    resume.style.width = String(w) + 'px';
  }

  /**
   * The page in a language: the room's own strings (data-room-t) and accessible names (data-room-aria), the language
   * switch. The attributes are the room's alone: the desktop's markup has its own data-* and is never touched here.
   */
  applyLang(lang: Lang): void {
    const T = t(lang);
    document.documentElement.lang = lang;
    document.title = PAGE_TITLE[lang];
    document.querySelector('meta[name="description"]')?.setAttribute('content', PAGE_DESCRIPTION[lang]);
    document.querySelectorAll('[data-room-t]').forEach((el) => {
      const key = el.getAttribute('data-room-t');
      if (isMarkupKey(key)) el.textContent = T[key];
    });
    document.querySelectorAll('[data-room-aria]').forEach((el) => {
      const key = el.getAttribute('data-room-aria');
      if (isAriaKey(key)) el.setAttribute('aria-label', T.aria[key]);
    });
    // the resume sheet holds both languages (index.html): the page's language shows one, names the dialog, prints
    for (const block of this.sheet.querySelectorAll<HTMLElement>('.cv-lang')) block.hidden = block.lang !== lang;
    this.sheet.setAttribute('aria-labelledby', lang === 'ru' ? 'cv-name' : 'cv-name-en');
    for (const b of document.querySelectorAll('button[data-lang]'))
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    this.fitChips();
  }
}
