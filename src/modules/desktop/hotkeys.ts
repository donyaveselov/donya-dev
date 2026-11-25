// Keyboard and pointer input at the desktop's root: language switching, the Windows key and Ctrl+Esc (Start),
// Ctrl+Shift+Esc (Task Manager), Alt+F4, Escape, and keys for menus, the Start menu and the desktop.
import { isBusy } from './session/busy';
import { deskKey } from './desktop-icons';
import { closest, now } from './dom';
import { changeLang } from './lang';
import { closeMenus, menuKey, menus } from './taskbar/menu';
import { saverRunning } from './session/screensaver';
import { sessionKey, turnOffDialog } from './session/session';
import { closeStart, startKey, startOpen, toggleStart } from './taskbar/start-menu';
import { dom, S } from './store/state';
import { sysApp } from './system-apps';
import { closeVol, volumeOpen } from './taskbar/taskbar';
import { Tip } from './taskbar/tooltip';
import { langSwitchKey, shellCommand } from './keys';

/** The Windows key is down and nothing else has been pressed since. */
let metaAlone = false;

export function resetHotkeys(): void {
  metaAlone = false;
}

export function onKey(e: KeyboardEvent): void {
  S.lastInput = now();
  metaAlone = e.key === 'Meta' && !e.repeat;
  const sw = langSwitchKey(e);
  if (sw) {
    if (sw === 'space') e.preventDefault();
    changeLang(S.lang === 'ru' ? 'en' : 'ru');
    return;
  }
  if (isBusy() || saverRunning()) return;
  if (sessionKey(e)) {
    e.preventDefault();
    return;
  }
  if (menus.length && menuKey(e)) {
    e.preventDefault();
    return;
  }
  const cmd = shellCommand(e);
  if (cmd === 'taskmgr' || cmd === 'start') {
    e.preventDefault();
    if (cmd === 'taskmgr') sysApp('taskmgr');
    else toggleStart(true);
    return;
  }
  if (startOpen() && startKey(e)) {
    e.preventDefault();
    return;
  }
  if (cmd === 'altF4') {
    e.preventDefault();
    if (S.active) S.active.close();
    else turnOffDialog();
    return;
  }
  if (e.key === 'Escape') {
    const a = S.active;
    if (a?.hooks.onEsc) {
      e.preventDefault();
      a.hooks.onEsc();
      return;
    }
    if (a?.hooks.escClose) {
      e.preventDefault();
      a.close();
      return;
    }
    if (volumeOpen()) {
      closeVol();
      return;
    }
  }
  if (document.activeElement === dom().desk && deskKey(e)) e.preventDefault();
}

/** The Windows key pressed and released alone opens the Start menu. */
export function onKeyUp(e: KeyboardEvent): void {
  if (e.key === 'Meta' && metaAlone && !isBusy()) {
    metaAlone = false;
    toggleStart(true);
  }
}

/** Any press on the desktop closes the pop-ups it is not inside. */
export function onRootDown(e: PointerEvent): void {
  S.lastInput = now();
  metaAlone = false; // Cmd+click is not "the Windows key alone"
  Tip.hide();
  if (!closest(e, '.xp-menu')) closeMenus(0);
  // a press inside the Start menu's own submenu must not close it: the click would never land
  if (startOpen() && !closest(e, '.xp-start') && !closest(e, '.xp-startbtn') && !closest(e, '.xp-menu')) closeStart();
  if (volumeOpen() && !closest(e, '.xp-vol')) closeVol();
}
