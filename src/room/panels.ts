// The room's DOM chrome: the top bar (time chip, resume button, language switch) and the resume sheet. The projects
// live on the desktop (src/xp).
import { DESKTOP_DOM, DESKTOP_ROOT_ID } from '../shared/desktop';
import { EXPERIENCE } from '../shared/experience';
import type { Lang, Status } from '../shared/types';
import { isAriaKey, isMarkupKey, t, timeChip } from './i18n';
import { setHash } from './routes';
import { fitPixelBox } from './tags';
import { byId } from './util';

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
    byId('open-resume').addEventListener('click', () => {
      this.openResume();
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
    byId('cv-years').textContent = EXPERIENCE.ru; // the sheet is in Russian; the markup holds the value for no-JS
  }

  /** Whether the resume sheet covers the page (the room need not be drawn under it). */
  get sheetOpen(): boolean {
    return !this.sheet.hidden;
  }

  openResume(): void {
    const wasOpen = !this.sheet.hidden;
    this.sheet.hidden = false;
    this.sheet.style.opacity = '1';
    this.sheetBack.hidden = false;
    setHash('resume');
    if (wasOpen) return;
    this.sheet.scrollTop = 0;
    const active = document.activeElement;
    this.returnFocus = active instanceof HTMLElement && active !== document.body ? active : null;
    this.sheetBack.focus({ preventScroll: true });
  }

  closeResume(): void {
    if (this.sheet.hidden) return;
    this.sheet.hidden = true;
    this.sheetBack.hidden = true;
    if (location.hash === '#resume') setHash('');
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

  /** Opens or closes the sheet for the route (#resume). */
  showResume(open: boolean): void {
    if (open) this.openResume();
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
  }

  /**
   * The page in a language: the room's own strings (data-room-t) and accessible names (data-room-aria), the language
   * switch. The attributes are the room's alone: the desktop's markup has its own data-* and is never touched here.
   */
  applyLang(lang: Lang): void {
    const T = t(lang);
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-room-t]').forEach((el) => {
      const key = el.getAttribute('data-room-t');
      if (isMarkupKey(key)) el.textContent = T[key];
    });
    document.querySelectorAll('[data-room-aria]').forEach((el) => {
      const key = el.getAttribute('data-room-aria');
      if (isAriaKey(key)) el.setAttribute('aria-label', T.aria[key]);
    });
    byId('cv-note').hidden = !T.resumeNote;
    byId('lang-ru').setAttribute('aria-pressed', String(lang === 'ru'));
    byId('lang-en').setAttribute('aria-pressed', String(lang === 'en'));
    this.fitChips();
  }
}
