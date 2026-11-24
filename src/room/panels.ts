// The room's DOM chrome: the top bar (time chip, resume button, language switch), the projects drawer, the resume
// sheet, and the hash routes that open them or preview a time of day or a status.
import type { Lang, Status } from '../shared/types';
import { isStatus } from './clock';
import { PROJECTS, isMarkupKey, t, timeChip } from './i18n';
import { byId } from './util';

const hash = (): string => location.hash.replace('#', '');
function setHash(h: string): void {
  if (hash() !== h) location.hash = h;
}

export class Panels {
  private readonly drawer = byId('drawer');
  private readonly sheet = byId('sheet');
  private readonly sheetBack = byId('sheet-back');
  private readonly time = byId('time');

  constructor() {
    byId('close-drawer').addEventListener('click', () => {
      this.closeDrawer();
    });
    byId('open-resume').addEventListener('click', () => {
      this.openResume();
    });
    this.sheetBack.addEventListener('click', () => {
      this.closeResume();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeDrawer();
        this.closeResume();
      }
    });
  }

  openDrawer(): void {
    this.drawer.classList.add('open');
    this.drawer.setAttribute('aria-hidden', 'false');
    setHash('projects');
  }

  closeDrawer(): void {
    this.drawer.classList.remove('open');
    this.drawer.setAttribute('aria-hidden', 'true');
    if (location.hash === '#projects') setHash('');
  }

  openResume(): void {
    this.sheet.hidden = false;
    this.sheet.style.opacity = '1';
    this.sheet.scrollTop = 0;
    this.sheetBack.hidden = false;
    setHash('resume');
  }

  closeResume(): void {
    this.sheet.hidden = true;
    this.sheetBack.hidden = true;
    if (location.hash === '#resume') setHash('');
  }

  /** Opens or closes the panels for the hash. */
  syncPanels(): void {
    const h = hash();
    if (h === 'resume') this.openResume();
    else if (!this.sheet.hidden) this.closeResume();
    if (h === 'projects') this.openDrawer();
    else if (this.drawer.classList.contains('open')) this.closeDrawer();
  }

  /** The time chip: "Пхукет 13:00 · работаю". */
  renderTime(lang: Lang, h: number, m: number, status: Status, gameName: string | null): void {
    this.time.replaceChildren(
      document.createElement('i'),
      document.createTextNode(timeChip(lang, h, m, status, gameName)),
    );
  }

  /** The page in a language: every data-t string, the language switch, the drawer's project list. */
  applyLang(lang: Lang): void {
    const T = t(lang);
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-t]').forEach((el) => {
      const key = el.getAttribute('data-t');
      el.textContent = isMarkupKey(key) ? T[key] : '';
    });
    byId('cv-note').hidden = !T.resumeNote;
    byId('lang-ru').setAttribute('aria-pressed', String(lang === 'ru'));
    byId('lang-en').setAttribute('aria-pressed', String(lang === 'en'));
    const list = byId('proj-list');
    list.textContent = '';
    for (const p of PROJECTS) {
      const d = document.createElement('div');
      d.className = 'proj';
      const h = document.createElement('h3');
      h.textContent = p.name;
      const s = document.createElement('p');
      s.textContent = p.about[lang];
      const ul = document.createElement('ul');
      ul.className = 'tags';
      for (const x of p.tags) {
        const li = document.createElement('li');
        li.textContent = x;
        ul.appendChild(li);
      }
      d.append(h, s, ul);
      list.appendChild(d);
    }
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
