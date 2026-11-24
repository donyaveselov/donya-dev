// The desktop's language: switching repaints every window, the taskbar, the icons and an open Start menu.
import type { Lang } from '../../shared/types';
import { layoutIcons } from './desktop-icons';
import { closeMenus } from './menu';
import { closeStart, openStart, startOpen } from './start-menu';
import { domOrNull, S } from './state';
import { L } from './strings';
import { buildQuickLaunch, updateTray } from './taskbar';

export function setLang(next: Lang): void {
  const l: Lang = next === 'en' ? 'en' : 'ru';
  if (l === S.lang) return;
  S.lang = l;
  const R = domOrNull();
  if (!S.mounted || !R) return;
  updateTray();
  layoutIcons();
  buildQuickLaunch();
  for (const w of S.wins) {
    w.renderTitle();
    for (const cb of w.langCbs.slice()) {
      try {
        cb(l);
      } catch (e) {
        console.error(e);
      }
    }
  }
  if (startOpen()) {
    closeStart();
    openStart();
  }
  closeMenus(0);
  R.desk.setAttribute('aria-label', L('desktop'));
  if (S.loginEl?.isConnected) {
    const p = S.loginEl.querySelector('p');
    if (p) p.textContent = L('toBegin');
  }
}

/** A switch the visitor made on the desktop: the host hears about it (and switches the room too). */
export function changeLang(l: Lang): void {
  setLang(l);
  S.opts?.onLangChange?.(S.lang);
}
