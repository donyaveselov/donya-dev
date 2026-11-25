// The room's DOM chrome: the top bar (time chip, resume button, language switch), the resume sheet, and the hash
// routes that open it or preview a time of day or a status. The projects live on the desktop (src/xp).
import { DESKTOP_DOM } from '../shared/desktop';
import { EXPERIENCE } from '../shared/experience';
import type { Lang, Status } from '../shared/types';
import { isStatus } from './clock';
import { isAriaKey, isMarkupKey, t, timeChip } from './i18n';
import { byId } from './util';

const hash = (): string => location.hash.replace('#', '');
function setHash(h: string): void {
  if (hash() !== h) location.hash = h;
}

export class Panels {
  private readonly sheet = byId('sheet');
  private readonly sheetBack = byId('sheet-back');
  private readonly time = byId('time');
  /** what had the focus before the sheet opened, to give it back */
  private returnFocus: HTMLElement | null = null;

  constructor() {
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
      document.querySelector<HTMLElement>(`#xp-root ${DESKTOP_DOM.root}`)?.focus({ preventScroll: true });
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

  /** Opens or closes the panels for the hash. */
  syncPanels(): void {
    const h = hash();
    if (h === 'resume') this.openResume();
    else if (!this.sheet.hidden) this.closeResume();
  }

  /** The time chip: "Пхукет 13:00 · работаю". */
  renderTime(lang: Lang, h: number, m: number, status: Status, gameName: string | null): void {
    this.time.replaceChildren(
      document.createElement('i'),
      document.createTextNode(timeChip(lang, h, m, status, gameName)),
    );
  }

  /** The page in a language: every data-t string and accessible name, the language switch. */
  applyLang(lang: Lang): void {
    const T = t(lang);
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-t]').forEach((el) => {
      const key = el.getAttribute('data-t');
      el.textContent = isMarkupKey(key) ? T[key] : '';
    });
    document.querySelectorAll('[data-t-aria]').forEach((el) => {
      const key = el.getAttribute('data-t-aria');
      if (isAriaKey(key)) el.setAttribute('aria-label', T.aria[key]);
    });
    byId('cv-note').hidden = !T.resumeNote;
    byId('lang-ru').setAttribute('aria-pressed', String(lang === 'ru'));
    byId('lang-en').setAttribute('aria-pressed', String(lang === 'en'));
  }
}

export interface Route {
  /** a previewed hour, or null for the clock */
  preview: number | null;
  /** a previewed status, or null for the schedule */
  forced: Status | null;
  /** a game to show (#dota, #cs, #pcdota) */
  game: { kind: 'dota' | 'cs'; name: string } | null;
}

/** The previews a hash asks for: #day / #sunset / #night an hour (a state link keeps the real hour), a status, a game. */
export function parseRoute(h: string): Route {
  const times: Record<string, number> = { day: 13, sunset: 18.2, night: 1.5 };
  const r: Route = { preview: times[h] ?? null, forced: isStatus(h) ? h : null, game: null };
  const g = h === 'pcdota' ? 'dota' : h;
  if (g === 'dota' || g === 'cs') {
    r.forced = 'play';
    r.game = { kind: g, name: g === 'dota' ? 'Dota 2' : 'Counter-Strike 2' };
  }
  return r;
}

export const currentHash = hash;
